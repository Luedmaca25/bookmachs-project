using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Refactored.Api.Domain.Entities;
using Bookmachs.Refactored.Api.Domain.Services;
using Bookmachs.Refactored.Api.Dtos;
using Bookmachs.Refactored.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Bookmachs.Refactored.Api.Services;

public interface ITransactionService
{
    Task<IEnumerable<MatchTransactionDto>> GetMyMatchesAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<bool> DeleteMatchAsync(Guid matchTransactionId, Guid userId, CancellationToken cancellationToken = default);
    Task<FeeEstimationDto> EstimateFeeAsync(Guid bookId, Guid requesterUserId, CancellationToken cancellationToken = default);
    Task<CheckoutResultDto> CheckoutCardAsync(Guid matchTransactionId, string cardToken, Guid requesterUserId, bool acceptCrossBorder, CancellationToken cancellationToken = default);
    Task<WebpayStartResultDto> WebpayStartAsync(Guid matchTransactionId, Guid requesterUserId, string returnUrl, bool acceptCrossBorder, CancellationToken cancellationToken = default);
    Task<WebpayConfirmResultDto> WebpayConfirmAsync(string token, CancellationToken cancellationToken = default);
    Task<WebpayConfirmResultDto> WebpayCancelAsync(string? tbkToken, string? buyOrder, CancellationToken cancellationToken = default);
    Task<ExchangeQuotaDto> GetExchangeQuotaAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<LogisticsResultDto> UpdateLogisticsAsync(Guid matchTransactionId, Guid requesterUserId, string logisticsMethod, string? trackingNumber, string? evidencePhotoBase64, CancellationToken cancellationToken = default);
    Task<WebhookProcessResultDto> ProcessMercadoPagoWebhookAsync(string type, string action, string dataId, CancellationToken cancellationToken = default);
    Task<LogisticsResultDto> ConfirmAdminBookReceiptAsync(Guid matchTransactionId, Guid adminUserId, CancellationToken cancellationToken = default);
    Task<IEnumerable<MatchTransactionDto>> GetPendingAdminLogisticsAsync(CancellationToken cancellationToken = default);
}

public class TransactionService : ITransactionService
{
    private readonly BookmachsDbContext _dbContext;
    private readonly EcolecturaDbContext _ecolecturaDbContext;
    private readonly IPaymentGatewayService _paymentService;

    public TransactionService(
        BookmachsDbContext dbContext,
        EcolecturaDbContext ecolecturaDbContext,
        IPaymentGatewayService paymentService)
    {
        _dbContext = dbContext;
        _ecolecturaDbContext = ecolecturaDbContext;
        _paymentService = paymentService;
    }

    public async Task<IEnumerable<MatchTransactionDto>> GetMyMatchesAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        // Sincronizar/recuperar cualquier me gusta (UserBookInteractions) que no tenga aún un MatchTransaction
        var userLikedBookIdStrs = await _dbContext.UserBookInteractions
            .AsNoTracking()
            .Where(i => i.UserId == userId && i.Action.ToLower() == "like")
            .Select(i => i.BookId)
            .ToListAsync(cancellationToken);

        if (userLikedBookIdStrs.Any())
        {
            var existingMatchBookIds = await _dbContext.MatchTransactions
                .Where(t => t.RequesterUserId == userId)
                .Select(t => t.BookId)
                .ToListAsync(cancellationToken);

            var existingMatchSet = new HashSet<Guid>(existingMatchBookIds);
            bool hasNewMatches = false;

            var user = await _dbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
            var settings = await _dbContext.GlobalSettings.AsNoTracking().FirstOrDefaultAsync(cancellationToken);

            decimal feePercentage = settings?.FeePercentage ?? 0.30m;
            decimal minFee = settings?.MinFeeAmount ?? 1000.0m;
            decimal maxFee = settings?.MaxFeeAmount ?? 9000.0m;

            foreach (var bIdStr in userLikedBookIdStrs)
            {
                if (Guid.TryParse(bIdStr, out var bGuid) && !existingMatchSet.Contains(bGuid))
                {
                    var book = await _dbContext.Books.FirstOrDefaultAsync(b => b.Id == bGuid, cancellationToken);
                    bool isReservedByOther = book != null && book.IsReserved && book.ReservedUntil >= DateTime.UtcNow && book.ReservedByUserId != userId;

                    if (book != null && book.IsAvailable && !isReservedByOther)
                    {
                        decimal rawFee = book.BaseValue * feePercentage;
                        decimal finalFee = rawFee;
                        if (finalFee < minFee) finalFee = minFee;
                        else if (finalFee > maxFee) finalFee = maxFee;
                        finalFee = Math.Round(finalFee, 2);

                        bool isCrossBorder = false;
                        if (!book.IsInternalStock && book.OwnerId.HasValue && user != null)
                        {
                            var owner = await _dbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == book.OwnerId.Value, cancellationToken);
                            if (owner != null && !string.IsNullOrEmpty(user.Pais) && !string.IsNullOrEmpty(owner.Pais))
                            {
                                isCrossBorder = !string.Equals(user.Pais, owner.Pais, StringComparison.OrdinalIgnoreCase);
                            }
                        }

                        await _dbContext.MatchTransactions.AddAsync(new MatchTransaction
                        {
                            Id = Guid.NewGuid(),
                            RequesterUserId = userId,
                            BookId = book.Id,
                            OwnerUserId = book.IsInternalStock ? null : book.OwnerId,
                            FeeAmount = finalFee,
                            PaymentStatus = "Pending",
                            LogisticsStatus = "Pending",
                            IsCrossBorder = isCrossBorder,
                            CreatedAt = DateTime.UtcNow,
                            StatusUpdatedAt = DateTime.UtcNow
                        }, cancellationToken);

                        existingMatchSet.Add(bGuid);
                        hasNewMatches = true;
                    }
                }
            }

