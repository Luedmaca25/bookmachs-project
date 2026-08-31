using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Bookmachs.Refactored.Api.Dtos;
using Bookmachs.Refactored.Api.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Bookmachs.Refactored.Api.Controllers;

[ApiController]
[Route("[controller]")]
[Authorize(Roles = "Admin")]
public class UsersController : ControllerBase
{
    private readonly BookmachsDbContext _dbContext;

    public UsersController(BookmachsDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    [HttpGet("admin-list")]
    public async Task<ActionResult<IEnumerable<AdminUserDetailDto>>> GetUsersForAdmin(CancellationToken cancellationToken)
    {
        var users = await _dbContext.Users
            .Include(u => u.Books)
            .Include(u => u.Preferences)
            .OrderByDescending(u => u.CreatedAt)
            .ToListAsync(cancellationToken);

        var result = users.Select(u => new AdminUserDetailDto
        {
            Id = u.Id,
            Email = u.Email,
            Name = u.Name,
            DocumentoIdentidad = u.DocumentoIdentidad,
            Pais = u.Pais,
            Telefono = u.Telefono,
            ProfileImageUrl = u.ProfileImageUrl,
            IsPremium = u.IsPremium,
            SubscriptionPlan = u.SubscriptionPlan,
            Role = u.Role,
            IsBlocked = u.IsBlocked,
            CreatedAt = u.CreatedAt,
            BooksCount = u.Books.Count,
            Preferences = u.Preferences.Select(p => p.PreferenceTag).ToList()
        });

        return Ok(result);
    }

    [HttpPost("{id}/toggle-block")]
    public async Task<ActionResult<AdminUserDetailDto>> ToggleBlockUser(Guid id, CancellationToken cancellationToken)
    {
        var user = await _dbContext.Users
            .Include(u => u.Books)
            .Include(u => u.Preferences)
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

        if (user == null)
        {
            return NotFound(new { message = "Usuario no encontrado." });
        }

        user.IsBlocked = !user.IsBlocked;
        _dbContext.Users.Update(user);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var dto = new AdminUserDetailDto
        {
            Id = user.Id,
            Email = user.Email,
            Name = user.Name,
            DocumentoIdentidad = user.DocumentoIdentidad,
            Pais = user.Pais,
            Telefono = user.Telefono,
            ProfileImageUrl = user.ProfileImageUrl,
            IsPremium = user.IsPremium,
            SubscriptionPlan = user.SubscriptionPlan,
            Role = user.Role,
            IsBlocked = user.IsBlocked,
            CreatedAt = user.CreatedAt,
            BooksCount = user.Books.Count,
            Preferences = user.Preferences.Select(p => p.PreferenceTag).ToList()
        };

        return Ok(dto);
    }

    [HttpPost("{id}/toggle-admin")]
    public async Task<ActionResult<AdminUserDetailDto>> ToggleAdminRole(Guid id, CancellationToken cancellationToken)
    {
        var user = await _dbContext.Users
            .Include(u => u.Books)
            .Include(u => u.Preferences)
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);

        if (user == null)
        {
            return NotFound(new { message = "Usuario no encontrado." });
        }

        user.Role = user.Role == "Admin" ? "User" : "Admin";
        _dbContext.Users.Update(user);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var dto = new AdminUserDetailDto
        {
            Id = user.Id,
            Email = user.Email,
            Name = user.Name,
            DocumentoIdentidad = user.DocumentoIdentidad,
            Pais = user.Pais,
            Telefono = user.Telefono,
            ProfileImageUrl = user.ProfileImageUrl,
            IsPremium = user.IsPremium,
            SubscriptionPlan = user.SubscriptionPlan,
            Role = user.Role,
            IsBlocked = user.IsBlocked,
            CreatedAt = user.CreatedAt,
            BooksCount = user.Books.Count,
            Preferences = user.Preferences.Select(p => p.PreferenceTag).ToList()
        };

        return Ok(dto);
    }
}
