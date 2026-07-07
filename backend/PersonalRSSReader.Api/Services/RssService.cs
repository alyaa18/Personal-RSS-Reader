using LibFeed = CodeHollow.FeedReader.Feed;
using CodeHollow.FeedReader;

namespace PersonalRSSReader.Api.Services;

public class RssService
{
    private readonly HttpClient _httpClient;

    public RssService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    /// Attempts to fetch and parse a feed from the given URL.
    /// Returns null if the URL is unreachable or not a valid RSS/Atom feed.
    public async Task<LibFeed?> TryFetchFeedAsync(string url)
    {
        try
        {
            var response = await _httpClient.GetStringAsync(url);
            var feed = FeedReader.ReadFromString(response);
            return feed;
        }
        catch
        {
            // Any failure (network error, invalid XML, not a feed, etc.)
            // means this is not a usable feed.
            return null;
        }
    }
}