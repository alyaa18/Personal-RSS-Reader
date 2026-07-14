using Microsoft.EntityFrameworkCore;
using PersonalRSSReader.Api.Models;

namespace PersonalRSSReader.Api.Data;

/// <summary>
/// EF Core context for SQLite-backed, user-owned relational data.
/// Feeds and articles intentionally remain in JSON files via
/// JsonStorageService; this context is scoped to data that genuinely
/// needs relational integrity, starting with accounts.
/// </summary>
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Email)
            .IsUnique();
    }
}