using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using SendGrid;
using SendGrid.Helpers.Mail;

namespace Bookmachs.Refactored.Api.Services;

#region Data Transfer Objects (Modelos de Correos)

public class PasswordResetEmailData
{
    public string UserName { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public string ResetLink { get; set; } = string.Empty;
    public int ExpirationMinutes { get; set; } = 60;
    public string SupportEmail { get; set; } = "soporte@intercambialibros.cl";
}

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
    public string PaymentStatus { get; set; } = "Cobrado en Webpay Plus (Pago Confirmado)";
    public string TransactionId { get; set; } = string.Empty;
}

public class ExchangePaymentConfirmedEmailData
{
    public string UserName { get; set; } = string.Empty;
    public string BuyOrder { get; set; } = string.Empty;
    public string PaymentDate { get; set; } = string.Empty;
    public decimal FeeAmount { get; set; }
    public string DeadlineDate { get; set; } = string.Empty;
    public string LogisticsMethod { get; set; } = string.Empty;
    public string LogisticsInstructions { get; set; } = string.Empty;

    public string BookToReceiveTitle { get; set; } = string.Empty;
    public string BookToReceiveAuthor { get; set; } = string.Empty;
    public string BookToReceiveImageUrl { get; set; } = string.Empty;

    public string BookToOfferTitle { get; set; } = string.Empty;
    public string BookToOfferAuthor { get; set; } = string.Empty;
    public string BookToOfferImageUrl { get; set; } = string.Empty;
}

public class ExchangeExpiredEmailData
{
    public string UserName { get; set; } = string.Empty;
    public string TransactionId { get; set; } = string.Empty;
    public string BookToReceiveTitle { get; set; } = string.Empty;
    public string BookToOfferTitle { get; set; } = string.Empty;
    public string ExpirationDate { get; set; } = string.Empty;
}

public class ExchangeCompletedEmailData
{
    public string UserName { get; set; } = string.Empty;
    public string BookReceivedTitle { get; set; } = string.Empty;
    public string BookOfferedTitle { get; set; } = string.Empty;
    public string CompletedDate { get; set; } = string.Empty;
    public string SocialTimelineUrl { get; set; } = "https://www.intercambialibros.cl/social";
}

public class MatchNotificationEmailData
{
    public string OwnerName { get; set; } = string.Empty;
    public string RequesterName { get; set; } = string.Empty;
    public string OwnerBookTitle { get; set; } = string.Empty;
    public string OfferedBookTitle { get; set; } = string.Empty;
    public string OfferedBookAuthor { get; set; } = string.Empty;
    public string OfferedBookImageUrl { get; set; } = string.Empty;
    public string ViewProposalUrl { get; set; } = "https://www.intercambialibros.cl/libreta";
}

public class WelcomeEmailData
{
    public string UserName { get; set; } = string.Empty;
    public string UploadBookUrl { get; set; } = "https://www.intercambialibros.cl/libreta";
    public string DiscoverUrl { get; set; } = "https://www.intercambialibros.cl/";
}

public class SupportTicketEmailData
{
    public string UserName { get; set; } = string.Empty;
    public string TicketId { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public string EstimatedResponseTime { get; set; } = string.Empty;
    public bool HasWhatsAppAccess { get; set; }
    public string? WhatsAppUrl { get; set; }
}

#endregion

public interface ISendGridEmailService
{
    Task<bool> SendPasswordResetEmailAsync(string recipientEmail, PasswordResetEmailData data);
    Task<bool> SendFulfillmentReminderEmailAsync(string recipientEmail, ExchangeReminderEmailData data);
    Task<bool> SendPaymentConfirmationEmailAsync(string recipientEmail, ExchangePaymentConfirmedEmailData data);
    Task<bool> SendFulfillmentExpiredEmailAsync(string recipientEmail, ExchangeExpiredEmailData data);
    Task<bool> SendExchangeCompletedEmailAsync(string recipientEmail, ExchangeCompletedEmailData data);
    Task<bool> SendMatchNotificationEmailAsync(string recipientEmail, MatchNotificationEmailData data);
    Task<bool> SendWelcomeEmailAsync(string recipientEmail, WelcomeEmailData data);
    Task<bool> SendSupportTicketConfirmationEmailAsync(string recipientEmail, SupportTicketEmailData data);
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

