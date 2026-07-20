using Microsoft.EntityFrameworkCore;
using PersonalRSSReader.Api.Data;
using PersonalRSSReader.Api.Models;
using PersonalRSSReader.Api.Models.DTOs;

namespace PersonalRSSReader.Api.Services;

/// <summary>
/// Manages feed subscriptions and refresh operations. Feeds are global
/// (shared across users), and each user's subscriptions are tracked via
/// the UserFeedSubscription join table.
/// </summary>
public class FeedService
{
    private readonly AppDbContext _db;
    private readonly RssService _rssService;
    private readonly ILogger<FeedService> _logger;

    public FeedService(AppDbContext db, RssService rssService, ILogger<FeedService> logger)
    {
        _db = db;
        _rssService = rssService;
        _logger = logger;
    }

    /// <summary>
    /// Returns all feeds the given user is subscribed to, ordered by title.
    /// </summary>
    public async Task<List<Feed>> GetAllFeedsAsync(Guid userId)
    {
        var feedIds = await _db.UserFeedSubscriptions
            .Where(ufs => ufs.UserId == userId)
            .Select(ufs => ufs.FeedId)
            .ToListAsync();

        var feeds = await _db.Feeds
            .Where(f => feedIds.Contains(f.Id))
            .OrderBy(f => f.Title)
            .ToListAsync();

        return feeds;
    }

    /// <summary>
    /// Subscribes the user to an RSS feed. If the feed URL is already known
    /// globally, reuses the existing Feed record. Otherwise creates a new one.
    /// Returns null if the URL is invalid or unreachable, or if the user is
    /// already subscribed.
    /// </summary>
    public async Task<Feed?> AddFeedAsync(Guid userId, string url)
    {
        var parsedFeed = await _rssService.TryFetchFeedAsync(url);
        if (parsedFeed == null)
        {
            _logger.LogWarning("Failed to fetch feed at {Url}", url);
            return null;
        }

        // Check if user is already subscribed to this URL
        var normalizedUrl = url.ToLowerInvariant();
        var existingSubscription = await _db.UserFeedSubscriptions
            .Include(ufs => ufs.Feed)
            .FirstOrDefaultAsync(ufs =>
                ufs.UserId == userId &&
                ufs.Feed.Url!.ToLower() == normalizedUrl);

        if (existingSubscription != null)
        {
            _logger.LogInformation("User {UserId} is already subscribed to {Url}", userId, url);
            return null;
        }

        // Find or create the global Feed record
        var feed = await _db.Feeds
            .FirstOrDefaultAsync(f => f.Url!.ToLower() == normalizedUrl);

        if (feed == null)
        {
            feed = new Feed
            {
                Id = Guid.NewGuid(),
                Title = string.IsNullOrWhiteSpace(parsedFeed.Title) ? url : parsedFeed.Title,
                Url = url,
                Language = parsedFeed.Language,
                CreatedAt = DateTime.UtcNow,
                LastFetchedAt = DateTime.UtcNow
            };
            _db.Feeds.Add(feed);
        }
        else
        {
            feed.LastFetchedAt = DateTime.UtcNow;
        }

        // Create subscription
        var subscription = new UserFeedSubscription
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            FeedId = feed.Id,
            SubscribedAt = DateTime.UtcNow
        };
        _db.UserFeedSubscriptions.Add(subscription);

        // Fetch and store articles
        var articles = _rssService.MapToArticles(parsedFeed, feed.Id);
        var existingLinks = await _db.Articles
            .Where(a => a.FeedId == feed.Id)
            .Select(a => a.Link)
            .ToHashSetAsync();

        var newArticles = articles
            .Where(a => !existingLinks.Contains(a.Link))
            .ToList();

        if (newArticles.Count > 0)
        {
            _db.Articles.AddRange(newArticles);
        }

        await _db.SaveChangesAsync();

        _logger.LogInformation(
            "User {UserId} subscribed to feed '{Title}' with {ArticleCount} articles ({NewCount} new)",
            userId, feed.Title, articles.Count, newArticles.Count);

