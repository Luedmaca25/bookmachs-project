using System.Threading.Tasks;

namespace Bookmachs.Refactored.Api.Domain.Services;

public class PaymentCaptureResult
{
    public bool Success { get; set; }
    public string? TransactionId { get; set; }
    public string? ErrorMessage { get; set; }
}

public class PaymentRefundResult
{
    public bool Success { get; set; }
    public string? RefundId { get; set; }
    public string? ErrorMessage { get; set; }
}

public class TransbankCreateResult
{
    public bool Success { get; set; }
    public string? Token { get; set; }
    public string? RedirectUrl { get; set; }
    public string? ErrorMessage { get; set; }
}

public class TransbankCommitResult
{
    public bool Success { get; set; }
    public string? AuthorizationCode { get; set; }
    public string? BuyOrder { get; set; }
    public decimal Amount { get; set; }
    public string? Status { get; set; }
    public string? ErrorMessage { get; set; }
}

/// <summary>
/// Servicio exclusivo de pasarela de pagos con Transbank Webpay Plus (Redirección, Hold y Captura Diferida).
/// </summary>
public interface IPaymentGatewayService
{
    /// <summary>
    /// Inicia una transacción diferida en Transbank Webpay Plus y retorna el token y la URL de redirección.
    /// </summary>
    Task<TransbankCreateResult> CreateTransbankHoldAsync(decimal amount, string buyOrder, string sessionId, string returnUrl);

    /// <summary>
    /// Confirma la transacción en Transbank tras la redirección del usuario (Commit).
    /// </summary>
    Task<TransbankCommitResult> CommitTransbankHoldAsync(string token);

    /// <summary>
    /// Captura diferida de fondos autorizados en Transbank Webpay.
    /// </summary>
    Task<PaymentCaptureResult> CaptureTransbankHoldAsync(string token, string buyOrder, string authorizationCode, decimal amount);

    /// <summary>
    /// Anula/Reversa los fondos autorizados diferidos en Transbank.
    /// </summary>
    Task<PaymentRefundResult> RefundTransbankHoldAsync(string token, decimal amount);
}
