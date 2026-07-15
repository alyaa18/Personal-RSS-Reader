namespace PersonalRSSReader.Api.Models;

/// <summary>
/// Per-user application settings. Kept in a separate table from User to keep
/// the identity model lean and to allow settings to evolve independently.
/// </summary>
public class UserSettings
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }

    // Future preference fields go here
    public string? Theme { get; set; }
    public int? RetentionDaysOverride { get; set; }

    // Navigation
    public User User { get; set; } = null!;
}
