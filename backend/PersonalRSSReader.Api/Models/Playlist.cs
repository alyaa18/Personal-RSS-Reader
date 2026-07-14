namespace PersonalRSSReader.Api.Models;

public class Playlist
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;

    // Random, URL-safe, unguessable — never a sequential ID. This is what
    // the public RSS endpoint (Milestone 8) uses in its URL, so it must
    // not be enumerable.
    public string Slug { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<PlaylistArticle> Articles { get; set; } = new();
}