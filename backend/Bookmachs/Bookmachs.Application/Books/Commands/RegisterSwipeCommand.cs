using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Application.Common.Interfaces;
using Bookmachs.Domain.Entities;
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
    public bool IsMatch { get; set; }
    public Guid? MatchTransactionId { get; set; }
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

        // 7. Evaluar si se logra un Match (cuando la acción es "like")
        bool isMatch = false;
        Guid? matchTransactionId = null;

        if (request.Action.Equals("like", StringComparison.OrdinalIgnoreCase))
        {
            var book = await _unitOfWork.Books.GetByIdAsync(request.BookId);
            if (book != null && book.IsAvailable)
            {
                // Un match ocurre de inmediato si es stock de la plataforma (IsInternalStock),
                // o con una probabilidad de 35% para simular coincidencia de otro usuario.
                isMatch = book.IsInternalStock || (Random.Shared.NextDouble() < 0.35);

                if (isMatch)
                {
                    decimal feePercentage = settings?.FeePercentage ?? 0.30m;
                    decimal minFee = settings?.MinFeeAmount ?? 1000.0m;
                    decimal maxFee = settings?.MaxFeeAmount ?? 9000.0m;

                    // Calcular el Fee dinámico de intercambio
                    decimal rawFee = book.BaseValue * feePercentage;
                    decimal finalFee = rawFee;

                    if (finalFee < minFee) finalFee = minFee;
                    else if (finalFee > maxFee) finalFee = maxFee;

                    finalFee = Math.Round(finalFee, 2);

                    // Determinar si es una transacción transfronteriza
                    bool isCrossBorder = false;
                    if (!book.IsInternalStock && book.OwnerId.HasValue)
                    {
                        var owner = await _unitOfWork.Users.GetByIdAsync(book.OwnerId.Value);
                        if (owner != null && !string.IsNullOrEmpty(user.Pais) && !string.IsNullOrEmpty(owner.Pais))
                        {
                            isCrossBorder = !string.Equals(user.Pais, owner.Pais, StringComparison.OrdinalIgnoreCase);
                        }
                    }

                    // Crear y registrar la transacción del Match
                    var transaction = new MatchTransaction
                    {
                        Id = Guid.NewGuid(),
                        RequesterUserId = user.Id,
                        BookId = book.Id,
                        OwnerUserId = book.IsInternalStock ? null : book.OwnerId,
                        FeeAmount = finalFee,
                        PaymentStatus = "Pending",
                        LogisticsStatus = "Pending",
                        IsCrossBorder = isCrossBorder,
                        CreatedAt = DateTime.UtcNow,
                        StatusUpdatedAt = DateTime.UtcNow
                    };

                    await _unitOfWork.MatchTransactions.AddAsync(transaction);
                    
                    // Opcional: deshabilitar el libro para evitar múltiples matches simultáneos
                    book.IsAvailable = false;
                    _unitOfWork.Books.Update(book);

                    matchTransactionId = transaction.Id;
                }
            }
        }

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return new SwipeResultDto
        {
            Success = true,
            SwipesConsumed = consumed,
            SwipeLimit = swipeLimit,
            Message = isMatch ? "¡Match logrado!" : "Swipe registrado con éxito.",
            IsMatch = isMatch,
            MatchTransactionId = matchTransactionId
        };
    }
}
