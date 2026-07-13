namespace PersonalRSSReader.Api.Models.DTOs;

/// <summary>
/// Article response DTO that includes the display-friendly feed title.
/// </summary>
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