    #region Layout y Envío Base Centralizado

    private static string BuildBaseEmailLayout(
        string preheader,
        string title,
        string bodyContentHtml,
        string? buttonText = null,
        string? buttonUrl = null,
        bool allowUnsubscribe = true)
    {
        var buttonHtml = !string.IsNullOrWhiteSpace(buttonText) && !string.IsNullOrWhiteSpace(buttonUrl)
            ? $@"
              <table role='presentation' border='0' cellpadding='0' cellspacing='0' style='margin: 28px 0;'>
                <tr>
                  <td align='center'>
                    <a href='{buttonUrl}' target='_blank' style='display: inline-block; background-color: #16a34a; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 28px; border-radius: 8px; letter-spacing: 0.2px; box-shadow: 0 4px 12px rgba(22, 163, 74, 0.25);'>
                      {buttonText}
                    </a>
                  </td>
                </tr>
              </table>"
            : string.Empty;

        var unsubscribeHtml = allowUnsubscribe
            ? @"
              <p style='margin: 12px 0 0; font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.5;'>
                Si no deseas recibir estas notificaciones automáticas, puedes <a href='<%unsubscribe%>' style='color: #16a34a; text-decoration: underline;'>desuscribirte aquí</a>.
              </p>"
            : string.Empty;

        return $@"
<!DOCTYPE html>
<html lang='es'>
<head>
  <meta charset='utf-8'>
  <meta name='viewport' content='width=device-width, initial-scale=1.0'>
  <title>{title}</title>
  <style>
    body {{ margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }}
    table {{ border-collapse: collapse; }}
    img {{ border: 0; outline: none; text-decoration: none; }}
  </style>
</head>
<body style='margin: 0; padding: 24px 12px; background-color: #f1f5f9; -webkit-font-smoothing: antialiased;'>
  <!-- Preheader oculto para clientes de correo -->
  <span style='display: none; font-size: 1px; color: #f1f5f9; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;'>
    {preheader}
  </span>

  <table role='presentation' width='100%' border='0' cellpadding='0' cellspacing='0'>
    <tr>
      <td align='center'>
        <table role='presentation' width='100%' style='max-width: 600px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);' border='0' cellpadding='0' cellspacing='0'>
          
          <!-- Encabezado con Identidad Oficial -->
          <tr>
            <td style='padding: 28px 32px 20px; background-color: #0f172a; text-align: center;'>
              <a href='https://www.intercambialibros.cl' target='_blank' style='text-decoration: none;'>
                <span style='font-size: 24px; font-weight: 800; color: #22c55e; letter-spacing: -0.5px;'>📚 Intercambialibros</span>
              </a>
              <div style='font-size: 12px; color: #94a3b8; margin-top: 4px; letter-spacing: 0.3px;'>Plataforma circular de lectura en Chile</div>
            </td>
          </tr>

          <!-- Cuerpo Principal -->
          <tr>
            <td style='padding: 32px; color: #1e293b; font-size: 15px; line-height: 1.6;'>
              <h1 style='margin: 0 0 16px; font-size: 20px; font-weight: 800; color: #0f172a; line-height: 1.3;'>{title}</h1>
              
              {bodyContentHtml}
              
              {buttonHtml}

              <p style='margin: 24px 0 0; font-size: 13px; color: #64748b; line-height: 1.5;'>
                Un saludo cordial,<br>
                <strong style='color: #0f172a;'>El equipo de Intercambialibros</strong>
              </p>
            </td>
          </tr>

          <!-- Pie de página Oficial y Legal -->
          <tr>
            <td style='padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center; line-height: 1.6;'>
              <strong>Intercambialibros</strong> • Patronato 447, Recoleta, Santiago, Chile.<br>
              Portal oficial: <a href='https://www.intercambialibros.cl' target='_blank' style='color: #16a34a; text-decoration: none;'>intercambialibros.cl</a> • Soporte: <a href='mailto:soporte@intercambialibros.cl' style='color: #16a34a; text-decoration: none;'>soporte@intercambialibros.cl</a>
              {unsubscribeHtml}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>";
    }

