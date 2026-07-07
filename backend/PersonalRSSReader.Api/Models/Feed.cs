namespace PersonalRSSReader.Api.Models;

public class Feed
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastFetchedAt { get; set; }
}
