namespace PersonalRSSReader.Api.Models.DTOs;

/// <summary>
/// Request body for adding a new feed subscription.
/// </summary>
public record AddFeedRequest(string Url);
