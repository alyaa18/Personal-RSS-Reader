using PersonalRSSReader.Api.Models;
using PersonalRSSReader.Api.Models.DTOs;

namespace PersonalRSSReader.Api.Services;

public class ArticleService
{
    private readonly JsonStorageService _storage;
    private readonly ILogger<ArticleService> _logger;

    public ArticleService(JsonStorageService storage, ILogger<ArticleService> logger)
    {
        _storage = storage;
        _logger = logger;
    }

    /// Returns all articles belonging to the given user's feeds, newest
    /// first. Filtering happens via feed ownership, since Article has no
    /// UserId of its own — a feed's owner implicitly owns its articles.
    public async Task<List<ArticleWithFeedInfo>> GetAllArticlesAsync(Guid userId)
    {
        var articles = await _storage.ReadAllAsync<Article>(StorageConstants.ArticlesFile);
        var feeds = await _storage.ReadAllAsync<Feed>(StorageConstants.FeedsFile);

        var userFeeds = feeds.Where(f => f.UserId == userId).ToList();
        var userFeedIds = userFeeds.Select(f => f.Id).ToHashSet();
        var feedTitleById = userFeeds.ToDictionary(f => f.Id, f => f.Title);

        _logger.LogDebug("Retrieved {ArticleCount} candidate articles across {FeedCount} feeds for user {UserId}",
            articles.Count, userFeeds.Count, userId);

        var result = articles
            .Where(a => userFeedIds.Contains(a.FeedId))
            .Select(a => new ArticleWithFeedInfo
            {
                Id = a.Id,
                FeedId = a.FeedId,
                FeedTitle = feedTitleById.GetValueOrDefault(a.FeedId, "(unknown feed)"),
                Title = a.Title,
                Link = a.Link,
                Summary = a.Summary,
                PublishedAt = a.PublishedAt,
                FetchedAt = a.FetchedAt
            })
            .OrderByDescending(a => a.PublishedAt)
            .ToList();

        return result;
    }

    /// Resolves full article details for a specific set of IDs, joined with
    /// feed titles. Used by Favorites, Playlists, and the public RSS feed —
    /// anywhere a caller has ArticleIds from SQLite and needs the actual
    /// content, which still lives only in the JSON cache.
    public async Task<List<ArticleWithFeedInfo>> GetArticlesByIdsAsync(IEnumerable<Guid> articleIds)
    {
        var idSet = articleIds.ToHashSet();
        var articles = await _storage.ReadAllAsync<Article>(StorageConstants.ArticlesFile);
        var feeds = await _storage.ReadAllAsync<Feed>(StorageConstants.FeedsFile);
        var feedTitleById = feeds.ToDictionary(f => f.Id, f => f.Title);

        return articles
            .Where(a => idSet.Contains(a.Id))
            .Select(a => new ArticleWithFeedInfo
            {
                Id = a.Id,
                FeedId = a.FeedId,
                FeedTitle = feedTitleById.GetValueOrDefault(a.FeedId, "(unknown feed)"),
                Title = a.Title,
                Link = a.Link,
                Summary = a.Summary,
                PublishedAt = a.PublishedAt,
                FetchedAt = a.FetchedAt
            })
            .OrderByDescending(a => a.PublishedAt)
            .ToList();
    }
}