    private async Task<bool> SendEmailInternalAsync(
        string recipientEmail,
        string recipientName,
        string subject,
        string preheader,
        string bodyContentHtml,
        string category,
        string? buttonText = null,
        string? buttonUrl = null,
        bool allowUnsubscribe = true)
    {
        var apiKey = _configuration["SendGrid:ApiKey"];
        var fromEmail = _configuration["SendGrid:FromEmail"] ?? "notificaciones@intercambialibros.cl";
        var fromName = _configuration["SendGrid:FromName"] ?? "Intercambialibros";

        // Modo Simulación / Desarrollo si no hay API Key real
        if (string.IsNullOrWhiteSpace(apiKey) || apiKey.StartsWith("YOUR_") || apiKey.StartsWith("SG.placeholder"))
        {
            _logger.LogInformation(
                "[SendGrid Mock / Dev] Simulación de correo exitosa. Destinatario: {RecipientEmail} ({RecipientName}) | Asunto: {Subject} | Categoría: {Category}",
                recipientEmail, recipientName, subject, category);
            return true;
        }

        try
        {
            var html = BuildBaseEmailLayout(preheader, subject, bodyContentHtml, buttonText, buttonUrl, allowUnsubscribe);
            var plainText = $"{subject}\n\n{bodyContentHtml.Replace("<br>", "\n").Replace("</p>", "\n\n")}\n\nIntercambialibros - Patronato 447, Recoleta, Santiago, Chile.";

            var client = new SendGridClient(apiKey);
            var from = new EmailAddress(fromEmail, fromName);
            var to = new EmailAddress(recipientEmail, recipientName);

            var msg = MailHelper.CreateSingleEmail(from, to, subject, plainText, html);
            msg.AddCategory(category);

            // Rastreo de Desuscripción con tag nativo <%unsubscribe%>
            if (allowUnsubscribe)
            {
                msg.SetSubscriptionTracking(
                    enable: true,
                    text: "Si no deseas recibir estas notificaciones, puedes desuscribirte aquí: <%unsubscribe%>",
                    html: "<p style='margin-top: 16px; font-size: 11px; color: #64748b; text-align: center;'>Si no deseas recibir estas notificaciones, puedes <a href='<%unsubscribe%>' style='color: #16a34a; text-decoration: underline;'>desuscribirte aquí</a>.</p>",
                    substitutionTag: "<%unsubscribe%>"
                );
            }

            var response = await client.SendEmailAsync(msg);
            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Correo ({Category}) enviado exitosamente a {RecipientEmail} vía SendGrid", category, recipientEmail);
                return true;
            }

            var body = await response.Body.ReadAsStringAsync();
            _logger.LogError("Error al enviar correo SendGrid ({Category}). StatusCode: {StatusCode}, Body: {Body}", category, response.StatusCode, body);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Excepción al conectar con SendGrid ({Category}) para {RecipientEmail}", category, recipientEmail);
            return false;
        }
    }

    #endregion

    #region Implementación de Escenarios Específicos

    public async Task<bool> SendPasswordResetEmailAsync(string recipientEmail, PasswordResetEmailData data)
    {
        var subject = "Restablece tu contraseña de Intercambialibros";
        var preheader = "Recibimos una solicitud para cambiar tu contraseña en Intercambialibros.";

        var bodyHtml = $@"
          <p>Hola, <strong>{data.UserName}</strong>:</p>
          <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta en <strong>Intercambialibros</strong>.</p>
          <p>Para definir una nueva contraseña y recuperar tu acceso, presiona el botón a continuación:</p>
          
          <div style='background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin: 20px 0; font-size: 13px; color: #64748b;'>
            ⏱️ Por motivos de seguridad, este enlace es de uso único y expirará en <strong>{data.ExpirationMinutes} minutos</strong>.
          </div>

          <p style='font-size: 13px; color: #64748b;'>Si tú no realizaste esta solicitud, puedes ignorar este correo de forma segura. Tu contraseña actual se mantendrá intacta.</p>";

        // No se permite desuscripción en restablecimiento de contraseñas por tratarse de correo crítico de seguridad
        return await SendEmailInternalAsync(
            recipientEmail: recipientEmail,
            recipientName: data.UserName,
            subject: subject,
            preheader: preheader,
            bodyContentHtml: bodyHtml,
            category: "PasswordReset",
            buttonText: "Restablecer mi contraseña",
            buttonUrl: data.ResetLink,
            allowUnsubscribe: false);
    }

