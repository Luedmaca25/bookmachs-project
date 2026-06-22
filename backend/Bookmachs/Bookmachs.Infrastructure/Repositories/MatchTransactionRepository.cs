using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Bookmachs.Domain.Entities;
using Bookmachs.Domain.Repositories;
using Bookmachs.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Bookmachs.Infrastructure.Repositories;

public class MatchTransactionRepository : IMatchTransactionRepository
{
    private readonly BookmachsDbContext _context;

    public MatchTransactionRepository(BookmachsDbContext context)
    {
        _context = context;
    }

    public async Task<MatchTransaction?> GetByIdAsync(Guid id)
    {
        return await _context.MatchTransactions
            .Include(t => t.RequesterUser)
            .Include(t => t.OwnerUser)
            .Include(t => t.Book)
            .FirstOrDefaultAsync(t => t.Id == id);
    }

    public async Task<IEnumerable<MatchTransaction>> GetTransactionsByUserIdAsync(Guid userId)
    {
        return await _context.MatchTransactions
            .Where(t => t.RequesterUserId == userId || t.OwnerUserId == userId)
            .Include(t => t.Book)
            .Include(t => t.RequesterUser)
            .Include(t => t.OwnerUser)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<MatchTransaction>> GetPendingTransactionsAsync()
    {
        return await _context.MatchTransactions
            .Where(t => t.PaymentStatus == "Pending")
            .Include(t => t.Book)
            .ToListAsync();
    }

    public async Task AddAsync(MatchTransaction transaction)
    {
        await _context.MatchTransactions.AddAsync(transaction);
    }

    public void Update(MatchTransaction transaction)
    {
        _context.MatchTransactions.Update(transaction);
    }
}
