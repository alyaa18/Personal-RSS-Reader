using LibFeed = CodeHollow.FeedReader.Feed;
using CodeHollow.FeedReader;
using PersonalRSSReader.Api.Models;

namespace PersonalRSSReader.Api.Services;

public class RssService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<RssService> _logger;

    public RssService(HttpClient httpClient, ILogger<RssService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
    }

    /// Attempts to fetch and parse a feed from the given URL.
    /// Returns null if the URL is unreachable or not a valid RSS/Atom feed.
    public async Task<LibFeed?> TryFetchFeedAsync(string url)
    {
        try
        {
            var response = await _httpClient.GetStringAsync(url);
            var feed = FeedReader.ReadFromString(response);
            _logger.LogDebug("Successfully fetched and parsed feed from {Url} ({ItemCount} items)", url, feed.Items.Count);
            return feed;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to fetch or parse feed from {Url}", url);
            return null;
        }
    }

    /// Converts a parsed feed's items into our own Article model,
    /// tagging each with the given feedId.
    public List<Article> MapToArticles(LibFeed parsedFeed, Guid feedId)
    {
        var articles = new List<Article>(parsedFeed.Items.Count);

        foreach (var item in parsedFeed.Items)
        {
            articles.Add(new Article
            {
                Id = Guid.NewGuid(),
                FeedId = feedId,
                Title = string.IsNullOrWhiteSpace(item.Title) ? "(untitled)" : item.Title,
                Link = item.Link ?? string.Empty,
                Summary = item.Description ?? string.Empty,
                PublishedAt = item.PublishingDate ?? DateTime.UtcNow,
                FetchedAt = DateTime.UtcNow
            });
        }

        return articles;
    }
}