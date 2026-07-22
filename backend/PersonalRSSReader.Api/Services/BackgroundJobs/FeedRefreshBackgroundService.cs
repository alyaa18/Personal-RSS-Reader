namespace PersonalRSSReader.Api.Services.BackgroundJobs;

/// <summary>
/// Periodically refreshes every feed stored in the database in the
/// background, so articles are already up to date whenever a user opens
/// the app — no manual "Refresh All" required. Feeds are global (not
/// owned by a single user), so this refreshes all of them regardless of
/// who is subscribed, reusing the same fetch/dedupe path FeedService
/// already uses for a logged-in user's "Refresh All" action.
/// </summary>
public class FeedRefreshBackgroundService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<FeedRefreshBackgroundService> _logger;

    public FeedRefreshBackgroundService(IServiceScopeFactory scopeFactory, IConfiguration configuration, ILogger<FeedRefreshBackgroundService> logger)
    {
        _scopeFactory = scopeFactory;
        _configuration = configuration;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var intervalMinutes = _configuration.GetValue<int?>("FeedRefresh:IntervalMinutes") ?? 15;

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunRefreshAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Background feed refresh run failed");
            }

            await Task.Delay(TimeSpan.FromMinutes(intervalMinutes), stoppingToken);
        }
    }

    private async Task RunRefreshAsync()
    {
        using var scope = _scopeFactory.CreateScope();
        var feedService = scope.ServiceProvider.GetRequiredService<FeedService>();

        var result = await feedService.RefreshAllFeedsAsync(null);

        _logger.LogInformation(
            "Background feed refresh completed: {NewCount} new articles, {FailedCount} failed feeds",
            result.NewArticlesCount, result.FailedFeedsCount);
    }
}