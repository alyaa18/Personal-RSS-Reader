using LibFeed = CodeHollow.FeedReader.Feed;
using CodeHollow.FeedReader;
using CodeHollow.FeedReader.Feeds;
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

    public async Task<LibFeed?> TryFetchFeedAsync(string url)
    {
        try
        {
            var response = await _httpClient.GetStringAsync(url);
            var feed = FeedReader.ReadFromString(response);
            _logger.LogDebug("Fetched feed {Url} with {ItemCount} items", url, feed.Items.Count);
            return feed;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to fetch or parse feed {Url}", url);
            return null;
        }
    }

    public List<Article> MapToArticles(LibFeed parsedFeed, Guid feedId)
    {
        var seenLinks = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var articles = new List<Article>(parsedFeed.Items.Count);

        foreach (var item in parsedFeed.Items)
        {
            // Use the feed's own ID if available; otherwise fall back to link.
            // If both are missing, generate a stable key from title + date so
            // the same article is never duplicated on repeated refreshes.
            var link = !string.IsNullOrWhiteSpace(item.Link)
                ? item.Link
                : !string.IsNullOrWhiteSpace(item.Id)
                    ? item.Id
                    : $"{item.Title}|{item.PublishingDate?.Ticks ?? 0}";

            // Skip duplicate links within the same batch
            if (!seenLinks.Add(link)) continue;

            var (imageUrl, enclosureUrl, enclosureType) = ExtractMedia(item);

            articles.Add(new Article
            {
                Id = Guid.NewGuid(),
                FeedId = feedId,
                Title = string.IsNullOrWhiteSpace(item.Title) ? "(untitled)" : item.Title,
                Link = link,
                Summary = item.Description ?? string.Empty,
                PublishedAt = item.PublishingDate ?? DateTime.UtcNow,
                FetchedAt = DateTime.UtcNow,
                ImageUrl = imageUrl,
                EnclosureUrl = enclosureUrl,
                EnclosureType = enclosureType,
                Language = parsedFeed.Language
            });
        }

        return articles;
    }

    /// Best-effort extraction of an image and/or podcast enclosure.
    /// RSS 2.0's <enclosure> is the most common source for both; if
    /// there's no enclosure, falls back to sniffing an <img> tag out of
    /// the item's HTML description. Wrapped defensively — a shape
    /// mismatch here should never break article import.
    private (string? ImageUrl, string? EnclosureUrl, string? EnclosureType) ExtractMedia(FeedItem item)
    {
        string? enclosureUrl = null;
        string? enclosureType = null;

        try
        {
            if (item.SpecificItem is Rss20FeedItem rss20 && rss20.Enclosure != null)
            {
                enclosureUrl = rss20.Enclosure.Url;
                enclosureType = rss20.Enclosure.MediaType;
            }
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Could not read enclosure for item '{Title}'", item.Title);
        }

        string? imageUrl = null;
        if (!string.IsNullOrEmpty(enclosureType) && enclosureType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
        {
            imageUrl = enclosureUrl;
        }
        else if (!string.IsNullOrEmpty(item.Description))
        {
            var match = System.Text.RegularExpressions.Regex.Match(
                item.Description, "<img[^>]+src=[\"']([^\"']+)[\"']",
                System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            if (match.Success) imageUrl = match.Groups[1].Value;
        }

        var isAudioEnclosure = !string.IsNullOrEmpty(enclosureType) && enclosureType.StartsWith("audio/", StringComparison.OrdinalIgnoreCase);

        return (
            imageUrl,
            isAudioEnclosure ? enclosureUrl : null,
            isAudioEnclosure ? enclosureType : null
        );
    }
}