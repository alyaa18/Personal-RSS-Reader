namespace PersonalRSSReader.Api.Models;

/// <summary>
/// Cached AI-generated summary for an article. Each article can have at most
/// one summary. Created for future AI summarization features.
/// </summary>
public class AiSummary
{
    public Guid Id { get; set; }
    public Guid ArticleId { get; set; }
    public string Summary { get; set; } = string.Empty;
    public string? Model { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Article Article { get; set; } = null!;
}
