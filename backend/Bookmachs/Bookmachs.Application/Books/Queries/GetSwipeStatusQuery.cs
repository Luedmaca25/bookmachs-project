using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Application.Common.Interfaces;
using Bookmachs.Domain.Repositories;
using MediatR;

namespace Bookmachs.Application.Books.Queries;

public class SwipeStatusDto
{
    public int SwipesConsumed { get; set; }
    public int SwipeLimit { get; set; }
    public bool LimitReached { get; set; }
}

public record GetSwipeStatusQuery(Guid UserId) : IRequest<SwipeStatusDto>;

public class GetSwipeStatusQueryHandler : IRequestHandler<GetSwipeStatusQuery, SwipeStatusDto>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICacheService _cacheService;

    public GetSwipeStatusQueryHandler(IUnitOfWork unitOfWork, ICacheService cacheService)
    {
        _unitOfWork = unitOfWork;
        _cacheService = cacheService;
    }

    public async Task<SwipeStatusDto> Handle(GetSwipeStatusQuery request, CancellationToken cancellationToken)
    {
        var user = await _unitOfWork.Users.GetByIdAsync(request.UserId);
        if (user == null)
        {
            throw new KeyNotFoundException("Usuario no encontrado.");
        }

        var settings = await _unitOfWork.GlobalSettings.GetSettingsAsync();
        int swipeLimit = 100;
        if (settings != null)
        {
            swipeLimit = user.IsPremium ? settings.DailySwipeLimitPremium : settings.DailySwipeLimitFree;
        }

        var cacheKey = $"swipes_consumed_{user.Id}";
        int consumed = 0;
        var now = DateTime.UtcNow;
        bool isNewDay = now.Date > user.LastSwipeResetDate.Date;

        if (isNewDay)
        {
            consumed = 0;
            user.DailySwipesConsumed = 0;
            user.LastSwipeResetDate = now;
            
            _unitOfWork.Users.Update(user);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            _cacheService.Set(cacheKey, consumed, TimeSpan.FromDays(1));
        }
        else
        {
            var cachedSwipes = _cacheService.Get<int?>(cacheKey);
            if (cachedSwipes.HasValue)
            {
                consumed = cachedSwipes.Value;
            }
            else
            {
                consumed = user.DailySwipesConsumed;
                _cacheService.Set(cacheKey, consumed, TimeSpan.FromDays(1));
            }
        }

        return new SwipeStatusDto
        {
            SwipesConsumed = consumed,
            SwipeLimit = swipeLimit,
            LimitReached = consumed >= swipeLimit
        };
    }
}
