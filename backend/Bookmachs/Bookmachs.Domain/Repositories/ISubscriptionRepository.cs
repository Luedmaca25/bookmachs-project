using System;
using System.Threading.Tasks;
using Bookmachs.Domain.Entities;

namespace Bookmachs.Domain.Repositories;

public interface ISubscriptionRepository
{
    Task<Subscription?> GetByIdAsync(Guid id);
    Task<Subscription?> GetActiveSubscriptionByUserIdAsync(Guid userId);
    Task AddAsync(Subscription subscription);
    void Update(Subscription subscription);
}
