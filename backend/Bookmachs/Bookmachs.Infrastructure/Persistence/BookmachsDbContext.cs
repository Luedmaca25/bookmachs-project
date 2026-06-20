using Bookmachs.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Bookmachs.Infrastructure.Persistence;

public class BookmachsDbContext : DbContext
{
    public BookmachsDbContext(DbContextOptions<BookmachsDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users { get; set; } = null!;
    public DbSet<Book> Books { get; set; } = null!;
    public DbSet<MatchTransaction> MatchTransactions { get; set; } = null!;
    public DbSet<Subscription> Subscriptions { get; set; } = null!;
    public DbSet<UserPreference> UserPreferences { get; set; } = null!;
    public DbSet<GlobalSettings> GlobalSettings { get; set; } = null!;
    public DbSet<MasterPreferenceTag> MasterPreferenceTags { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // --- Configuración de User ---
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.Property(u => u.Email).IsRequired().HasMaxLength(150);
            entity.HasIndex(u => u.Email).IsUnique();
            entity.Property(u => u.Name).IsRequired().HasMaxLength(100);
            entity.Property(u => u.DocumentoIdentidad).IsRequired().HasMaxLength(50);
            entity.Property(u => u.Pais).IsRequired().HasMaxLength(50);
            entity.Property(u => u.SubscriptionPlan).IsRequired().HasMaxLength(20);
            entity.Property(u => u.Role).IsRequired().HasMaxLength(20);
            entity.HasIndex(u => u.GoogleSub).HasFilter("[GoogleSub] IS NOT NULL");
        });

        // --- Configuración de Book ---
        modelBuilder.Entity<Book>(entity =>
        {
            entity.HasKey(b => b.Id);
            entity.Property(b => b.Title).IsRequired().HasMaxLength(200);
            entity.Property(b => b.Author).IsRequired().HasMaxLength(100);
            entity.Property(b => b.Condition).IsRequired().HasMaxLength(20);
            entity.Property(b => b.BaseValue).HasPrecision(18, 2);

            // Relación del libro con su propietario original
            entity.HasOne(b => b.Owner)
                .WithMany(u => u.Books)
                .HasForeignKey(b => b.OwnerId)
                .OnDelete(DeleteBehavior.Restrict);

            // Relación con el usuario que tiene reservado el libro
            entity.HasOne(b => b.ReservedByUser)
                .WithMany()
                .HasForeignKey(b => b.ReservedByUserId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // --- Configuración de MatchTransaction ---
        modelBuilder.Entity<MatchTransaction>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.Property(t => t.FeeAmount).HasPrecision(18, 2);
            entity.Property(t => t.PaymentStatus).IsRequired().HasMaxLength(20);
            entity.Property(t => t.LogisticsStatus).IsRequired().HasMaxLength(20);
            entity.Property(t => t.LogisticsMethod).HasMaxLength(50);
            entity.Property(t => t.PaymentHoldId).HasMaxLength(100);

            // Relación de Match con el Solicitante (Requester)
            entity.HasOne(t => t.RequesterUser)
                .WithMany()
                .HasForeignKey(t => t.RequesterUserId)
                .OnDelete(DeleteBehavior.Restrict);

            // Relación de Match con el Dueño del Libro
            entity.HasOne(t => t.OwnerUser)
                .WithMany()
                .HasForeignKey(t => t.OwnerUserId)
                .OnDelete(DeleteBehavior.Restrict);

            // Relación de Match con el Libro
            entity.HasOne(t => t.Book)
                .WithMany()
                .HasForeignKey(t => t.BookId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // --- Configuración de Subscription ---
        modelBuilder.Entity<Subscription>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.Property(s => s.PlanName).IsRequired().HasMaxLength(20);
            entity.Property(s => s.Price).HasPrecision(18, 2);
            entity.Property(s => s.ExternalSubscriptionId).HasMaxLength(100);

            // Relación de suscripción con usuario
            entity.HasOne(s => s.User)
                .WithMany(u => u.Subscriptions)
                .HasForeignKey(s => s.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // --- Configuración de UserPreference ---
        modelBuilder.Entity<UserPreference>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.PreferenceTag).IsRequired().HasMaxLength(50);

            // Relación de preferencia con usuario
            entity.HasOne(p => p.User)
                .WithMany(u => u.Preferences)
                .HasForeignKey(p => p.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // --- Configuración de GlobalSettings ---
        modelBuilder.Entity<GlobalSettings>(entity =>
        {
            entity.HasKey(g => g.Id);
            entity.Property(g => g.BasicPlanPriceUsd).HasPrecision(18, 2);
            entity.Property(g => g.PremiumPlanPriceUsd).HasPrecision(18, 2);
            entity.Property(g => g.FeePercentage).HasPrecision(5, 4); // ej: 0.3000
            entity.Property(g => g.MinFeeAmount).HasPrecision(18, 2);
            entity.Property(g => g.MaxFeeAmount).HasPrecision(18, 2);
        });

        // --- Configuración de MasterPreferenceTag ---
        modelBuilder.Entity<MasterPreferenceTag>(entity =>
        {
            entity.HasKey(m => m.Id);
            entity.Property(m => m.Name).IsRequired().HasMaxLength(50);
            entity.HasIndex(m => m.Name).IsUnique();
        });
    }
}
