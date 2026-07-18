namespace PersonalRSSReader.Api.Models.DTOs;

public class LoginResult
{
    public AuthResponse? AuthResponse { get; set; }
    public bool EmailNotVerified { get; set; }
    public string? Email { get; set; }
}
