using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Application.Transactions.Commands;
using Bookmachs.Application.Transactions.Queries;
using Bookmachs.Domain.Entities;
using Bookmachs.Domain.Services;
using Bookmachs.Infrastructure.Persistence;
using Bookmachs.Infrastructure.Repositories;
using Bookmachs.Infrastructure.Payments;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace Bookmachs.Tests;

public class CheckoutTests
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
    public async Task ConfirmCardCheckout_ShouldUpdateStatusToHold_WhenCheckoutIsSuccessful()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        using var unitOfWork = new UnitOfWork(context);
        var paymentService = GetMockPaymentService();

        var requester = new User
        {
            Id = Guid.NewGuid(),
            Email = "requester@example.com",
            Name = "Requester User",
            Pais = "Chile",
            DocumentoIdentidad = "12345678-9"
        };
        await context.Users.AddAsync(requester);

        var book = new Book
        {
            Id = Guid.NewGuid(),
            Title = "El señor de los anillos",
            Author = "J.R.R. Tolkien",
            Condition = "Good",
            BaseValue = 8000.0m,
            IsInternalStock = true
        };
        await context.Books.AddAsync(book);

        var transaction = new MatchTransaction
        {
            Id = Guid.NewGuid(),
            RequesterUserId = requester.Id,
            BookId = book.Id,
            FeeAmount = 2400.0m,
            PaymentStatus = "Pending",
            LogisticsStatus = "Pending"
        };
        await context.MatchTransactions.AddAsync(transaction);
        await context.SaveChangesAsync();

        var command = new ConfirmCardCheckoutCommand
        {
            MatchTransactionId = transaction.Id,
            CardToken = "tok_visa_123",
            RequesterUserId = requester.Id
        };
        var handler = new ConfirmCardCheckoutCommandHandler(unitOfWork, paymentService);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.Success);
        Assert.Equal("Hold", result.PaymentStatus);
        Assert.NotNull(result.PaymentHoldId);
        Assert.StartsWith("mp_hold_", result.PaymentHoldId);

        // Verificar DB
        var dbTx = await context.MatchTransactions.FindAsync(transaction.Id);
        Assert.NotNull(dbTx);
        Assert.Equal("Hold", dbTx.PaymentStatus);
        Assert.Equal(result.PaymentHoldId, dbTx.PaymentHoldId);
    }

    [Fact]
    public async Task StartWebpayCheckout_ShouldReturnRedirection_WhenValidTransaction()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        using var unitOfWork = new UnitOfWork(context);
        var paymentService = GetMockPaymentService();

        var requester = new User
        {
            Id = Guid.NewGuid(),
            Email = "requester@example.com",
            Name = "Requester User"
        };
        await context.Users.AddAsync(requester);

        var book = new Book
        {
            Id = Guid.NewGuid(),
            Title = "El Hobbit",
            BaseValue = 5000.0m
        };
        await context.Books.AddAsync(book);

        var transaction = new MatchTransaction
        {
            Id = Guid.NewGuid(),
            RequesterUserId = requester.Id,
            BookId = book.Id,
            FeeAmount = 1500.0m,
            PaymentStatus = "Pending"
        };
        await context.MatchTransactions.AddAsync(transaction);
        await context.SaveChangesAsync();

        var command = new StartWebpayCheckoutCommand
        {
            MatchTransactionId = transaction.Id,
            ReturnUrl = "https://my-app.com/callback",
            RequesterUserId = requester.Id
        };
        var handler = new StartWebpayCheckoutCommandHandler(unitOfWork, paymentService);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.Success);
        Assert.NotNull(result.Token);
        Assert.StartsWith("tb_token_", result.Token);
        Assert.Contains("token_ws=", result.RedirectUrl);
    }

    [Fact]
    public async Task ConfirmWebpayCheckout_ShouldUpdateStatusToHold_WhenWebpayTokenIsCommitted()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        using var unitOfWork = new UnitOfWork(context);
        var paymentService = GetMockPaymentService();

        // En el mock de Transbank, el buyOrder devuelto es "tb_token_12345" o similar
        // y para simularlo, en ConfirmWebpayCheckoutCommandHandler
        // se intenta parsear la BuyOrder como Guid.
        // Por ende, debemos crear la transacción usando un Guid como ID, y en el test mockeado,
        // la simulación de CommitTransbankHoldAsync del PaymentGatewayService devuelve
        // BuyOrder = bo_xxxx. Para que funcione con un Guid real de transacción en el test de integración,
        // podemos pasar un token de Transbank simulado.
        // Pero espera, en la implementación de CommitTransbankHoldAsync:
        // Si el token es mock ("tb_token_12345"), devuelve BuyOrder = bo_xxxx.
        // Para que se pueda testear con una transacción real de la base de datos,
        // modifiqué temporalmente el token del test para que coincida con el Guid de la transacción.
        // O más simple: en la simulación del Commit de Transbank en PaymentGatewayService,
        // si el token empieza con "tb_token_" y tiene un formato específico o si creamos
        // una transacción cuyo ID coincida con el BuyOrder devuelto.
        // Espera, en PaymentGatewayService.cs, la simulación de Commit devuelve:
        // BuyOrder = $"bo_{Guid.NewGuid().ToString("N")[..8]}"
        // Esto no coincide con el Guid de la transacción!
        // Pero en la vida real, el token enviado a Transbank se asocia a la transacción y cuando Transbank
        // responde, devuelve la BuyOrder que enviamos al crearla (que es el ID de la transacción!).
        // Para testear este flujo en el test de unidad con mock:
        // ¿Qué tal si en la simulación de CommitTransbankHoldAsync, si el token contiene el Guid de la transacción,
        // devolvemos ese Guid como BuyOrder?
        // En PaymentGatewayService.cs:
        // if (_useMock || token.StartsWith("tb_token_"))
        // {
        //      // Si el token contiene una subcadena que sea un Guid, lo usamos como BuyOrder!
        // }
        // ¡Esa es una excelente idea para flexibilizar la simulación!
        // Revisemos si podemos extraer el Guid del token en el mock:
        // if (token.Contains("_") && Guid.TryParse(token.Split('_')[^1], out var parsedGuid)) { BuyOrder = parsedGuid.ToString(); }
        // Sí! Modifiquemos esa pequeña parte del mock en PaymentGatewayService.cs para hacer el test de integración
        // robusto y preciso!
        
        var transactionId = Guid.NewGuid();
        var requester = new User
        {
            Id = Guid.NewGuid(),
            Email = "requester@example.com",
            Name = "Requester User"
        };
        await context.Users.AddAsync(requester);

        var book = new Book
        {
            Id = Guid.NewGuid(),
            Title = "El Hobbit",
            BaseValue = 5000.0m
        };
        await context.Books.AddAsync(book);

        var transaction = new MatchTransaction
        {
            Id = transactionId,
            RequesterUserId = requester.Id,
            BookId = book.Id,
            FeeAmount = 1500.0m,
            PaymentStatus = "Pending"
        };
        await context.MatchTransactions.AddAsync(transaction);
        await context.SaveChangesAsync();

        // Creamos un token que contenga el transactionId al final
        var token = $"tb_token_{transactionId}";

        var command = new ConfirmWebpayCheckoutCommand
        {
            Token = token
        };
        var handler = new ConfirmWebpayCheckoutCommandHandler(unitOfWork, paymentService);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.Success);
        Assert.Equal("Hold", result.PaymentStatus);
        Assert.Equal(transactionId.ToString(), result.MatchTransactionId);

        var dbTx = await context.MatchTransactions.FindAsync(transactionId);
        Assert.NotNull(dbTx);
        Assert.Equal("Hold", dbTx.PaymentStatus);
        Assert.Equal(token, dbTx.PaymentHoldId);
    }

    [Fact]
    public async Task GetMyMatches_ShouldReturnTransactionsList_WhenActiveTransactionsExist()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        using var unitOfWork = new UnitOfWork(context);

        var userId = Guid.NewGuid();
        var otherUser = new User
        {
            Id = Guid.NewGuid(),
            Email = "other@example.com",
            Name = "Other User"
        };
        await context.Users.AddAsync(otherUser);

        var me = new User
        {
            Id = userId,
            Email = "me@example.com",
            Name = "Me User"
        };
        await context.Users.AddAsync(me);

        var book = new Book
        {
            Id = Guid.NewGuid(),
            Title = "El señor de los anillos",
            BaseValue = 8000.0m
        };
        await context.Books.AddAsync(book);

        var transaction = new MatchTransaction
        {
            Id = Guid.NewGuid(),
            RequesterUserId = userId,
            BookId = book.Id,
            OwnerUserId = otherUser.Id,
            FeeAmount = 2400.0m,
            PaymentStatus = "Pending",
            LogisticsStatus = "Pending"
        };
        await context.MatchTransactions.AddAsync(transaction);
        await context.SaveChangesAsync();

        var query = new GetMyMatchesQuery(userId);
        var handler = new GetMyMatchesQueryHandler(unitOfWork);

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        var list = Assert.IsAssignableFrom<IEnumerable<MatchTransactionDto>>(result);
        Assert.Single(list);
    }

    [Fact]
    public async Task ConfirmCardCheckout_ShouldFail_WhenIsCrossBorderButAcceptCrossBorderIsFalse()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        using var unitOfWork = new UnitOfWork(context);
        var paymentService = GetMockPaymentService();

        var requester = new User
        {
            Id = Guid.NewGuid(),
            Email = "requester@example.com",
            Name = "Requester User"
        };
        await context.Users.AddAsync(requester);

        var book = new Book
        {
            Id = Guid.NewGuid(),
            Title = "El Hobbit",
            BaseValue = 5000.0m
        };
        await context.Books.AddAsync(book);

        var transaction = new MatchTransaction
        {
            Id = Guid.NewGuid(),
            RequesterUserId = requester.Id,
            BookId = book.Id,
            FeeAmount = 1500.0m,
            PaymentStatus = "Pending",
            IsCrossBorder = true // Transfronterizo
        };
        await context.MatchTransactions.AddAsync(transaction);
        await context.SaveChangesAsync();

        var command = new ConfirmCardCheckoutCommand
        {
            MatchTransactionId = transaction.Id,
            CardToken = "tok_visa_123",
            RequesterUserId = requester.Id,
            AcceptCrossBorder = false // No acepta
        };
        var handler = new ConfirmCardCheckoutCommandHandler(unitOfWork, paymentService);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        Assert.False(result.Success);
        Assert.Contains("costos de envío internacional", result.Message);
        Assert.Equal("Pending", transaction.PaymentStatus); // Sigue pendiente
    }

    [Fact]
    public async Task StartWebpayCheckout_ShouldFail_WhenIsCrossBorderButAcceptCrossBorderIsFalse()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        using var unitOfWork = new UnitOfWork(context);
        var paymentService = GetMockPaymentService();

        var requester = new User
        {
            Id = Guid.NewGuid(),
            Email = "requester@example.com",
            Name = "Requester User"
        };
        await context.Users.AddAsync(requester);

        var book = new Book
        {
            Id = Guid.NewGuid(),
            Title = "El Hobbit",
            BaseValue = 5000.0m
        };
        await context.Books.AddAsync(book);

        var transaction = new MatchTransaction
        {
            Id = Guid.NewGuid(),
            RequesterUserId = requester.Id,
            BookId = book.Id,
            FeeAmount = 1500.0m,
            PaymentStatus = "Pending",
            IsCrossBorder = true // Transfronterizo
        };
        await context.MatchTransactions.AddAsync(transaction);
        await context.SaveChangesAsync();

        var command = new StartWebpayCheckoutCommand
        {
            MatchTransactionId = transaction.Id,
            ReturnUrl = "https://my-app.com/callback",
            RequesterUserId = requester.Id,
            AcceptCrossBorder = false // No acepta
        };
        var handler = new StartWebpayCheckoutCommandHandler(unitOfWork, paymentService);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        Assert.False(result.Success);
        Assert.Contains("costos de envío internacional", result.Message);
    }

    [Fact]
    public async Task UpdateLogistics_ShouldUpdateLogistics_WhenStatusIsHoldAndMethodIsValidP2PWithTracking()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        using var unitOfWork = new UnitOfWork(context);

        var requester = new User
        {
            Id = Guid.NewGuid(),
            Email = "requester@example.com",
            Name = "Requester User"
        };
        await context.Users.AddAsync(requester);

        var book = new Book
        {
            Id = Guid.NewGuid(),
            Title = "El Hobbit",
            BaseValue = 5000.0m
        };
        await context.Books.AddAsync(book);

        var transaction = new MatchTransaction
        {
            Id = Guid.NewGuid(),
            RequesterUserId = requester.Id,
            BookId = book.Id,
            FeeAmount = 1500.0m,
            PaymentStatus = "Hold", // Ya pagó
            LogisticsStatus = "Pending"
        };
        await context.MatchTransactions.AddAsync(transaction);
        await context.SaveChangesAsync();

        var command = new UpdateLogisticsCommand
        {
            MatchTransactionId = transaction.Id,
            LogisticsMethod = "P2P",
            TrackingNumber = "TRK12345678",
            RequesterUserId = requester.Id
        };
        var handler = new UpdateLogisticsCommandHandler(unitOfWork);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.Success);
        Assert.Equal("InTransit", result.LogisticsStatus);
        Assert.Equal("P2P", result.LogisticsMethod);

        var dbTx = await context.MatchTransactions.FindAsync(transaction.Id);
        Assert.NotNull(dbTx);
        Assert.Equal("P2P", dbTx.LogisticsMethod);
        Assert.Equal("InTransit", dbTx.LogisticsStatus);
    }

    [Fact]
    public async Task UpdateLogistics_ShouldFail_WhenStatusIsPending()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        using var unitOfWork = new UnitOfWork(context);

        var requester = new User
        {
            Id = Guid.NewGuid(),
            Email = "requester@example.com",
            Name = "Requester User"
        };
        await context.Users.AddAsync(requester);

        var book = new Book
        {
            Id = Guid.NewGuid(),
            Title = "El Hobbit",
            BaseValue = 5000.0m
        };
        await context.Books.AddAsync(book);

        var transaction = new MatchTransaction
        {
            Id = Guid.NewGuid(),
            RequesterUserId = requester.Id,
            BookId = book.Id,
            FeeAmount = 1500.0m,
            PaymentStatus = "Pending", // No pagado
            LogisticsStatus = "Pending"
        };
        await context.MatchTransactions.AddAsync(transaction);
        await context.SaveChangesAsync();

        var command = new UpdateLogisticsCommand
        {
            MatchTransactionId = transaction.Id,
            LogisticsMethod = "P2P",
            TrackingNumber = "TRK12345678",
            RequesterUserId = requester.Id
        };
        var handler = new UpdateLogisticsCommandHandler(unitOfWork);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        Assert.False(result.Success);
        Assert.Contains("pagar", result.Message);
    }

    [Fact]
    public async Task UpdateLogistics_ShouldFail_WhenMethodIsDonacionButNoEvidence()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        using var unitOfWork = new UnitOfWork(context);

        var requester = new User
        {
            Id = Guid.NewGuid(),
            Email = "requester@example.com",
            Name = "Requester User"
        };
        await context.Users.AddAsync(requester);

        var book = new Book
        {
            Id = Guid.NewGuid(),
            Title = "El Hobbit",
            BaseValue = 5000.0m
        };
        await context.Books.AddAsync(book);

        var transaction = new MatchTransaction
        {
            Id = Guid.NewGuid(),
            RequesterUserId = requester.Id,
            BookId = book.Id,
            FeeAmount = 1500.0m,
            PaymentStatus = "Hold",
            LogisticsStatus = "Pending"
        };
        await context.MatchTransactions.AddAsync(transaction);
        await context.SaveChangesAsync();

        var command = new UpdateLogisticsCommand
        {
            MatchTransactionId = transaction.Id,
            LogisticsMethod = "Donacion",
            RequesterUserId = requester.Id,
            EvidencePhotoBase64 = "" // Vacío
        };
        var handler = new UpdateLogisticsCommandHandler(unitOfWork);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        Assert.False(result.Success);
        Assert.Contains("evidencia", result.Message);
    }
}
