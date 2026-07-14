using Microsoft.EntityFrameworkCore;
using PersonalRSSReader.Api.Data;
using PersonalRSSReader.Api.Models;

namespace PersonalRSSReader.Api.Services;

public class PlaylistService
{
    private readonly AppDbContext _db;
    private readonly ILogger<PlaylistService> _logger;

    public PlaylistService(AppDbContext db, ILogger<PlaylistService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<List<Playlist>> GetPlaylistsAsync(Guid userId)
        => await _db.Playlists.Where(p => p.UserId == userId).ToListAsync();

    public async Task<Playlist> CreatePlaylistAsync(Guid userId, string name)
    {
        var playlist = new Playlist
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = name,
            Slug = Guid.NewGuid().ToString("N"), // 32 random hex chars, unguessable
            CreatedAt = DateTime.UtcNow
        };

        _db.Playlists.Add(playlist);
        await _db.SaveChangesAsync();
        _logger.LogInformation("User {UserId} created playlist '{Name}' ({PlaylistId})", userId, name, playlist.Id);
        return playlist;
    }

    public async Task<bool> DeletePlaylistAsync(Guid userId, Guid playlistId)
    {
        var playlist = await _db.Playlists.FirstOrDefaultAsync(p => p.Id == playlistId && p.UserId == userId);
        if (playlist == null) return false;

        _db.Playlists.Remove(playlist);
        await _db.SaveChangesAsync();
        _logger.LogInformation("User {UserId} deleted playlist {PlaylistId}", userId, playlistId);
        return true;
    }

    public async Task<Playlist?> GetOwnedPlaylistAsync(Guid userId, Guid playlistId)
        => await _db.Playlists.Include(p => p.Articles).FirstOrDefaultAsync(p => p.Id == playlistId && p.UserId == userId);

    /// Public lookup, intentionally NOT scoped by user — this is what the
    /// public RSS endpoint (Milestone 8) uses. Only reachable if the caller
    /// already knows the random slug.
    public async Task<Playlist?> GetBySlugAsync(string slug)
        => await _db.Playlists.Include(p => p.Articles).FirstOrDefaultAsync(p => p.Slug == slug);

    public async Task<bool> AddArticleAsync(Guid userId, Guid playlistId, Guid articleId)
    {
        var playlist = await _db.Playlists.FirstOrDefaultAsync(p => p.Id == playlistId && p.UserId == userId);
        if (playlist == null) return false;

        var exists = await _db.PlaylistArticles.AnyAsync(pa => pa.PlaylistId == playlistId && pa.ArticleId == articleId);
        if (exists) return true; // already present — treat as success, not an error

        _db.PlaylistArticles.Add(new PlaylistArticle { Id = Guid.NewGuid(), PlaylistId = playlistId, ArticleId = articleId, AddedAt = DateTime.UtcNow });
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RemoveArticleAsync(Guid userId, Guid playlistId, Guid articleId)
    {
        var playlist = await _db.Playlists.FirstOrDefaultAsync(p => p.Id == playlistId && p.UserId == userId);
        if (playlist == null) return false;

        var link = await _db.PlaylistArticles.FirstOrDefaultAsync(pa => pa.PlaylistId == playlistId && pa.ArticleId == articleId);
        if (link == null) return false;

        _db.PlaylistArticles.Remove(link);
        await _db.SaveChangesAsync();
        return true;
    }
}