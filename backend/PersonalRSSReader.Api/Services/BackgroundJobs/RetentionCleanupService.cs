using Microsoft.EntityFrameworkCore;
using PersonalRSSReader.Api.Data;

namespace PersonalRSSReader.Api.Services.BackgroundJobs;

/// <summary>
/// Periodically evicts old articles from the database. Articles that are
/// favorited or belong to any playlist are always protected, regardless of
/// age. AI summaries are cascade-deleted along with their parent article
/// by the EF Core relationship.
/// </summary>
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

        var maxAgeDays = _configuration.GetValue<int?>("Retention:MaxArticleAgeDays") ?? 60;
        var cutoff = DateTime.UtcNow.AddDays(-maxAgeDays);

        // Collect IDs of articles that are protected (favorited or in a playlist)
        var protectedIds = await db.Favorites.Select(f => f.ArticleId)
            .Union(db.PlaylistArticles.Select(pa => pa.ArticleId))
            .ToListAsync(stoppingToken);
        var protectedSet = protectedIds.ToHashSet();

        // Delete articles that are old AND not protected
        var oldArticles = await db.Articles
            .Where(a => a.FetchedAt < cutoff && !protectedSet.Contains(a.Id))
            .ToListAsync(stoppingToken);

        var removedCount = oldArticles.Count;

        if (removedCount == 0)
        {
            _logger.LogDebug("Retention cleanup ran, nothing to remove");
            return;
        }

        db.Articles.RemoveRange(oldArticles);
        await db.SaveChangesAsync(stoppingToken);

        _logger.LogInformation(
            "Retention cleanup removed {RemovedCount} articles older than {MaxAgeDays}d (protected: {ProtectedCount})",
            removedCount, maxAgeDays, protectedSet.Count);
    }
}