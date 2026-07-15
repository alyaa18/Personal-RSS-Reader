namespace PersonalRSSReader.Api.Models;

/// <summary>
/// A named collection of articles owned by a single user. The Slug is a
/// random, unguessable string used in the public RSS endpoint URL.
/// </summary>
public class Playlist
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;

    // Random, URL-safe, unguessable — never a sequential ID. This is what
    // the public RSS endpoint uses in its URL, so it must not be enumerable.
    public string Slug { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public User User { get; set; } = null!;
    public List<PlaylistArticle> Articles { get; set; } = new();
}