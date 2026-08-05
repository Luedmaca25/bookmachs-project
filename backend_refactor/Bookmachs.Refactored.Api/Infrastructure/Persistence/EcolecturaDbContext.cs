using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace Bookmachs.Refactored.Api.Infrastructure.Persistence
{
    public class EcolecturaDbContext : DbContext
    {
        public EcolecturaDbContext(DbContextOptions<EcolecturaDbContext> options) : base(options)
        {
        }

        public DbSet<EcolecturaProducto> Productos { get; set; } = null!;
        public DbSet<EcolecturaCategoria> CategoriaProductos { get; set; } = null!;
        public DbSet<EcolecturaSubcategoria> SubcategoriaProductos { get; set; } = null!;
        public DbSet<EcolecturaImagenProducto> ImagenProductos { get; set; } = null!;
        public DbSet<EcolecturaAjusteInventario> AjustesInventario { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<EcolecturaCategoria>(entity =>
            {
                entity.ToTable("CategoriaProductos");
                entity.HasKey(c => c.IdCategoriaProducto);
                entity.Property(c => c.NombreCategoria).IsRequired().HasMaxLength(250);
                entity.Property(c => c.Activo).IsRequired();
                entity.Property(c => c.Orden).IsRequired();
            });

            modelBuilder.Entity<EcolecturaSubcategoria>(entity =>
            {
                entity.ToTable("SubcategoriaProductos");
                entity.HasKey(s => s.IdSubcategoria);
                entity.Property(s => s.NombreSubcategoria).IsRequired().HasMaxLength(1000);
                entity.Property(s => s.Activo).IsRequired();
                
                entity.HasOne<EcolecturaCategoria>()
                    .WithMany()
                    .HasForeignKey(s => s.IdCategoria)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<EcolecturaProducto>(entity =>
            {
                entity.ToTable("Productos");
                entity.HasKey(p => p.IdProducto);
                entity.Property(p => p.IdProducto).HasMaxLength(128);
                entity.Property(p => p.NombreLibro).IsRequired().HasMaxLength(250);
                entity.Property(p => p.Autor).HasMaxLength(500);
                entity.Property(p => p.Resena).HasMaxLength(8000);
                entity.Property(p => p.Precio).HasPrecision(9, 2);
                entity.Property(p => p.PrecioOferta).HasPrecision(9, 2);
                entity.Property(p => p.Idioma).HasMaxLength(50);
                entity.Property(p => p.Editorial).HasMaxLength(100);
                entity.Property(p => p.Ubicacion).HasMaxLength(1000);

                entity.HasOne(p => p.Categoria)
                    .WithMany()
                    .HasForeignKey(p => p.IdCategoriaProducto)
                    .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(p => p.Subcategoria)
                    .WithMany()
                    .HasForeignKey(p => p.IdSubcategoria)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<EcolecturaImagenProducto>(entity =>
            {
                entity.ToTable("ImagenProductos");
                entity.HasKey(i => i.IdImagenProducto);
                entity.Property(i => i.RutaImagen).IsRequired().HasMaxLength(1000);
                entity.Property(i => i.IdProducto).HasMaxLength(128);

                entity.HasOne(i => i.Producto)
                    .WithMany(p => p.Imagenes)
                    .HasForeignKey(i => i.IdProducto)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<EcolecturaAjusteInventario>(entity =>
            {
                entity.ToTable("AjusteInventario");
                entity.HasKey(a => a.Id);
                entity.Property(a => a.IdProducto).HasMaxLength(128);
                entity.Property(a => a.PrecioAnterior).HasPrecision(9, 2);
                entity.Property(a => a.PrecioActualizacion).HasPrecision(9, 2);
                entity.Property(a => a.UbicacionAnterior).IsRequired().HasMaxLength(100);
                entity.Property(a => a.UbicacionActualizacion).IsRequired().HasMaxLength(100);
                entity.Property(a => a.IdUsuario).HasMaxLength(128);
                entity.Property(a => a.Justificacion).HasMaxLength(500);
            });
        }
    }

    public class EcolecturaProducto
    {
        public string IdProducto { get; set; } = string.Empty;
        public string NombreLibro { get; set; } = string.Empty;
        public string? Autor { get; set; }
        public int? Stock { get; set; }
        public int? CantidadPaginas { get; set; }
        public int? AñoPublicacion { get; set; }
        public decimal? Precio { get; set; }
        public string? Idioma { get; set; }
        public int? IdCategoriaProducto { get; set; }
        public int? IdEstadoProducto { get; set; }
        public DateTime? FechaRegistro { get; set; }
        public bool Activo { get; set; }
        public string? Editorial { get; set; }
        public bool Destacado { get; set; }
        public bool Oferta { get; set; }
        public string? IdUsuarioRegistroLibro { get; set; }
        public string? Ubicacion { get; set; }
        public int? IdSubcategoria { get; set; }
        public decimal? PrecioOferta { get; set; }
        public string Resena { get; set; } = string.Empty;
        public DateTime? FechaActualizacion { get; set; }

        public EcolecturaCategoria? Categoria { get; set; }
        public EcolecturaSubcategoria? Subcategoria { get; set; }
        public ICollection<EcolecturaImagenProducto> Imagenes { get; set; } = new List<EcolecturaImagenProducto>();
    }

    public class EcolecturaCategoria
    {
        public int IdCategoriaProducto { get; set; }
        public string NombreCategoria { get; set; } = string.Empty;
        public bool Activo { get; set; }
        public int Orden { get; set; }
    }

    public class EcolecturaSubcategoria
    {
        public int IdSubcategoria { get; set; }
        public string NombreSubcategoria { get; set; } = string.Empty;
        public bool Activo { get; set; }
        public int IdCategoria { get; set; }
    }

    public class EcolecturaImagenProducto
    {
        public int IdImagenProducto { get; set; }
        public string RutaImagen { get; set; } = string.Empty;
        public DateTime FechaRegistro { get; set; }
        public bool Principal { get; set; }
        public string? IdProducto { get; set; }

        public EcolecturaProducto? Producto { get; set; }
    }

    public class EcolecturaAjusteInventario
    {
        public int Id { get; set; }
        public string? IdProducto { get; set; }
        public decimal PrecioAnterior { get; set; }
        public int StockAnterior { get; set; }
        public string UbicacionAnterior { get; set; } = string.Empty;
        public bool EstadoAnterior { get; set; }
        public decimal PrecioActualizacion { get; set; }
        public int StockActualizacion { get; set; }
        public string UbicacionActualizacion { get; set; } = string.Empty;
        public bool EstadoActual { get; set; }
        public string? IdUsuario { get; set; }
        public DateTime FechaActualizacion { get; set; }
        public string? Justificacion { get; set; }
    }
}
