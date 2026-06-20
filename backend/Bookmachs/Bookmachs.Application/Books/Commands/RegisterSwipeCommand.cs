using System;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Application.Common.Interfaces;
using Bookmachs.Domain.Repositories;
using MediatR;

namespace Bookmachs.Application.Books.Commands;

public record RegisterSwipeCommand : IRequest<SwipeResultDto>
{
    public Guid UserId { get; init; }
    public Guid BookId { get; init; }
    public string Action { get; init; } = string.Empty; // "like" o "dislike"
}

public class SwipeResultDto
{
    public bool Success { get; set; }
    public int SwipesConsumed { get; set; }
    public int SwipeLimit { get; set; }
    public string? ErrorCode { get; set; }
    public string? Message { get; set; }
}

public class RegisterSwipeCommandHandler : IRequestHandler<RegisterSwipeCommand, SwipeResultDto>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICacheService _cacheService;

    public RegisterSwipeCommandHandler(IUnitOfWork unitOfWork, ICacheService cacheService)
    {
        _unitOfWork = unitOfWork;
        _cacheService = cacheService;
    }

    public async Task<SwipeResultDto> Handle(RegisterSwipeCommand request, CancellationToken cancellationToken)
    {
        // 1. Obtener al usuario
        var user = await _unitOfWork.Users.GetByIdAsync(request.UserId);
        if (user == null)
        {
            throw new KeyNotFoundException("Usuario no encontrado.");
        }

        // 2. Obtener configuraciones globales para los límites
        var settings = await _unitOfWork.GlobalSettings.GetSettingsAsync();
        int swipeLimit = 100; // fallback por defecto
        if (settings != null)
        {
            swipeLimit = user.IsPremium ? settings.DailySwipeLimitPremium : settings.DailySwipeLimitFree;
        }

        // 3. Clave para la caché
        var cacheKey = $"swipes_consumed_{user.Id}";
        
        // 4. Determinar los swipes consumidos en el día actual
        int consumed = 0;
        var now = DateTime.UtcNow;
        bool isNewDay = now.Date > user.LastSwipeResetDate.Date;

        if (isNewDay)
        {
            // Es un nuevo día, resetear los contadores
            consumed = 0;
            user.DailySwipesConsumed = 0;
            user.LastSwipeResetDate = now;
            
            _unitOfWork.Users.Update(user);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            
            // Actualizar la caché
            _cacheService.Set(cacheKey, consumed, TimeSpan.FromDays(1));
        }
        else
        {
            // Intentar leer de caché
            var cachedSwipes = _cacheService.Get<int?>(cacheKey);
            if (cachedSwipes.HasValue)
            {
                consumed = cachedSwipes.Value;
            }
            else
            {
                // Fallback a base de datos si no está en caché
                consumed = user.DailySwipesConsumed;
                _cacheService.Set(cacheKey, consumed, TimeSpan.FromDays(1));
            }
        }

        // 5. Validar si excede el límite
        if (consumed >= swipeLimit)
        {
            return new SwipeResultDto
            {
                Success = false,
                SwipesConsumed = consumed,
                SwipeLimit = swipeLimit,
                ErrorCode = "DailyLimitExceeded",
                Message = $"Has alcanzado tu límite diario de {swipeLimit} swipes en la cuenta gratuita. Pásate a Premium para deslizar sin límites."
            };
        }

        // 6. Incrementar contador
        consumed++;
        
        // Actualizar caché
        _cacheService.Set(cacheKey, consumed, TimeSpan.FromDays(1));

        // Actualizar base de datos de manera persistente
        user.DailySwipesConsumed = consumed;
        _unitOfWork.Users.Update(user);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new SwipeResultDto
        {
            Success = true,
            SwipesConsumed = consumed,
            SwipeLimit = swipeLimit,
            Message = "Swipe registrado con éxito."
        };
    }
}
