using System;
using System.Threading;
using System.Threading.Tasks;

namespace Bookmachs.Domain.Repositories;

public interface IUnitOfWork : IDisposable
{
    IBookRepository Books { get; }
    IUserRepository Users { get; }
    IMatchTransactionRepository MatchTransactions { get; }
    ISubscriptionRepository Subscriptions { get; }
    IGlobalSettingsRepository GlobalSettings { get; }
    IMasterPreferenceTagRepository MasterPreferenceTags { get; }
    ITimelineEventRepository TimelineEvents { get; }
    
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
