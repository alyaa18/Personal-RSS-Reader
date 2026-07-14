namespace PersonalRSSReader.Api.Models.DTOs;

public record RegisterRequest(string Email, string Password, string DisplayName);