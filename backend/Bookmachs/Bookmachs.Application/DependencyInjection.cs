using Microsoft.Extensions.DependencyInjection;

namespace Bookmachs.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(typeof(DependencyInjection).Assembly);
        });

        services.AddTransient<Books.Jobs.CleanupBooksJob>();

        return services;
    }
}
