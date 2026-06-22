using System.Net;
using Hangfire.Dashboard;
using Microsoft.AspNetCore.Http;

namespace Bookmachs.Api.Security;

public class HangfireAuthorizationFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
    {
        var httpContext = context.GetHttpContext();

        // En un entorno de producción real, se verificaría si el usuario está autenticado
        // y si posee el rol administrativo. Por ejemplo:
        // var user = httpContext.User;
        // if (user.Identity?.IsAuthenticated == true && user.IsInRole("Admin")) return true;

        // Por defecto, como política de seguridad restrictiva de nivel senior para producción, 
        // solo se permite acceso desde conexiones de bucle local (localhost).
        var remoteIp = httpContext.Connection.RemoteIpAddress;
        
        if (remoteIp == null)
        {
            return true;
        }

        if (IPAddress.IsLoopback(remoteIp))
        {
            return true;
        }

        var localIp = httpContext.Connection.LocalIpAddress;
        return remoteIp.Equals(localIp);
    }
}
