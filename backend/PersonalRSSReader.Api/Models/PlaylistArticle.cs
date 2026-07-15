namespace PersonalRSSReader.Api.Models;

/// <summary>
/// Join table linking a Playlist to an Article. A unique constraint on
/// (PlaylistId, ArticleId) prevents adding the same article twice.
/// </summary>
public class PlaylistArticle
{
    public Guid Id { get; set; }
    public Guid PlaylistId { get; set; }
    public Guid ArticleId { get; set; }
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Playlist Playlist { get; set; } = null!;
    public Article Article { get; set; } = null!;
}