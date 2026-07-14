using Microsoft.EntityFrameworkCore;
using PersonalRSSReader.Api.Models;

namespace PersonalRSSReader.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Favorite> Favorites => Set<Favorite>();
    public DbSet<Playlist> Playlists => Set<Playlist>();
    public DbSet<PlaylistArticle> PlaylistArticles => Set<PlaylistArticle>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        // A user can only favorite a given article once.
        modelBuilder.Entity<Favorite>()
            .HasIndex(f => new { f.UserId, f.ArticleId })
            .IsUnique();

        // Slug must be globally unique — it's the public playlist URL key.
        modelBuilder.Entity<Playlist>()
            .HasIndex(p => p.Slug)
            .IsUnique();

        // Deleting a playlist deletes its article links automatically.
        modelBuilder.Entity<PlaylistArticle>()
            .HasOne<Playlist>()
            .WithMany(p => p.Articles)
            .HasForeignKey(pa => pa.PlaylistId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}