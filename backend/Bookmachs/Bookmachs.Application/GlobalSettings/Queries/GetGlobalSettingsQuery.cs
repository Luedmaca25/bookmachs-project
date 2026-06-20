using System;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Domain.Repositories;
using MediatR;

namespace Bookmachs.Application.GlobalSettings.Queries;

public record GetGlobalSettingsQuery : IRequest<GlobalSettingsDto>;

public class GetGlobalSettingsQueryHandler : IRequestHandler<GetGlobalSettingsQuery, GlobalSettingsDto>
{
    private readonly IUnitOfWork _unitOfWork;

    public GetGlobalSettingsQueryHandler(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    public async Task<GlobalSettingsDto> Handle(GetGlobalSettingsQuery request, CancellationToken cancellationToken)
    {
        var settings = await _unitOfWork.GlobalSettings.GetSettingsAsync();

        if (settings == null)
        {
            settings = new Domain.Entities.GlobalSettings
            {
                DailySwipeLimitFree = 100,
                DailySwipeLimitPremium = 1000,
                BasicPlanPriceUsd = 2.0m,
                PremiumPlanPriceUsd = 5.0m,
                FeePercentage = 0.30m,
                MinFeeAmount = 1000.0m,
                MaxFeeAmount = 9000.0m,
                LastUpdatedAt = DateTime.UtcNow
            };

            await _unitOfWork.GlobalSettings.AddAsync(settings);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }

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
