using System.Threading;
using System.Threading.Tasks;

namespace Bookmachs.Refactored.Api.Services;

public interface ITwilioVerifyService
{
    /// <summary>
    /// Normaliza un número de teléfono a formato internacional E.164 (ej: +56912345678).
    /// </summary>
    string NormalizePhoneNumber(string phone);

    /// <summary>
    /// Envía un código OTP de verificación al teléfono vía WhatsApp o SMS con Twilio Verify.
    /// </summary>
    Task<(bool Success, string Message)> SendVerificationCodeAsync(string toPhone, string channel, CancellationToken cancellationToken = default);

    /// <summary>
    /// Valida el código OTP provisto por el usuario contra Twilio Verify.
    /// </summary>
    Task<(bool Verified, string Message)> CheckVerificationCodeAsync(string toPhone, string code, CancellationToken cancellationToken = default);
}
