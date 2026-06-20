using System;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Domain.Repositories;
using MediatR;

namespace Bookmachs.Application.GlobalSettings.Commands;

public record UpdateGlobalSettingsCommand : IRequest<GlobalSettingsDto>
{
    public int DailySwipeLimitFree { get; init; }
    public int DailySwipeLimitPremium { get; init; }
    public decimal BasicPlanPriceUsd { get; init; }
    public decimal PremiumPlanPriceUsd { get; init; }
    public decimal FeePercentage { get; init; }
    public decimal MinFeeAmount { get; init; }
    public decimal MaxFeeAmount { get; init; }
}

public class UpdateGlobalSettingsCommandHandler : IRequestHandler<UpdateGlobalSettingsCommand, GlobalSettingsDto>
{
    private readonly IUnitOfWork _unitOfWork;

    public UpdateGlobalSettingsCommandHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<GlobalSettingsDto> Handle(UpdateGlobalSettingsCommand request, CancellationToken cancellationToken)
    {
        var settings = await _unitOfWork.GlobalSettings.GetSettingsAsync();

        if (settings == null)
        {
            settings = new Domain.Entities.GlobalSettings();
            await _unitOfWork.GlobalSettings.AddAsync(settings);
        }

        // Actualizar parámetros
        settings.DailySwipeLimitFree = request.DailySwipeLimitFree;
        settings.DailySwipeLimitPremium = request.DailySwipeLimitPremium;
        settings.BasicPlanPriceUsd = request.BasicPlanPriceUsd;
        settings.PremiumPlanPriceUsd = request.PremiumPlanPriceUsd;
        settings.FeePercentage = request.FeePercentage;
        settings.MinFeeAmount = request.MinFeeAmount;
        settings.MaxFeeAmount = request.MaxFeeAmount;
        settings.LastUpdatedAt = DateTime.UtcNow;

        _unitOfWork.GlobalSettings.Update(settings);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new GlobalSettingsDto
        {
            Id = settings.Id,
            DailySwipeLimitFree = settings.DailySwipeLimitFree,
            DailySwipeLimitPremium = settings.DailySwipeLimitPremium,
            BasicPlanPriceUsd = settings.BasicPlanPriceUsd,
            PremiumPlanPriceUsd = settings.PremiumPlanPriceUsd,
            FeePercentage = settings.FeePercentage,
            MinFeeAmount = settings.MinFeeAmount,
            MaxFeeAmount = settings.MaxFeeAmount,
            LastUpdatedAt = settings.LastUpdatedAt
        };
    }
}
