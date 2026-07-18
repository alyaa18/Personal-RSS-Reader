using System.Collections;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using PersonalRSSReader.Api.Data;
using PersonalRSSReader.Api.Helpers;
using PersonalRSSReader.Api.Middleware;
using PersonalRSSReader.Api.Models.DTOs;
using PersonalRSSReader.Api.Services;

var builder = WebApplication.CreateBuilder(args);

Console.WriteLine("===== PROVIDERS =====");
foreach (var p in ((IConfigurationRoot)builder.Configuration).Providers)
{
    Console.WriteLine(p.GetType().FullName);
}
// Console.WriteLine("=====================");

// Console.WriteLine("===== CONFIG TEST =====");
// Console.WriteLine($"Jwt:Secret = '{builder.Configuration["Jwt:Secret"]}'");
// Console.WriteLine($"Environment Jwt__Secret = '{Environment.GetEnvironmentVariable("Jwt__Secret")}'");
// Console.WriteLine("=======================");


builder.Services.AddSingleton<RssFeedGeneratorService>();
builder.Services.AddHttpClient<RssService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(15);
});
builder.Services.AddHttpClient<TranslationService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(10);
});
builder.Services.AddScoped<FeedService>();
builder.Services.AddScoped<ArticleService>();
builder.Services.AddSingleton<DemoService>();
builder.Services.AddScoped<FavoriteService>();
builder.Services.AddScoped<PlaylistService>();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<EmailService>();

// foreach (DictionaryEntry env in Environment.GetEnvironmentVariables())
// {
//     if (env.Key.ToString()!.Contains("Jwt"))
//         Console.WriteLine($"{env.Key} = {env.Value}");
// }

var jwtSecret = builder.Configuration["Jwt:Secret"];
if (string.IsNullOrWhiteSpace(jwtSecret))
{
    throw new InvalidOperationException(
        "Jwt:Secret is not configured. Set it via 'dotnet user-secrets' locally, " +
        "or the Jwt__Secret environment variable in production.");
}

Console.WriteLine($"DIAGNOSTIC: Jwt:Secret length is {jwtSecret.Length} characters");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"],
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret))
        };
    });

builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Services.AddHostedService<PersonalRSSReader.Api.Services.BackgroundJobs.RetentionCleanupService>();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

// ── Auth endpoints ──────────────────────────────────────────────

app.MapPost("/api/auth/register", async (RegisterRequest request, AuthService authService) =>
{
    if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
    {
        return Results.BadRequest(new { error = "Email and password are required." });
    }
    if (request.Password.Length < 8)
    {
        return Results.BadRequest(new { error = "Password must be at least 8 characters." });
    }

    // Basic email format validation
    if (!System.Text.RegularExpressions.Regex.IsMatch(request.Email, @"^[^@\s]+@[^@\s]+\.[^@\s]+$"))
    {
        return Results.BadRequest(new { error = "Invalid email format." });
    }

    var result = await authService.RegisterAsync(request);
    if (result == null)
    {
        return Results.BadRequest(new { error = "An account with this email already exists. Please log in instead." });
    }

    return Results.Ok(result);
});

app.MapPost("/api/auth/login", async (LoginRequest request, AuthService authService) =>
{
    if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
    {
        return Results.BadRequest(new { error = "Email and password are required." });
    }

    var result = await authService.LoginAsync(request);
    if (result == null)
    {
        return Results.Json(new { error = "Invalid email or password." }, statusCode: 401);
    }

    return Results.Ok(result);
});

// ── Feed endpoints (all require a logged-in user) ───────────────

app.MapGet("/api/feeds", async (ClaimsPrincipal user, FeedService feedService) =>
{
    var feeds = await feedService.GetAllFeedsAsync(user.GetUserId());
    return Results.Ok(feeds);
}).RequireAuthorization();

app.MapPost("/api/feeds", async (AddFeedRequest request, ClaimsPrincipal user, FeedService feedService, AppDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(request.Url))
    {
        return Results.BadRequest(new { error = "URL is required." });
    }

    var userId = user.GetUserId();

    // Check if user is already subscribed — return the existing feed ID
    var normalizedUrl = request.Url.ToLowerInvariant();
    var existingSub = await db.UserFeedSubscriptions
        .Include(ufs => ufs.Feed)
        .FirstOrDefaultAsync(ufs =>
            ufs.UserId == userId &&
            ufs.Feed.Url!.ToLower() == normalizedUrl);

    if (existingSub != null)
    {
        return Results.Ok(new { duplicate = true, feed = existingSub.Feed });
    }

    var newFeed = await feedService.AddFeedAsync(userId, request.Url);

    if (newFeed == null)
    {
        return Results.BadRequest(new { error = "Invalid or unreachable feed URL." });
    }

    return Results.Created($"/api/feeds/{newFeed.Id}", newFeed);
}).RequireAuthorization();