    public async Task<bool> SendFulfillmentReminderEmailAsync(string recipientEmail, ExchangeReminderEmailData data)
    {
        var subject = $"⏳ Te quedan {data.DaysRemaining} días para coordinar la entrega de tu libro | Orden #{data.TransactionId}";
        var preheader = $"Tu intercambio #{data.TransactionId} en Intercambialibros está activo. Revisa los detalles de entrega.";

        var bodyHtml = $@"
          <p>Hola, <strong>{data.UserName}</strong>:</p>
          <p>Te recordamos que tu intercambio con la <strong>Orden #{data.TransactionId}</strong> se encuentra activo y te quedan <strong>{data.DaysRemaining} días</strong> para completar la entrega física de tu ejemplar.</p>

          <div style='background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;'>
            <table role='presentation' width='100%' style='font-size: 14px; line-height: 1.5;'>
              <tr>
                <td style='padding-bottom: 8px; color: #64748b;'>🗓️ <strong>Fecha límite fatal:</strong></td>
                <td align='right' style='padding-bottom: 8px; font-weight: 700; color: #dc2626;'>{data.FulfillmentDeadlineDate}</td>
              </tr>
              <tr>
                <td style='padding-bottom: 8px; color: #64748b;'>💳 <strong>Tarifa Webpay Plus:</strong></td>
                <td align='right' style='padding-bottom: 8px; font-weight: 700; color: #16a34a;'>${Math.Round(data.FeeAmount):N0} CLP (Pagado)</td>
              </tr>
              <tr>
                <td style='color: #64748b;'>🚚 <strong>Modalidad:</strong></td>
                <td align='right' style='font-weight: 700; color: #0f172a;'>{data.LogisticsMethodName}</td>
              </tr>
            </table>
          </div>

          <h3 style='margin: 20px 0 10px; font-size: 15px; color: #0f172a;'>📚 Libros del Intercambio:</h3>
          <ul style='padding-left: 20px; margin: 0 0 20px; line-height: 1.6;'>
            <li><strong>Libro que recibirás:</strong> {data.BookToReceiveTitle} (de {data.BookToReceiveAuthor}) — Estado: <em>{data.BookToReceiveCondition}</em></li>
            <li><strong>Libro que tú entregas:</strong> {data.BookToOfferTitle} (de {data.BookToOfferAuthor}) — Estado: <em>{data.BookToOfferCondition}</em></li>
          </ul>

          <div style='background-color: #ecfdf5; border-left: 4px solid #16a34a; padding: 12px 16px; margin: 16px 0; font-size: 13px; color: #065f46;'>
            <strong>📍 Instrucciones de Entrega:</strong><br>{data.LogisticsInstructions}
          </div>

          <p style='font-size: 13px; color: #64748b;'>Al cumplirse el plazo de 5 días sin registrar la entrega o comprobante, la orden expira para garantizar la disponibilidad de catálogo para otros lectores.</p>";

        return await SendEmailInternalAsync(
            recipientEmail: recipientEmail,
            recipientName: data.UserName,
            subject: subject,
            preheader: preheader,
            bodyContentHtml: bodyHtml,
            category: "ExchangeReminder",
            buttonText: "Ver estado en Mi Libreta",
            buttonUrl: "https://www.intercambialibros.cl/libreta",
            allowUnsubscribe: true);
    }

