using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

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
        var smtpUser = _configuration["Email:SmtpUser"];
        var smtpPassword = _configuration["Email:SmtpPassword"];

        if (string.IsNullOrEmpty(smtpUser) || string.IsNullOrEmpty(smtpPassword))
        {
            _logger.LogWarning("SMTP not configured — skipping verification email to {Email}", toEmail);
            return;
        }

        var smtpHost = _configuration["Email:Host"] ?? "smtp.gmail.com";
        var smtpPort = _configuration["Email:Port"] ?? "587";

        var port = 587;
        if (int.TryParse(smtpPort, out var parsedPort))
        {
            port = parsedPort;
        }

        var secureOption = SecureSocketOptions.StartTls;

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress("Personal RSS Reader", smtpUser));
        message.To.Add(new MailboxAddress(displayName, toEmail));
        message.Subject = "Verify your email — Personal RSS Reader";

        message.Body = new TextPart("plain")
        {
            Text = $"Hi {displayName},\n\nPlease verify your email by clicking the link below:\n{verificationLink}\n\nIf you didn't create this account, you can ignore this email.\n\n— Personal RSS Reader"
        };

        try
        {
            using var client = new SmtpClient();
            await client.ConnectAsync(smtpHost, port, secureOption);
            await client.AuthenticateAsync(smtpUser, smtpPassword);
            await client.SendAsync(message);
            await client.DisconnectAsync(true);

            _logger.LogInformation("Verification email sent to {Email}", toEmail);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send verification email to {Email}", toEmail);
        }
    }
}
