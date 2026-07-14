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

    public AuthService(AppDbContext db, IConfiguration configuration, ILogger<AuthService> logger)
    {
        _db = db;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<AuthResponse?> RegisterAsync(RegisterRequest request)
    {
        var email = request.Email.Trim().ToLowerInvariant();

        var exists = await _db.Users.AnyAsync(u => u.Email == email);
        if (exists)
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
            CreatedAt = DateTime.UtcNow
        };

        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        _logger.LogInformation("Registered new user {UserId}", user.Id);
        return BuildAuthResponse(user);
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

        _logger.LogInformation("User {UserId} logged in", user.Id);
        return BuildAuthResponse(user);
    }

    private AuthResponse BuildAuthResponse(User user)
    {
        var token = GenerateJwt(user);
        return new AuthResponse(token, user.Id, user.Email, user.DisplayName);
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