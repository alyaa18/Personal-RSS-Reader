using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging.Abstractions;
using PersonalRSSReader.Api.Models;
using Rocket.Syndication.Models;
using Rocket.Syndication.Parsing;

namespace PersonalRSSReader.Api.Services;

/// <summary>
/// Fetches and parses RSS/Atom feeds using Rocket.Syndication.
///
/// This is the sole parsing layer in the application. All feed data flows
/// through here, making it straightforward to swap the underlying parser
/// library in the future — only this file needs to change.
/// </summary>
public partial class RssService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<RssService> _logger;
    private readonly FeedParserPipeline _parserPipeline;

    public RssService(HttpClient httpClient, ILogger<RssService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _parserPipeline = new FeedParserPipeline(
            new IFeedParser[] { new RssFeedParser(), new AtomFeedParser() },
            NullLogger<FeedParserPipeline>.Instance);
    }

    /// <summary>
    /// Downloads and parses a feed URL. Returns null on any failure
    /// (network, invalid XML, unrecognised format, …).
    /// </summary>
    public async Task<Rocket.Syndication.Models.Feed?> TryFetchFeedAsync(string url)
    {
        try
        {
            var response = await _httpClient.GetStringAsync(url);
            var result = _parserPipeline.Parse(response);

            if (!result.IsSuccess || result.Feed == null)
            {
                _logger.LogWarning("Failed to parse feed {Url}: {ErrorType} — {Message}",
                    url, result.Error?.Type, result.Error?.Message);
                return null;
            }

            _logger.LogDebug("Fetched feed {Url} with {ItemCount} items", url, result.Feed.Items.Count);
            return result.Feed;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to fetch or parse feed {Url}", url);
            return null;
        }
    }

    /// <summary>
    /// Converts a parsed Rocket.Syndication feed into the application's
    /// internal Article model, deduplicating by link within a single batch.
    /// </summary>
    public List<Article> MapToArticles(Rocket.Syndication.Models.Feed parsedFeed, Guid feedId)
    {
        var seenLinks = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var articles = new List<Article>(parsedFeed.Items.Count);

        foreach (var item in parsedFeed.Items)
        {
            // Build a stable deduplication key:
            //   1. item.Link (URI → string)
            //   2. item.Id  (GUID / Atom ID)
            //   3. synthetic key from title + date
            var link = item.Link?.ToString() ?? string.Empty;
            if (string.IsNullOrWhiteSpace(link))
                link = item.Id;
            if (string.IsNullOrWhiteSpace(link))
                link = $"{item.Title}|{item.PublishedDate?.Ticks ?? 0}";

            if (!seenLinks.Add(link)) continue;

            var (imageUrl, enclosureUrl, enclosureType) = ExtractMedia(item);

            articles.Add(new Article
            {
                Id = Guid.NewGuid(),
                FeedId = feedId,
                Title = string.IsNullOrWhiteSpace(item.Title) ? "(untitled)" : item.Title,
                Link = link,
                Summary = item.Content?.Html            // prefer HTML (content:encoded / atom:content)
                       ?? item.Content?.PlainText        // fall back to plain text
                       ?? string.Empty,
                PublishedAt = item.PublishedDate?.UtcDateTime ?? DateTime.UtcNow,
                FetchedAt = DateTime.UtcNow,
                ImageUrl = imageUrl,
                EnclosureUrl = enclosureUrl,
                EnclosureType = enclosureType,
                Language = parsedFeed.Language,
                Author = item.Authors.FirstOrDefault()?.Name
            });
        }

        return articles;
    }

    /// <summary>
    /// Best-effort extraction of an image and/or podcast enclosure.
    ///
    /// Priority order for images:
    ///   1. <media:content> where medium="image" (or MIME starts with image/)
    ///   2. <enclosure> where type starts with image/
    ///   3. <media:thumbnail>
    ///   4. First <img> tag sniffed from the item's HTML description
    ///
    /// Priority order for audio enclosures:
    ///   1. <enclosure> where type starts with audio/
    ///   2. <media:content> where medium="audio"
    ///
    /// Wrapped defensively — a shape mismatch here should never break article import.
    /// </summary>
    private static (string? ImageUrl, string? EnclosureUrl, string? EnclosureType) ExtractMedia(FeedItem item)
    {
        string? enclosureUrl = null;
        string? enclosureType = null;
        string? imageUrl = null;

        // ── Try <enclosure> elements ───────────────────────
        foreach (var enc in item.Enclosures)
        {
            var url = enc.Url?.ToString();
            var mime = enc.MimeType ?? string.Empty;

            if (string.IsNullOrWhiteSpace(url)) continue;

            if (mime.StartsWith("audio/", StringComparison.OrdinalIgnoreCase))
            {
                // First audio enclosure wins
                if (enclosureUrl == null)
                {
                    enclosureUrl = url;
                    enclosureType = mime;
                }
            }
            else if (mime.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            {
                imageUrl ??= url;
            }
            else if (enclosureUrl == null)
            {
                // Keep the first non-audio, non-image enclosure as a fallback
                enclosureUrl = url;
                enclosureType = mime;
            }
        }

        // ── Try <media:content> (Media RSS) ────────────────
        if (item.Media != null)
        {
            var mediaUrl = item.Media.Url?.ToString();
            var mediaMime = item.Media.MimeType ?? string.Empty;
            var medium = item.Media.Medium ?? string.Empty;

            if (!string.IsNullOrWhiteSpace(mediaUrl))
            {
                if (medium.Equals("audio", StringComparison.OrdinalIgnoreCase) ||
                    mediaMime.StartsWith("audio/", StringComparison.OrdinalIgnoreCase))
                {
                    enclosureUrl ??= mediaUrl;
                    enclosureType ??= mediaMime;
                }
                else if (medium.Equals("image", StringComparison.OrdinalIgnoreCase) ||
                         mediaMime.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
                {
                    imageUrl ??= mediaUrl;
                }
            }

            // <media:thumbnail> as image fallback
            if (imageUrl == null && item.Media.ThumbnailUrl != null)
                imageUrl = item.Media.ThumbnailUrl.ToString();
        }

        // ── Last-resort: sniff <img> from HTML description ─
        if (imageUrl == null)
        {
            var html = item.Content?.Html ?? item.Content?.PlainText;
            if (!string.IsNullOrEmpty(html))
            {
                var match = ImgSrcPattern().Match(html);
                if (match.Success)
                    imageUrl = match.Groups[1].Value;
            }
        }

        return (imageUrl, enclosureUrl, enclosureType);
    }

    [GeneratedRegex("<img[^>]+src=[\"']([^\"']+)[\"']", RegexOptions.IgnoreCase, "en-US")]
    private static partial Regex ImgSrcPattern();
}