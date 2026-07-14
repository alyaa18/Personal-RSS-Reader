using Microsoft.EntityFrameworkCore;
using PersonalRSSReader.Api.Data;
using PersonalRSSReader.Api.Models;

namespace PersonalRSSReader.Api.Services.BackgroundJobs;

/// Periodically evicts old articles from the JSON cache. Articles favorited
/// or added to any playlist are always protected, regardless of age —
/// checked directly against SQLite before anything is deleted.
public class RetentionCleanupService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<RetentionCleanupService> _logger;

    public RetentionCleanupService(IServiceScopeFactory scopeFactory, IConfiguration configuration, ILogger<RetentionCleanupService> logger)
    {
        _scopeFactory = scopeFactory;
        _configuration = configuration;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var intervalHours = _configuration.GetValue<int?>("Retention:CleanupIntervalHours") ?? 24;

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunCleanupAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Retention cleanup run failed");
            }

            await Task.Delay(TimeSpan.FromHours(intervalHours), stoppingToken);
        }
    }

    private async Task RunCleanupAsync(CancellationToken stoppingToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var storage = scope.ServiceProvider.GetRequiredService<JsonStorageService>();

        var maxAgeDays = _configuration.GetValue<int?>("Retention:MaxArticleAgeDays") ?? 60;
        var cutoff = DateTime.UtcNow.AddDays(-maxAgeDays);

        var protectedIds = await db.Favorites.Select(f => f.ArticleId)
            .Union(db.PlaylistArticles.Select(pa => pa.ArticleId))
            .ToListAsync(stoppingToken);
        var protectedSet = protectedIds.ToHashSet();

        var articles = await storage.ReadAllAsync<Article>(StorageConstants.ArticlesFile);
        var toKeep = articles.Where(a => a.FetchedAt >= cutoff || protectedSet.Contains(a.Id)).ToList();
        var removedCount = articles.Count - toKeep.Count;

        if (removedCount == 0)
        {
            _logger.LogDebug("Retention cleanup ran, nothing to remove");
            return;
        }

        await storage.WriteAllAsync(StorageConstants.ArticlesFile, toKeep);

        // Evict any AI summary whose parent article is gone (Milestone 6).
        // var keptIds = toKeep.Select(a => a.Id).ToHashSet();
        // var summaries = await storage.ReadAllAsync<AiSummary>(StorageConstants.AiSummariesFile);
        // var remainingSummaries = summaries.Where(s => keptIds.Contains(s.ArticleId)).ToList();
        // if (remainingSummaries.Count != summaries.Count)
        // {
        //     await storage.WriteAllAsync(StorageConstants.AiSummariesFile, remainingSummaries);
        // }

        _logger.LogInformation(
            "Retention cleanup removed {RemovedCount} articles older than {MaxAgeDays}d (protected: {ProtectedCount})",
            removedCount, maxAgeDays, protectedSet.Count);
    }
}