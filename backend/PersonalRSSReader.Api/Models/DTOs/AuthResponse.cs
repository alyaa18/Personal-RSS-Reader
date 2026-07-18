namespace PersonalRSSReader.Api.Models.DTOs;

public record AuthResponse(
    string Token,
    Guid UserId,
    string Email,
    string DisplayName,
    bool EmailVerified
);