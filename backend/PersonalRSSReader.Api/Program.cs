using PersonalRSSReader.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<JsonStorageService>();
builder.Services.AddHttpClient<RssService>();
builder.Services.AddSingleton<FeedService>();

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

app.Run();

// Request DTO (Data Transfer Object) for POST /api/feeds.
// Kept here for now since it's small and only used by one endpoint.
record AddFeedRequest(string Url);