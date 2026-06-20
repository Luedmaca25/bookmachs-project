using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Application.Common.Interfaces;
using Bookmachs.Domain.Repositories;
using MediatR;

namespace Bookmachs.Application.Authentication.Commands;

public record UpdateProfileCommand : IRequest<AuthResponseDto>
{
    public Guid UserId { get; init; }
    public string DocumentoIdentidad { get; init; } = string.Empty;
    public string Pais { get; init; } = string.Empty;
}

public class UpdateProfileCommandHandler : IRequestHandler<UpdateProfileCommand, AuthResponseDto>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;

    public UpdateProfileCommandHandler(IUnitOfWork unitOfWork, IJwtTokenGenerator jwtTokenGenerator)
    {
        _unitOfWork = unitOfWork;
        _jwtTokenGenerator = jwtTokenGenerator;
    }

    public async Task<AuthResponseDto> Handle(UpdateProfileCommand request, CancellationToken cancellationToken)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(request.UserId);
        if (user == null)
        {
            throw new KeyNotFoundException("Usuario no encontrado.");
        }

        user.DocumentoIdentidad = request.DocumentoIdentidad;
        user.Pais = request.Pais;

        _unitOfWork.Users.Update(user);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var token = _jwtTokenGenerator.GenerateToken(user);

        return new AuthResponseDto
        {
            Id = user.Id,
            Email = user.Email,
            Name = user.Name,
            DocumentoIdentidad = user.DocumentoIdentidad,
            Pais = user.Pais,
            Role = user.Role,
            IsPremium = user.IsPremium,
            Token = token
        };
    }
}
