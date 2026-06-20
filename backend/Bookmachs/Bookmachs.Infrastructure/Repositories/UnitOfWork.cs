using System;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Domain.Repositories;
using Bookmachs.Infrastructure.Persistence;

namespace Bookmachs.Infrastructure.Repositories;

public class UnitOfWork : IUnitOfWork
{
    private readonly BookmachsDbContext _context;
    
    private IBookRepository? _books;
    private IUserRepository? _users;
    private IMatchTransactionRepository? _matchTransactions;
    private ISubscriptionRepository? _subscriptions;
    private IGlobalSettingsRepository? _globalSettings;

    public UnitOfWork(BookmachsDbContext context)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
    }

    public IBookRepository Books => _books ??= new BookRepository(_context);
    public IUserRepository Users => _users ??= new UserRepository(_context);
    public IMatchTransactionRepository MatchTransactions => _matchTransactions ??= new MatchTransactionRepository(_context);
    public ISubscriptionRepository Subscriptions => _subscriptions ??= new SubscriptionRepository(_context);
    public IGlobalSettingsRepository GlobalSettings => _globalSettings ??= new GlobalSettingsRepository(_context);

    public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        return await _context.SaveChangesAsync(cancellationToken);
    }

    private bool _disposed = false;

    protected virtual void Dispose(bool disposing)
    {
        if (!_disposed)
        {
            if (disposing)
            {
                _context.Dispose();
            }
            _disposed = true;
        }
    }

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }
}
