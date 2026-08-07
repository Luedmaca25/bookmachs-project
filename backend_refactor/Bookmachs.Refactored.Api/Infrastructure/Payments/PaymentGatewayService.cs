using System;
using System.Threading.Tasks;
using Bookmachs.Refactored.Api.Domain.Services;
using MercadoPago.Client.Payment;
using MercadoPago.Config;
using MercadoPago.Resource.Payment;
using Microsoft.Extensions.Configuration;
using Transbank.Common;
using Transbank.Webpay.Common;
using Transbank.Webpay.WebpayPlus;

namespace Bookmachs.Refactored.Api.Infrastructure.Payments;

public class PaymentGatewayService : IPaymentGatewayService
{
    private readonly IConfiguration _configuration;
    private readonly bool _useMock;
    private readonly Options _tbOptions;

    public PaymentGatewayService(IConfiguration configuration)
    {
        _configuration = configuration;
        var mpToken = _configuration["Payments:MercadoPagoAccessToken"];
        
        if (string.IsNullOrEmpty(mpToken) || mpToken == "YOUR_TEST_ACCESS_TOKEN" || mpToken.StartsWith("MOCK_"))
        {
            _useMock = true;
        }
        else
        {
            _useMock = false;
            MercadoPagoConfig.AccessToken = mpToken;
        }

        // Credenciales Oficiales de Prueba/Integración de Transbank Webpay Plus
        var tbCommerceCode = _configuration["Payments:TransbankCommerceCode"];
        var tbApiKey = _configuration["Payments:TransbankApiKey"];
        var tbEnv = _configuration["Payments:TransbankEnvironment"] ?? "Integration";

        if (tbEnv.Equals("Production", StringComparison.OrdinalIgnoreCase))
        {
            _tbOptions = new Options(tbCommerceCode, tbApiKey, WebpayIntegrationType.Live);
        }
        else
        {
            // Código de comercio e ApiKey oficiales de prueba de Webpay Plus (Transbank SDK .NET)
            var integrationCommerceCode = string.IsNullOrEmpty(tbCommerceCode) ? "597055555532" : tbCommerceCode;
            var integrationApiKey = string.IsNullOrEmpty(tbApiKey) ? "579B532A7440BB0C9079DED94D31EA1615B1C2B178715761D58694E2EF444B75" : tbApiKey;

            _tbOptions = new Options(integrationCommerceCode, integrationApiKey, WebpayIntegrationType.Test);
        }
    }

    // ==========================================================================
    // SECCIÓN 1: Mercado Pago (API Directa / Card Token)
    // ==========================================================================

    public async Task<PaymentHoldResult> CreateHoldAsync(decimal amount, string bookTitle, string cardToken, string customerEmail)
    {
        if (_useMock)
        {
            return new PaymentHoldResult
            {
                Success = true,
                PaymentHoldId = $"mp_hold_{Guid.NewGuid().ToString("N")[..12]}",
                Status = "authorized",
                ErrorMessage = null
            };
        }

        try
        {
            var request = new PaymentCreateRequest
            {
                TransactionAmount = amount,
                Token = cardToken,
                Description = $"Bookmachs Match - {bookTitle}",
                Installments = 1,
                PaymentMethodId = "visa",
                Payer = new PaymentPayerRequest
                {
                    Email = customerEmail
                },
                Capture = false // CLAVE: No captura de inmediato, se retiene
            };

            var client = new PaymentClient();
            Payment payment = await client.CreateAsync(request);

            if (payment.Status == "authorized" || payment.Status == "in_process" || payment.Status == "approved")
            {
                return new PaymentHoldResult
                {
                    Success = true,
                    PaymentHoldId = payment.Id.ToString(),
                    Status = payment.Status,
                    ErrorMessage = null
                };
            }

            return new PaymentHoldResult
            {
                Success = false,
                ErrorMessage = $"El cobro hold fue rechazado: {payment.StatusDetail}"
            };
        }
        catch (Exception ex)
        {
            return new PaymentHoldResult
            {
                Success = false,
                ErrorMessage = $"Error en Mercado Pago SDK: {ex.Message}"
            };
        }
    }

