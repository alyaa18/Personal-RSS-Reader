namespace PersonalRSSReader.Api.Models;

public class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Nullable: unset means "use app default."
    public string? PreferredLanguage { get; set; }

    // Email verification
    public bool EmailVerified { get; set; } = false;
    public string? EmailVerificationToken { get; set; }
    public DateTime? EmailVerificationTokenExpiresAt { get; set; }

    // Navigation
    public List<UserFeedSubscription> Subscriptions { get; set; } = new();
    public List<Favorite> Favorites { get; set; } = new();
    public List<Playlist> Playlists { get; set; } = new();
    public UserSettings? Settings { get; set; }
}