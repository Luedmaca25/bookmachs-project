USE [db_a5dc9c_ecolecturavpstest]
GO
/****** Object:  Table [dbo].[AjusteInventario]    Script Date: 19/07/2026 10:24:33 a. m. ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO
CREATE TABLE [dbo].[AjusteInventario](
	[Id] [int] IDENTITY(1,1) NOT NULL,
	[IdProducto] [nvarchar](128) NULL,
	[PrecioAnterior] [decimal](9, 2) NOT NULL,
	[StockAnterior] [int] NOT NULL,
	[UbicacionAnterior] [varchar](100) NOT NULL,
	[EstadoAnterior] [bit] NOT NULL,
	[PrecioActualizacion] [decimal](9, 2) NOT NULL,
	[StockActualizacion] [int] NOT NULL,
	[UbicacionActualizacion] [varchar](100) NOT NULL,
	[EstadoActual] [bit] NOT NULL,
	[IdUsuario] [nvarchar](128) NULL,
	[FechaActualizacion] [datetime] NOT NULL,
	[Justificacion] [varchar](500) NULL,
PRIMARY KEY CLUSTERED 
(
	[Id] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO
ALTER TABLE [dbo].[AjusteInventario]  WITH CHECK ADD FOREIGN KEY([IdProducto])
REFERENCES [dbo].[Productos] ([IdProducto])
GO
ALTER TABLE [dbo].[AjusteInventario]  WITH CHECK ADD FOREIGN KEY([IdUsuario])
REFERENCES [dbo].[AspNetUsers] ([Id])
GO