    public async Task<PaymentCaptureResult> CaptureHoldAsync(string paymentHoldId)
    {
        if (_useMock || paymentHoldId.StartsWith("mp_hold_"))
        {
            return new PaymentCaptureResult
            {
                Success = true,
                TransactionId = $"capture_{Guid.NewGuid().ToString("N")[..12]}",
                ErrorMessage = null
            };
        }

        try
        {
            if (!long.TryParse(paymentHoldId, out var paymentId))
            {
                return new PaymentCaptureResult
                {
                    Success = false,
                    ErrorMessage = "ID de hold no es un número válido."
                };
            }

            var client = new PaymentClient();
            Payment payment = await client.CaptureAsync(paymentId);

            if (payment.Status == "approved")
            {
                return new PaymentCaptureResult
                {
                    Success = true,
                    TransactionId = payment.Id.ToString(),
                    ErrorMessage = null
                };
            }

            return new PaymentCaptureResult
            {
                Success = false,
                ErrorMessage = $"Error al capturar fondos. Estado: {payment.Status}"
            };
        }
        catch (Exception ex)
        {
            return new PaymentCaptureResult
            {
                Success = false,
                ErrorMessage = $"Error al conectar con Mercado Pago para captura: {ex.Message}"
            };
        }
    }

    public async Task<PaymentRefundResult> RefundHoldAsync(string paymentHoldId)
    {
        if (_useMock || paymentHoldId.StartsWith("mp_hold_"))
        {
            return new PaymentRefundResult
            {
                Success = true,
                RefundId = $"refund_{Guid.NewGuid().ToString("N")[..12]}",
                ErrorMessage = null
            };
        }

        try
        {
            if (!long.TryParse(paymentHoldId, out var paymentId))
            {
                return new PaymentRefundResult
                {
                    Success = false,
                    ErrorMessage = "ID de hold no es un número válido."
                };
            }

            var client = new PaymentClient();
            Payment payment = await client.CancelAsync(paymentId);

            if (payment.Status == "cancelled")
            {
                return new PaymentRefundResult
                {
                    Success = true,
                    RefundId = payment.Id.ToString(),
                    ErrorMessage = null
                };
            }

            return new PaymentRefundResult
            {
                Success = false,
                ErrorMessage = $"Error al anular la retención. Estado: {payment.Status}"
            };
        }
        catch (Exception ex)
        {
            return new PaymentRefundResult
            {
                Success = false,
                ErrorMessage = $"Error al conectar con Mercado Pago para anulación: {ex.Message}"
            };
        }
    }

    // ==========================================================================
    // SECCIÓN 2: Transbank Webpay Plus (Redirección / Captura Diferida)
    // ==========================================================================

    public Task<TransbankCreateResult> CreateTransbankHoldAsync(decimal amount, string buyOrder, string sessionId, string returnUrl)
    {
        try
        {
            var tx = new Transbank.Webpay.WebpayPlus.Transaction(_tbOptions);
            var response = tx.Create(buyOrder, sessionId, amount, returnUrl);

            return Task.FromResult(new TransbankCreateResult
            {
                Success = true,
                Token = response.Token,
                RedirectUrl = response.Url,
                ErrorMessage = null
            });
        }
        catch (Exception ex)
        {
            return Task.FromResult(new TransbankCreateResult
            {
                Success = false,
                ErrorMessage = $"Error al iniciar transacción en Webpay Plus: {ex.Message}"
            });
        }
    }

    public Task<TransbankCommitResult> CommitTransbankHoldAsync(string token)
    {
        try
        {
            var tx = new Transbank.Webpay.WebpayPlus.Transaction(_tbOptions);
            var response = tx.Commit(token);

            if (response.Status == "AUTHORIZED")
            {
                return Task.FromResult(new TransbankCommitResult
                {
                    Success = true,
                    AuthorizationCode = response.AuthorizationCode,
                    BuyOrder = response.BuyOrder,
                    Amount = response.Amount ?? 0m,
                    Status = response.Status,
                    ErrorMessage = null
                });
            }

            return Task.FromResult(new TransbankCommitResult
            {
                Success = false,
                Status = response.Status,
                ErrorMessage = $"La transacción de Transbank no fue aprobada. Estado: {response.Status}"
            });
        }
        catch (Exception ex)
        {
            return Task.FromResult(new TransbankCommitResult
            {
                Success = false,
                ErrorMessage = $"Error al confirmar transacción en Webpay Plus: {ex.Message}"
            });
        }
    }

