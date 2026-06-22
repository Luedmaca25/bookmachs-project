using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Bookmachs.Domain.Entities;

namespace Bookmachs.Domain.Repositories;

public interface IMatchTransactionRepository
{
    Task<MatchTransaction?> GetByIdAsync(Guid id);
    Task<IEnumerable<MatchTransaction>> GetTransactionsByUserIdAsync(Guid userId);
    Task<IEnumerable<MatchTransaction>> GetPendingTransactionsAsync();
    Task AddAsync(MatchTransaction transaction);
    void Update(MatchTransaction transaction);
}
