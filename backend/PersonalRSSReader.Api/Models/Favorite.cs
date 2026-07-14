namespace PersonalRSSReader.Api.Models;

public class Favorite
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid ArticleId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}