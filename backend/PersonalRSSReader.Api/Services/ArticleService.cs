using PersonalRSSReader.Api.Models;

namespace PersonalRSSReader.Api.Services;

public class ArticleService
{
    private const string FeedsFile = "feeds.json";
    private const string ArticlesFile = "articles.json";

    private readonly JsonStorageService _storage;

    public ArticleService(JsonStorageService storage)
    {
        _storage = storage;
    }

    public async Task<List<ArticleWithFeedInfo>> GetAllArticlesAsync()
    {
        var articles = await _storage.ReadAllAsync<Article>(ArticlesFile);
        var feeds = await _storage.ReadAllAsync<Feed>(FeedsFile);

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

        return result;
    }
}

public class ArticleWithFeedInfo
{
    public Guid Id { get; set; }
    public Guid FeedId { get; set; }
    public string FeedTitle { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Link { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public DateTime PublishedAt { get; set; }
    public DateTime FetchedAt { get; set; } = DateTime.UtcNow;
}