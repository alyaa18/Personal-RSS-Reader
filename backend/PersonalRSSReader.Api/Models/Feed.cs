namespace PersonalRSSReader.Api.Models;

/// <summary>
/// Represents a unique RSS feed globally. A Feed is not owned by any single
/// user — multiple users can subscribe to the same Feed via UserFeedSubscription.
/// </summary>
public class Feed
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastFetchedAt { get; set; }
    public string? Language { get; set; }

    // Navigation (ignored in API responses to avoid circular references)
    [System.Text.Json.Serialization.JsonIgnore]
    public List<UserFeedSubscription> Subscriptions { get; set; } = new();
    [System.Text.Json.Serialization.JsonIgnore]
    public List<Article> Articles { get; set; } = new();
}