using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Application.Subscriptions.Commands;
using Bookmachs.Domain.Entities;
using Bookmachs.Domain.Services;
using Bookmachs.Infrastructure.Persistence;
using Bookmachs.Infrastructure.Repositories;
using Bookmachs.Infrastructure.Payments;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace Bookmachs.Tests;

public class SubscriptionTests
{
    private BookmachsDbContext GetInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<BookmachsDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new BookmachsDbContext(options);
    }

    private IPaymentGatewayService GetMockPaymentService()
    {
        var settings = new Dictionary<string, string?>
        {
            { "Payments:MercadoPagoAccessToken", "MOCK_TOKEN" }
        };
        var config = new ConfigurationBuilder().AddInMemoryCollection(settings).Build();
        return new PaymentGatewayService(config);
    }

    [Fact]
    public async Task ProcessWebhook_ShouldSetPremium_WhenStatusIsAuthorizedAndUserExists()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        using var unitOfWork = new UnitOfWork(context);
        var paymentService = GetMockPaymentService();

        var email = "subscriber@example.com";
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            Name = "Subscriber User",
            IsPremium = false,
            SubscriptionPlan = "Free"
        };
        await context.Users.AddAsync(user);
        await context.SaveChangesAsync();

        var safeEmail = email.Replace("@", "_");
        var mockSubId = $"mp_mock_sub_123_email_{safeEmail}";

        var command = new ProcessMercadoPagoWebhookCommand
        {
            Type = "preapproval",
            Action = "created",
            DataId = mockSubId
        };
        var handler = new ProcessMercadoPagoWebhookCommandHandler(unitOfWork, paymentService);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.Success);
        Assert.Equal(user.Id.ToString(), result.UserId);
        Assert.Equal("Premium", result.SubscriptionPlan);

        // Verificar DB
        var dbUser = await context.Users.FindAsync(user.Id);
        Assert.NotNull(dbUser);
        Assert.True(dbUser.IsPremium);
        Assert.Equal("Premium", dbUser.SubscriptionPlan);
        Assert.NotNull(dbUser.SubscriptionEndDate);

        // Verificar registro de Suscripción en BD
        var dbSub = await context.Subscriptions.FirstOrDefaultAsync(s => s.UserId == user.Id);
        Assert.NotNull(dbSub);
        Assert.True(dbSub.IsActive);
        Assert.Equal("Premium", dbSub.PlanName);
        Assert.Equal(mockSubId, dbSub.ExternalSubscriptionId);
    }

    [Fact]
    public async Task ProcessWebhook_ShouldSetFree_WhenStatusIsCancelledAndUserIsPremium()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        using var unitOfWork = new UnitOfWork(context);
        var paymentService = GetMockPaymentService();

        var email = "canceller@example.com";
        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = email,
            Name = "Canceller User",
            IsPremium = true,
            SubscriptionPlan = "Premium",
            SubscriptionEndDate = DateTime.UtcNow.AddDays(15)
        };
        await context.Users.AddAsync(user);

        var subscription = new Subscription
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            PlanName = "Premium",
            Price = 9990.00m,
            StartDate = DateTime.UtcNow.AddDays(-15),
            EndDate = DateTime.UtcNow.AddDays(15),
            IsActive = true,
            ExternalSubscriptionId = "mp_mock_sub_to_cancel"
        };
        await context.Subscriptions.AddAsync(subscription);
        await context.SaveChangesAsync();

        var safeEmail = email.Replace("@", "_");
        var mockSubId = $"mp_mock_sub_to_cancel_email_{safeEmail}_status_cancelled";

        var command = new ProcessMercadoPagoWebhookCommand
        {
            Type = "preapproval",
            Action = "updated",
            DataId = mockSubId
        };
        var handler = new ProcessMercadoPagoWebhookCommandHandler(unitOfWork, paymentService);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.Success);
        Assert.Equal("Free", result.SubscriptionPlan);

        // Verificar DB
        var dbUser = await context.Users.FindAsync(user.Id);
        Assert.NotNull(dbUser);
        Assert.False(dbUser.IsPremium);
        Assert.Equal("Free", dbUser.SubscriptionPlan);

        var dbSub = await context.Subscriptions.FindAsync(subscription.Id);
        Assert.NotNull(dbSub);
        Assert.False(dbSub.IsActive);
    }
}
