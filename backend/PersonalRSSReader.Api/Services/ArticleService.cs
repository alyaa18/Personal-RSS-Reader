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

    public async Task<List<ArticleWithFeedInfo>> GetAllArticlesAsync()
    {
        var articles = await _storage.ReadAllAsync<Article>(StorageConstants.ArticlesFile);
        var feeds = await _storage.ReadAllAsync<Feed>(StorageConstants.FeedsFile);

        var feedTitleById = feeds.ToDictionary(f => f.Id, f => f.Title);

        var result = articles
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

        _logger.LogDebug("Retrieved {Count} articles across {FeedCount} feeds", result.Count, feeds.Count);
        return result;
    }
}