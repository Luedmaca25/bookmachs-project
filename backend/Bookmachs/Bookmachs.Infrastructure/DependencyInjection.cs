using Bookmachs.Domain.Repositories;
using Bookmachs.Infrastructure.Persistence;
using Bookmachs.Infrastructure.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Bookmachs.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<BookmachsDbContext>(options =>
            options.UseSqlServer(
                configuration.GetConnectionString("DefaultConnection"),
                b => b.MigrationsAssembly(typeof(BookmachsDbContext).Assembly.FullName)));

        // Registrar Unit of Work y Repositorios
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<IBookRepository, BookRepository>();
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<IMatchTransactionRepository, MatchTransactionRepository>();
        services.AddScoped<ISubscriptionRepository, SubscriptionRepository>();
        services.AddScoped<IGlobalSettingsRepository, GlobalSettingsRepository>();

        return services;
    }
}
