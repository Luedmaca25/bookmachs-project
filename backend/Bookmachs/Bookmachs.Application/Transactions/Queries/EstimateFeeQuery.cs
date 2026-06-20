using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Bookmachs.Domain.Repositories;

namespace Bookmachs.Application.Transactions.Queries;

public class FeeEstimationDto
{
    public Guid BookId { get; set; }
    public string BookTitle { get; set; } = string.Empty;
    public decimal BaseValue { get; set; }
    public decimal FeePercentage { get; set; }
    public decimal RawFee { get; set; }
    public decimal MinFeeAmount { get; set; }
    public decimal MaxFeeAmount { get; set; }
    public decimal FinalFee { get; set; }
    public bool IsCrossBorder { get; set; }
    public string RequesterCountry { get; set; } = string.Empty;
    public string OwnerCountry { get; set; } = string.Empty;
}

public record EstimateFeeQuery : IRequest<FeeEstimationDto>
{
    public Guid BookId { get; init; }
    public Guid RequesterUserId { get; init; }
}

public class EstimateFeeQueryHandler : IRequestHandler<EstimateFeeQuery, FeeEstimationDto>
{
    private readonly IUnitOfWork _unitOfWork;

    public EstimateFeeQueryHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<FeeEstimationDto> Handle(EstimateFeeQuery request, CancellationToken cancellationToken)
    {
        // 1. Obtener el libro
        var book = await _unitOfWork.Books.GetByIdAsync(request.BookId);
        if (book == null)
        {
            throw new KeyNotFoundException($"El libro con ID {request.BookId} no existe.");
        }

        // 2. Obtener el usuario solicitante para comparar países
        var requester = await _unitOfWork.Users.GetByIdAsync(request.RequesterUserId);
        if (requester == null)
        {
            throw new KeyNotFoundException($"El usuario con ID {request.RequesterUserId} no existe.");
        }

        // 3. Obtener configuraciones globales para los parámetros del Fee
        var settings = await _unitOfWork.GlobalSettings.GetSettingsAsync();
        
        // Parámetros por defecto en caso de no existir en la base de datos
        decimal feePercentage = settings?.FeePercentage ?? 0.30m;
        decimal minFee = settings?.MinFeeAmount ?? 1000.0m;
        decimal maxFee = settings?.MaxFeeAmount ?? 9000.0m;

        // 4. Calcular el Fee (30% del BaseValue por defecto, o según settings)
        decimal rawFee = book.BaseValue * feePercentage;
        decimal finalFee = rawFee;

        // Aplicar límites mínimo y máximo configurables
        if (finalFee < minFee)
        {
            finalFee = minFee;
        }
        else if (finalFee > maxFee)
        {
            finalFee = maxFee;
        }

        // Redondear el Fee para evitar decimales extraños
        finalFee = Math.Round(finalFee, 2);
        rawFee = Math.Round(rawFee, 2);

        // 5. Determinar si es una transacción transfronteriza
        bool isCrossBorder = false;
        string ownerCountry = string.Empty;

        if (!book.IsInternalStock && book.OwnerId.HasValue)
        {
            var owner = await _unitOfWork.Users.GetByIdAsync(book.OwnerId.Value);
            if (owner != null)
            {
                ownerCountry = owner.Pais;
                if (!string.IsNullOrEmpty(requester.Pais) && 
                    !string.IsNullOrEmpty(owner.Pais) && 
                    !string.Equals(requester.Pais, owner.Pais, StringComparison.OrdinalIgnoreCase))
                {
                    isCrossBorder = true;
                }
            }
        }

        return new FeeEstimationDto
        {
            BookId = book.Id,
            BookTitle = book.Title,
            BaseValue = book.BaseValue,
            FeePercentage = feePercentage,
            RawFee = rawFee,
            MinFeeAmount = minFee,
            MaxFeeAmount = maxFee,
            FinalFee = finalFee,
            IsCrossBorder = isCrossBorder,
            RequesterCountry = requester.Pais,
            OwnerCountry = ownerCountry
        };
    }
}
