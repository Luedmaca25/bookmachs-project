using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SendGrid;
using SendGrid.Helpers.Mail;

namespace Bookmachs.Refactored.Api.Services;

public class ExchangeReminderEmailData
{
    public string UserName { get; set; } = string.Empty;
    public int DaysRemaining { get; set; }
    public string FulfillmentDeadlineDate { get; set; } = string.Empty;
    
    // Libro a Recibir
    public string BookToReceiveTitle { get; set; } = string.Empty;
    public string BookToReceiveAuthor { get; set; } = string.Empty;
    public string BookToReceiveImageUrl { get; set; } = string.Empty;
    public string BookToReceiveCondition { get; set; } = string.Empty;
    
    // Libro a Entregar
    public string BookToOfferTitle { get; set; } = string.Empty;
    public string BookToOfferAuthor { get; set; } = string.Empty;
    public string BookToOfferImageUrl { get; set; } = string.Empty;
    public string BookToOfferCondition { get; set; } = string.Empty;
    
    // Logística y Pago
    public string LogisticsMethodName { get; set; } = string.Empty;
    public string LogisticsInstructions { get; set; } = string.Empty;
    public decimal FeeAmount { get; set; }
    public string PaymentStatus { get; set; } = string.Empty;
    public string TransactionId { get; set; } = string.Empty;
}

public interface ISendGridEmailService
{
    Task<bool> SendFulfillmentReminderEmailAsync(string recipientEmail, ExchangeReminderEmailData data);
}

public class SendGridEmailService : ISendGridEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<SendGridEmailService> _logger;

    public SendGridEmailService(IConfiguration configuration, ILogger<SendGridEmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<bool> SendFulfillmentReminderEmailAsync(string recipientEmail, ExchangeReminderEmailData data)
    {
        var apiKey = _configuration["SendGrid:ApiKey"];
        var fromEmail = _configuration["SendGrid:FromEmail"] ?? "notificaciones@bookmachs.com";
        var fromName = _configuration["SendGrid:FromName"] ?? "Bookmachs Intercambios";
        var templateId = _configuration["SendGrid:TemplateIdFulfillmentReminder"];

        if (string.IsNullOrWhiteSpace(apiKey) || apiKey.StartsWith("YOUR_"))
        {
            _logger.LogWarning("SendGrid API Key no configurada o en modo simulación. Correo no enviado a {RecipientEmail}", recipientEmail);
            return false;
        }

        if (string.IsNullOrWhiteSpace(templateId))
        {
            _logger.LogWarning("SendGrid TemplateIdFulfillmentReminder no configurado. Correo no enviado a {RecipientEmail}", recipientEmail);
            return false;
        }

        try
        {
            var client = new SendGridClient(apiKey);
            var from = new EmailAddress(fromEmail, fromName);
            var to = new EmailAddress(recipientEmail, data.UserName);

            var msg = MailHelper.CreateSingleTemplateEmail(
                from,
                to,
                templateId,
                data
            );

            var response = await client.SendEmailAsync(msg);
            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Correo de recordatorio de entrega enviado exitosamente a {RecipientEmail} vía SendGrid", recipientEmail);
                return true;
            }

            var body = await response.Body.ReadAsStringAsync();
            _logger.LogError("Error al enviar correo SendGrid. StatusCode: {StatusCode}, Body: {Body}", response.StatusCode, body);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Excepción al conectar con SendGrid para enviar correo a {RecipientEmail}", recipientEmail);
            return false;
        }
    }
}
