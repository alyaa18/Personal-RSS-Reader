using Microsoft.EntityFrameworkCore;
using PersonalRSSReader.Api.Data;
using PersonalRSSReader.Api.Models;
using PersonalRSSReader.Api.Models.DTOs;

namespace PersonalRSSReader.Api.Services;

/// <summary>
/// Provides demo data for unauthenticated ("guest") users. Fetches the
/// three predefined demo feeds, caches them in-memory for a short period,
/// and returns feeds + articles without requiring any auth.
/// </summary>
public class DemoService
{
    private static readonly string[] DemoFeedUrls =
    [
        "https://github.blog/feed/",
        "https://feeds.bbci.co.uk/news/rss.xml",
        "https://news.mit.edu/rss/feed"
    ];

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<DemoService> _logger;

    private static List<Feed>? _cachedFeeds = null;
    private static List<ArticleWithFeedInfo>? _cachedArticles = null;
    private static DateTime _cacheTime = DateTime.MinValue;
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(15);
    private static readonly SemaphoreSlim _cacheLock = new(1, 1);

    public DemoService(IServiceScopeFactory scopeFactory, ILogger<DemoService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async Task<(List<Feed> Feeds, List<ArticleWithFeedInfo> Articles)> GetDemoDataAsync()
    {
        // Return cached data if still fresh
        if (_cachedFeeds != null && _cachedArticles != null && DateTime.UtcNow - _cacheTime < CacheDuration)
        {
            return (_cachedFeeds, _cachedArticles);
        }

        await _cacheLock.WaitAsync();
        try
        {
            // Double-check after acquiring lock
            if (_cachedFeeds != null && _cachedArticles != null && DateTime.UtcNow - _cacheTime < CacheDuration)
            {
                return (_cachedFeeds, _cachedArticles);
            }

            // Check if demo feeds already exist in the database (from previous real subscriptions)
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var rssService = scope.ServiceProvider.GetRequiredService<RssService>();

            var feeds = new List<Feed>();
            var allArticles = new List<Article>();

            foreach (var url in DemoFeedUrls)
            {
                var existingFeed = await db.Feeds.FirstOrDefaultAsync(f => f.Url!.ToLower() == url.ToLower());
                if (existingFeed != null)
                {
                    // Feed exists in DB — load its articles
                    feeds.Add(existingFeed);
                    var existingArticles = await db.Articles
                        .Where(a => a.FeedId == existingFeed.Id)
                        .OrderByDescending(a => a.PublishedAt)
                        .Take(50)
                        .ToListAsync();
                    allArticles.AddRange(existingArticles);
                    continue;
                }

                // Fetch fresh
                var parsed = await rssService.TryFetchFeedAsync(url);
                if (parsed == null)
                {
                    _logger.LogWarning("Demo feed unavailable: {Url}", url);
                    continue;
                }

                var feed = new Feed
                {
                    Id = Guid.NewGuid(),
                    Title = string.IsNullOrWhiteSpace(parsed.Title) ? url : parsed.Title,
                    Url = url,
                    CreatedAt = DateTime.UtcNow,
                    LastFetchedAt = DateTime.UtcNow
                };

                var articles = rssService.MapToArticles(parsed, feed.Id);

                feeds.Add(feed);
                allArticles.AddRange(articles);
            }

            _cachedFeeds = feeds;
            _cachedArticles = allArticles
                .OrderByDescending(a => a.PublishedAt)
                .Select(a => new ArticleWithFeedInfo
                {
                    Id = a.Id,
                    FeedId = a.FeedId,
                    FeedTitle = feeds.FirstOrDefault(f => f.Id == a.FeedId)?.Title ?? "",
                    FeedUrl = feeds.FirstOrDefault(f => f.Id == a.FeedId)?.Url ?? "",
                    Title = a.Title,
                    Link = a.Link,
                    Summary = a.Summary,
                    PublishedAt = a.PublishedAt,
                    FetchedAt = a.FetchedAt,
                    Author = a.Author
                })
                .ToList();
            _cacheTime = DateTime.UtcNow;

            return (_cachedFeeds, _cachedArticles);
        }
        finally
        {
            _cacheLock.Release();
        }
    }
}