app.MapDelete("/api/feeds/{id:guid}", async (Guid id, ClaimsPrincipal user, FeedService feedService) =>
{
    var removed = await feedService.RemoveFeedAsync(user.GetUserId(), id);

    if (!removed)
    {
        return Results.NotFound(new { error = $"No feed found with id '{id}'." });
    }

    return Results.NoContent();
}).RequireAuthorization();

app.MapPost("/api/feeds/{id:guid}/refresh", async (Guid id, ClaimsPrincipal user, FeedService feedService) =>
{
    var newArticles = await feedService.RefreshFeedAsync(user.GetUserId(), id);

    if (newArticles == null)
    {
        return Results.NotFound(new { error = $"Feed '{id}' not found or could not be fetched." });
    }

    return Results.Ok(new { newArticlesCount = newArticles.Count, articles = newArticles });
}).RequireAuthorization();

app.MapPost("/api/feeds/refresh", async (ClaimsPrincipal user, FeedService feedService) =>
{
    var result = await feedService.RefreshAllFeedsAsync(user.GetUserId());
    return Results.Ok(result);
}).RequireAuthorization();

// ── Article endpoints ───────────────────────────────────────────

app.MapGet("/api/articles", async (ClaimsPrincipal user, ArticleService articleService) =>
{
    var articles = await articleService.GetAllArticlesAsync(user.GetUserId());
    return Results.Ok(articles);
}).RequireAuthorization();

// ── User preferences ──────────────────────────────────────────

app.MapPatch("/api/auth/language", async (ClaimsPrincipal user, AppDbContext db, LanguageUpdateRequest request) =>
{
    if (request.Language != "en" && request.Language != "ar")
    {
        return Results.BadRequest(new { error = "Language must be 'en' or 'ar'." });
    }

    var dbUser = await db.Users.FindAsync(user.GetUserId());
    if (dbUser == null) return Results.NotFound(new { error = "User not found." });

    dbUser.PreferredLanguage = request.Language;
    await db.SaveChangesAsync();

    return Results.Ok(new { preferredLanguage = dbUser.PreferredLanguage });
}).RequireAuthorization();

// ── Diagnostics (intentionally public — no user data exposed) ──

app.MapGet("/api/health/db", (IWebHostEnvironment env) =>
{
    var dbPath = Path.Combine(env.ContentRootPath, "Data", "app.db");
    var exists = File.Exists(dbPath);
    var info = exists ? new FileInfo(dbPath) : null;

    return Results.Ok(new
    {
        exists,
        sizeBytes = info?.Length,
        lastModifiedUtc = info?.LastWriteTimeUtc
    });
});

// ── Demo / Guest mode (no auth) ─────────────────────────────

app.MapGet("/api/demo", async (DemoService demoService) =>
{
    var (feeds, articles) = await demoService.GetDemoDataAsync();

    return Results.Ok(new
    {
        feeds = feeds.Select(f => new { f.Id, f.Title, f.Url, f.CreatedAt, f.LastFetchedAt, f.Language }),
        articles
    });
});

// ── Favorites ────────────────────────────────────────────────

app.MapGet("/api/favorites", async (ClaimsPrincipal user, FavoriteService favoriteService, ArticleService articleService) =>
{
    var ids = await favoriteService.GetFavoriteArticleIdsAsync(user.GetUserId());
    var articles = await articleService.GetArticlesByIdsAsync(ids);
    return Results.Ok(articles);
}).RequireAuthorization();

app.MapPost("/api/favorites", async (AddFavoriteRequest request, ClaimsPrincipal user, FavoriteService favoriteService) =>
{
    var added = await favoriteService.AddFavoriteAsync(user.GetUserId(), request.ArticleId);
    return added
        ? Results.Created($"/api/favorites/{request.ArticleId}", new { request.ArticleId })
        : Results.Ok(new { message = "Already favorited." });
}).RequireAuthorization();

app.MapDelete("/api/favorites/{articleId:guid}", async (Guid articleId, ClaimsPrincipal user, FavoriteService favoriteService) =>
{
    var removed = await favoriteService.RemoveFavoriteAsync(user.GetUserId(), articleId);
    return removed ? Results.NoContent() : Results.NotFound(new { error = "Favorite not found." });
}).RequireAuthorization();

// ── Playlists ────────────────────────────────────────────────

app.MapGet("/api/playlists", async (ClaimsPrincipal user, PlaylistService playlistService) =>
{
    var playlists = await playlistService.GetPlaylistsAsync(user.GetUserId());
    return Results.Ok(playlists.Select(p => new { p.Id, p.Name, p.Slug, p.CreatedAt }));
}).RequireAuthorization();

