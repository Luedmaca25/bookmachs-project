using System.Threading.Tasks;

namespace Bookmachs.Domain.Services;

public class PaymentHoldResult
{
    public bool Success { get; set; }
    public string? PaymentHoldId { get; set; }
    public string? ErrorMessage { get; set; }
    public string? Status { get; set; }
}

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

public interface IPaymentGatewayService
{
    // --- Mercado Pago (Pago Directo API - Card Token) ---
    
    /// <summary>
    /// Genera una pre-autorización (Hold) por el monto del Fee de intercambio usando Mercado Pago.
    /// </summary>
    Task<PaymentHoldResult> CreateHoldAsync(decimal amount, string bookTitle, string cardToken, string customerEmail);

    /// <summary>
    /// Captura (procesa definitivamente) un cobro previamente pre-autorizado en Mercado Pago.
    /// </summary>
    Task<PaymentCaptureResult> CaptureHoldAsync(string paymentHoldId);

    /// <summary>
    /// Reversa (libera) los fondos previamente retenidos en Mercado Pago.
    /// </summary>
    Task<PaymentRefundResult> RefundHoldAsync(string paymentHoldId);


    // --- Transbank Webpay Plus (Flujo de Redirección y Captura Diferida) ---

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

    /// <summary>
    /// Recupera los detalles de una pre-autorización recurrente (suscripción) de Mercado Pago.
    /// </summary>
    Task<SubscriptionDetailsResult> GetSubscriptionDetailsAsync(string externalSubscriptionId);
}

public class SubscriptionDetailsResult
{
    public bool Success { get; set; }
    public string? SubscriptionId { get; set; }
    public string? PayerEmail { get; set; }
    public string? Status { get; set; } // authorized, active, cancelled
    public string? PlanName { get; set; } // Premium, Basic
    public decimal Price { get; set; }
    public string? ErrorMessage { get; set; }
}