    public async Task<bool> SendPaymentConfirmationEmailAsync(string recipientEmail, ExchangePaymentConfirmedEmailData data)
    {
        var subject = $"✅ ¡Pago confirmado! Tu intercambio está en marcha | Orden #{data.BuyOrder}";
        var preheader = $"Hemos recibido tu pago por Webpay Plus. Conoce los próximos pasos para tu intercambio #{data.BuyOrder}.";

        var bodyHtml = $@"
          <p>¡Excelente noticia, <strong>{data.UserName}</strong>! 🎉</p>
          <p>Tu pago a través de <strong>Webpay Plus (Transbank)</strong> ha sido procesado con éxito y tu intercambio ya se encuentra oficialmente activo.</p>

          <div style='background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;'>
            <table role='presentation' width='100%' style='font-size: 14px; line-height: 1.5;'>
              <tr>
                <td style='padding-bottom: 8px; color: #64748b;'>📄 <strong>Orden de Compra:</strong></td>
                <td align='right' style='padding-bottom: 8px; font-weight: 700; color: #0f172a;'>#{data.BuyOrder}</td>
              </tr>
              <tr>
                <td style='padding-bottom: 8px; color: #64748b;'>📅 <strong>Fecha de Pago:</strong></td>
                <td align='right' style='padding-bottom: 8px; color: #0f172a;'>{data.PaymentDate}</td>
              </tr>
              <tr>
                <td style='padding-bottom: 8px; color: #64748b;'>💰 <strong>Monto Abonado:</strong></td>
                <td align='right' style='padding-bottom: 8px; font-weight: 700; color: #16a34a;'>${Math.Round(data.FeeAmount):N0} CLP</td>
              </tr>
              <tr>
                <td style='color: #64748b;'>⏰ <strong>Plazo de Entrega (5 Días):</strong></td>
                <td align='right' style='font-weight: 700; color: #dc2626;'>Hasta {data.DeadlineDate}</td>
              </tr>
            </table>
          </div>

          <h3 style='margin: 20px 0 10px; font-size: 15px; color: #0f172a;'>📚 Libros del Intercambio:</h3>
          <ul style='padding-left: 20px; margin: 0 0 20px; line-height: 1.6;'>
            <li><strong>Libro que recibirás:</strong> {data.BookToReceiveTitle} ({data.BookToReceiveAuthor})</li>
            <li><strong>Libro que tú entregas:</strong> {data.BookToOfferTitle} ({data.BookToOfferAuthor})</li>
          </ul>

          <div style='background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 16px 0; font-size: 13px; color: #1e40af;'>
            <strong>🚚 Modalidad: {data.LogisticsMethod}</strong><br>{data.LogisticsInstructions}
          </div>

          <p style='font-size: 13px; color: #64748b;'>Si seleccionaste encomienda o donación, recuerda subir el número de tracking o la foto de comprobante en tu libreta para que nuestro equipo lo valide oportunamente.</p>";

        return await SendEmailInternalAsync(
            recipientEmail: recipientEmail,
            recipientName: data.UserName,
            subject: subject,
            preheader: preheader,
            bodyContentHtml: bodyHtml,
            category: "PaymentConfirmation",
            buttonText: "Ir a Mi Libreta",
            buttonUrl: "https://www.intercambialibros.cl/libreta",
            allowUnsubscribe: true);
    }

    public async Task<bool> SendFulfillmentExpiredEmailAsync(string recipientEmail, ExchangeExpiredEmailData data)
    {
        var subject = $"Aviso: Plazo de entrega expirado | Orden #{data.TransactionId}";
        var preheader = $"Se ha cumplido el plazo de 5 días para la entrega de tu ejemplar en la orden #{data.TransactionId}.";

        var bodyHtml = $@"
          <p>Estimado/a <strong>{data.UserName}</strong>:</p>
          <p>Te informamos que la Orden de Intercambio <strong>#{data.TransactionId}</strong> ha superado el plazo máximo de 5 días fijado el <strong>{data.ExpirationDate}</strong> sin registrarse la entrega física o comprobante de tu libro <em>""{data.BookToOfferTitle}""</em>.</p>
          
          <div style='background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 14px 18px; margin: 20px 0; font-size: 13px; color: #991b1b;'>
            ⚠️ El libro solicitado (<em>""{data.BookToReceiveTitle}""</em>) ha sido reintegrado a la circulación para que otros lectores puedan solicitarlo.
          </div>

          <p style='font-size: 13px; color: #64748b;'>De acuerdo con los términos de servicio de Intercambialibros, la tarifa de servicio cobrada vía Webpay Plus cubrió los gastos de reserva física y preparación de inventario.</p>
          <p style='font-size: 13px; color: #64748b;'>Si tuviste algún inconveniente de fuerza mayor con tu envío o entrega presencial, por favor contáctanos respondiendo este correo.</p>";

        return await SendEmailInternalAsync(
            recipientEmail: recipientEmail,
            recipientName: data.UserName,
            subject: subject,
            preheader: preheader,
            bodyContentHtml: bodyHtml,
            category: "FulfillmentExpired",
            buttonText: "Explorar Nuevos Libros",
            buttonUrl: "https://www.intercambialibros.cl/",
            allowUnsubscribe: true);
    }

