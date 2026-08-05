using Bookmachs.Refactored.Api.Domain.Entities;

namespace Bookmachs.Refactored.Api.Infrastructure.Services;

public interface IJwtTokenGenerator
{
    string GenerateToken(User user);
}

