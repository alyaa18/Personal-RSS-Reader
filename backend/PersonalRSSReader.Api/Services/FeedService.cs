using PersonalRSSReader.Api.Models;

namespace PersonalRSSReader.Api.Services;

public class FeedService
{
    private const string FeedsFile = "feeds.json";
    private const string ArticlesFile = "articles.json";

    private readonly JsonStorageService _storage;
    private readonly RssService _rssService;

    public FeedService(JsonStorageService storage, RssService rssService)
    {
        _storage = storage;
        _rssService = rssService;
    }

    public async Task<List<Feed>> GetAllFeedsAsync()
    {
        return await _storage.ReadAllAsync<Feed>(FeedsFile);
    }

    /// Validates the given URL as an RSS/Atom feed, and if valid, saves it.
    /// Returns null if the URL is not a valid feed.
    public async Task<Feed?> AddFeedAsync(string url)
    {
        var parsedFeed = await _rssService.TryFetchFeedAsync(url);
        if (parsedFeed == null)
        {
            return null;
        }

        var feeds = await _storage.ReadAllAsync<Feed>(FeedsFile);

        // Avoid adding a duplicate subscription to the same URL.
        if (feeds.Any(f => f.Url.Equals(url, StringComparison.OrdinalIgnoreCase)))
        {
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
        await _storage.WriteAllAsync(FeedsFile, feeds);

        // Fetch initial articles right away so the feed isn't empty until first manual refresh.
        var articles = _rssService.MapToArticles(parsedFeed, newFeed.Id);
        var allArticles = await _storage.ReadAllAsync<Article>(ArticlesFile);
        allArticles.AddRange(articles);
        await _storage.WriteAllAsync(ArticlesFile, allArticles);

        return newFeed;
    }

    /// Removes a feed by its ID. Returns true if a feed was found and removed,
    /// false if no feed with that ID existed.
    public async Task<bool> RemoveFeedAsync(Guid feedId)
    {
        var feeds = await _storage.ReadAllAsync<Feed>(FeedsFile);
        var feedToRemove = feeds.FirstOrDefault(f => f.Id == feedId);
        if (feedToRemove == null)
        {
            return false;
        }

        feeds.Remove(feedToRemove);
        await _storage.WriteAllAsync(FeedsFile, feeds);

        // Also clean up articles belonging to the removed feed,
        // otherwise orphaned articles would linger forever.
        var articles = await _storage.ReadAllAsync<Article>(ArticlesFile);
        var remainingArticles = articles.Where(a => a.FeedId != feedId).ToList();
        await _storage.WriteAllAsync(ArticlesFile, remainingArticles);

        return true;
    }

    /// Re-fetches a specific feed's articles, adding any new ones and
    /// updating the feed's LastFetchedAt timestamp.
    /// Returns null if the feed doesn't exist or can no longer be fetched.
    public async Task<List<Article>?> RefreshFeedAsync(Guid feedId)
    {
        var feeds = await _storage.ReadAllAsync<Feed>(FeedsFile);
        var feed = feeds.FirstOrDefault(f => f.Id == feedId);
        if (feed == null)
        {
            return null;
        }

        var parsedFeed = await _rssService.TryFetchFeedAsync(feed.Url);
        if (parsedFeed == null)
        {
            return null;
        }

        var fetchedArticles = _rssService.MapToArticles(parsedFeed, feedId);

        var allArticles = await _storage.ReadAllAsync<Article>(ArticlesFile);
        var existingLinks = allArticles
            .Where(a => a.FeedId == feedId)
            .Select(a => a.Link)
            .ToHashSet();

        // Only keep articles we haven't already stored, identified by their link.
        var newArticles = fetchedArticles
            .Where(a => !existingLinks.Contains(a.Link))
            .ToList();

        allArticles.AddRange(newArticles);
        await _storage.WriteAllAsync(ArticlesFile, allArticles);

        feed.LastFetchedAt = DateTime.UtcNow;
        await _storage.WriteAllAsync(FeedsFile, feeds);

        return newArticles;
    }

    /// Refreshes all feeds server-side and returns aggregate totals,
    /// so the frontend can issue a single request.
    public async Task<RefreshAllFeedsResult> RefreshAllFeedsAsync()
    {
        var feeds = await _storage.ReadAllAsync<Feed>(FeedsFile);

        var allNewArticles = new List<Article>();
        var failedFeedsCount = 0;

        // Sequential refresh avoids concurrent writes to JSON files.
        foreach (var feed in feeds)
        {
            var newArticles = await RefreshFeedAsync(feed.Id);
            if (newArticles == null)
            {
                failedFeedsCount++;
                continue;
            }

            allNewArticles.AddRange(newArticles);
        }

        return new RefreshAllFeedsResult
        {
            NewArticlesCount = allNewArticles.Count,
            Articles = allNewArticles,
            FailedFeedsCount = failedFeedsCount
        };
    }
}

public class RefreshAllFeedsResult
{
    public int NewArticlesCount { get; set; }
    public List<Article> Articles { get; set; } = new();
    public int FailedFeedsCount { get; set; }
}