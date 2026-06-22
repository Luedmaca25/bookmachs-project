using System;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Domain.Repositories;
using MediatR;

namespace Bookmachs.Application.Authentication.Queries;

public class UserProfileDto
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string DocumentoIdentidad { get; set; } = string.Empty;
    public string Pais { get; set; } = string.Empty;
    public bool IsPremium { get; set; }
    public string SubscriptionPlan { get; set; } = "Free";
    public string Role { get; set; } = "User";
}

public record GetUserProfileQuery(Guid UserId) : IRequest<UserProfileDto>;

public class GetUserProfileQueryHandler : IRequestHandler<GetUserProfileQuery, UserProfileDto>
{
    private readonly IUnitOfWork _unitOfWork;

    public GetUserProfileQueryHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<UserProfileDto> Handle(GetUserProfileQuery request, CancellationToken cancellationToken)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(request.UserId);
        if (user == null)
        {
            throw new KeyNotFoundException($"El usuario con ID {request.UserId} no existe.");
        }

        return new UserProfileDto
        {
            Id = user.Id,
            Email = user.Email,
            Name = user.Name,
            DocumentoIdentidad = user.DocumentoIdentidad,
            Pais = user.Pais,
            IsPremium = user.IsPremium,
            SubscriptionPlan = user.SubscriptionPlan,
            Role = user.Role
        };
    }
}
