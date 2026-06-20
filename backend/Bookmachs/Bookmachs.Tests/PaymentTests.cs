using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Bookmachs.Domain.Services;
using Bookmachs.Infrastructure.Payments;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace Bookmachs.Tests;

public class PaymentTests
{
    private IConfiguration GetMockConfiguration(string mpToken)
    {
        var settings = new Dictionary<string, string?>
        {
            { "Payments:MercadoPagoAccessToken", mpToken }
        };

        return new ConfigurationBuilder()
            .AddInMemoryCollection(settings)
            .Build();
    }

    [Fact]
    public async Task CreateHold_ShouldSucceedWithMockId_WhenConfigTokenIsMock()
    {
        // Arrange
        var config = GetMockConfiguration("MOCK_TOKEN_123");
        var paymentService = new PaymentGatewayService(config);

        // Act
        var result = await paymentService.CreateHoldAsync(1500.0m, "Don Quijote de la Mancha", "tok_card_visa", "payer@example.com");

        // Assert
        Assert.NotNull(result);
        Assert.True(result.Success);
        Assert.NotNull(result.PaymentHoldId);
        Assert.StartsWith("mp_hold_", result.PaymentHoldId);
        Assert.Equal("authorized", result.Status);
    }

    [Fact]
    public async Task CaptureHold_ShouldSucceed_WhenUsingMockHoldId()
    {
        // Arrange
        var config = GetMockConfiguration("MOCK_TOKEN_123");
        var paymentService = new PaymentGatewayService(config);
        var holdId = "mp_hold_abc123xyz789";

        // Act
        var result = await paymentService.CaptureHoldAsync(holdId);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.Success);
        Assert.NotNull(result.TransactionId);
        Assert.StartsWith("capture_", result.TransactionId);
        Assert.Null(result.ErrorMessage);
    }

    [Fact]
    public async Task RefundHold_ShouldSucceed_WhenUsingMockHoldId()
    {
        // Arrange
        var config = GetMockConfiguration("MOCK_TOKEN_123");
        var paymentService = new PaymentGatewayService(config);
        var holdId = "mp_hold_abc123xyz789";

        // Act
        var result = await paymentService.RefundHoldAsync(holdId);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.Success);
        Assert.NotNull(result.RefundId);
        Assert.StartsWith("refund_", result.RefundId);
        Assert.Null(result.ErrorMessage);
    }

    [Fact]
    public async Task CreateTransbankHold_ShouldSucceed_WhenUsingMockMode()
    {
        // Arrange
        var config = GetMockConfiguration("MOCK_TOKEN_123");
        var paymentService = new PaymentGatewayService(config);

        // Act
        var result = await paymentService.CreateTransbankHoldAsync(1500.0m, "buy_123456", "session_abc", "https://return.url");

        // Assert
        Assert.NotNull(result);
        Assert.True(result.Success);
        Assert.NotNull(result.Token);
        Assert.StartsWith("tb_token_", result.Token);
        Assert.NotNull(result.RedirectUrl);
    }

    [Fact]
    public async Task CommitTransbankHold_ShouldSucceed_WhenUsingMockToken()
    {
        // Arrange
        var config = GetMockConfiguration("MOCK_TOKEN_123");
        var paymentService = new PaymentGatewayService(config);
        var token = "tb_token_12345";

        // Act
        var result = await paymentService.CommitTransbankHoldAsync(token);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.Success);
        Assert.Equal("123456", result.AuthorizationCode);
        Assert.Equal("AUTHORIZED", result.Status);
    }

    [Fact]
    public async Task CaptureTransbankHold_ShouldSucceed_WhenUsingMockToken()
    {
        // Arrange
        var config = GetMockConfiguration("MOCK_TOKEN_123");
        var paymentService = new PaymentGatewayService(config);
        var token = "tb_token_12345";

        // Act
        var result = await paymentService.CaptureTransbankHoldAsync(token, "buy_123", "auth_123", 1500.0m);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.Success);
        Assert.StartsWith("tb_capture_", result.TransactionId);
    }

    [Fact]
    public async Task RefundTransbankHold_ShouldSucceed_WhenUsingMockToken()
    {
        // Arrange
        var config = GetMockConfiguration("MOCK_TOKEN_123");
        var paymentService = new PaymentGatewayService(config);
        var token = "tb_token_12345";

        // Act
        var result = await paymentService.RefundTransbankHoldAsync(token, 1500.0m);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.Success);
        Assert.StartsWith("tb_refund_", result.RefundId);
    }
}