    public Task<PaymentCaptureResult> CaptureTransbankHoldAsync(string token, string buyOrder, string authorizationCode, decimal amount)
    {
        if (_useMock || token.StartsWith("tb_token_"))
        {
            return Task.FromResult(new PaymentCaptureResult
            {
                Success = true,
                TransactionId = $"tb_capture_{Guid.NewGuid().ToString("N")[..12]}",
                ErrorMessage = null
            });
        }

        try
        {
            var tx = new Transbank.Webpay.WebpayPlus.Transaction(_tbOptions);
            // Captura el monto diferido pre-autorizado. Acepta decimal en el SDK.
            var response = tx.Capture(token, buyOrder, authorizationCode, amount);

            return Task.FromResult(new PaymentCaptureResult
            {
                Success = true,
                TransactionId = response.AuthorizationCode,
                ErrorMessage = null
            });
        }
        catch (Exception ex)
        {
            return Task.FromResult(new PaymentCaptureResult
            {
                Success = false,
                ErrorMessage = $"Error al capturar fondos diferidos en Webpay Plus: {ex.Message}"
            });
        }
    }

    public Task<PaymentRefundResult> RefundTransbankHoldAsync(string token, decimal amount)
    {
        if (_useMock || token.StartsWith("tb_token_"))
        {
            return Task.FromResult(new PaymentRefundResult
            {
                Success = true,
                RefundId = $"tb_refund_{Guid.NewGuid().ToString("N")[..12]}",
                ErrorMessage = null
            });
        }

        try
        {
            var tx = new Transbank.Webpay.WebpayPlus.Transaction(_tbOptions);
            // Anula/reversa la transacción diferida. Acepta decimal en el SDK.
            var response = tx.Refund(token, amount);

            return Task.FromResult(new PaymentRefundResult
            {
                Success = true,
                RefundId = response.Type ?? "NULLIFIED",
                ErrorMessage = null
            });
        }
        catch (Exception ex)
        {
            return Task.FromResult(new PaymentRefundResult
            {
                Success = false,
                ErrorMessage = $"Error al anular transacción diferida en Webpay Plus: {ex.Message}"
            });
        }
    }

    public async Task<SubscriptionDetailsResult> GetSubscriptionDetailsAsync(string externalSubscriptionId)
    {
        if (_useMock || externalSubscriptionId.StartsWith("mp_mock_sub_"))
        {
            var email = "payer@example.com";
            if (externalSubscriptionId.Contains("_email_"))
            {
                var parts = externalSubscriptionId.Split("_email_");
                if (parts.Length > 1)
                {
                    email = parts[1].Split("_status")[0].Replace("_", "@");
                }
            }

            var status = "authorized";
            if (externalSubscriptionId.Contains("_status_cancelled"))
            {
                status = "cancelled";
            }

            return new SubscriptionDetailsResult
            {
                Success = true,
                SubscriptionId = externalSubscriptionId,
                PayerEmail = email,
                Status = status,
                PlanName = "Premium",
                Price = 9990.00m
            };
        }

        try
        {
            var client = new MercadoPago.Client.Preapproval.PreapprovalClient();
            var preapproval = await client.GetAsync(externalSubscriptionId);
            
            if (preapproval != null)
            {
                return new SubscriptionDetailsResult
                {
                    Success = true,
                    SubscriptionId = preapproval.Id,
                    PayerEmail = preapproval.PayerEmail,
                    Status = preapproval.Status,
                    PlanName = "Premium",
                    Price = preapproval.AutoRecurring?.TransactionAmount ?? 9990.00m
                };
            }

            return new SubscriptionDetailsResult
            {
                Success = false,
                ErrorMessage = "No se encontró la pre-aprobación en Mercado Pago."
            };
        }
        catch (Exception ex)
        {
            return new SubscriptionDetailsResult
            {
                Success = false,
                ErrorMessage = $"Error al recuperar detalles de suscripción de Mercado Pago: {ex.Message}"
            };
        }
    }
}

