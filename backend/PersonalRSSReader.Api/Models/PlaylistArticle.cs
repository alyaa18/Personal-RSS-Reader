namespace PersonalRSSReader.Api.Models;

public class PlaylistArticle
{
    public Guid Id { get; set; }
    public Guid PlaylistId { get; set; }
    public Guid ArticleId { get; set; }
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;
}