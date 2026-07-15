namespace PersonalRSSReader.Api.Models;

/// <summary>
/// A cached article from an RSS feed. Each article belongs to exactly one
/// Feed and exists only once globally regardless of how many users subscribe
/// to that feed.
/// </summary>
public class Article
{
    public Guid Id { get; set; }
    public Guid FeedId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Link { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public DateTime PublishedAt { get; set; }
    public DateTime FetchedAt { get; set; } = DateTime.UtcNow;

    // Optional — not every feed provides these. Frontend must render
    // gracefully when any of these are null.
    public string? ImageUrl { get; set; }
    public string? EnclosureUrl { get; set; }
    public string? EnclosureType { get; set; }
    public string? Language { get; set; }
    public string? Author { get; set; }

    // Navigation
    [System.Text.Json.Serialization.JsonIgnore]
    public Feed Feed { get; set; } = null!;
    [System.Text.Json.Serialization.JsonIgnore]
    public AiSummary? AiSummary { get; set; }
}