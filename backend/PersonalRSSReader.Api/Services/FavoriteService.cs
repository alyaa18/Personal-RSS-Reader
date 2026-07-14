using Microsoft.EntityFrameworkCore;
using PersonalRSSReader.Api.Data;
using PersonalRSSReader.Api.Models;

namespace PersonalRSSReader.Api.Services;

public class FavoriteService
{
    private readonly AppDbContext _db;
    private readonly ILogger<FavoriteService> _logger;

    public FavoriteService(AppDbContext db, ILogger<FavoriteService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<List<Guid>> GetFavoriteArticleIdsAsync(Guid userId)
        => await _db.Favorites.Where(f => f.UserId == userId).Select(f => f.ArticleId).ToListAsync();

    public async Task<bool> AddFavoriteAsync(Guid userId, Guid articleId)
    {
        var exists = await _db.Favorites.AnyAsync(f => f.UserId == userId && f.ArticleId == articleId);
        if (exists) return false;

        _db.Favorites.Add(new Favorite { Id = Guid.NewGuid(), UserId = userId, ArticleId = articleId, CreatedAt = DateTime.UtcNow });
        await _db.SaveChangesAsync();
        _logger.LogInformation("User {UserId} favorited article {ArticleId}", userId, articleId);
        return true;
    }

    public async Task<bool> RemoveFavoriteAsync(Guid userId, Guid articleId)
    {
        var favorite = await _db.Favorites.FirstOrDefaultAsync(f => f.UserId == userId && f.ArticleId == articleId);
        if (favorite == null) return false;

        _db.Favorites.Remove(favorite);
        await _db.SaveChangesAsync();
        _logger.LogInformation("User {UserId} unfavorited article {ArticleId}", userId, articleId);
        return true;
    }
}