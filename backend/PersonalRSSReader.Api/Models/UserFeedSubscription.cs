namespace PersonalRSSReader.Api.Models;

/// <summary>
/// Join table linking Users to Feeds. Each row records that a specific user
/// has subscribed to a specific feed. A unique constraint on (UserId, FeedId)
/// prevents duplicate subscriptions.
/// </summary>
public class UserFeedSubscription
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public Guid FeedId { get; set; }
    public DateTime SubscribedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    [System.Text.Json.Serialization.JsonIgnore]
    public User User { get; set; } = null!;
    public Feed Feed { get; set; } = null!;
}
