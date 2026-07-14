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

    public async Task<List<Feed>> GetAllFeedsAsync(Guid userId)
    {
        var feeds = await _storage.ReadAllAsync<Feed>(StorageConstants.FeedsFile);
        return feeds.Where(f => f.UserId == userId).ToList();
    }

    /// Validates the given URL as an RSS/Atom feed, and if valid, saves it
    /// under the given user's subscriptions.
    /// Returns null if the URL is invalid, unreachable, or already
    /// subscribed to by this user.
    public async Task<Feed?> AddFeedAsync(Guid userId, string url)
    {
        var parsedFeed = await _rssService.TryFetchFeedAsync(url);
        if (parsedFeed == null)
        {
            _logger.LogWarning("Failed to fetch feed at {Url}", url);
            return null;
        }

        var feeds = await _storage.ReadAllAsync<Feed>(StorageConstants.FeedsFile);

        // Duplicate check is scoped per user — two different users may
        // both subscribe to the same public feed URL.
        if (feeds.Any(f => f.UserId == userId && f.Url.Equals(url, StringComparison.OrdinalIgnoreCase)))
        {
            _logger.LogInformation("Duplicate feed URL rejected for user {UserId}: {Url}", userId, url);
            return null;
        }

        var newFeed = new Feed
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Title = string.IsNullOrWhiteSpace(parsedFeed.Title) ? url : parsedFeed.Title,
            Url = url,
            CreatedAt = DateTime.UtcNow,
            LastFetchedAt = DateTime.UtcNow
        };

        feeds.Add(newFeed);
        await _storage.WriteAllAsync(StorageConstants.FeedsFile, feeds);

        var articles = _rssService.MapToArticles(parsedFeed, newFeed.Id);
        var allArticles = await _storage.ReadAllAsync<Article>(StorageConstants.ArticlesFile);
        allArticles.AddRange(articles);
        await _storage.WriteAllAsync(StorageConstants.ArticlesFile, allArticles);

        _logger.LogInformation("User {UserId} added feed '{Title}' with {ArticleCount} initial articles",
            userId, newFeed.Title, articles.Count);
        return newFeed;
    }

    /// Removes a feed by its ID, only if it belongs to the given user.
    /// Returns true if a matching feed was found and removed.
    public async Task<bool> RemoveFeedAsync(Guid userId, Guid feedId)
    {
        var feeds = await _storage.ReadAllAsync<Feed>(StorageConstants.FeedsFile);
        var feedToRemove = feeds.FirstOrDefault(f => f.Id == feedId && f.UserId == userId);
        if (feedToRemove == null)
        {
            _logger.LogWarning("User {UserId} attempted to remove non-existent or unowned feed {FeedId}", userId, feedId);
            return false;
        }

        feeds.Remove(feedToRemove);
        await _storage.WriteAllAsync(StorageConstants.FeedsFile, feeds);

        var articles = await _storage.ReadAllAsync<Article>(StorageConstants.ArticlesFile);
        var remainingArticles = articles.Where(a => a.FeedId != feedId).ToList();
        await _storage.WriteAllAsync(StorageConstants.ArticlesFile, remainingArticles);

        var removedCount = articles.Count - remainingArticles.Count;
        _logger.LogInformation("User {UserId} removed feed '{Title}' and {ArticleCount} associated articles",
            userId, feedToRemove.Title, removedCount);
        return true;
    }

    /// Re-fetches a specific feed's articles, only if it belongs to the
    /// given user. Returns null if the feed doesn't exist, isn't owned
    /// by this user, or can no longer be fetched.
    public async Task<List<Article>?> RefreshFeedAsync(Guid userId, Guid feedId)
    {
        var feeds = await _storage.ReadAllAsync<Feed>(StorageConstants.FeedsFile);
        var feed = feeds.FirstOrDefault(f => f.Id == feedId && f.UserId == userId);
        if (feed == null)
        {
            _logger.LogWarning("User {UserId} requested refresh for non-existent or unowned feed {FeedId}", userId, feedId);
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

        var newArticles = fetchedArticles
            .Where(a => !existingLinks.Contains(a.Link))
            .ToList();

        allArticles.AddRange(newArticles);
        await _storage.WriteAllAsync(StorageConstants.ArticlesFile, allArticles);

        feed.LastFetchedAt = DateTime.UtcNow;
        await _storage.WriteAllAsync(StorageConstants.FeedsFile, feeds);

        _logger.LogInformation("User {UserId} refreshed feed '{Title}': {NewCount} new articles",
            userId, feed.Title, newArticles.Count);
        return newArticles;
    }

    /// Refreshes only the given user's feeds. Reads and writes the FULL
    /// feeds/articles files (all users), but only operates on this user's
    /// subset — Feed/Article are reference types, so mutating the filtered
    /// subset mutates the same objects present in the full list, which is
    /// what gets persisted. Filtering before writing back would silently
    /// delete every other user's data.
    public async Task<RefreshAllFeedsResult> RefreshAllFeedsAsync(Guid userId)
    {
        var allFeeds = await _storage.ReadAllAsync<Feed>(StorageConstants.FeedsFile);
        var userFeeds = allFeeds.Where(f => f.UserId == userId).ToList();

        var allArticles = await _storage.ReadAllAsync<Article>(StorageConstants.ArticlesFile);

        var existingLinksByFeedId = allArticles
            .GroupBy(a => a.FeedId)
            .ToDictionary(
                group => group.Key,
                group => group.Select(a => a.Link).ToHashSet());

        var refreshTasks = userFeeds.Select(async feed =>
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
            result.Feed.LastFetchedAt = now; // mutates the shared object also present in allFeeds
        }

        if (allNewArticles.Count > 0)
        {
            await _storage.WriteAllAsync(StorageConstants.ArticlesFile, allArticles);
        }

        if (userFeeds.Count > failedFeedsCount)
        {
            // Write the FULL list — see method summary above.
            await _storage.WriteAllAsync(StorageConstants.FeedsFile, allFeeds);
        }

        _logger.LogInformation(
            "User {UserId} RefreshAllFeeds completed: {NewCount} new articles, {FailedCount} failed feeds out of {TotalCount}",
            userId, allNewArticles.Count, failedFeedsCount, userFeeds.Count);

        return new RefreshAllFeedsResult
        {
            NewArticlesCount = allNewArticles.Count,
            Articles = allNewArticles,
            FailedFeedsCount = failedFeedsCount
        };
    }

    private record FeedRefreshResult(Feed Feed, List<Article>? NewArticles);
}