        return feed;
    }

    /// <summary>
    /// Removes the user's subscription to a feed. Does NOT delete the
    /// global Feed record or its articles — other users may still reference them.
    /// </summary>
    public async Task<bool> RemoveFeedAsync(Guid userId, Guid feedId)
    {
        var subscription = await _db.UserFeedSubscriptions
            .FirstOrDefaultAsync(ufs => ufs.UserId == userId && ufs.FeedId == feedId);

        if (subscription == null)
        {
            _logger.LogWarning("User {UserId} attempted to remove non-existent subscription to feed {FeedId}",
                userId, feedId);
            return false;
        }

        _db.UserFeedSubscriptions.Remove(subscription);
        await _db.SaveChangesAsync();

        _logger.LogInformation("User {UserId} unsubscribed from feed {FeedId}", userId, feedId);
        return true;
    }

    /// <summary>
    /// Re-fetches a specific feed's articles. When a userId is provided, only
    /// succeeds if the user is subscribed to the feed. When null (guest),
    /// skips the subscription check and refreshes the feed directly.
    /// Returns null if the feed can no longer be fetched.
    /// </summary>
    public async Task<List<Article>?> RefreshFeedAsync(Guid? userId, Guid feedId)
    {
        if (userId.HasValue)
        {
            var subscribed = await _db.UserFeedSubscriptions
                .AnyAsync(ufs => ufs.UserId == userId.Value && ufs.FeedId == feedId);

            if (!subscribed)
            {
                _logger.LogWarning("User {UserId} requested refresh for unsubscribed feed {FeedId}", userId, feedId);
                return null;
            }
        }

        var feed = await _db.Feeds.FindAsync(feedId);
        if (feed == null) return null;

        var parsedFeed = await _rssService.TryFetchFeedAsync(feed.Url);
        if (parsedFeed == null)
        {
            _logger.LogWarning("Failed to fetch feed '{Title}' for refresh", feed.Title);
            return null;
        }

        var fetchedArticles = _rssService.MapToArticles(parsedFeed, feedId);

        var existingLinks = await _db.Articles
            .Where(a => a.FeedId == feedId)
            .Select(a => a.Link)
            .ToHashSetAsync();

        var newArticles = fetchedArticles
            .Where(a => !existingLinks.Contains(a.Link))
            .ToList();

        if (newArticles.Count > 0)
        {
            _db.Articles.AddRange(newArticles);
        }

        feed.LastFetchedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        _logger.LogInformation(
            "User {UserId} refreshed feed '{Title}': {NewCount} new articles",
            userId, feed.Title, newArticles.Count);

        return newArticles;
    }

    /// <summary>
    /// Refreshes all feeds. When a userId is provided, only refreshes feeds
    /// the user is subscribed to. When null (guest), refreshes all feeds
    /// currently stored in the database.
    /// </summary>
    public async Task<RefreshAllFeedsResult> RefreshAllFeedsAsync(Guid? userId)
    {
        List<Guid> feedIds;
        List<Feed> feeds;

        if (userId.HasValue)
        {
            feedIds = await _db.UserFeedSubscriptions
                .Where(ufs => ufs.UserId == userId.Value)
                .Select(ufs => ufs.FeedId)
                .ToListAsync();

            feeds = await _db.Feeds
                .Where(f => feedIds.Contains(f.Id))
                .ToListAsync();
        }
        else
        {
            feeds = await _db.Feeds.ToListAsync();
            feedIds = feeds.Select(f => f.Id).ToList();
        }

        if (feeds.Count == 0)
        {
            return new RefreshAllFeedsResult();
        }

        var allExistingLinks = await _db.Articles
            .Where(a => feedIds.Contains(a.FeedId))
            .GroupBy(a => a.FeedId)
            .ToDictionaryAsync(g => g.Key, g => g.Select(a => a.Link).ToHashSet());

        var refreshTasks = feeds.Select(async feed =>
        {
            var parsedFeed = await _rssService.TryFetchFeedAsync(feed.Url);
            if (parsedFeed == null)
            {
                _logger.LogWarning("Feed '{Title}' ({Url}) failed to refresh", feed.Title, feed.Url);
                return new FeedRefreshResult(feed, null);
            }

            allExistingLinks.TryGetValue(feed.Id, out var existingLinks);
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
        var failedResults = refreshResults.Where(result => result.NewArticles == null).ToList();
        var failedFeedsCount = failedResults.Count;
        var now = DateTime.UtcNow;

        foreach (var result in successfulResults)
        {
            if (result.NewArticles!.Count > 0)
            {
                _db.Articles.AddRange(result.NewArticles);
            }
            result.Feed.LastFetchedAt = now;
        }

        if (allNewArticles.Count > 0 || successfulResults.Count > 0)
        {
            await _db.SaveChangesAsync();
        }

        _logger.LogInformation(
            "User {UserId} RefreshAllFeeds completed: {NewCount} new articles, {FailedCount} failed feeds out of {TotalCount}",
            userId, allNewArticles.Count, failedFeedsCount, feeds.Count);

        return new RefreshAllFeedsResult
        {
            NewArticlesCount = allNewArticles.Count,
            Articles = allNewArticles,
            FailedFeedsCount = failedFeedsCount,
            FailedFeedNames = failedResults.Select(r => r.Feed.Title).ToList()
        };
    }

    private record FeedRefreshResult(Feed Feed, List<Article>? NewArticles);
}