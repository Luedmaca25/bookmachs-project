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
}
