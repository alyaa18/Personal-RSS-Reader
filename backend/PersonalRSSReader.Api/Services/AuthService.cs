using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
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
            if (!existing.EmailVerified)
            {
                // Unverified account exists — let the frontend offer a resend option
                _logger.LogInformation("Registration: unverified account exists for {Email}", email);
                return new AuthResponse(
                    Token: "",
                    UserId: existing.Id,
                    Email: existing.Email,
                    DisplayName: existing.DisplayName,
                    PreferredLanguage: existing.PreferredLanguage,
                    EmailVerified: false,
                    EmailVerificationRequired: true
                );
            }

            _logger.LogInformation("Registration rejected: email {Email} already in use", email);
            return null;
        }

        var verificationToken = Guid.NewGuid().ToString("N");
        var autoVerify = _emailService.IsAutoVerify;

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            DisplayName = string.IsNullOrWhiteSpace(request.DisplayName) ? email : request.DisplayName.Trim(),
            CreatedAt = DateTime.UtcNow,
            EmailVerified = autoVerify,
            VerificationToken = autoVerify ? null : verificationToken
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        if (autoVerify)
        {
            // Dev mode: no SMTP configured — log the user in immediately
            _logger.LogInformation("Auto-verified new user {UserId}", user.Id);
            return BuildAuthResponse(user);
        }

        // Production mode: send verification email
        var baseUrl = _configuration["App:BaseUrl"] ?? "http://localhost:5001";
        var verificationLink = $"{baseUrl}/api/auth/verify?token={verificationToken}";
        var sent = await _emailService.SendVerificationEmailAsync(user.Email, user.DisplayName, verificationLink);

        if (!sent)
        {
            _logger.LogWarning("Verification email sending failed for {Email}", email);
        }

        _logger.LogInformation("Registered new user {UserId} — verification email sent", user.Id);

        return new AuthResponse(
            Token: "",
            UserId: user.Id,
            Email: user.Email,
            DisplayName: user.DisplayName,
            PreferredLanguage: user.PreferredLanguage,
            EmailVerified: false,
            EmailVerificationRequired: true
        );
    }

    public async Task<AuthResponse?> LoginAsync(LoginRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            _logger.LogInformation("Login failed for {Email}", email);
            return null;
        }

        // Block login if email verification is enabled and user is not verified
        if (!_emailService.IsAutoVerify && !user.EmailVerified)
        {
            _logger.LogInformation("Login blocked for {Email} — email not verified", email);
            return new AuthResponse(
                Token: "",
                UserId: user.Id,
                Email: user.Email,
                DisplayName: user.DisplayName,
                PreferredLanguage: user.PreferredLanguage,
                EmailVerified: false,
                EmailVerificationRequired: true
            );
        }

        _logger.LogInformation("User {UserId} logged in", user.Id);
        return BuildAuthResponse(user);
    }

    public async Task<(bool Success, string Message)> VerifyEmailAsync(string token)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return (false, "Verification token is required.");
        }

        var user = await _db.Users.FirstOrDefaultAsync(u => u.VerificationToken == token);

        if (user == null)
        {
            return (false, "Invalid or expired verification token.");
        }

        if (user.EmailVerified)
        {
            return (true, "Email is already verified. You can log in.");
        }

        user.EmailVerified = true;
        user.VerificationToken = null; // Invalidate the token
        await _db.SaveChangesAsync();

        _logger.LogInformation("User {UserId} verified their email", user.Id);
        return (true, "Email verified successfully! You can now log in.");
    }

    public async Task<(bool Success, string Message)> ResendVerificationAsync(string email)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == email && !u.EmailVerified);
        if (user == null)
        {
            return (false, "No unverified account found with that email.");
        }

        if (_emailService.IsAutoVerify)
        {
            // Dev mode: auto-verify on resend
            user.EmailVerified = true;
            user.VerificationToken = null;
            await _db.SaveChangesAsync();
            return (true, "Account verified automatically (dev mode).");
        }

        user.VerificationToken = Guid.NewGuid().ToString("N");
        await _db.SaveChangesAsync();

        var baseUrl = _configuration["App:BaseUrl"] ?? "http://localhost:5001";
        var verificationLink = $"{baseUrl}/api/auth/verify?token={user.VerificationToken}";
        var sent = await _emailService.SendVerificationEmailAsync(user.Email, user.DisplayName, verificationLink);

        return sent
            ? (true, "Verification email sent.")
            : (false, "Failed to send verification email. Check SMTP configuration.");
    }

    private AuthResponse BuildAuthResponse(User user)
    {
        var token = GenerateJwt(user);
        return new AuthResponse(
            Token: token,
            UserId: user.Id,
            Email: user.Email,
            DisplayName: user.DisplayName,
            PreferredLanguage: user.PreferredLanguage,
            EmailVerified: user.EmailVerified
        );
    }

    private string GenerateJwt(User user)
    {
        var secret = _configuration["Jwt:Secret"]
            ?? throw new InvalidOperationException("Jwt:Secret is not configured.");

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