using PersonalRSSReader.Api.Models;

namespace PersonalRSSReader.Api.Services;

public class FeedService
{
    private readonly JsonStorageService _storage;
    private readonly RssService _rssService;

    public FeedService(JsonStorageService storage, RssService rssService)
    {
        _storage = storage;
        _rssService = rssService;
    }

    public async Task<List<Feed>> GetAllFeedsAsync()
    {
        return await _storage.ReadAllAsync<Feed>();
    }

    /// <summary>
    /// Validates the given URL as an RSS/Atom feed, and if valid, saves it.
    /// Returns null if the URL is not a valid feed.
    /// </summary>
    public async Task<Feed?> AddFeedAsync(string url)
    {
        var parsedFeed = await _rssService.TryFetchFeedAsync(url);
        if (parsedFeed == null)
        {
            return null;
        }

        var feeds = await _storage.ReadAllAsync<Feed>();

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
        await _storage.WriteAllAsync(feeds);

        return newFeed;
    }
}