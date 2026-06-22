using Bookmachs.Application.Common.Interfaces;
using Bookmachs.Domain.Repositories;
using Bookmachs.Domain.Services;
using Bookmachs.Infrastructure.Persistence;
using Bookmachs.Infrastructure.Repositories;
using Bookmachs.Infrastructure.Services;
using Bookmachs.Infrastructure.Payments;
using Hangfire;
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
        services.AddScoped<IMasterPreferenceTagRepository, MasterPreferenceTagRepository>();
        services.AddScoped<ITimelineEventRepository, TimelineEventRepository>();

        // Registrar Servicios de Autenticación y Seguridad
        services.AddMemoryCache();
        services.AddScoped<ICacheService, MemoryCacheService>();
        services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();
        services.AddScoped<IPasswordHasher, PasswordHasher>();
        services.AddScoped<IFileStorageService, LocalFileStorageService>();
        services.AddScoped<IPaymentGatewayService, PaymentGatewayService>();

        // Registrar Hangfire con SqlServer Storage
        services.AddHangfire(config => config
            .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
            .UseSimpleAssemblyNameTypeSerializer()
            .UseRecommendedSerializerSettings()
            .UseSqlServerStorage(
                configuration.GetConnectionString("DefaultConnection"),
                new Hangfire.SqlServer.SqlServerStorageOptions
                {
                    CommandBatchMaxTimeout = TimeSpan.FromMinutes(5),
                    SlidingInvisibilityTimeout = TimeSpan.FromMinutes(5),
                    QueuePollInterval = TimeSpan.FromSeconds(15),
                    UseRecommendedIsolationLevel = true,
                    DisableGlobalLocks = true
                }));

        services.AddHangfireServer();

        return services;
    }
}
