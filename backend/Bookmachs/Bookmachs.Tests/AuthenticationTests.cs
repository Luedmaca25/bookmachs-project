using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Application.Authentication.Commands;
using Bookmachs.Infrastructure.Persistence;
using Bookmachs.Infrastructure.Repositories;
using Bookmachs.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace Bookmachs.Tests;

public class AuthenticationTests
{
    private BookmachsDbContext GetInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<BookmachsDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        return new BookmachsDbContext(options);
    }

    private IConfiguration GetMockConfiguration()
    {
        var inMemorySettings = new Dictionary<string, string?> {
            {"Jwt:Secret", "SuperSecretKeyForBookmachsJWTAuthentication2026!"},
            {"Jwt:Issuer", "BookmachsApi"},
            {"Jwt:Audience", "BookmachsClients"},
            {"Jwt:ExpiryInMinutes", "1440"}
        };

        return new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();
    }

    [Fact]
    public async Task Register_ShouldCreateUserAndReturnToken_WhenDataIsValid()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        using var unitOfWork = new UnitOfWork(context);
        var passwordHasher = new PasswordHasher();
        var jwtTokenGenerator = new JwtTokenGenerator(GetMockConfiguration());

        var registerHandler = new RegisterUserCommandHandler(unitOfWork, passwordHasher, jwtTokenGenerator);
        var registerCommand = new RegisterUserCommand
        {
            Email = "test@example.com",
            Password = "SecurePassword123!",
            Name = "John Doe",
            DocumentoIdentidad = "12.345.678-9",
            Pais = "Chile"
        };

        // Act
        var result = await registerHandler.Handle(registerCommand, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("test@example.com", result.Email);
        Assert.Equal("John Doe", result.Name);
        Assert.Equal("12.345.678-9", result.DocumentoIdentidad);
        Assert.Equal("Chile", result.Pais);
        Assert.NotEmpty(result.Token);
    }

    [Fact]
    public async Task Login_ShouldReturnToken_WhenCredentialsAreValid()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        using var unitOfWork = new UnitOfWork(context);
        var passwordHasher = new PasswordHasher();
        var jwtTokenGenerator = new JwtTokenGenerator(GetMockConfiguration());

        var registerHandler = new RegisterUserCommandHandler(unitOfWork, passwordHasher, jwtTokenGenerator);
        var loginHandler = new LoginUserCommandHandler(unitOfWork, passwordHasher, jwtTokenGenerator);

        var registerCommand = new RegisterUserCommand
        {
            Email = "login_test@example.com",
            Password = "MyPassword123!",
            Name = "Alice Smith",
            DocumentoIdentidad = "87654321-K",
            Pais = "Chile"
        };

        // Registrar primero
        await registerHandler.Handle(registerCommand, CancellationToken.None);

        var loginCommand = new LoginUserCommand
        {
            Email = "login_test@example.com",
            Password = "MyPassword123!"
        };

        // Act
        var result = await loginHandler.Handle(loginCommand, CancellationToken.None);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("login_test@example.com", result.Email);
        Assert.NotEmpty(result.Token);
    }

    [Fact]
    public async Task Login_ShouldThrowUnauthorized_WhenPasswordIsIncorrect()
    {
        // Arrange
        using var context = GetInMemoryDbContext();
        using var unitOfWork = new UnitOfWork(context);
        var passwordHasher = new PasswordHasher();
        var jwtTokenGenerator = new JwtTokenGenerator(GetMockConfiguration());

        var registerHandler = new RegisterUserCommandHandler(unitOfWork, passwordHasher, jwtTokenGenerator);
        var loginHandler = new LoginUserCommandHandler(unitOfWork, passwordHasher, jwtTokenGenerator);

        var registerCommand = new RegisterUserCommand
        {
            Email = "wrong_pass@example.com",
            Password = "CorrectPassword123!",
            Name = "Bob Builder",
            DocumentoIdentidad = "11111111-1",
            Pais = "Chile"
        };

        await registerHandler.Handle(registerCommand, CancellationToken.None);

        var loginCommand = new LoginUserCommand
        {
            Email = "wrong_pass@example.com",
            Password = "WrongPassword123!"
        };

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() =>
            loginHandler.Handle(loginCommand, CancellationToken.None));
    }
}