            if (hasNewMatches)
            {
                await _dbContext.SaveChangesAsync(cancellationToken);
            }
        }

        var transactions = await _dbContext.MatchTransactions
            .Where(t => t.RequesterUserId == userId || t.OwnerUserId == userId)
            .Include(t => t.Book)
            .Include(t => t.RequesterUser)
            .Include(t => t.OwnerUser)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync(cancellationToken);

        var resultList = new List<MatchTransactionDto>();

        foreach (var t in transactions)
        {
            bool isAvailable = false;
            if (t.Book != null)
            {
                bool isTakenByOther = await _dbContext.MatchTransactions
                    .AnyAsync(other => other.Id != t.Id && other.BookId == t.BookId && (other.PaymentStatus == "Captured" || other.PaymentStatus == "Hold" || other.LogisticsStatus == "Delivered") && other.LogisticsStatus != "Cancelled" && other.LogisticsStatus != "Expired", cancellationToken);

                bool isReservedByOther = t.Book.IsReserved && t.Book.ReservedUntil >= DateTime.UtcNow && t.Book.ReservedByUserId != userId;

                isAvailable = t.Book.IsAvailable && !isTakenByOther && !isReservedByOther;
            }

            resultList.Add(new MatchTransactionDto
            {
                Id = t.Id,
                RequesterUserId = t.RequesterUserId,
                RequesterName = t.RequesterUser?.Name ?? "Desconocido",
                BookId = t.BookId,
                BookTitle = t.Book?.Title ?? "Libro no disponible",
                BookAuthor = t.Book?.Author ?? "Desconocido",
                BookImageUrl = t.Book?.ImageUrl ?? string.Empty,
                BookCondition = t.Book?.Condition ?? "Bueno",
                OwnerUserId = t.OwnerUserId,
                OwnerName = t.Book?.IsInternalStock == true ? "Bookmachs Store (Stock Interno)" : (t.OwnerUser?.Name ?? "Desconocido"),
                FeeAmount = t.FeeAmount,
                PaymentStatus = t.PaymentStatus,
                LogisticsStatus = t.LogisticsStatus,
                LogisticsMethod = t.LogisticsMethod,
                IsCrossBorder = t.IsCrossBorder,
                IsAvailable = isAvailable,
                CreatedAt = t.CreatedAt
            });
        }

        return resultList;
    }

    public async Task<bool> DeleteMatchAsync(Guid matchTransactionId, Guid userId, CancellationToken cancellationToken = default)
    {
        var transaction = await _dbContext.MatchTransactions
            .Include(t => t.Book)
            .FirstOrDefaultAsync(t => t.Id == matchTransactionId && (t.RequesterUserId == userId || t.OwnerUserId == userId), cancellationToken);

        if (transaction == null)
        {
            throw new KeyNotFoundException("La propuesta de match no fue encontrada.");
        }

        if (transaction.Book != null)
        {
            transaction.Book.IsAvailable = true;
            _dbContext.Books.Update(transaction.Book);
        }

        // Eliminar también el registro de interacción en UserBookInteractions para evitar que se re-cree al recargar
        string bookIdStr = transaction.BookId.ToString();
        var interactions = await _dbContext.UserBookInteractions
            .Where(i => i.UserId == userId && (i.BookId == bookIdStr || i.BookId.ToLower() == bookIdStr.ToLower()))
            .ToListAsync(cancellationToken);

        if (interactions.Any())
        {
            _dbContext.UserBookInteractions.RemoveRange(interactions);
        }

        _dbContext.MatchTransactions.Remove(transaction);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<FeeEstimationDto> EstimateFeeAsync(Guid bookId, Guid requesterUserId, CancellationToken cancellationToken = default)
    {
        var book = await _dbContext.Books.FirstOrDefaultAsync(b => b.Id == bookId, cancellationToken);
        if (book == null)
        {
            throw new KeyNotFoundException($"El libro con ID {bookId} no existe.");
        }

        var requester = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == requesterUserId, cancellationToken);
        if (requester == null)
        {
            throw new KeyNotFoundException($"El usuario con ID {requesterUserId} no existe.");
        }

        var settings = await _dbContext.GlobalSettings.FirstOrDefaultAsync(cancellationToken);
        decimal feePercentage = settings?.FeePercentage ?? 0.30m;
        decimal minFee = settings?.MinFeeAmount ?? 1000.0m;
        decimal maxFee = settings?.MaxFeeAmount ?? 9000.0m;

        decimal rawFee = book.BaseValue * feePercentage;
        decimal finalFee = rawFee;

        if (finalFee < minFee) finalFee = minFee;
        else if (finalFee > maxFee) finalFee = maxFee;

        finalFee = Math.Round(finalFee, 2);
        rawFee = Math.Round(rawFee, 2);

        var existingTx = await _dbContext.MatchTransactions
            .FirstOrDefaultAsync(t => t.BookId == bookId && t.RequesterUserId == requesterUserId, cancellationToken);
        if (existingTx != null && existingTx.FeeAmount > 0)
        {
            finalFee = existingTx.FeeAmount;
        }

        bool isCrossBorder = false;
        string ownerCountry = string.Empty;

        if (!book.IsInternalStock && book.OwnerId.HasValue)
        {
            var owner = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == book.OwnerId.Value, cancellationToken);
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

    public Task<CheckoutResultDto> CheckoutCardAsync(Guid matchTransactionId, string cardToken, Guid requesterUserId, bool acceptCrossBorder, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(new CheckoutResultDto
        {
            Success = false,
            PaymentStatus = "Pending",
            Message = "La pasarela directa por tarjeta de Mercado Pago ha sido desactivada. Bookmachs utiliza exclusivamente Transbank Webpay Plus."
        });
    }

    public async Task<WebpayStartResultDto> WebpayStartAsync(Guid matchTransactionId, Guid requesterUserId, string returnUrl, bool acceptCrossBorder, CancellationToken cancellationToken = default)
    {
        var transaction = await _dbContext.MatchTransactions
            .Include(t => t.Book)
            .FirstOrDefaultAsync(t => t.Id == matchTransactionId, cancellationToken);
        if (transaction == null)
        {
            throw new KeyNotFoundException($"La transacción de Match con ID {matchTransactionId} no existe.");
        }

        if (transaction.RequesterUserId != requesterUserId)
        {
            throw new UnauthorizedAccessException("No tienes permisos para pagar esta transacción.");
        }

        // Validar límite mensual de intercambios del plan (Free: 2, Premium: 5)
        var quota = await GetExchangeQuotaAsync(requesterUserId, cancellationToken);
        if (quota.LimitReached)
        {
            string upgradeSuggestion = !quota.IsPremium 
                ? " Actualiza a Plan Premium para obtener hasta 5 intercambios al mes." 
                : " Has alcanzado el tope mensual de intercambios de tu plan.";
            return new WebpayStartResultDto
            {
                Success = false,
                Message = $"Has alcanzado tu límite mensual de intercambios ({quota.ExchangesConsumed}/{quota.MonthlyLimit}) para tu {quota.PlanName}.{upgradeSuggestion}"
            };
        }

        // Validar si el libro objetivo ya no está disponible o está reservado por otro usuario
        bool alreadyHasActiveReservation = false;
        bool didApplyTemporaryCheckoutHold = false;

        if (transaction.Book != null)
        {
            bool isTakenByAnotherTx = await _dbContext.MatchTransactions
                .AnyAsync(t => t.Id != matchTransactionId && t.BookId == transaction.BookId && (t.PaymentStatus == "Captured" || t.PaymentStatus == "Hold" || t.LogisticsStatus == "Delivered") && t.LogisticsStatus != "Cancelled" && t.LogisticsStatus != "Expired", cancellationToken);

            bool isReservedByOther = transaction.Book.IsReserved && transaction.Book.ReservedUntil >= DateTime.UtcNow && transaction.Book.ReservedByUserId != requesterUserId;

            if ((!transaction.Book.IsInternalStock && !transaction.Book.IsAvailable) || isTakenByAnotherTx || isReservedByOther)
            {
                return new WebpayStartResultDto
                {
                    Success = false,
                    Message = "⚠️ Este libro ya no está disponible para intercambio porque se encuentra reservado o ya fue tomado por otro usuario."
                };
            }

            alreadyHasActiveReservation = transaction.Book.IsReserved && 
                                          transaction.Book.ReservedByUserId == requesterUserId && 
                                          transaction.Book.ReservedUntil >= DateTime.UtcNow;

            // INVENTORY HOLD: Descontar stock temporalmente en Ecolectura si el libro no estaba reservado previamente
            if (transaction.Book.IsInternalStock && !alreadyHasActiveReservation)
            {
                var product = await _ecolecturaDbContext.Productos
                    .FirstOrDefaultAsync(p => p.IdProducto == transaction.Book.Id.ToString(), cancellationToken);

                if (product == null || (product.Stock ?? 0) <= 0)
                {
                    return new WebpayStartResultDto
                    {
                        Success = false,
                        Message = "⚠️ Lo sentimos, este libro ya no cuenta con stock disponible en Ecolectura para ser intercambiado."
                    };
                }

                int stockAnterior = product.Stock ?? 0;
                int nuevoStock = stockAnterior - 1;
                product.Stock = nuevoStock;

                // Por requerimiento explícito, NO se modifica product.Activo
                _ecolecturaDbContext.Productos.Update(product);

                var adjustment = new EcolecturaAjusteInventario
                {
                    IdProducto = product.IdProducto,
                    PrecioAnterior = product.Precio ?? 0.00m,
                    StockAnterior = stockAnterior,
                    UbicacionAnterior = (product.Ubicacion ?? "No especificada").Length > 100 
                        ? (product.Ubicacion ?? "No especificada")[..100] 
                        : (product.Ubicacion ?? "No especificada"),
                    EstadoAnterior = product.Activo,
                    PrecioActualizacion = product.Precio ?? 0.00m,
                    StockActualizacion = nuevoStock,
                    UbicacionActualizacion = (product.Ubicacion ?? "No especificada").Length > 100 
                        ? (product.Ubicacion ?? "No especificada")[..100] 
                        : (product.Ubicacion ?? "No especificada"),
                    EstadoActual = product.Activo,
                    IdUsuario = null,
                    FechaActualizacion = DateTime.UtcNow,
                    Justificacion = $"Bloqueo temporal de stock por inicio de pago en Webpay (20 min). Transacción: {transaction.Id}. Usuario: {requesterUserId}."
                };

                await _ecolecturaDbContext.AjustesInventario.AddAsync(adjustment, cancellationToken);
                await _ecolecturaDbContext.SaveChangesAsync(cancellationToken);
            }

            // Aplicar bloqueo temporal en Bookmachs por 20 minutos si no tenía reserva previa
            if (!alreadyHasActiveReservation)
            {
                transaction.Book.IsReserved = true;
                transaction.Book.ReservedByUserId = requesterUserId;
                transaction.Book.ReservedUntil = DateTime.UtcNow.AddMinutes(20);
                _dbContext.Books.Update(transaction.Book);
                await _dbContext.SaveChangesAsync(cancellationToken);
                didApplyTemporaryCheckoutHold = true;
            }
        }

        // Validar que el usuario tenga al menos un libro cargado en su libreta para ofrecer a cambio
        var userInventory = await _dbContext.Books.Where(b => b.OwnerId == requesterUserId).ToListAsync(cancellationToken);
        if (userInventory == null || !userInventory.Any())
        {
            // Revertir bloqueo temporal si no cumple condición
            if (didApplyTemporaryCheckoutHold && transaction.Book != null)
            {
                transaction.Book.IsReserved = false;
                transaction.Book.ReservedUntil = null;
                transaction.Book.ReservedByUserId = null;
                _dbContext.Books.Update(transaction.Book);
                await _dbContext.SaveChangesAsync(cancellationToken);

                if (transaction.Book.IsInternalStock)
                {
                    await RestoreEcolecturaStockAsync(transaction.Book.Id, $"Restitución de stock por validación fallida de libreta. Transacción: {transaction.Id}.", cancellationToken);
                }
            }

            return new WebpayStartResultDto
            {
                Success = false,
                Message = "No tienes ningún libro cargado en 'Tu Libreta' (Tengo para intercambiar). Debes subir al menos un libro para ofrecer a cambio antes de procesar el pago del fee."
            };
        }

        if (transaction.IsCrossBorder && !acceptCrossBorder)
        {
            if (didApplyTemporaryCheckoutHold && transaction.Book != null)
            {
                transaction.Book.IsReserved = false;
                transaction.Book.ReservedUntil = null;
                transaction.Book.ReservedByUserId = null;
                _dbContext.Books.Update(transaction.Book);
                await _dbContext.SaveChangesAsync(cancellationToken);

                if (transaction.Book.IsInternalStock)
                {
                    await RestoreEcolecturaStockAsync(transaction.Book.Id, $"Restitución de stock por rechazo de costos internacionales. Transacción: {transaction.Id}.", cancellationToken);
                }
            }

            return new WebpayStartResultDto
            {
                Success = false,
                Message = "Debe confirmar explícitamente que acepta los costos de envío internacional."
            };
        }

        if (transaction.PaymentStatus == "Hold" || transaction.PaymentStatus == "Captured")
        {
            return new WebpayStartResultDto
            {
                Success = false,
                Message = "La transacción ya cuenta con una retención o cobro procesado."
            };
        }

        // Transbank Webpay Plus exige que buyOrder tenga un largo máximo de 26 caracteres alfanuméricos
        var buyOrder = transaction.BuyOrder;
        if (string.IsNullOrEmpty(buyOrder))
        {
            buyOrder = transaction.Id.ToString("N")[..26];
            transaction.BuyOrder = buyOrder;
            _dbContext.MatchTransactions.Update(transaction);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        var sessionId = $"sess_{requesterUserId.ToString("N")[..8]}";

        var tbResult = await _paymentService.CreateTransbankTransactionAsync(
            transaction.FeeAmount,
            buyOrder,
            sessionId,
            returnUrl
        );

        if (tbResult.Success)
        {
            return new WebpayStartResultDto
            {
                Success = true,
                Token = tbResult.Token,
                RedirectUrl = tbResult.RedirectUrl,
                Message = "Redirección a Transbank Webpay Plus generada con éxito."
            };
        }

        // Si falló el inicio en Webpay, revertir el bloqueo temporal
        if (didApplyTemporaryCheckoutHold && transaction.Book != null)
        {
            transaction.Book.IsReserved = false;
            transaction.Book.ReservedUntil = null;
            transaction.Book.ReservedByUserId = null;
            _dbContext.Books.Update(transaction.Book);
            await _dbContext.SaveChangesAsync(cancellationToken);

            if (transaction.Book.IsInternalStock)
            {
                await RestoreEcolecturaStockAsync(transaction.Book.Id, $"Restitución de stock por error al iniciar pasarela Webpay. Transacción: {transaction.Id}.", cancellationToken);
            }
        }

        return new WebpayStartResultDto
        {
            Success = false,
            Message = $"Error al iniciar el pago en Webpay: {tbResult.ErrorMessage}"
        };
    }

    private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, WebpayConfirmResultDto> _matchTokenConfirmCache = new();

    public async Task<WebpayConfirmResultDto> WebpayConfirmAsync(string token, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrEmpty(token))
        {
            throw new ArgumentException("El token de Webpay Plus es requerido.");
        }

        if (_matchTokenConfirmCache.TryGetValue(token, out var cachedResult))
        {
            return cachedResult;
        }

        var tbResult = await _paymentService.CommitTransbankTransactionAsync(token);

        if (tbResult.Success && !string.IsNullOrEmpty(tbResult.BuyOrder))
        {
            // Búsqueda directa por igualdad exacta del BuyOrder indexado en la Base de Datos
            var transaction = await _dbContext.MatchTransactions
                .FirstOrDefaultAsync(t => t.BuyOrder == tbResult.BuyOrder, cancellationToken);

            if (transaction != null)
            {
                transaction.PaymentHoldId = token;
                transaction.PaymentStatus = "Captured";
                transaction.StatusUpdatedAt = DateTime.UtcNow;

                var method = (transaction.LogisticsMethod ?? "Presencial").ToLowerInvariant();
                if (method == "envio" || method == "bodega" || method == "p2p")
                {
                    transaction.LogisticsStatus = "Pendiente Comprobante";
                }
                else
                {
                    transaction.LogisticsStatus = "En Espera";
                }

                var book = await _dbContext.Books.FirstOrDefaultAsync(b => b.Id == transaction.BookId, cancellationToken);
                bool wasAlreadyReserved = false;
                if (book != null)
                {
                    wasAlreadyReserved = book.IsReserved && book.ReservedByUserId == transaction.RequesterUserId;
                    book.IsAvailable = false;
                    book.IsReserved = false;
                    book.ReservedUntil = null;
                    book.ReservedByUserId = null;
                    _dbContext.Books.Update(book);
                }

                _dbContext.MatchTransactions.Update(transaction);
                await _dbContext.SaveChangesAsync(cancellationToken);

                // Descontar stock y registrar el ajuste en Ecolectura (evitando duplicidad si ya estaba reservado)
                await DeductStockAndLogAdjustmentAsync(transaction.BookId, transaction.Id, transaction.RequesterUserId, wasAlreadyReserved, cancellationToken);

                var successRes = new WebpayConfirmResultDto
                {
                    Success = true,
                    MatchTransactionId = transaction.Id.ToString(),
                    PaymentStatus = "Captured",
                    Message = "Transacción Webpay Plus confirmada y cobrada con éxito."
                };
                _matchTokenConfirmCache[token] = successRes;
                return successRes;
            }

            var invalidRes = new WebpayConfirmResultDto
            {
                Success = false,
                Message = $"La orden de compra {tbResult.BuyOrder} devuelta por Webpay no corresponde a ninguna transacción válida."
            };
            _matchTokenConfirmCache[token] = invalidRes;
            return invalidRes;
        }

        if (!string.IsNullOrEmpty(tbResult.BuyOrder))
        {
            var transaction = await _dbContext.MatchTransactions
                .Include(t => t.Book)
                .FirstOrDefaultAsync(t => t.BuyOrder == tbResult.BuyOrder, cancellationToken);

            if (transaction != null)
            {
                transaction.PaymentStatus = "Failed";
                transaction.StatusUpdatedAt = DateTime.UtcNow;

                // Si tenía bloqueo temporal de checkout Webpay, liberarlo y restituir stock en Ecolectura
                if (transaction.Book != null && transaction.Book.IsReserved && transaction.Book.ReservedByUserId == transaction.RequesterUserId)
                {
                    if (transaction.Book.ReservedUntil <= DateTime.UtcNow.AddMinutes(30))
                    {
                        transaction.Book.IsReserved = false;
                        transaction.Book.ReservedUntil = null;
                        transaction.Book.ReservedByUserId = null;
                        _dbContext.Books.Update(transaction.Book);

                        if (transaction.Book.IsInternalStock)
                        {
                            await RestoreEcolecturaStockAsync(transaction.Book.Id, $"Restitución de stock por pago rechazado o fallido en Webpay. Transacción: {transaction.Id}.", cancellationToken);
                        }
                    }
                }

                _dbContext.MatchTransactions.Update(transaction);
                await _dbContext.SaveChangesAsync(cancellationToken);

                var failRes = new WebpayConfirmResultDto
                {
                    Success = false,
                    MatchTransactionId = transaction.Id.ToString(),
                    PaymentStatus = "Failed",
                    Message = $"Transacción fallida o rechazada en Webpay. Estado Transbank: {tbResult.Status}. Detalle: {tbResult.ErrorMessage}"
                };
                _matchTokenConfirmCache[token] = failRes;
                return failRes;
            }
        }

        var defaultFailRes = new WebpayConfirmResultDto
        {
            Success = false,
            PaymentStatus = "Failed",
            Message = $"Error al confirmar transacción en Webpay Plus: {tbResult.ErrorMessage}"
        };
        _matchTokenConfirmCache[token] = defaultFailRes;
        return defaultFailRes;
    }

    public async Task<WebpayConfirmResultDto> WebpayCancelAsync(string? tbkToken, string? buyOrder, CancellationToken cancellationToken = default)
    {
        MatchTransaction? transaction = null;

        if (!string.IsNullOrEmpty(buyOrder))
        {
            transaction = await _dbContext.MatchTransactions
                .Include(t => t.Book)
                .FirstOrDefaultAsync(t => t.BuyOrder == buyOrder, cancellationToken);
        }

        if (transaction == null && !string.IsNullOrEmpty(tbkToken))
        {
            transaction = await _dbContext.MatchTransactions
                .Include(t => t.Book)
                .FirstOrDefaultAsync(t => t.PaymentHoldId == tbkToken, cancellationToken);
        }

        if (transaction != null)
        {
            transaction.PaymentStatus = "Failed";
            transaction.StatusUpdatedAt = DateTime.UtcNow;

            if (transaction.Book != null && transaction.Book.IsReserved && transaction.Book.ReservedByUserId == transaction.RequesterUserId)
            {
                // Si fue un bloqueo temporal de checkout Webpay, liberarlo y restituir stock en Ecolectura
                if (transaction.Book.ReservedUntil <= DateTime.UtcNow.AddMinutes(30))
                {
                    transaction.Book.IsReserved = false;
                    transaction.Book.ReservedUntil = null;
                    transaction.Book.ReservedByUserId = null;
                    _dbContext.Books.Update(transaction.Book);

                    if (transaction.Book.IsInternalStock)
                    {
                        await RestoreEcolecturaStockAsync(transaction.Book.Id, $"Restitución de stock por anulación voluntaria del usuario en Webpay. Transacción: {transaction.Id}.", cancellationToken);
                    }
                }
            }

            _dbContext.MatchTransactions.Update(transaction);
            await _dbContext.SaveChangesAsync(cancellationToken);

            return new WebpayConfirmResultDto
            {
                Success = false,
                MatchTransactionId = transaction.Id.ToString(),
                PaymentStatus = "Failed",
                Message = "El pago en Webpay fue cancelado por el usuario. El libro ha sido liberado."
            };
        }

        return new WebpayConfirmResultDto
        {
            Success = false,
            PaymentStatus = "Failed",
            Message = "Cancelación de Webpay procesada."
        };
    }

    public async Task<ExchangeQuotaDto> GetExchangeQuotaAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user == null)
        {
            throw new KeyNotFoundException("Usuario no encontrado.");
        }

        var now = DateTime.UtcNow;
        if (UserCycleHelper.CheckAndApplySubscriptionExpiration(user, now))
        {
            _dbContext.Users.Update(user);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        var (cycleStart, cycleEnd) = UserCycleHelper.GetUserMonthlyCycle(user, now);

        var settings = await _dbContext.GlobalSettings.AsNoTracking().FirstOrDefaultAsync(cancellationToken);
        int limit = user.IsPremium ? (settings?.MonthlyMatchLimitPremium ?? 5) : (settings?.MonthlyMatchLimitFree ?? 2);

        // Contar transacciones de intercambio donde el usuario es el solicitante y que hayan sido pagadas/iniciadas dentro del ciclo actual
        var consumedCount = await _dbContext.MatchTransactions
            .AsNoTracking()
            .Where(t => t.RequesterUserId == userId &&
                        (t.PaymentStatus == "Captured" || t.PaymentStatus == "Hold" ||
                         t.LogisticsStatus == "Delivered" || t.LogisticsStatus == "Completed" ||
                         t.LogisticsStatus == "InTransit" || t.LogisticsStatus == "Pendiente Comprobante" ||
                         t.LogisticsStatus == "En Espera") &&
                        t.LogisticsStatus != "Cancelled" && t.LogisticsStatus != "Expired" &&
                        t.CreatedAt >= cycleStart)
            .CountAsync(cancellationToken);

        return new ExchangeQuotaDto
        {
            ExchangesConsumed = consumedCount,
            MonthlyLimit = limit,
            LimitReached = consumedCount >= limit,
            IsPremium = user.IsPremium,
            PlanName = user.IsPremium ? "Plan Premium" : "Plan Gratuito",
            CycleStartDate = cycleStart,
            CycleEndDate = cycleEnd
        };
    }

    public async Task<LogisticsResultDto> UpdateLogisticsAsync(Guid matchTransactionId, Guid requesterUserId, string logisticsMethod, string? trackingNumber, string? evidencePhotoBase64, CancellationToken cancellationToken = default)
    {
        var transaction = await _dbContext.MatchTransactions.FirstOrDefaultAsync(t => t.Id == matchTransactionId, cancellationToken);
        if (transaction == null)
        {
            throw new KeyNotFoundException($"La transacción de Match con ID {matchTransactionId} no existe.");
        }

        if (transaction.RequesterUserId != requesterUserId)
        {
            throw new UnauthorizedAccessException("No tienes permisos para actualizar la logística de esta transacción.");
        }

        if (transaction.PaymentStatus != "Hold" && transaction.PaymentStatus != "Captured")
        {
            return new LogisticsResultDto
            {
                Success = false,
                Message = "Debe pre-autorizar (pagar) el Fee de intercambio antes de configurar la logística."
            };
        }

        var method = logisticsMethod.ToLowerInvariant();
        if (method != "presencial" && method != "bodega" && method != "p2p" && method != "donacion")
        {
            return new LogisticsResultDto
            {
                Success = false,
                Message = "Método logístico no válido. Use: Presencial, Bodega, P2P o Donacion."
            };
        }

        if (method == "donacion" && string.IsNullOrEmpty(evidencePhotoBase64))
        {
            return new LogisticsResultDto
            {
                Success = false,
                Message = "Para el método Donación, debe subir una foto de evidencia."
            };
        }

        if ((method == "bodega" || method == "p2p") && string.IsNullOrEmpty(trackingNumber))
        {
            return new LogisticsResultDto
            {
                Success = false,
                Message = "Para envíos P2P o Bodega, debe ingresar un número de seguimiento (tracking)."
            };
        }

        transaction.LogisticsMethod = logisticsMethod;
        transaction.LogisticsStatus = "En Espera";
        transaction.StatusUpdatedAt = Bookmachs.Refactored.Api.Helpers.DateTimeHelper.GetSantiagoTime();

        _dbContext.MatchTransactions.Update(transaction);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new LogisticsResultDto
        {
            Success = true,
            LogisticsStatus = transaction.LogisticsStatus,
            Message = "Comprobante e información logística registrada exitosamente. El intercambio se encuentra en estatus 'En Espera' hasta que un administrador confirme haber recibido el libro físico."
        };
    }

    public async Task<LogisticsResultDto> ConfirmAdminBookReceiptAsync(Guid matchTransactionId, Guid adminUserId, CancellationToken cancellationToken = default)
    {
        var adminUser = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == adminUserId, cancellationToken);
        if (adminUser == null || adminUser.Role != "Admin")
        {
            throw new UnauthorizedAccessException("Solamente los administradores de Bookmachs pueden confirmar la recepción del libro.");
        }

        var transaction = await _dbContext.MatchTransactions
            .Include(t => t.Book)
            .FirstOrDefaultAsync(t => t.Id == matchTransactionId, cancellationToken);

        if (transaction == null)
        {
            throw new KeyNotFoundException($"Transacción #{matchTransactionId} no encontrada.");
        }

        transaction.LogisticsStatus = "Delivered";
        transaction.StatusUpdatedAt = DateTime.UtcNow;

        if (transaction.Book != null)
        {
            transaction.Book.IsAvailable = false;
            _dbContext.Books.Update(transaction.Book);
        }

        _dbContext.MatchTransactions.Update(transaction);
        await _dbContext.SaveChangesAsync(cancellationToken);

        if (transaction.IsPublic && transaction.Book != null)
        {
            var requester = await _dbContext.Users.FirstOrDefaultAsync(u => u.Id == transaction.RequesterUserId, cancellationToken);
            var timelineEvent = new TimelineEvent
            {
                Id = Guid.NewGuid(),
                MatchTransactionId = transaction.Id,
                EventType = "Exchange",
                Title = "¡Intercambio completado!",
                Description = $"¡Intercambio completado exitosamente! {requester?.Name ?? "Un lector"} recibió '{transaction.Book.Title}'.",
                CreatedAt = DateTime.UtcNow
            };
            await _dbContext.TimelineEvents.AddAsync(timelineEvent, cancellationToken);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return new LogisticsResultDto
        {
            Success = true,
            LogisticsStatus = "Delivered",
            Message = "Recepción del libro confirmada exitosamente por el administrador."
        };
    }

    public async Task<IEnumerable<MatchTransactionDto>> GetPendingAdminLogisticsAsync(CancellationToken cancellationToken = default)
    {
        var transactions = await _dbContext.MatchTransactions
            .Where(t => t.LogisticsStatus == "En Espera" || t.LogisticsStatus == "Pendiente Comprobante" || t.LogisticsStatus == "InTransit")
            .Include(t => t.Book)
            .Include(t => t.RequesterUser)
            .Include(t => t.OwnerUser)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync(cancellationToken);

        return transactions.Select(t => new MatchTransactionDto
        {
            Id = t.Id,
            RequesterUserId = t.RequesterUserId,
            RequesterName = t.RequesterUser?.Name ?? "Desconocido",
            BookId = t.BookId,
            BookTitle = t.Book?.Title ?? "Libro no disponible",
            BookAuthor = t.Book?.Author ?? "Desconocido",
            BookImageUrl = t.Book?.ImageUrl ?? string.Empty,
            BookCondition = t.Book?.Condition ?? "Bueno",
            OwnerUserId = t.OwnerUserId,
            OwnerName = t.Book?.IsInternalStock == true ? "Bookmachs Store (Stock Interno)" : (t.OwnerUser?.Name ?? "Desconocido"),
            FeeAmount = t.FeeAmount,
            PaymentStatus = t.PaymentStatus,
            LogisticsStatus = t.LogisticsStatus,
            LogisticsMethod = t.LogisticsMethod,
            IsCrossBorder = t.IsCrossBorder,
            IsAvailable = t.Book?.IsAvailable ?? false,
            CreatedAt = t.CreatedAt
        });
    }

    public Task<WebhookProcessResultDto> ProcessMercadoPagoWebhookAsync(string type, string action, string dataId, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(new WebhookProcessResultDto
        {
            Success = false,
            Message = "Los webhooks de Mercado Pago están desactivados. Bookmachs utiliza exclusivamente Transbank Webpay Plus."
        });
    }

    private async Task DeductStockAndLogAdjustmentAsync(Guid bookId, Guid matchTransactionId, Guid requesterUserId, bool wasAlreadyReserved, CancellationToken cancellationToken)
    {
        try
        {
            // 1. Verificar si el libro es stock interno de Ecolectura
            var book = await _dbContext.Books.FirstOrDefaultAsync(b => b.Id == bookId, cancellationToken);
            if (book == null || !book.IsInternalStock)
            {
                return; // No es un libro de Ecolectura
            }

            // 2. Buscar el producto en la base de datos de Ecolectura
            var product = await _ecolecturaDbContext.Productos
                .FirstOrDefaultAsync(p => p.IdProducto == bookId.ToString(), cancellationToken);

            if (product == null)
            {
                return; // No se encontró en Ecolectura
            }

            // Guardar valores anteriores para el historial
            decimal precioAnterior = product.Precio ?? 0.00m;
            int stockAnterior = product.Stock ?? 0;
            string ubicacionAnterior = product.Ubicacion ?? "No especificada";
            bool estadoAnterior = product.Activo;

            int nuevoStock = stockAnterior;
            string justificacion;

            if (wasAlreadyReserved)
            {
                // El stock ya fue descontado de la base de datos al realizar la reserva previa en Bookmachs.
                // No se descuenta nuevamente para evitar duplicidad de decremento.
                justificacion = $"Intercambio concretado en Bookmachs (Previamente reservado con descuento de stock aplicado). Match Transaction ID: {matchTransactionId}. Requester User ID: {requesterUserId}.";
            }
            else
            {
                // Descontar 1 unidad de stock directamente ya que no provenía de una reserva previa
                nuevoStock = stockAnterior > 0 ? stockAnterior - 1 : 0;
                product.Stock = nuevoStock;
                _ecolecturaDbContext.Productos.Update(product);

                justificacion = $"Descuento por intercambio directo concretado en Bookmachs. Match Transaction ID: {matchTransactionId}. Requester User ID: {requesterUserId}.";
            }

            // IMPORTANTE: Por requerimiento explícito, NO se modifica product.Activo. Se preserva su estado original.

            // 4. Crear el registro en AjusteInventario
            var adjustment = new EcolecturaAjusteInventario
            {
                IdProducto = product.IdProducto,
                PrecioAnterior = precioAnterior,
                StockAnterior = stockAnterior,
                UbicacionAnterior = ubicacionAnterior.Length > 100 ? ubicacionAnterior[..100] : ubicacionAnterior,
                EstadoAnterior = estadoAnterior,
                PrecioActualizacion = product.Precio ?? 0.00m,
                StockActualizacion = nuevoStock,
                UbicacionActualizacion = (product.Ubicacion ?? "No especificada").Length > 100 
                    ? (product.Ubicacion ?? "No especificada")[..100] 
                    : (product.Ubicacion ?? "No especificada"),
                EstadoActual = product.Activo,
                IdUsuario = null, // Al ser a través de API externa, no se asocia un usuario AspNetUsers local
                FechaActualizacion = DateTime.UtcNow,
                Justificacion = justificacion
            };

            await _ecolecturaDbContext.AjustesInventario.AddAsync(adjustment, cancellationToken);

            // Guardar cambios en Ecolectura
            await _ecolecturaDbContext.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            // Registrar error pero no interrumpir la transacción local de Bookmachs
            Console.Error.WriteLine($"Error al descontar stock de Ecolectura o registrar el ajuste de inventario: {ex.Message}");
        }
    }

    private async Task RestoreEcolecturaStockAsync(Guid bookId, string justificacion, CancellationToken cancellationToken)
    {
        try
        {
            var product = await _ecolecturaDbContext.Productos
                .FirstOrDefaultAsync(p => p.IdProducto == bookId.ToString(), cancellationToken);

            if (product != null)
            {
                int stockAnterior = product.Stock ?? 0;
                int nuevoStock = stockAnterior + 1;
                product.Stock = nuevoStock;

                // IMPORTANTE: Por requerimiento explícito, NO se modifica product.Activo.
                _ecolecturaDbContext.Productos.Update(product);

                var adjustment = new EcolecturaAjusteInventario
                {
                    IdProducto = product.IdProducto,
                    PrecioAnterior = product.Precio ?? 0.00m,
                    StockAnterior = stockAnterior,
                    UbicacionAnterior = (product.Ubicacion ?? "No especificada").Length > 100 
                        ? (product.Ubicacion ?? "No especificada")[..100] 
                        : (product.Ubicacion ?? "No especificada"),
                    EstadoAnterior = product.Activo,
                    PrecioActualizacion = product.Precio ?? 0.00m,
                    StockActualizacion = nuevoStock,
                    UbicacionActualizacion = (product.Ubicacion ?? "No especificada").Length > 100 
                        ? (product.Ubicacion ?? "No especificada")[..100] 
                        : (product.Ubicacion ?? "No especificada"),
                    EstadoActual = product.Activo,
                    IdUsuario = null,
                    FechaActualizacion = DateTime.UtcNow,
                    Justificacion = justificacion
                };

                await _ecolecturaDbContext.AjustesInventario.AddAsync(adjustment, cancellationToken);
                await _ecolecturaDbContext.SaveChangesAsync(cancellationToken);
            }
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Error al restituir stock de Ecolectura o registrar ajuste: {ex.Message}");
        }
    }
}
