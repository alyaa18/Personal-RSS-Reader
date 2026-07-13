using PersonalRSSReader.Api.Models;
using PersonalRSSReader.Api.Models.DTOs;

namespace PersonalRSSReader.Api.Services;

public class FeedService
{
    private readonly JsonStorageService _storage;
    private readonly RssService _rssService;
    private readonly ILogger<FeedService> _logger;

    public FeedService(JsonStorageService storage, RssService rssService, ILogger<FeedService> logger)
    {
        _storage = storage;
        _rssService = rssService;
        _logger = logger;
    }

    public async Task<List<Feed>> GetAllFeedsAsync()
    {
        return await _storage.ReadAllAsync<Feed>(StorageConstants.FeedsFile);
    }

    /// Validates the given URL as an RSS/Atom feed, and if valid, saves it.
    /// Returns null if the URL is not a valid feed.
    public async Task<Feed?> AddFeedAsync(string url)
    {
        var parsedFeed = await _rssService.TryFetchFeedAsync(url);
        if (parsedFeed == null)
        {
            _logger.LogWarning("Failed to fetch feed at {Url}", url);
            return null;
        }

        var feeds = await _storage.ReadAllAsync<Feed>(StorageConstants.FeedsFile);

        // Avoid adding a duplicate subscription to the same URL.
        if (feeds.Any(f => f.Url.Equals(url, StringComparison.OrdinalIgnoreCase)))
        {
            _logger.LogInformation("Duplicate feed URL rejected: {Url}", url);
            return null;
        }

        var newFeed = new Feed
        {
            Id = Guid.NewGuid(),
            Title = string.IsNullOrWhiteSpace(parsedFeed.Title) ? url : parsedFeed.Title,
            Url = url,
            CreatedAt = DateTime.UtcNow,
            LastFetchedAt = DateTime.UtcNow
        };

        feeds.Add(newFeed);
        await _storage.WriteAllAsync(StorageConstants.FeedsFile, feeds);

        // Fetch initial articles right away so the feed isn't empty until first manual refresh.
        var articles = _rssService.MapToArticles(parsedFeed, newFeed.Id);
        var allArticles = await _storage.ReadAllAsync<Article>(StorageConstants.ArticlesFile);
        allArticles.AddRange(articles);
        await _storage.WriteAllAsync(StorageConstants.ArticlesFile, allArticles);

        _logger.LogInformation("Added feed '{Title}' with {ArticleCount} initial articles", newFeed.Title, articles.Count);
        return newFeed;
    }

    /// Removes a feed by its ID. Returns true if a feed was found and removed,
    /// false if no feed with that ID existed.
    public async Task<bool> RemoveFeedAsync(Guid feedId)
    {
        var feeds = await _storage.ReadAllAsync<Feed>(StorageConstants.FeedsFile);
        var feedToRemove = feeds.FirstOrDefault(f => f.Id == feedId);
        if (feedToRemove == null)
        {
            _logger.LogWarning("Attempted to remove non-existent feed {FeedId}", feedId);
            return false;
        }

        feeds.Remove(feedToRemove);
        await _storage.WriteAllAsync(StorageConstants.FeedsFile, feeds);

        // Also clean up articles belonging to the removed feed,
        // otherwise orphaned articles would linger forever.
        var articles = await _storage.ReadAllAsync<Article>(StorageConstants.ArticlesFile);
        var remainingArticles = articles.Where(a => a.FeedId != feedId).ToList();
        await _storage.WriteAllAsync(StorageConstants.ArticlesFile, remainingArticles);

        var removedCount = articles.Count - remainingArticles.Count;
        _logger.LogInformation("Removed feed '{Title}' and {ArticleCount} associated articles",
            feedToRemove.Title, removedCount);
        return true;
    }

