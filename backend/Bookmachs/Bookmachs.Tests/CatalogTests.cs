using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Application.Books.Queries;
using Bookmachs.Domain.Entities;
using Bookmachs.Infrastructure.Persistence;
using Bookmachs.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Bookmachs.Tests;

public class CatalogTests
{
    private BookmachsDbContext GetInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<BookmachsDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new BookmachsDbContext(options);
    }

    [Fact]
    public async Task GetAdvancedCatalogQuery_ShouldThrowUnauthorizedAccessException_WhenUserIsNotPremium()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        using var unitOfWork = new UnitOfWork(context);

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = "freeuser@example.com",
            Name = "Free User",
            IsPremium = false
        };
        await context.Users.AddAsync(user);
        await context.SaveChangesAsync();

        var query = new GetAdvancedCatalogQuery(UserId: user.Id);
        var handler = new GetAdvancedCatalogQueryHandler(unitOfWork);

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => handler.Handle(query, CancellationToken.None));
    }

    [Fact]
    public async Task GetAdvancedCatalogQuery_ShouldReturnCorrectBooks_WhenUserIsPremiumAndNoFiltersApplied()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        using var unitOfWork = new UnitOfWork(context);

        var premiumUser = new User
        {
            Id = Guid.NewGuid(),
            Email = "premium@example.com",
            Name = "Premium User",
            IsPremium = true
        };
        await context.Users.AddAsync(premiumUser);

        var otherUser = new User
        {
            Id = Guid.NewGuid(),
            Email = "other@example.com",
            Name = "Other User",
            IsPremium = false
        };
        await context.Users.AddAsync(otherUser);

        var book1 = new Book
        {
            Id = Guid.NewGuid(),
            Title = "Don Quijote",
            Author = "Cervantes",
            Description = "Novela clásica española de aventuras y caballería",
            Condition = "Good",
            BaseValue = 15000,
            IsAvailable = true,
            OwnerId = otherUser.Id
        };
        var book2 = new Book
        {
            Id = Guid.NewGuid(),
            Title = "El Hobbit",
            Author = "Tolkien",
            Description = "Fantasía heroica de la Tierra Media",
            Condition = "Excellent",
            BaseValue = 20000,
            IsAvailable = true,
            OwnerId = otherUser.Id
        };
        await context.Books.AddRangeAsync(book1, book2);
        await context.SaveChangesAsync();

        var query = new GetAdvancedCatalogQuery(UserId: premiumUser.Id);
        var handler = new GetAdvancedCatalogQueryHandler(unitOfWork);

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(2, result.TotalCount);
        Assert.Equal(2, result.Items.Count());
        Assert.Equal(1, result.TotalPages);
        Assert.Contains(result.Items, b => b.Title == "Don Quijote");
        Assert.Contains(result.Items, b => b.Title == "El Hobbit");
    }

    [Fact]
    public async Task GetAdvancedCatalogQuery_ShouldExcludeOwnBooks()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        using var unitOfWork = new UnitOfWork(context);

        var premiumUser = new User
        {
            Id = Guid.NewGuid(),
            Email = "premium@example.com",
            Name = "Premium User",
            IsPremium = true
        };
        await context.Users.AddAsync(premiumUser);

        var otherUser = new User
        {
            Id = Guid.NewGuid(),
            Email = "other@example.com",
            Name = "Other User",
            IsPremium = false
        };
        await context.Users.AddAsync(otherUser);

        // Libro propio
        var ownBook = new Book
        {
            Id = Guid.NewGuid(),
            Title = "Mi Libro Propio",
            Author = "Yo",
            Condition = "Excellent",
            BaseValue = 10000,
            IsAvailable = true,
            OwnerId = premiumUser.Id
        };

        // Libro ajeno
        var otherBook = new Book
        {
            Id = Guid.NewGuid(),
            Title = "Libro del Otro",
            Author = "Otro Autor",
            Condition = "Good",
            BaseValue = 12000,
            IsAvailable = true,
            OwnerId = otherUser.Id
        };
        await context.Books.AddRangeAsync(ownBook, otherBook);
        await context.SaveChangesAsync();

        var query = new GetAdvancedCatalogQuery(UserId: premiumUser.Id);
        var handler = new GetAdvancedCatalogQueryHandler(unitOfWork);

        // Act
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        Assert.Single(result.Items);
        Assert.Equal("Libro del Otro", result.Items.First().Title);
    }

    [Fact]
    public async Task GetAdvancedCatalogQuery_ShouldFilterBySearchTerm()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        using var unitOfWork = new UnitOfWork(context);

        var premiumUser = new User
        {
            Id = Guid.NewGuid(),
            IsPremium = true
        };
        await context.Users.AddAsync(premiumUser);

        var otherUser = new User
        {
            Id = Guid.NewGuid()
        };
        await context.Users.AddAsync(otherUser);

        var book1 = new Book
        {
            Id = Guid.NewGuid(),
            Title = "El Hobbit",
            Author = "J.R.R. Tolkien",
            Description = "Libro de fantasía",
            Condition = "Good",
            OwnerId = otherUser.Id
        };
        var book2 = new Book
        {
            Id = Guid.NewGuid(),
            Title = "El Silmarillion",
            Author = "J.R.R. Tolkien",
            Description = "Mitología de la Tierra Media",
            Condition = "Excellent",
            OwnerId = otherUser.Id
        };
        var book3 = new Book
        {
            Id = Guid.NewGuid(),
            Title = "Harry Potter",
            Author = "J.K. Rowling",
            Description = "Libro de magia y hechicería",
            Condition = "Excellent",
            OwnerId = otherUser.Id
        };
        await context.Books.AddRangeAsync(book1, book2, book3);
        await context.SaveChangesAsync();

        var handler = new GetAdvancedCatalogQueryHandler(unitOfWork);

        // Act - Buscar por término
        var query1 = new GetAdvancedCatalogQuery(UserId: premiumUser.Id, SearchTerm: "Tolkien");
        var result1 = await handler.Handle(query1, CancellationToken.None);

        var query2 = new GetAdvancedCatalogQuery(UserId: premiumUser.Id, SearchTerm: "magia");
        var result2 = await handler.Handle(query2, CancellationToken.None);

        // Assert
        Assert.Equal(2, result1.TotalCount);
        Assert.Contains(result1.Items, b => b.Title == "El Hobbit");
        Assert.Contains(result1.Items, b => b.Title == "El Silmarillion");

        Assert.Single(result2.Items);
        Assert.Equal("Harry Potter", result2.Items.First().Title);
    }

    [Fact]
    public async Task GetAdvancedCatalogQuery_ShouldFilterByCategory()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        using var unitOfWork = new UnitOfWork(context);

        var premiumUser = new User
        {
            Id = Guid.NewGuid(),
            IsPremium = true
        };
        await context.Users.AddAsync(premiumUser);

        var otherUser = new User
        {
            Id = Guid.NewGuid()
        };
        await context.Users.AddAsync(otherUser);

        var book1 = new Book
        {
            Id = Guid.NewGuid(),
            Title = "Fundación e Imperio",
            Author = "Isaac Asimov",
            Description = "Novela de Ciencia Ficción y viajes en el espacio",
            Condition = "Good",
            OwnerId = otherUser.Id
        };
        var book2 = new Book
        {
            Id = Guid.NewGuid(),
            Title = "El Hobbit",
            Author = "Tolkien",
            Description = "Fantasía épica medieval",
            Condition = "Excellent",
            OwnerId = otherUser.Id
        };
        await context.Books.AddRangeAsync(book1, book2);
        await context.SaveChangesAsync();

        var handler = new GetAdvancedCatalogQueryHandler(unitOfWork);

        // Act - Filtrar por categoría "Ciencia Ficción"
        var query = new GetAdvancedCatalogQuery(UserId: premiumUser.Id, Category: "Ciencia Ficción");
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        Assert.Single(result.Items);
        Assert.Equal("Fundación e Imperio", result.Items.First().Title);
    }

    [Fact]
    public async Task GetAdvancedCatalogQuery_ShouldFilterByCondition()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        using var unitOfWork = new UnitOfWork(context);

        var premiumUser = new User
        {
            Id = Guid.NewGuid(),
            IsPremium = true
        };
        await context.Users.AddAsync(premiumUser);

        var otherUser = new User
        {
            Id = Guid.NewGuid()
        };
        await context.Users.AddAsync(otherUser);

        var book1 = new Book
        {
            Id = Guid.NewGuid(),
            Title = "Book Excellent",
            Author = "Author A",
            Condition = "Excellent",
            OwnerId = otherUser.Id
        };
        var book2 = new Book
        {
            Id = Guid.NewGuid(),
            Title = "Book Good",
            Author = "Author B",
            Condition = "Good",
            OwnerId = otherUser.Id
        };
        await context.Books.AddRangeAsync(book1, book2);
        await context.SaveChangesAsync();

        var handler = new GetAdvancedCatalogQueryHandler(unitOfWork);

        // Act
        var query = new GetAdvancedCatalogQuery(UserId: premiumUser.Id, Condition: "Excellent");
        var result = await handler.Handle(query, CancellationToken.None);

        // Assert
        Assert.Single(result.Items);
        Assert.Equal("Book Excellent", result.Items.First().Title);
    }

    [Fact]
    public async Task GetAdvancedCatalogQuery_ShouldSortAndPaginateCorrectly()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        using var unitOfWork = new UnitOfWork(context);

        var premiumUser = new User
        {
            Id = Guid.NewGuid(),
            IsPremium = true
        };
        await context.Users.AddAsync(premiumUser);

        var otherUser = new User
        {
            Id = Guid.NewGuid()
        };
        await context.Users.AddAsync(otherUser);

        var book1 = new Book
        {
            Id = Guid.NewGuid(),
            Title = "A Book",
            Author = "Author 1",
            Condition = "Good",
            BaseValue = 100,
            OwnerId = otherUser.Id,
            CreatedAt = DateTime.UtcNow.AddMinutes(-10)
        };
        var book2 = new Book
        {
            Id = Guid.NewGuid(),
            Title = "B Book",
            Author = "Author 2",
            Condition = "Good",
            BaseValue = 200,
            OwnerId = otherUser.Id,
            CreatedAt = DateTime.UtcNow.AddMinutes(-5)
        };
        var book3 = new Book
        {
            Id = Guid.NewGuid(),
            Title = "C Book",
            Author = "Author 3",
            Condition = "Good",
            BaseValue = 300,
            OwnerId = otherUser.Id,
            CreatedAt = DateTime.UtcNow
        };
        await context.Books.AddRangeAsync(book1, book2, book3);
        await context.SaveChangesAsync();

        var handler = new GetAdvancedCatalogQueryHandler(unitOfWork);

        // Act - Ordenar por novedad desc (Recién llegados), Pagina 1, Tamaño 2
        var query1 = new GetAdvancedCatalogQuery(UserId: premiumUser.Id, SortBy: "createdAt", PageNumber: 1, PageSize: 2);
        var result1 = await handler.Handle(query1, CancellationToken.None);

        // Act - Ordenar por novedad desc, Pagina 2, Tamaño 2
        var query2 = new GetAdvancedCatalogQuery(UserId: premiumUser.Id, SortBy: "createdAt", PageNumber: 2, PageSize: 2);
        var result2 = await handler.Handle(query2, CancellationToken.None);

        // Assert
        Assert.Equal(3, result1.TotalCount);
        Assert.Equal(2, result1.Items.Count());
        Assert.Equal(2, result1.TotalPages);

        // Recién llegados: el último creado (book3) y el anterior (book2) deben estar en la pág 1
        var items1 = result1.Items.ToList();
        Assert.Equal("C Book", items1[0].Title);
        Assert.Equal("B Book", items1[1].Title);

        // En la página 2 debe estar el más antiguo (book1)
        Assert.Single(result2.Items);
        Assert.Equal("A Book", result2.Items.First().Title);
    }
}
