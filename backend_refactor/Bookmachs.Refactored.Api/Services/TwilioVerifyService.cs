using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Bookmachs.Refactored.Api.Services;

public class TwilioVerifyService : ITwilioVerifyService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<TwilioVerifyService> _logger;

    public TwilioVerifyService(HttpClient httpClient, IConfiguration configuration, ILogger<TwilioVerifyService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
    }

    public string NormalizePhoneNumber(string phone)
    {
        if (string.IsNullOrWhiteSpace(phone))
            return string.Empty;

        // Remover espacios, guiones, paréntesis y puntos
        var cleaned = Regex.Replace(phone.Trim(), @"[^\d+]", "");
        
        // Si no tiene prefijo '+', agregarlo
        if (!cleaned.StartsWith("+"))
        {
            cleaned = "+" + cleaned;
        }

        return cleaned;
    }

    public async Task<(bool Success, string Message)> SendVerificationCodeAsync(string toPhone, string channel, CancellationToken cancellationToken = default)
    {
        var normalizedPhone = NormalizePhoneNumber(toPhone);
        if (string.IsNullOrWhiteSpace(normalizedPhone) || normalizedPhone.Length < 8)
        {
            return (false, "El número de teléfono proporcionado no tiene un formato internacional válido (ej: +56912345678).");
        }

        var normalizedChannel = string.Equals(channel?.Trim(), "sms", StringComparison.OrdinalIgnoreCase) ? "sms" : "whatsapp";

        var devMode = _configuration.GetValue<bool>("Twilio:DevMode", true);
        var accountSid = _configuration["Twilio:AccountSid"];
        var authToken = _configuration["Twilio:AuthToken"];
        var verifyServiceSid = _configuration["Twilio:VerifyServiceSid"];

        // Si está en modo desarrollo o faltan credenciales, simular envío exitoso sin costo
        if (devMode || string.IsNullOrWhiteSpace(accountSid) || accountSid.StartsWith("AC_TWILIO") || string.IsNullOrWhiteSpace(authToken) || string.IsNullOrWhiteSpace(verifyServiceSid))
        {
            var devOtp = _configuration["Twilio:DevOtpCode"] ?? "123456";
            _logger.LogInformation("[Twilio Verify Mock] Modo desarrollo activo. Código OTP para {Phone} vía {Channel} es: {Otp}", normalizedPhone, normalizedChannel, devOtp);
            return (true, $"Código de verificación enviado correctamente vía {normalizedChannel.ToUpperInvariant()} (Modo Desarrollo: use {devOtp}).");
        }

        try
        {
            var requestUrl = $"https://verify.twilio.com/v2/Services/{verifyServiceSid}/Verifications";
            var authHeader = Convert.ToBase64String(Encoding.ASCII.GetBytes($"{accountSid}:{authToken}"));

            var formData = new Dictionary<string, string>
            {
                { "To", normalizedPhone },
                { "Channel", normalizedChannel }
            };

            using var request = new HttpRequestMessage(HttpMethod.Post, requestUrl)
            {
                Content = new FormUrlEncodedContent(formData)
            };
            request.Headers.Authorization = new AuthenticationHeaderValue("Basic", authHeader);

            var response = await _httpClient.SendAsync(request, cancellationToken);
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("[Twilio Verify] Código enviado a {Phone} vía {Channel}", normalizedPhone, normalizedChannel);
                return (true, $"Código de verificación enviado correctamente vía {normalizedChannel.ToUpperInvariant()}.");
            }

            _logger.LogWarning("[Twilio Verify Error] Fallo al enviar código a {Phone}: {Status} - {Response}", normalizedPhone, response.StatusCode, responseBody);
            return (false, "No fue posible enviar el código a través de Twilio. Por favor verifica el número o intenta por otro canal.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Twilio Verify Exception] Error al comunicarse con Twilio Verify para {Phone}", normalizedPhone);
            return (false, "Error de conexión con el servicio de verificación telefónica.");
        }
    }

    public async Task<(bool Verified, string Message)> CheckVerificationCodeAsync(string toPhone, string code, CancellationToken cancellationToken = default)
    {
        var normalizedPhone = NormalizePhoneNumber(toPhone);
        var cleanCode = code?.Trim() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(cleanCode))
        {
            return (false, "Debes ingresar el código de verificación.");
        }

        var devMode = _configuration.GetValue<bool>("Twilio:DevMode", true);
        var devOtp = _configuration["Twilio:DevOtpCode"] ?? "123456";
        var accountSid = _configuration["Twilio:AccountSid"];
        var authToken = _configuration["Twilio:AuthToken"];
        var verifyServiceSid = _configuration["Twilio:VerifyServiceSid"];

        // Validación en modo desarrollo o bypass
        if (devMode || string.IsNullOrWhiteSpace(accountSid) || accountSid.StartsWith("AC_TWILIO"))
        {
            if (cleanCode == devOtp || cleanCode == "1234" || cleanCode == "123456")
            {
                _logger.LogInformation("[Twilio Verify Mock] Código validado con éxito para {Phone} en modo desarrollo.", normalizedPhone);
                return (true, "Teléfono verificado correctamente (Modo Desarrollo).");
            }
            return (false, $"Código inválido. En modo desarrollo el código permitido es {devOtp}.");
        }

        try
        {
            var requestUrl = $"https://verify.twilio.com/v2/Services/{verifyServiceSid}/VerificationCheck";
            var authHeader = Convert.ToBase64String(Encoding.ASCII.GetBytes($"{accountSid}:{authToken}"));

            var formData = new Dictionary<string, string>
            {
                { "To", normalizedPhone },
                { "Code", cleanCode }
            };

            using var request = new HttpRequestMessage(HttpMethod.Post, requestUrl)
            {
                Content = new FormUrlEncodedContent(formData)
            };
            request.Headers.Authorization = new AuthenticationHeaderValue("Basic", authHeader);

            var response = await _httpClient.SendAsync(request, cancellationToken);
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

            if (response.IsSuccessStatusCode)
            {
                using var jsonDoc = JsonDocument.Parse(responseBody);
                if (jsonDoc.RootElement.TryGetProperty("status", out var statusProp))
                {
                    var status = statusProp.GetString();
                    if (string.Equals(status, "approved", StringComparison.OrdinalIgnoreCase))
                    {
                        _logger.LogInformation("[Twilio Verify] Código aprobado con éxito para {Phone}", normalizedPhone);
                        return (true, "Número de teléfono verificado con éxito.");
                    }
                }
            }

            _logger.LogWarning("[Twilio Verify] Código inválido o expirado para {Phone}: {Response}", normalizedPhone, responseBody);
            return (false, "El código ingresado es incorrecto o ha expirado. Por favor solicita uno nuevo.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Twilio Verify Exception] Error al validar código para {Phone}", normalizedPhone);
            return (false, "Error interno al validar el código telefónico.");
        }
    }
}
