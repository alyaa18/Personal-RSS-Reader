using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Security.Cryptography;
using PersonalRSSReader.Api.Data;
using PersonalRSSReader.Api.Models;
using PersonalRSSReader.Api.Models.DTOs;

namespace PersonalRSSReader.Api.Services;

public class AuthService
{
    private readonly AppDbContext _db;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthService> _logger;
    private readonly EmailService _emailService;

    public AuthService(AppDbContext db, IConfiguration configuration, ILogger<AuthService> logger, EmailService emailService)
    {
        _db = db;
        _configuration = configuration;
        _logger = logger;
        _emailService = emailService;
    }

    public async Task<AuthResponse?> RegisterAsync(RegisterRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();

        // Check for existing account
        var existing = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (existing != null)
        {
            _logger.LogInformation("Registration rejected: email {Email} already in use", email);
            return null;
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            DisplayName = string.IsNullOrWhiteSpace(request.DisplayName) ? email : request.DisplayName.Trim(),
            CreatedAt = DateTime.UtcNow,
            EmailVerified = false,
            EmailVerificationToken = GenerateVerificationToken(),
            EmailVerificationTokenExpiresAt = DateTime.UtcNow.AddHours(24)
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Registered new user {UserId}", user.Id);

        // Send verification email
        var frontendUrl = _configuration["Frontend:BaseUrl"] ?? "http://localhost:5500";
        var verificationLink = $"{frontendUrl}/verify-email.html?token={user.EmailVerificationToken}";
        await _emailService.SendVerificationEmailAsync(user.Email, user.DisplayName, verificationLink);

        return BuildAuthResponse(user);
    }

    public async Task<(AuthResponse? Response, bool EmailNotVerified, string? Email)> LoginAsync(LoginRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            _logger.LogInformation("Login failed for {Email}", email);
            return (null, false, null);
        }

        if (!user.EmailVerified)
        {
            _logger.LogInformation("Login blocked for unverified user {UserId}", user.Id);
            return (null, true, user.Email);
        }

        _logger.LogInformation("User {UserId} logged in", user.Id);
        return (BuildAuthResponse(user), false, null);
    }

    private AuthResponse BuildAuthResponse(User user)
    {
        var token = GenerateJwt(user);
        return new AuthResponse(
            Token: token,
            UserId: user.Id,
            Email: user.Email,
            DisplayName: user.DisplayName,
            EmailVerified: user.EmailVerified
        );
    }

    private static string GenerateVerificationToken()
        => Convert.ToHexString(RandomNumberGenerator.GetBytes(32));

    /// <summary>
    /// Verifies the given token. On success, returns a fully-populated
    /// AuthResponse (same shape as Login/Register) so the frontend can log
    /// the user in immediately instead of leaving them unauthenticated.
    /// Returns null if the token is missing, invalid, expired, or already used.
    /// </summary>
    public async Task<AuthResponse?> VerifyEmailAsync(string token)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.EmailVerificationToken == token);
        if (user == null || user.EmailVerified) return null;
        if (user.EmailVerificationTokenExpiresAt.HasValue && user.EmailVerificationTokenExpiresAt.Value < DateTime.UtcNow) return null;
        user.EmailVerified = true;
        user.EmailVerificationToken = null;
        user.EmailVerificationTokenExpiresAt = null;
        await _db.SaveChangesAsync();
        _logger.LogInformation("User {UserId} verified their email", user.Id);
        return BuildAuthResponse(user);
    }

    public async Task<bool> ResendVerificationEmailAsync(string email)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email.Trim().ToLowerInvariant());
        if (user == null || user.EmailVerified) return false;
        user.EmailVerificationToken = GenerateVerificationToken();
        user.EmailVerificationTokenExpiresAt = DateTime.UtcNow.AddHours(24);
        await _db.SaveChangesAsync();
        var frontendUrl = _configuration["Frontend:BaseUrl"] ?? "http://localhost:5500";
        var verificationLink = $"{frontendUrl}/verify-email.html?token={user.EmailVerificationToken}";
        await _emailService.SendVerificationEmailAsync(user.Email, user.DisplayName, verificationLink);
        return true;
    }

    private string GenerateJwt(User user)
    {
        var secret = _configuration["Jwt:Secret"];
        if (string.IsNullOrWhiteSpace(secret))
        {
            throw new InvalidOperationException(
                "Jwt:Secret is not configured. Set it via 'dotnet user-secrets' locally, " +
                "or the Jwt__Secret environment variable in production.");
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim("displayName", user.DisplayName)
        };

        var token = new JwtSecurityToken(
            issuer: _configuration["Jwt:Issuer"],
            audience: _configuration["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}