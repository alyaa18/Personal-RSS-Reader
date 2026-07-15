using Microsoft.EntityFrameworkCore;
using PersonalRSSReader.Api.Models;

namespace PersonalRSSReader.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<UserSettings> UserSettings => Set<UserSettings>();
    public DbSet<Feed> Feeds => Set<Feed>();
    public DbSet<UserFeedSubscription> UserFeedSubscriptions => Set<UserFeedSubscription>();
    public DbSet<Article> Articles => Set<Article>();
    public DbSet<Favorite> Favorites => Set<Favorite>();
    public DbSet<Playlist> Playlists => Set<Playlist>();
    public DbSet<PlaylistArticle> PlaylistArticles => Set<PlaylistArticle>();
    public DbSet<AiSummary> AiSummaries => Set<AiSummary>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // ── User ────────────────────────────────────────────────
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();

        // ── UserSettings (1:1 with User) ────────────────────────
        modelBuilder.Entity<UserSettings>()
            .HasIndex(us => us.UserId)
            .IsUnique();

        modelBuilder.Entity<UserSettings>()
            .HasOne(us => us.User)
            .WithOne(u => u.Settings)
            .HasForeignKey<UserSettings>(us => us.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // ── Feed ────────────────────────────────────────────────
        modelBuilder.Entity<Feed>()
            .HasIndex(f => f.Url)
            .IsUnique();

        // ── UserFeedSubscription (User N:N Feed) ────────────────
        modelBuilder.Entity<UserFeedSubscription>()
            .HasIndex(ufs => new { ufs.UserId, ufs.FeedId })
            .IsUnique();

        modelBuilder.Entity<UserFeedSubscription>()
            .HasOne(ufs => ufs.User)
            .WithMany(u => u.Subscriptions)
            .HasForeignKey(ufs => ufs.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<UserFeedSubscription>()
            .HasOne(ufs => ufs.Feed)
            .WithMany(f => f.Subscriptions)
            .HasForeignKey(ufs => ufs.FeedId)
            .OnDelete(DeleteBehavior.Cascade);

        // ── Article ─────────────────────────────────────────────
        modelBuilder.Entity<Article>()
            .HasIndex(a => new { a.FeedId, a.Link })
            .IsUnique();

        modelBuilder.Entity<Article>()
            .HasIndex(a => a.FetchedAt);

        modelBuilder.Entity<Article>()
            .HasOne(a => a.Feed)
            .WithMany(f => f.Articles)
            .HasForeignKey(a => a.FeedId)
            .OnDelete(DeleteBehavior.Cascade);

        // ── Favorite (User M:N Article) ─────────────────────────
        modelBuilder.Entity<Favorite>()
            .HasIndex(f => new { f.UserId, f.ArticleId })
            .IsUnique();

        modelBuilder.Entity<Favorite>()
            .HasOne(f => f.User)
            .WithMany(u => u.Favorites)
            .HasForeignKey(f => f.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Favorite>()
            .HasOne(f => f.Article)
            .WithMany()
            .HasForeignKey(f => f.ArticleId)
            .OnDelete(DeleteBehavior.Cascade);

        // ── Playlist ────────────────────────────────────────────
        modelBuilder.Entity<Playlist>()
            .HasIndex(p => p.Slug)
            .IsUnique();

        modelBuilder.Entity<Playlist>()
            .HasOne(p => p.User)
            .WithMany(u => u.Playlists)
            .HasForeignKey(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        // ── PlaylistArticle (Playlist N:N Article) ──────────────
        modelBuilder.Entity<PlaylistArticle>()
            .HasIndex(pa => new { pa.PlaylistId, pa.ArticleId })
            .IsUnique();

        modelBuilder.Entity<PlaylistArticle>()
            .HasOne(pa => pa.Playlist)
            .WithMany(p => p.Articles)
            .HasForeignKey(pa => pa.PlaylistId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PlaylistArticle>()
            .HasOne(pa => pa.Article)
            .WithMany()
            .HasForeignKey(pa => pa.ArticleId)
            .OnDelete(DeleteBehavior.Cascade);

        // ── AiSummary (1:1 with Article) ────────────────────────
        modelBuilder.Entity<AiSummary>()
            .HasIndex(ais => ais.ArticleId)
            .IsUnique();

        modelBuilder.Entity<AiSummary>()
            .HasOne(ais => ais.Article)
            .WithOne(a => a.AiSummary)
            .HasForeignKey<AiSummary>(ais => ais.ArticleId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}