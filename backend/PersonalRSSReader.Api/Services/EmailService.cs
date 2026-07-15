using System.Net;
using System.Net.Mail;

namespace PersonalRSSReader.Api.Services;

/// <summary>
/// Sends transactional emails (verification, notifications) via SMTP.
/// Configured through appsettings.json "Email" section.
/// Designed to produce deliverable emails that avoid spam folders:
/// - Proper From/Reply-To headers
/// - Multipart alternative (plain text + HTML)
/// - List-Unsubscribe header
/// - Reasonable rate limiting (optional)
/// </summary>
public class EmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
        var settings = GetSettings();
        // Auto-verify when no SMTP server is configured (dev mode)
        IsAutoVerify = settings.AutoVerify || string.IsNullOrWhiteSpace(settings.Host);
    }

    public bool IsAutoVerify { get; }

    private SmtpSettings GetSettings()
    {
        var section = _configuration.GetSection("Email");
        return new SmtpSettings
        {
            Host = section["Host"] ?? "",
            Port = int.Parse(section["Port"] ?? "587"),
            Username = section["Username"] ?? "",
            Password = section["Password"] ?? "",
            FromAddress = section["FromAddress"] ?? "noreply@personalrssreader.app",
            FromName = section["FromName"] ?? "Personal RSS Reader",
            EnableSsl = bool.Parse(section["EnableSsl"] ?? "true"),
            AutoVerify = bool.Parse(section["AutoVerify"] ?? "false")
        };
    }

    /// <summary>
    /// Sends an email verification message. Returns true if the email was
    /// accepted by the SMTP server (or if AutoVerify is enabled for dev).
    /// </summary>
    public async Task<bool> SendVerificationEmailAsync(string toEmail, string toName, string verificationLink)
    {
        var settings = GetSettings();

        // Dev mode: auto-verify without sending
        if (settings.AutoVerify)
        {
            _logger.LogInformation("AutoVerify enabled — skipping email to {Email}", toEmail);
            return true;
        }

        var subject = "Verify your email — Personal RSS Reader";

        var plainText = $"""
        Hi {toName},

        Welcome to Personal RSS Reader! Please verify your email address by clicking the link below:

        {verificationLink}

        This link expires in 24 hours.

        If you did not create an account, you can safely ignore this email.

        — Personal RSS Reader
        """;

        var htmlBody = $"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="font-size: 20px; font-weight: 600; color: #1a1a1a;">Personal RSS Reader</h1>
          </div>
          <div style="background: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 32px;">
            <p style="font-size: 16px; color: #333;">Hi <strong>{toName}</strong>,</p>
            <p style="font-size: 16px; color: #333;">Welcome! Please verify your email address by clicking the button below:</p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="{verificationLink}" style="display: inline-block; background: #1a1a1a; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-size: 16px; font-weight: 600;">Verify Email</a>
            </div>
            <p style="font-size: 14px; color: #666;">Or copy and paste this link into your browser:</p>
            <p style="font-size: 14px; color: #666; word-break: break-all;">{verificationLink}</p>
            <p style="font-size: 14px; color: #666; margin-top: 24px;">This link expires in 24 hours. If you did not create an account, please ignore this email.</p>
          </div>
          <div style="text-align: center; margin-top: 16px;">
            <p style="font-size: 12px; color: #999;">&mdash; Personal RSS Reader</p>
          </div>
        </body>
        </html>
        """;

        return await SendEmailAsync(toEmail, toName, subject, plainText, htmlBody);
    }

    private async Task<bool> SendEmailAsync(string toEmail, string toName, string subject, string plainText, string htmlBody)
    {
        var settings = GetSettings();

        try
        {
            using var client = new SmtpClient(settings.Host, settings.Port)
            {
                Credentials = string.IsNullOrEmpty(settings.Username)
                    ? null
                    : new NetworkCredential(settings.Username, settings.Password),
                EnableSsl = settings.EnableSsl,
                DeliveryMethod = SmtpDeliveryMethod.Network
            };

            using var message = new MailMessage
            {
                From = new MailAddress(settings.FromAddress, settings.FromName),
                Subject = subject,
                Body = plainText,
                IsBodyHtml = false,
                Priority = MailPriority.Normal,
                ReplyTo = new MailAddress(settings.FromAddress, settings.FromName)
            };

            message.To.Add(new MailAddress(toEmail, toName));

            // Add HTML alternative view
            var htmlView = AlternateView.CreateAlternateViewFromString(htmlBody, null, "text/html");
            message.AlternateViews.Add(htmlView);

            // Add List-Unsubscribe header
            message.Headers.Add("List-Unsubscribe", $"<mailto:{settings.FromAddress}?subject=unsubscribe>");

            await client.SendMailAsync(message);

            _logger.LogInformation("Verification email sent to {Email}", toEmail);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send verification email to {Email}", toEmail);
            return false;
        }
    }
}

internal class SmtpSettings
{
    public string Host { get; set; } = "localhost";
    public int Port { get; set; } = 587;
    public string Username { get; set; } = "";
    public string Password { get; set; } = "";
    public string FromAddress { get; set; } = "noreply@personalrssreader.app";
    public string FromName { get; set; } = "Personal RSS Reader";
    public bool EnableSsl { get; set; } = true;
    public bool AutoVerify { get; set; } = false;
}
