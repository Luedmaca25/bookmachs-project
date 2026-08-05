USE [db_a5dc9c_ecolecturavpstest]
GO
/****** Object:  Table [dbo].[CategoriaProductos]    Script Date: 19/07/2026 10:14:18 a. m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[CategoriaProductos](
	[IdCategoriaProducto] [int] IDENTITY(1,1) NOT NULL,
	[NombreCategoria] [varchar](250) NOT NULL,
	[Activo] [bit] NOT NULL,
	[Orden] [int] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[IdCategoriaProducto] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[ImagenProductos]    Script Date: 19/07/2026 10:14:19 a. m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[ImagenProductos](
	[IdImagenProducto] [int] IDENTITY(1,1) NOT NULL,
	[RutaImagen] [nvarchar](1000) NOT NULL,
	[FechaRegistro] [datetime] NOT NULL,
	[Principal] [bit] NOT NULL,
	[IdProducto] [nvarchar](128) NULL,
	[IdUsuarioRegistroLibro] [nvarchar](128) NULL,
PRIMARY KEY CLUSTERED 
(
	[IdImagenProducto] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[Productos]    Script Date: 19/07/2026 10:14:19 a. m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[Productos](
	[IdProducto] [nvarchar](128) NOT NULL,
	[NombreLibro] [nvarchar](250) NOT NULL,
	[Autor] [nvarchar](500) NULL,
	[Stock] [int] NULL,
	[CantidadPaginas] [int] NULL,
	[AñoPublicacion] [int] NULL,
	[Precio] [decimal](9, 2) NULL,
	[Idioma] [varchar](50) NULL,
	[IdCategoriaProducto] [int] NULL,
	[IdEstadoProducto] [int] NULL,
	[FechaRegistro] [datetime] NULL,
	[Activo] [bit] NOT NULL,
	[Editorial] [varchar](100) NULL,
	[Destacado] [bit] NOT NULL,
	[Oferta] [bit] NOT NULL,
	[FechaDestacado] [datetime] NULL,
	[IdUsuarioRegistroLibro] [nvarchar](128) NULL,
	[Ubicacion] [nvarchar](1000) NULL,
	[IdSubcategoria] [int] NULL,
	[PrecioOferta] [decimal](9, 2) NULL,
	[FechaInicioOferta] [datetime] NULL,
	[FechaFinOferta] [datetime] NULL,
	[IdProductoDescuento] [int] NULL,
	[Resena] [varchar](8000) NOT NULL,
	[FechaActualizacion] [datetime] NULL,
	[IdUbicacion] [int] NULL,
PRIMARY KEY CLUSTERED 
(
	[IdProducto] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
/****** Object:  Table [dbo].[SubcategoriaProductos]    Script Date: 19/07/2026 10:14:19 a. m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[SubcategoriaProductos](
	[IdSubcategoria] [int] IDENTITY(1,1) NOT NULL,
	[NombreSubcategoria] [varchar](1000) NOT NULL,
	[Activo] [bit] NOT NULL,
	[IdCategoria] [int] NOT NULL,
PRIMARY KEY CLUSTERED 
(
	[IdSubcategoria] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
ALTER TABLE [dbo].[CategoriaProductos] ADD  DEFAULT ((1)) FOR [Activo]
GO
ALTER TABLE [dbo].[CategoriaProductos] ADD  DEFAULT ((0)) FOR [Orden]
GO
ALTER TABLE [dbo].[ImagenProductos] ADD  DEFAULT (getutcdate()) FOR [FechaRegistro]
GO
ALTER TABLE [dbo].[ImagenProductos] ADD  DEFAULT ((0)) FOR [Principal]
GO
ALTER TABLE [dbo].[Productos] ADD  DEFAULT (newid()) FOR [IdProducto]
GO
ALTER TABLE [dbo].[Productos] ADD  DEFAULT (getutcdate()) FOR [FechaRegistro]
GO
ALTER TABLE [dbo].[Productos] ADD  DEFAULT ((1)) FOR [Activo]
GO
ALTER TABLE [dbo].[Productos] ADD  DEFAULT ((0)) FOR [Destacado]
GO
ALTER TABLE [dbo].[Productos] ADD  DEFAULT ('') FOR [Resena]
GO
ALTER TABLE [dbo].[SubcategoriaProductos] ADD  DEFAULT ((1)) FOR [Activo]
GO
ALTER TABLE [dbo].[ImagenProductos]  WITH CHECK ADD FOREIGN KEY([IdProducto])
REFERENCES [dbo].[Productos] ([IdProducto])
GO
ALTER TABLE [dbo].[ImagenProductos]  WITH CHECK ADD FOREIGN KEY([IdUsuarioRegistroLibro])
REFERENCES [dbo].[AspNetUsers] ([Id])
GO
ALTER TABLE [dbo].[Productos]  WITH CHECK ADD FOREIGN KEY([IdCategoriaProducto])
REFERENCES [dbo].[CategoriaProductos] ([IdCategoriaProducto])
GO
ALTER TABLE [dbo].[Productos]  WITH CHECK ADD FOREIGN KEY([IdEstadoProducto])
REFERENCES [dbo].[EstadoProductos] ([IdEstadoProducto])
GO
ALTER TABLE [dbo].[Productos]  WITH CHECK ADD FOREIGN KEY([IdProductoDescuento])
REFERENCES [dbo].[ProductosDescuento] ([IdProductoDescuento])
GO
ALTER TABLE [dbo].[Productos]  WITH CHECK ADD FOREIGN KEY([IdSubcategoria])
REFERENCES [dbo].[SubcategoriaProductos] ([IdSubcategoria])
GO
ALTER TABLE [dbo].[Productos]  WITH CHECK ADD FOREIGN KEY([IdUbicacion])
REFERENCES [dbo].[Ubicaciones] ([Id])
GO
ALTER TABLE [dbo].[Productos]  WITH CHECK ADD FOREIGN KEY([IdUsuarioRegistroLibro])
REFERENCES [dbo].[AspNetUsers] ([Id])
GO
ALTER TABLE [dbo].[SubcategoriaProductos]  WITH CHECK ADD FOREIGN KEY([IdCategoria])
REFERENCES [dbo].[CategoriaProductos] ([IdCategoriaProducto])
GO