    public async Task<bool> SendExchangeCompletedEmailAsync(string recipientEmail, ExchangeCompletedEmailData data)
    {
        var subject = $"🎉 ¡Intercambio completado con éxito! Disfruta tu nueva lectura";
        var preheader = $"Hemos confirmado la recepción de tu libro. Tu nuevo ejemplar ya está listo.";

        var bodyHtml = $@"
          <p>¡Hola, <strong>{data.UserName}</strong>! 📖✨</p>
          <p>Nos alegra comunicarte que hemos recibido y verificado con éxito tu libro <em>""{data.BookOfferedTitle}""</em> en nuestro centro de distribución de Patronato 447, Recoleta.</p>
          <p>Con esto, tu intercambio se da por completado el <strong>{data.CompletedDate}</strong> y tu ejemplar <strong>""{data.BookReceivedTitle}""</strong> ya es formalmente tuyo.</p>

          <div style='background-color: #ecfdf5; border: 1px solid #d1fae5; border-radius: 8px; padding: 14px 18px; margin: 20px 0; font-size: 14px; color: #065f46;'>
            ¿Te gustó la experiencia? Te invitamos a calificar el estado de tu libro y compartir tu opinión con nuestra comunidad de lectores.
          </div>";

        return await SendEmailInternalAsync(
            recipientEmail: recipientEmail,
            recipientName: data.UserName,
            subject: subject,
            preheader: preheader,
            bodyContentHtml: bodyHtml,
            category: "ExchangeCompleted",
            buttonText: "Ver en el Muro Comunitario",
            buttonUrl: data.SocialTimelineUrl,
            allowUnsubscribe: true);
    }

    public async Task<bool> SendMatchNotificationEmailAsync(string recipientEmail, MatchNotificationEmailData data)
    {
        var subject = $"🔥 ¡Hiciste match con tu libro \"{data.OwnerBookTitle}\"!";
        var preheader = $"A otro lector le interesa tu libro \"{data.OwnerBookTitle}\" y tiene libros para intercambiar.";

        var bodyHtml = $@"
          <p>¡Hola, <strong>{data.OwnerName}</strong>!</p>
          <p>¡Buenas noticias! Otro lector de la comunidad (<strong>{data.RequesterName}</strong>) le ha dado me gusta a tu libro <em>""{data.OwnerBookTitle}""</em> y tiene títulos disponibles en su libreta que hacen match contigo.</p>

          <div style='background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;'>
            <strong>📚 Te ofrece a cambio:</strong><br>
            <span style='font-size: 16px; font-weight: 700; color: #0f172a;'>{data.OfferedBookTitle}</span><br>
            <span style='color: #64748b;'>Autor: {data.OfferedBookAuthor}</span>
          </div>

          <p>Para revisar los detalles del ejemplar, ver sus fotografías y concretar el intercambio, ingresa a tu libreta:</p>";

        return await SendEmailInternalAsync(
            recipientEmail: recipientEmail,
            recipientName: data.OwnerName,
            subject: subject,
            preheader: preheader,
            bodyContentHtml: bodyHtml,
            category: "MatchNotification",
            buttonText: "Ver Propuesta de Intercambio",
            buttonUrl: data.ViewProposalUrl,
            allowUnsubscribe: true);
    }

