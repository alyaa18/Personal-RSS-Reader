namespace PersonalRSSReader.Api.Models;

public class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Nullable: unset means "use app default." Modeled now so a future
    // preferences UI doesn't require another migration to add columns.
    public string? PreferredLanguage { get; set; }
    public string? Theme { get; set; }
    public int? RetentionDaysOverride { get; set; }
}