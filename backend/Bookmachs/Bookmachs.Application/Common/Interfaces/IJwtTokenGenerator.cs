using Bookmachs.Domain.Entities;

namespace Bookmachs.Application.Common.Interfaces;

public interface IJwtTokenGenerator
{
    string GenerateToken(User user);
}
