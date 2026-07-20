using SendGrid;
using SendGrid.Helpers.Mail;

namespace PersonalRSSReader.Api.Services;

public class EmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendVerificationEmailAsync(string toEmail, string displayName, string verificationLink)
    {
        var apiKey = _configuration["Email:SendGridApiKey"];
        var fromAddress = _configuration["Email:FromAddress"];

        if (string.IsNullOrEmpty(apiKey) || string.IsNullOrEmpty(fromAddress))
        {
            _logger.LogWarning("SendGrid not configured — skipping verification email to {Email}", toEmail);
            return;
        }

        try
        {
            var client = new SendGridClient(apiKey);
            var from = new EmailAddress(fromAddress, "Personal RSS Reader");
            var to = new EmailAddress(toEmail, displayName);
            var plainText = $"Hi {displayName},\n\nPlease verify your email by clicking the link below:\n{verificationLink}\n\nIf you didn't create this account, you can ignore this email.\n\n— Personal RSS Reader";
            var msg = MailHelper.CreateSingleEmail(from, to, "Verify your email — Personal RSS Reader", plainText, null);
            var response = await client.SendEmailAsync(msg);

            if ((int)response.StatusCode >= 400)
            {
                var body = await response.Body.ReadAsStringAsync();
                _logger.LogWarning("SendGrid returned {StatusCode} sending to {Email}: {Body}", response.StatusCode, toEmail, body);
                return;
            }

            _logger.LogInformation("Verification email sent to {Email}", toEmail);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send verification email to {Email}", toEmail);
        }
    }
}
