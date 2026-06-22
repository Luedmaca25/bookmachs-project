using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Application.Social.Queries;
using Bookmachs.Domain.Entities;
using Bookmachs.Infrastructure.Persistence;
using Bookmachs.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Bookmachs.Tests;

public class SocialImpactTests
{
    private BookmachsDbContext GetInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<BookmachsDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new BookmachsDbContext(options);
    }

    [Fact]
    public async Task GetUserImpactMetricsQuery_ShouldThrowKeyNotFoundException_WhenUserDoesNotExist()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        using var unitOfWork = new UnitOfWork(context);

        var query = new GetUserImpactMetricsQuery(Guid.NewGuid());
        var handler = new GetUserImpactMetricsQueryHandler(unitOfWork);

        // Act & Assert
        await Assert.ThrowsAsync<KeyNotFoundException>(() => handler.Handle(query, CancellationToken.None));
    }

    [Fact]
    public async Task GetUserImpactMetricsQuery_ShouldCalculateCorrectMetrics_WhenUserHasExchangesAndDonations()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        using var unitOfWork = new UnitOfWork(context);

        var user = new User { Id = Guid.NewGuid(), Email = "user@example.com", Name = "User" };
        var otherUser1 = new User { Id = Guid.NewGuid(), Email = "other1@example.com", Name = "Other 1" };
        var otherUser2 = new User { Id = Guid.NewGuid(), Email = "other2@example.com", Name = "Other 2" };
        await context.Users.AddRangeAsync(user, otherUser1, otherUser2);

        var book1 = new Book { Id = Guid.NewGuid(), Title = "Book 1", Author = "Author 1", BaseValue = 100, OwnerId = otherUser1.Id };
        var book2 = new Book { Id = Guid.NewGuid(), Title = "Book 2", Author = "Author 2", BaseValue = 100, OwnerId = user.Id };
        var book3 = new Book { Id = Guid.NewGuid(), Title = "Book 3", Author = "Author 3", BaseValue = 100, OwnerId = otherUser2.Id };
        await context.Books.AddRangeAsync(book1, book2, book3);

        // Transacción 1: Intercambio P2P completado del usuario actual (Solicitante)
        var tx1 = new MatchTransaction
        {
            Id = Guid.NewGuid(),
            RequesterUserId = user.Id,
            OwnerUserId = otherUser1.Id,
            BookId = book1.Id,
            LogisticsMethod = "P2P",
            LogisticsStatus = "Delivered",
            PaymentStatus = "Hold",
            CreatedAt = DateTime.UtcNow
        };

        // Transacción 2: Donación completada del usuario actual (Propietario)
        var tx2 = new MatchTransaction
        {
            Id = Guid.NewGuid(),
            RequesterUserId = otherUser1.Id,
            OwnerUserId = user.Id,
            BookId = book2.Id,
            LogisticsMethod = "Donacion",
            LogisticsStatus = "Delivered",
            PaymentStatus = "Hold",
            CreatedAt = DateTime.UtcNow
        };

        // Transacción 3: Intercambio completado ajeno al usuario (Comunidad únicamente)
        var tx3 = new MatchTransaction
        {
            Id = Guid.NewGuid(),
            RequesterUserId = otherUser1.Id,
            OwnerUserId = otherUser2.Id,
            BookId = book3.Id,
            LogisticsMethod = "Presencial",
            LogisticsStatus = "Delivered",
            PaymentStatus = "Hold",
            CreatedAt = DateTime.UtcNow
        };

        // Transacción 4: Transacción pendiente (no completada, no debe contar)
        var tx4 = new MatchTransaction
        {
            Id = Guid.NewGuid(),
            RequesterUserId = user.Id,
            OwnerUserId = otherUser2.Id,
            BookId = book3.Id,
            LogisticsMethod = "P2P",
            LogisticsStatus = "Pending",
            PaymentStatus = "Pending",
            CreatedAt = DateTime.UtcNow
        };

        await context.MatchTransactions.AddRangeAsync(tx1, tx2, tx3, tx4);
        await context.SaveChangesAsync();

        var query = new GetUserImpactMetricsQuery(user.Id);
        var handler = new GetUserImpactMetricsQueryHandler(unitOfWork);

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        
        // Métricas de usuario: 1 intercambio + 1 donación = 2 libros totales
        Assert.Equal(1, result.UserBooksExchanged);
        Assert.Equal(1, result.UserBooksDonated);
        Assert.Equal(2, result.UserTotalBooks);
        
        // Huella de Carbono = 2 * 0.4 * 2.71 = 2.17 kg
        Assert.Equal(2.17, result.UserCo2AvoidedKg);
        // Árboles equivalentes = 2.17 / 22.0 = 0.10
        Assert.Equal(0.10, result.UserEquivalentTrees);

        // Métricas de comunidad: tx1 + tx2 + tx3 = 3 libros totales (tx4 se descarta por Pending)
        Assert.Equal(3, result.CommunityTotalBooks);
        // Huella de Carbono Comunidad = 3 * 0.4 * 2.71 = 3.25 kg
        Assert.Equal(3.25, result.CommunityCo2AvoidedKg);
        // Árboles equivalentes comunidad = 3.25 / 22.0 = 0.15
        Assert.Equal(0.15, result.CommunityEquivalentTrees);
    }

    [Fact]
    public async Task GetGlobalExchangeHistoryQuery_ShouldReturnOnlyDeliveredTransactionsSortedByDate()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        using var unitOfWork = new UnitOfWork(context);

        var userA = new User { Id = Guid.NewGuid(), Email = "usera@example.com", Name = "User A" };
        var userB = new User { Id = Guid.NewGuid(), Email = "userb@example.com", Name = "User B" };
        await context.Users.AddRangeAsync(userA, userB);

        var book1 = new Book { Id = Guid.NewGuid(), Title = "Book 1", Author = "Author 1", BaseValue = 100, OwnerId = userB.Id };
        var book2 = new Book { Id = Guid.NewGuid(), Title = "Book 2", Author = "Author 2", BaseValue = 120, OwnerId = userA.Id };
        await context.Books.AddRangeAsync(book1, book2);

        // Transacción 1: Completada hace 2 horas (Presencial)
        var tx1 = new MatchTransaction
        {
            Id = Guid.NewGuid(),
            RequesterUserId = userA.Id,
            OwnerUserId = userB.Id,
            BookId = book1.Id,
            LogisticsMethod = "Presencial",
            LogisticsStatus = "Delivered",
            PaymentStatus = "Hold",
            CreatedAt = DateTime.UtcNow.AddHours(-3),
            StatusUpdatedAt = DateTime.UtcNow.AddHours(-2)
        };

        // Transacción 2: Completada hace 1 hora (Donación)
        var tx2 = new MatchTransaction
        {
            Id = Guid.NewGuid(),
            RequesterUserId = userB.Id,
            OwnerUserId = null,
            BookId = book2.Id,
            LogisticsMethod = "Donacion",
            LogisticsStatus = "Delivered",
            PaymentStatus = "Hold",
            CreatedAt = DateTime.UtcNow.AddHours(-2),
            StatusUpdatedAt = DateTime.UtcNow.AddHours(-1)
        };

        // Transacción 3: Pendiente (no debe aparecer en el historial global)
        var tx3 = new MatchTransaction
        {
            Id = Guid.NewGuid(),
            RequesterUserId = userA.Id,
            OwnerUserId = userB.Id,
            BookId = book1.Id,
            LogisticsMethod = "P2P",
            LogisticsStatus = "Pending",
            PaymentStatus = "Pending",
            CreatedAt = DateTime.UtcNow,
            StatusUpdatedAt = DateTime.UtcNow
        };

        var event1 = new TimelineEvent
        {
            Id = Guid.NewGuid(),
            MatchTransactionId = tx1.Id,
            MatchTransaction = tx1,
            EventType = "Exchange",
            Title = "Intercambio completado",
            Description = "Intercambio realizado",
            CreatedAt = DateTime.UtcNow.AddHours(-2)
        };

        var event2 = new TimelineEvent
        {
            Id = Guid.NewGuid(),
            MatchTransactionId = tx2.Id,
            MatchTransaction = tx2,
            EventType = "Donation",
            Title = "Donación completada",
            Description = "Donación realizada",
            CreatedAt = DateTime.UtcNow.AddHours(-1)
        };

        await context.MatchTransactions.AddRangeAsync(tx1, tx2, tx3);
        await context.TimelineEvents.AddRangeAsync(event1, event2);
        await context.SaveChangesAsync();

        var query = new GetGlobalExchangeHistoryQuery();
        var handler = new GetGlobalExchangeHistoryQueryHandler(unitOfWork);

        // Act
        var result = (await handler.Handle(query, CancellationToken.None)).ToList();

        // Assert
        Assert.NotNull(result);
        Assert.Equal(2, result.Count);

        // Orden descendente por CreatedAt: event2 primero (hace 1 hora), luego event1 (hace 2 horas)
        Assert.Equal(event2.Id, result[0].Id);
        Assert.Equal("User B", result[0].RequesterName);
        Assert.Equal("Bookmachs (Donación)", result[0].OwnerName);
        Assert.Equal("Book 2", result[0].BookTitle);
        Assert.Equal("Donacion", result[0].LogisticsMethod);

        Assert.Equal(event1.Id, result[1].Id);
        Assert.Equal("User A", result[1].RequesterName);
        Assert.Equal("User B", result[1].OwnerName);
        Assert.Equal("Book 1", result[1].BookTitle);
        Assert.Equal("Presencial", result[1].LogisticsMethod);
    }

    [Fact]
    public async Task AddTimelineReviewCommand_ShouldSuccessfullyAddReview_WhenUserIsParticipant()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        using var unitOfWork = new UnitOfWork(context);

        var requester = new User { Id = Guid.NewGuid(), Email = "requester@example.com", Name = "Requester" };
        var owner = new User { Id = Guid.NewGuid(), Email = "owner@example.com", Name = "Owner" };
        await context.Users.AddRangeAsync(requester, owner);

        var book = new Book { Id = Guid.NewGuid(), Title = "Book", Author = "Author", BaseValue = 100, OwnerId = owner.Id };
        await context.Books.AddAsync(book);

        var tx = new MatchTransaction
        {
            Id = Guid.NewGuid(),
            RequesterUserId = requester.Id,
            OwnerUserId = owner.Id,
            BookId = book.Id,
            LogisticsMethod = "P2P",
            LogisticsStatus = "Delivered",
            PaymentStatus = "Hold"
        };
        await context.MatchTransactions.AddAsync(tx);

        var ev = new TimelineEvent
        {
            Id = Guid.NewGuid(),
            MatchTransactionId = tx.Id,
            MatchTransaction = tx,
            EventType = "Exchange",
            Title = "Title",
            Description = "Description"
        };
        await context.TimelineEvents.AddAsync(ev);
        await context.SaveChangesAsync();

        var command = new Bookmachs.Application.Social.Commands.AddTimelineReviewCommand
        {
            TimelineEventId = ev.Id,
            UserId = requester.Id, // Participante
            ReviewComment = "¡Increíble servicio!",
            ReviewRating = 5
        };
        var handler = new Bookmachs.Application.Social.Commands.AddTimelineReviewCommandHandler(unitOfWork);

        // Act
        var result = await handler.Handle(command, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.Success);

        var dbEv = await context.TimelineEvents.FindAsync(ev.Id);
        Assert.NotNull(dbEv);
        Assert.Equal("¡Increíble servicio!", dbEv.ReviewComment);
        Assert.Equal(5, dbEv.ReviewRating);
    }

    [Fact]
    public async Task AddTimelineReviewCommand_ShouldThrowUnauthorizedAccessException_WhenUserIsNotParticipant()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        using var unitOfWork = new UnitOfWork(context);

        var requester = new User { Id = Guid.NewGuid(), Email = "requester@example.com", Name = "Requester" };
        var owner = new User { Id = Guid.NewGuid(), Email = "owner@example.com", Name = "Owner" };
        var stranger = new User { Id = Guid.NewGuid(), Email = "stranger@example.com", Name = "Stranger" };
        await context.Users.AddRangeAsync(requester, owner, stranger);

        var book = new Book { Id = Guid.NewGuid(), Title = "Book", Author = "Author", BaseValue = 100, OwnerId = owner.Id };
        await context.Books.AddAsync(book);

        var tx = new MatchTransaction
        {
            Id = Guid.NewGuid(),
            RequesterUserId = requester.Id,
            OwnerUserId = owner.Id,
            BookId = book.Id,
            LogisticsMethod = "P2P",
            LogisticsStatus = "Delivered",
            PaymentStatus = "Hold"
        };
        await context.MatchTransactions.AddAsync(tx);

        var ev = new TimelineEvent
        {
            Id = Guid.NewGuid(),
            MatchTransactionId = tx.Id,
            MatchTransaction = tx,
            EventType = "Exchange",
            Title = "Title",
            Description = "Description"
        };
        await context.TimelineEvents.AddAsync(ev);
        await context.SaveChangesAsync();

        var command = new Bookmachs.Application.Social.Commands.AddTimelineReviewCommand
        {
            TimelineEventId = ev.Id,
            UserId = stranger.Id, // No es participante
            ReviewComment = "Intento hack",
            ReviewRating = 1
        };
        var handler = new Bookmachs.Application.Social.Commands.AddTimelineReviewCommandHandler(unitOfWork);

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => handler.Handle(command, CancellationToken.None));
    }
}
