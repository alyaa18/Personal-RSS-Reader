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

builder.Services.AddSingleton<JsonStorageService>();
builder.Services.AddHttpClient<RssService>(client =>
{
    client.Timeout = TimeSpan.FromSeconds(15);
});
builder.Services.AddSingleton<FeedService>();
builder.Services.AddSingleton<ArticleService>();
builder.Services.AddScoped<FavoriteService>();
builder.Services.AddScoped<PlaylistService>();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<AuthService>();

var jwtSecret = builder.Configuration["Jwt:Secret"]
    ?? "ThisIsJustADevelopmentSecretKeyThatIsLongEnough123!";

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

    var result = await authService.RegisterAsync(request);
    if (result == null)
    {
        return Results.BadRequest(new { error = "An account with this email already exists." });
    }

    return Results.Created("/api/auth/me", result);
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

app.MapPost("/api/feeds", async (AddFeedRequest request, ClaimsPrincipal user, FeedService feedService) =>
{
    if (string.IsNullOrWhiteSpace(request.Url))
    {
        return Results.BadRequest(new { error = "URL is required." });
    }

    var newFeed = await feedService.AddFeedAsync(user.GetUserId(), request.Url);

    if (newFeed == null)
    {
        return Results.BadRequest(new { error = "Invalid, unreachable, or duplicate feed URL." });
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

app.Run();