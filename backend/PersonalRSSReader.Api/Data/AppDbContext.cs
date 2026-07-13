using Microsoft.EntityFrameworkCore;

namespace PersonalRSSReader.Api.Data;

/// <summary>
/// EF Core context for SQLite-backed, user-owned relational data
/// (accounts, favorites, playlists — added in later milestones).
/// Feeds and articles intentionally remain in JSON files via
/// JsonStorageService; this context is scoped only to data that
/// genuinely needs relational integrity.
/// </summary>
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    // DbSets are added incrementally starting in Milestone 2 (Users),
    // then Milestone 3 (Favorites, Playlists). Left empty here so this
    // milestone is a pure infrastructure check, deployable and
    // verifiable in isolation before any real data model depends on it.
}