    public async Task<bool> SendWelcomeEmailAsync(string recipientEmail, WelcomeEmailData data)
    {
        var subject = "👋 ¡Te damos la bienvenida a Intercambialibros!";
        var preheader = "Comienza a descubrir y hacer match con cientos de libros en todo Chile.";

        var bodyHtml = $@"
          <p>¡Hola, <strong>{data.UserName}</strong>! Te damos la más cordial bienvenida a <strong>Intercambialibros</strong> 📚🇨🇱</p>
          <p>Somos la plataforma chilena creada para que los libros no se queden acumulando polvo en repisas, sino que circulen entre lectores apasionados.</p>

          <h3 style='margin: 20px 0 10px; font-size: 15px; color: #0f172a;'>Aquí tienes los 3 pasos clave para empezar hoy mismo:</h3>
          <ol style='padding-left: 20px; margin: 0 0 20px; line-height: 1.8;'>
            <li><strong>Sube tus libros a ""Tu Libreta"":</strong> Fotografía la portada, dinos su estado físico y déjalos listos para intercambiar.</li>
            <li><strong>Desliza en ""Descubrir"":</strong> Desliza a la derecha en los libros que quieras leer.</li>
            <li><strong>Haz Match e intercambia:</strong> Coordina la entrega de manera segura con Webpay Plus de Transbank.</li>
          </ol>";

        return await SendEmailInternalAsync(
            recipientEmail: recipientEmail,
            recipientName: data.UserName,
            subject: subject,
            preheader: preheader,
            bodyContentHtml: bodyHtml,
            category: "Welcome",
            buttonText: "Cargar mi primer libro",
            buttonUrl: data.UploadBookUrl,
            allowUnsubscribe: true);
    }

    public async Task<bool> SendSupportTicketConfirmationEmailAsync(string recipientEmail, SupportTicketEmailData data)
    {
        var subject = $"Recibimos tu consulta: Ticket #{data.TicketId}";
        var preheader = $"Tu solicitud #{data.TicketId} ha ingresado a la mesa de ayuda de Intercambialibros.";

        var whatsappBlock = data.HasWhatsAppAccess && !string.IsNullOrWhiteSpace(data.WhatsAppUrl)
            ? $@"
              <div style='background-color: #ecfdf5; border-left: 4px solid #16a34a; padding: 12px 16px; margin: 16px 0; font-size: 13px;'>
                🟢 <strong>Atención Prioritaria 24/7 disponible:</strong> Puedes escribirnos directamente a nuestro canal de WhatsApp preferencial: <a href='{data.WhatsAppUrl}' target='_blank' style='color: #16a34a; font-weight: 700;'>Abrir WhatsApp de Soporte</a>.
              </div>"
            : string.Empty;

        var bodyHtml = $@"
          <p>Hola, <strong>{data.UserName}</strong>:</p>
          <p>Hemos recibido tu consulta en la mesa de ayuda de <strong>Intercambialibros</strong>.</p>

          <div style='background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;'>
            <table role='presentation' width='100%' style='font-size: 14px; line-height: 1.5;'>
              <tr>
                <td style='padding-bottom: 8px; color: #64748b;'>📋 <strong>Número de Ticket:</strong></td>
                <td align='right' style='padding-bottom: 8px; font-weight: 700; color: #0f172a;'>#{data.TicketId}</td>
              </tr>
              <tr>
                <td style='padding-bottom: 8px; color: #64748b;'>🏷️ <strong>Categoría:</strong></td>
                <td align='right' style='padding-bottom: 8px; color: #0f172a;'>{data.Category}</td>
              </tr>
              <tr>
                <td style='padding-bottom: 8px; color: #64748b;'>📝 <strong>Asunto:</strong></td>
                <td align='right' style='padding-bottom: 8px; color: #0f172a;'>{data.Subject}</td>
              </tr>
              <tr>
                <td style='padding-bottom: 8px; color: #64748b;'>⚡ <strong>Prioridad:</strong></td>
                <td align='right' style='padding-bottom: 8px; font-weight: 700; color: #16a34a;'>{data.Priority}</td>
              </tr>
              <tr>
                <td style='color: #64748b;'>⏱️ <strong>Tiempo estimado:</strong></td>
                <td align='right' style='font-weight: 700; color: #0f172a;'>{data.EstimatedResponseTime}</td>
              </tr>
            </table>
          </div>

          {whatsappBlock}

          <p style='font-size: 13px; color: #64748b;'>Un miembro de nuestro equipo responderá directamente a este correo manteniendo el ticket activo.</p>";

        return await SendEmailInternalAsync(
            recipientEmail: recipientEmail,
            recipientName: data.UserName,
            subject: subject,
            preheader: preheader,
            bodyContentHtml: bodyHtml,
            category: "SupportTicket",
            buttonText: "Ir al Centro de Ayuda",
            buttonUrl: "https://www.intercambialibros.cl/soporte",
            allowUnsubscribe: true);
    }

    #endregion
}
