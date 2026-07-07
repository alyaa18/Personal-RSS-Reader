using PersonalRSSReader.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<JsonStorageService>();
builder.Services.AddHttpClient<RssService>();
builder.Services.AddSingleton<FeedService>();
builder.Services.AddSingleton<ArticleService>();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

app.UseCors();

app.MapGet("/api/feeds", async (FeedService feedService) =>
{
    var feeds = await feedService.GetAllFeedsAsync();
    return Results.Ok(feeds);
});

app.MapPost("/api/feeds", async (AddFeedRequest request, FeedService feedService) =>
{
    if (string.IsNullOrWhiteSpace(request.Url))
    {
        return Results.BadRequest(new { error = "URL is required." });
    }

    var newFeed = await feedService.AddFeedAsync(request.Url);

    if (newFeed == null)
    {
        return Results.BadRequest(new { error = "Invalid, unreachable, or duplicate feed URL." });
    }

    return Results.Created($"/api/feeds/{newFeed.Id}", newFeed);
});

app.MapDelete("/api/feeds/{id:guid}", async (Guid id, FeedService feedService) =>
{
    var removed = await feedService.RemoveFeedAsync(id);

    if (!removed)
    {
        return Results.NotFound(new { error = $"No feed found with id '{id}'." });
    }

    return Results.NoContent();
});

app.MapPost("/api/feeds/{id:guid}/refresh", async (Guid id, FeedService feedService) =>
{
    var newArticles = await feedService.RefreshFeedAsync(id);

    if (newArticles == null)
    {
        return Results.NotFound(new { error = $"Feed '{id}' not found or could not be fetched." });
    }

    return Results.Ok(new { newArticlesCount = newArticles.Count, articles = newArticles });
});

app.MapGet("/api/articles", async (ArticleService articleService) =>
{
    var articles = await articleService.GetAllArticlesAsync();
    return Results.Ok(articles);
});

app.Run();

record AddFeedRequest(string Url);