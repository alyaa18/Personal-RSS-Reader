using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace PersonalRSSReader.Api.Helpers;

public static class ClaimsPrincipalExtensions
{
    public static Guid GetUserId(this ClaimsPrincipal principal)
    {
        var sub = principal.FindFirstValue(JwtRegisteredClaimNames.Sub)
            ?? principal.FindFirstValue(ClaimTypes.NameIdentifier);

        if (sub == null || !Guid.TryParse(sub, out var userId))
        {
            throw new InvalidOperationException("Authenticated request is missing a valid user id claim.");
        }

        return userId;
    }
}