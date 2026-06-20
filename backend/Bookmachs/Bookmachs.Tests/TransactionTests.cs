using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Application.Transactions.Queries;
using Bookmachs.Domain.Entities;
using Bookmachs.Infrastructure.Persistence;
using Bookmachs.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Bookmachs.Tests;

public class TransactionTests
{
    private BookmachsDbContext GetInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<BookmachsDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new BookmachsDbContext(options);
    }

    [Fact]
    public async Task EstimateFee_ShouldCalculateDefault30Percent_WhenValueIsWithinLimits()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        using var unitOfWork = new UnitOfWork(context);

        // Crear configuración global inicial
        var settings = new GlobalSettings
        {
            FeePercentage = 0.30m,
            MinFeeAmount = 1000.0m,
            MaxFeeAmount = 9000.0m
        };
        await context.GlobalSettings.AddAsync(settings);

        // Crear usuario solicitante
        var requester = new User
        {
            Id = Guid.NewGuid(),
            Email = "requester@example.com",
            Name = "Requester User",
            Pais = "Chile",
            DocumentoIdentidad = "12345678-9"
        };
        await context.Users.AddAsync(requester);

        // Crear libro con BaseValue = 5000 CLP
        // 30% de 5000 = 1500 (dentro de los límites de 1000 y 9000)
        var book = new Book
        {
            Id = Guid.NewGuid(),
            Title = "El Hobbit",
            Author = "J.R.R. Tolkien",
            Condition = "Good",
            BaseValue = 5000.0m,
            IsInternalStock = true
        };
        await context.Books.AddAsync(book);
        await context.SaveChangesAsync();

        var queryHandler = new EstimateFeeQueryHandler(unitOfWork);
        var query = new EstimateFeeQuery
        {
            BookId = book.Id,
            RequesterUserId = requester.Id
        };

        // Act
        var result = await queryHandler.Handle(query, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(5000.0m, result.BaseValue);
        Assert.Equal(0.30m, result.FeePercentage);
        Assert.Equal(1500.0m, result.RawFee);
        Assert.Equal(1500.0m, result.FinalFee);
        Assert.False(result.IsCrossBorder);
    }

    [Fact]
    public async Task EstimateFee_ShouldClampToMinFee_WhenCalculatedFeeIsTooLow()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        using var unitOfWork = new UnitOfWork(context);

        var settings = new GlobalSettings
        {
            FeePercentage = 0.30m,
            MinFeeAmount = 1000.0m,
            MaxFeeAmount = 9000.0m
        };
        await context.GlobalSettings.AddAsync(settings);

        var requester = new User
        {
            Id = Guid.NewGuid(),
            Email = "requester@example.com",
            Name = "Requester User",
            Pais = "Chile",
            DocumentoIdentidad = "12345678-9"
        };
        await context.Users.AddAsync(requester);

        // Crear libro con BaseValue = 2000 CLP
        // 30% de 2000 = 600 (debajo del mínimo de 1000) -> Debe retornar 1000
        var book = new Book
        {
            Id = Guid.NewGuid(),
            Title = "Un libro barato",
            Author = "Autor Falso",
            Condition = "Fair",
            BaseValue = 2000.0m,
            IsInternalStock = true
        };
        await context.Books.AddAsync(book);
        await context.SaveChangesAsync();

        var queryHandler = new EstimateFeeQueryHandler(unitOfWork);
        var query = new EstimateFeeQuery
        {
            BookId = book.Id,
            RequesterUserId = requester.Id
        };

        // Act
        var result = await queryHandler.Handle(query, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(2000.0m, result.BaseValue);
        Assert.Equal(600.0m, result.RawFee);
        Assert.Equal(1000.0m, result.FinalFee); // MinFee clamping
    }

    [Fact]
    public async Task EstimateFee_ShouldClampToMaxFee_WhenCalculatedFeeIsTooHigh()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        using var unitOfWork = new UnitOfWork(context);

        var settings = new GlobalSettings
        {
            FeePercentage = 0.30m,
            MinFeeAmount = 1000.0m,
            MaxFeeAmount = 9000.0m
        };
        await context.GlobalSettings.AddAsync(settings);

        var requester = new User
        {
            Id = Guid.NewGuid(),
            Email = "requester@example.com",
            Name = "Requester User",
            Pais = "Chile",
            DocumentoIdentidad = "12345678-9"
        };
        await context.Users.AddAsync(requester);

        // Crear libro con BaseValue = 40000 CLP
        // 30% de 40000 = 12000 (arriba del máximo de 9000) -> Debe retornar 9000
        var book = new Book
        {
            Id = Guid.NewGuid(),
            Title = "Enciclopedia de Arte Caro",
            Author = "Varios",
            Condition = "New",
            BaseValue = 40000.0m,
            IsInternalStock = true
        };
        await context.Books.AddAsync(book);
        await context.SaveChangesAsync();

        var queryHandler = new EstimateFeeQueryHandler(unitOfWork);
        var query = new EstimateFeeQuery
        {
            BookId = book.Id,
            RequesterUserId = requester.Id
        };

        // Act
        var result = await queryHandler.Handle(query, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(40000.0m, result.BaseValue);
        Assert.Equal(12000.0m, result.RawFee);
        Assert.Equal(9000.0m, result.FinalFee); // MaxFee clamping
    }

    [Fact]
    public async Task EstimateFee_ShouldSetCrossBorderTrue_WhenRequesterAndOwnerAreInDifferentCountries()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        using var unitOfWork = new UnitOfWork(context);

        var settings = new GlobalSettings
        {
            FeePercentage = 0.30m,
            MinFeeAmount = 1000.0m,
            MaxFeeAmount = 9000.0m
        };
        await context.GlobalSettings.AddAsync(settings);

        // Requester en Chile
        var requester = new User
        {
            Id = Guid.NewGuid(),
            Email = "requester@example.com",
            Name = "Requester User",
            Pais = "Chile",
            DocumentoIdentidad = "12345678-9"
        };
        await context.Users.AddAsync(requester);

        // Owner en Argentina
        var owner = new User
        {
            Id = Guid.NewGuid(),
            Email = "owner@example.com",
            Name = "Owner User",
            Pais = "Argentina",
            DocumentoIdentidad = "98765432-1"
        };
        await context.Users.AddAsync(owner);

        // Libro del dueño de Argentina
        var book = new Book
        {
            Id = Guid.NewGuid(),
            Title = "Ficciones",
            Author = "Jorge Luis Borges",
            Condition = "Good",
            BaseValue = 6000.0m,
            IsInternalStock = false,
            OwnerId = owner.Id
        };
        await context.Books.AddAsync(book);
        await context.SaveChangesAsync();

        var queryHandler = new EstimateFeeQueryHandler(unitOfWork);
        var query = new EstimateFeeQuery
        {
            BookId = book.Id,
            RequesterUserId = requester.Id
        };

        // Act
        var result = await queryHandler.Handle(query, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.IsCrossBorder);
        Assert.Equal("Chile", result.RequesterCountry);
        Assert.Equal("Argentina", result.OwnerCountry);
    }
}