app.MapPost("/api/playlists", async (CreatePlaylistRequest request, ClaimsPrincipal user, PlaylistService playlistService) =>
{
    if (string.IsNullOrWhiteSpace(request.Name))
    {
        return Results.BadRequest(new { error = "Playlist name is required." });
    }

    var playlist = await playlistService.CreatePlaylistAsync(user.GetUserId(), request.Name.Trim());
    return Results.Created($"/api/playlists/{playlist.Id}", new { playlist.Id, playlist.Name, playlist.Slug, playlist.CreatedAt });
}).RequireAuthorization();

app.MapDelete("/api/playlists/{id:guid}", async (Guid id, ClaimsPrincipal user, PlaylistService playlistService) =>
{
    var removed = await playlistService.DeletePlaylistAsync(user.GetUserId(), id);
    return removed ? Results.NoContent() : Results.NotFound(new { error = "Playlist not found." });
}).RequireAuthorization();

app.MapGet("/api/playlists/{id:guid}", async (Guid id, ClaimsPrincipal user, PlaylistService playlistService, ArticleService articleService) =>
{
    var playlist = await playlistService.GetOwnedPlaylistAsync(user.GetUserId(), id);
    if (playlist == null) return Results.NotFound(new { error = "Playlist not found." });

    var articles = await articleService.GetArticlesByIdsAsync(playlist.Articles.Select(a => a.ArticleId));
    return Results.Ok(new { playlist.Id, playlist.Name, playlist.Slug, playlist.CreatedAt, Articles = articles });
}).RequireAuthorization();

app.MapPost("/api/playlists/{id:guid}/articles", async (Guid id, AddPlaylistArticleRequest request, ClaimsPrincipal user, PlaylistService playlistService) =>
{
    var added = await playlistService.AddArticleAsync(user.GetUserId(), id, request.ArticleId);
    return added ? Results.Ok(new { message = "Added." }) : Results.NotFound(new { error = "Playlist not found." });
}).RequireAuthorization();

app.MapDelete("/api/playlists/{id:guid}/articles/{articleId:guid}", async (Guid id, Guid articleId, ClaimsPrincipal user, PlaylistService playlistService) =>
{
    var removed = await playlistService.RemoveArticleAsync(user.GetUserId(), id, articleId);
    return removed ? Results.NoContent() : Results.NotFound(new { error = "Article not in playlist." });
}).RequireAuthorization();

// ── Translation (authenticated — used by frontend) ──────────

app.MapPost("/api/translate", async (TranslationRequest request, TranslationService translationService) =>
{
    if (string.IsNullOrWhiteSpace(request.Text))
    {
        return Results.BadRequest(new { error = "Text is required." });
    }

    var translated = await translationService.TranslateAsync(
        request.Text, request.Source ?? "auto", request.Target);

    if (translated == null)
    {
        return Results.Ok(new { translatedText = request.Text });
    }

    return Results.Ok(new { translatedText = translated });
}).RequireAuthorization();

app.MapPost("/api/translate/batch", async (BatchTranslationRequest request, TranslationService translationService) =>
{
    if (request.Texts == null || request.Texts.Count == 0)
    {
        return Results.BadRequest(new { error = "Texts are required." });
    }

    var results = await translationService.TranslateBatchAsync(
        request.Texts, request.Source ?? "auto", request.Target);

    return Results.Ok(new { translations = results });
}).RequireAuthorization();

// ── Playlists: public RSS feed (no auth) ────────────────────

// Intentionally public/unauthenticated — this is meant to be subscribed
// to by external RSS readers, which can't attach a JWT. Only reachable
// by anyone who has the unguessable slug.
app.MapGet("/api/playlists/{slug}/rss", async (string slug, HttpContext httpContext, PlaylistService playlistService, ArticleService articleService, RssFeedGeneratorService rssGenerator) =>
{
    var playlist = await playlistService.GetBySlugAsync(slug);

    // If the playlist was deleted (or never existed), return a tombstone
    // RSS feed instead of 404. This ensures external RSS readers show
    // a friendly message rather than a connection error.
    if (playlist == null)
    {
        var tombstone = rssGenerator.GenerateTombstoneFeed(slug);
        return Results.Text(tombstone, "application/rss+xml; charset=utf-8");
    }

    var articles = await articleService.GetArticlesByIdsAsync(playlist.Articles.Select(a => a.ArticleId));
    var baseUrl = $"{httpContext.Request.Scheme}://{httpContext.Request.Host}";
    var xml = rssGenerator.GeneratePlaylistFeed(playlist, articles, baseUrl);

    return Results.Text(xml, "application/rss+xml; charset=utf-8");
});

app.Run();