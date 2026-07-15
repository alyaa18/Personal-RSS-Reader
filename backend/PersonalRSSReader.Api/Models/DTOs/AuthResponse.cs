namespace PersonalRSSReader.Api.Models.DTOs;

public record AuthResponse(
    string Token,
    Guid UserId,
    string Email,
    string DisplayName,
    string? PreferredLanguage,
    bool EmailVerified = false,
    bool EmailVerificationRequired = false
);