    /// Re-fetches a specific feed's articles, adding any new ones and
    /// updating the feed's LastFetchedAt timestamp.
    /// Returns null if the feed doesn't exist or can no longer be fetched.
    public async Task<List<Article>?> RefreshFeedAsync(Guid feedId)
    {
        var feeds = await _storage.ReadAllAsync<Feed>(StorageConstants.FeedsFile);
        var feed = feeds.FirstOrDefault(f => f.Id == feedId);
        if (feed == null)
        {
            _logger.LogWarning("Refresh requested for non-existent feed {FeedId}", feedId);
            return null;
        }

        var parsedFeed = await _rssService.TryFetchFeedAsync(feed.Url);
        if (parsedFeed == null)
        {
            _logger.LogWarning("Failed to fetch feed '{Title}' for refresh", feed.Title);
            return null;
        }

        var fetchedArticles = _rssService.MapToArticles(parsedFeed, feedId);

        var allArticles = await _storage.ReadAllAsync<Article>(StorageConstants.ArticlesFile);
        var existingLinks = allArticles
            .Where(a => a.FeedId == feedId)
            .Select(a => a.Link)
            .ToHashSet();

        // Only keep articles we haven't already stored, identified by their link.
        var newArticles = fetchedArticles
            .Where(a => !existingLinks.Contains(a.Link))
            .ToList();

        allArticles.AddRange(newArticles);
        await _storage.WriteAllAsync(StorageConstants.ArticlesFile, allArticles);

        feed.LastFetchedAt = DateTime.UtcNow;
        await _storage.WriteAllAsync(StorageConstants.FeedsFile, feeds);

        _logger.LogInformation("Refreshed feed '{Title}': {NewCount} new articles", feed.Title, newArticles.Count);
        return newArticles;
    }

    /// Refreshes all feeds server-side and returns aggregate totals,
    /// so the frontend can issue a single request.
    public async Task<RefreshAllFeedsResult> RefreshAllFeedsAsync()
    {
        var feeds = await _storage.ReadAllAsync<Feed>(StorageConstants.FeedsFile);
        var allArticles = await _storage.ReadAllAsync<Article>(StorageConstants.ArticlesFile);

        var existingLinksByFeedId = allArticles
            .GroupBy(a => a.FeedId)
            .ToDictionary(
                group => group.Key,
                group => group.Select(a => a.Link).ToHashSet());

        var refreshTasks = feeds.Select(async feed =>
        {
            var parsedFeed = await _rssService.TryFetchFeedAsync(feed.Url);
            if (parsedFeed == null)
            {
                return new FeedRefreshResult(feed, null);
            }

            existingLinksByFeedId.TryGetValue(feed.Id, out var existingLinks);
            existingLinks ??= new HashSet<string>();

            var newArticles = _rssService.MapToArticles(parsedFeed, feed.Id)
                .Where(a => !existingLinks.Contains(a.Link))
                .ToList();

            return new FeedRefreshResult(feed, newArticles);
        });

        var refreshResults = await Task.WhenAll(refreshTasks);
        var successfulResults = refreshResults
            .Where(result => result.NewArticles != null)
            .ToList();
        var allNewArticles = successfulResults
            .SelectMany(result => result.NewArticles!)
            .ToList();
        var failedFeedsCount = refreshResults.Length - successfulResults.Count;
        var now = DateTime.UtcNow;

        foreach (var result in successfulResults)
        {
            allArticles.AddRange(result.NewArticles!);
            result.Feed.LastFetchedAt = now;
        }

        if (allNewArticles.Count > 0)
        {
            await _storage.WriteAllAsync(StorageConstants.ArticlesFile, allArticles);
        }

        if (feeds.Count > failedFeedsCount)
        {
            await _storage.WriteAllAsync(StorageConstants.FeedsFile, feeds);
        }

        _logger.LogInformation(
            "RefreshAllFeeds completed: {NewCount} new articles, {FailedCount} failed feeds out of {TotalCount}",
            allNewArticles.Count, failedFeedsCount, feeds.Count);

        return new RefreshAllFeedsResult
        {
            NewArticlesCount = allNewArticles.Count,
            Articles = allNewArticles,
            FailedFeedsCount = failedFeedsCount
        };
    }

    private record FeedRefreshResult(Feed Feed, List<Article>? NewArticles);
}
