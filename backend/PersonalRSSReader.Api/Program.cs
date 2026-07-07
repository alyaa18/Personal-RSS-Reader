using PersonalRSSReader.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Register services for Dependency Injection.
// Singleton is fine here since these services are stateless (all state lives in the JSON file).
builder.Services.AddSingleton<JsonStorageService>();
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

app.Run();