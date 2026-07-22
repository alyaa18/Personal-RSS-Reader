using System.Net;
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

            var safeDisplayName = WebUtility.HtmlEncode(displayName);
            var htmlContent = $@"
<!DOCTYPE html>
<html>
  <body style=""margin:0;padding:0;background-color:#F7F2E7;font-family:Arial, Helvetica, sans-serif;"">
    <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""background-color:#F7F2E7;padding:32px 16px;"">
      <tr>
        <td align=""center"">
          <table role=""presentation"" width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""max-width:480px;background-color:#FFFFFF;border-radius:16px;padding:40px 32px;"">
            <tr>
              <td style=""text-align:center;"">
                <p style=""margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#6B655A;"">The Daily</p>
                <h1 style=""margin:0 0 24px;font-size:22px;font-weight:600;color:#211F1C;"">RSS Reader</h1>
                <p style=""margin:0 0 24px;font-size:15px;line-height:1.6;color:#211F1C;"">Hi {safeDisplayName},</p>
                <p style=""margin:0 0 28px;font-size:15px;line-height:1.6;color:#211F1C;"">Please confirm your email address to activate your account.</p>
                <a href=""{verificationLink}"" style=""display:inline-block;background-color:#B5542A;color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:600;padding:14px 32px;border-radius:10px;"">Verify Email</a>
                <p style=""margin:28px 0 0;font-size:12px;line-height:1.5;color:#6B655A;"">If the button doesn't work, copy and paste this link into your browser:</p>
                <p style=""margin:6px 0 0;font-size:12px;line-height:1.5;word-break:break-all;""><a href=""{verificationLink}"" style=""color:#B5542A;"">{verificationLink}</a></p>
                <p style=""margin:28px 0 0;font-size:12px;line-height:1.5;color:#9B968A;"">If you didn't create this account, you can safely ignore this email.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>";

            var msg = MailHelper.CreateSingleEmail(from, to, "Verify your email — Personal RSS Reader", plainText, htmlContent);
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