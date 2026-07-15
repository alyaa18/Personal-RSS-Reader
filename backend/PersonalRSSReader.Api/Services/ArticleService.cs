using Microsoft.EntityFrameworkCore;
using PersonalRSSReader.Api.Data;
using PersonalRSSReader.Api.Models;
using PersonalRSSReader.Api.Models.DTOs;

namespace PersonalRSSReader.Api.Services;

/// <summary>
/// Retrieves articles from the database. Articles are cached RSS data that
/// belong to feeds; users see articles from feeds they are subscribed to.
/// </summary>
public class ArticleService
{
    private readonly AppDbContext _db;
    private readonly ILogger<ArticleService> _logger;

    public ArticleService(AppDbContext db, ILogger<ArticleService> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Returns all articles from feeds the given user is subscribed to,
    /// newest first, with the feed title included.
    /// </summary>
    public async Task<List<ArticleWithFeedInfo>> GetAllArticlesAsync(Guid userId)
    {
        var subscribedFeedIds = await _db.UserFeedSubscriptions
            .Where(ufs => ufs.UserId == userId)
            .Select(ufs => ufs.FeedId)
            .ToListAsync();

        var articles = await _db.Articles
            .Where(a => subscribedFeedIds.Contains(a.FeedId))
            .Include(a => a.Feed)
            .OrderByDescending(a => a.PublishedAt)
            .ToListAsync();

        _logger.LogDebug("Retrieved {ArticleCount} articles across {FeedCount} feeds for user {UserId}",
            articles.Count, subscribedFeedIds.Count, userId);

        return articles.Select(a => new ArticleWithFeedInfo
        {
            Id = a.Id,
            FeedId = a.FeedId,
            FeedTitle = a.Feed.Title,
            Title = a.Title,
            Link = a.Link,
            Summary = a.Summary,
            PublishedAt = a.PublishedAt,
            FetchedAt = a.FetchedAt
        }).ToList();
    }

    /// <summary>
    /// Resolves full article details for a specific set of IDs, joined with
    /// feed titles. Used by Favorites, Playlists, and the public RSS feed.
    /// </summary>
    public async Task<List<ArticleWithFeedInfo>> GetArticlesByIdsAsync(IEnumerable<Guid> articleIds)
    {
        var idSet = articleIds.ToHashSet();

        var articles = await _db.Articles
            .Where(a => idSet.Contains(a.Id))
            .Include(a => a.Feed)
            .OrderByDescending(a => a.PublishedAt)
            .ToListAsync();

        return articles.Select(a => new ArticleWithFeedInfo
        {
            Id = a.Id,
            FeedId = a.FeedId,
            FeedTitle = a.Feed.Title,
            Title = a.Title,
            Link = a.Link,
            Summary = a.Summary,
            PublishedAt = a.PublishedAt,
            FetchedAt = a.FetchedAt
        }).ToList();
    }
}