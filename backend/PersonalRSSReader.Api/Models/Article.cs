namespace PersonalRSSReader.Api.Models;

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
}