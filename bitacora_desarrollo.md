# Bitácora de Desarrollo Detallada e Historial de Ejecución - Bookmachs
## Proyecto: Bookmachs (ASP.NET Core + React SPA)

Este documento contiene un registro técnico detallado de cada una de las tareas ejecutadas desde la **Fase 1** hasta la **Fase 7**, reflejando las implementaciones específicas, flujos lógicos, DTOs, componentes de frontend, reglas CSS y pruebas aplicadas.

## Refactorización Técnica y Mejoras de Seguridad (Post-Code Review)
* **Objetivo:** Implementar los puntos críticos y sugerencias del Code Review para mejorar la seguridad del sistema y simplificar la arquitectura mediante el manejo global de excepciones.
* **Detalles del Trabajo Realizado:**
  - **Manejo Global de Excepciones (Middleware):**
    - Diseñado y creado [ExceptionHandlingMiddleware.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Api/Middlewares/ExceptionHandlingMiddleware.cs) en la capa de API.
    - Captura excepciones en toda la canalización de solicitudes HTTP, mapeando excepciones de negocio (`KeyNotFoundException` a 404, `UnauthorizedAccessException` a 403, `ArgumentException`/`InvalidOperationException` a 400, y otras a 500) a respuestas de error estructuradas bajo el estándar RFC 7807 `ProblemDetails`.
    - Registrado en [Program.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Api/Program.cs) para encapsular todo el ciclo de vida de la petición.
  - **Seguridad del Dashboard de Hangfire:**
    - Creado el filtro de autorización de panel [HangfireAuthorizationFilter.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Api/Security/HangfireAuthorizationFilter.cs) para restringir el acceso al panel `/hangfire` en entornos que no sean de desarrollo (`!IsDevelopment()`), bloqueando solicitudes externas y permitiendo únicamente conexiones locales (localhost).
    - Configurado condicionalmente en [Program.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Api/Program.cs) con `DashboardOptions`.
  - **Compilación y Pruebas:**
    - Compilación completa exitosa de la solución (0 errores, 0 advertencias).
    - Ejecución de `dotnet test` confirmando que las 50 pruebas pasan satisfactoriamente.
* **Archivos Clave:**
  - [ExceptionHandlingMiddleware.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Api/Middlewares/ExceptionHandlingMiddleware.cs)
  - [HangfireAuthorizationFilter.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Api/Security/HangfireAuthorizationFilter.cs)
  - [Program.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Api/Program.cs)

---

## 🏛️ Fase 1: Setup Inicial del Proyecto y Arquitectura

### Tarea 1: Estructuración de la Solución de Clean Architecture
* **Objetivo:** Definir la separación de conceptos y la dirección de dependencias apuntando al dominio.
* **Detalles del Trabajo Realizado:**
  - Creación de `Bookmachs.sln`.
  - Configuración del proyecto `Bookmachs.Domain` (entidades y abstracciones base).
  - Configuración de `Bookmachs.Application` (dependencias a `Domain` y uso de MediatR).
  - Configuración de `Bookmachs.Infrastructure` (dependencias a `Domain` y `Application`, configuración de Entity Framework y servicios de pasarela).
  - Configuración de `Bookmachs.Api` (punto de entrada, controladores REST y dependencias a todas las capas).
* **Archivos Clave:**
  - Archivos de configuración de proyectos `.csproj` en la solución backend.

### Tarea 2: Inyección de Dependencias, MediatR y Swagger en API
* **Objetivo:** Implementar el patrón CQRS para separar comandos de consultas y documentar interactivamente el API.
* **Detalles del Trabajo Realizado:**
  - Registro de MediatR con `builder.Services.AddMediatR()`.
  - Configuración de Swagger para documentar endpoints, incluyendo soporte para tokens JWT mediante el esquema de seguridad Bearer.
  - Registro del pipeline de controladores REST y mapeo automatizado de dependencias.
* **Archivos Clave:**
  - [Program.cs (Api)](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Api/Program.cs)

### Tarea 3: Inicialización del Proyecto Frontend
* **Objetivo:** Setup del entorno web SPA para la interfaz de usuario interactiva.
* **Detalles del Trabajo Realizado:**
  - Creación del andamiaje base de React 19 + TypeScript utilizando el empaquetador Vite.
  - Configuración de `tsconfig.json` y scripts de empaquetado.
* **Archivos Clave:**
  - [package.json (frontend)](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/package.json)
  - [vite.config.ts](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/vite.config.ts)

### Tarea 4: Configuración Core y Feature-Sliced Design (FSD)
* **Objetivo:** Implementar una arquitectura limpia y modular en el frontend usando CSS Puro.
* **Detalles del Trabajo Realizado:**
  - Creación del árbol de directorios FSD (`app`, `features`, `lib`, `shared`).
  - Configuración del cliente `apiClient` para peticiones fetch con interceptación de tokens.
  - Configuración de Zustand para la gestión de estado de autenticación y caché de React Query.
  - Setup del sistema de variables de estilo Vanilla CSS.
* **Archivos Clave:**
  - [AppRouter.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/app/router/AppRouter.tsx)
  - [index.css](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/index.css)
  - [apiClient.ts](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/lib/apiClient.ts)

---

## 🗄️ Fase 2: Modelado de Datos y Base de Datos (EF Core Code-First)

### Tarea 5: Codificación de las Entidades de Dominio
* **Objetivo:** Modelar los datos de negocio en C# de acuerdo a los requerimientos funcionales.
* **Detalles del Trabajo Realizado:**
  - `User`: Email, Nombre, País, DocumentoIdentidad, suscripción premium y contadores de swipes.
  - `Book`: Título, Autor, Resumen, Condición, Valor base, procedencia (`IsInternalStock`) e imagen.
  - `MatchTransaction`: Solicitante, Libro, Dueño, FeeAmount, ID de Hold de pago, LogisticsStatus e IsCrossBorder.
  - `GlobalSettings`: Parámetros de negocio configurables (limites de swipes y topes de fee).
  - `UserPreference`: Preferencias cruzadas de cuestionarios.
* **Archivos Clave:**
  - [User.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Domain/Entities/User.cs)
  - [Book.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Domain/Entities/Book.cs)
  - [MatchTransaction.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Domain/Entities/MatchTransaction.cs)

### Tarea 6: Contexto de Base de Datos (EF Core) y Mapeos Fluent API
* **Objetivo:** Configurar las reglas relacionales de persistencia en la base de datos SQL Server.
* **Detalles del Trabajo Realizado:**
  - Creación de `BookmachsDbContext`.
  - Definición de relaciones uno a muchos entre Matches, Libros y Usuarios.
  - Restricción de tamaños de caracteres y campos requeridos para evitar excepciones.
* **Archivos Clave:**
  - [BookmachsDbContext.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Infrastructure/Persistence/BookmachsDbContext.cs)

### Tarea 7: Generación de la Migración Inicial y Aplicación en SQL Server
* **Objetivo:** Mapear la base de datos física local.
* **Detalles del Trabajo Realizado:**
  - Creación del historial de migraciones a través del comando `dotnet ef migrations add InitialCreate`.
  - Actualización de la BD local (`dotnet ef database update`).
* **Archivos Clave:**
  - Carpeta de Migraciones en `Infrastructure`.

### Tarea 8: Patrón Repositorio y Unit of Work
* **Objetivo:** Desacoplar la base de datos de los controladores y comandos CQRS.
* **Detalles del Trabajo Realizado:**
  - Definición de interfaces (`IUserRepository`, `IBookRepository`, etc.) en `Domain`.
  - Implementación de los repositorios y la clase coordinadora `UnitOfWork` que procesa transacciones atómicas.
* **Archivos Clave:**
  - [IUnitOfWork.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Domain/Repositories/IUnitOfWork.cs)
  - [UnitOfWork.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Infrastructure/Repositories/UnitOfWork.cs)

---

## ⚙️ Fase 3: Backoffice y Parametrización Global

### Tarea 9: CRUD de Configuraciones Globales (GlobalSettings)
* **Objetivo:** Proveer endpoints para alterar variables en caliente.
* **Detalles del Trabajo Realizado:**
  - Endpoints `GET` y `PUT` para leer y actualizar la tabla única de parámetros comerciales (límites, tarifas, topes).
* **Archivos Clave:**
  - [GlobalSettingsController.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Api/Controllers/GlobalSettingsController.cs)

### Tarea 10: CRUD del Catálogo Maestro del Cuestionario de Gustos
* **Objetivo:** Endpoint dinámico para alimentar el wizard de registro.
* **Detalles del Trabajo Realizado:**
  - Creación del catálogo maestro de géneros literarios e intenciones y exposición mediante API REST.
* **Archivos Clave:**
  - `CatalogsController.cs`

### Tarea 11: Interfaz del Panel CMS Web de Administración
* **Objetivo:** Permitir la edición visual de los parámetros en caliente.
* **Detalles del Trabajo Realizado:**
  - Vistas de control con inputs en React para configurar rangos y precios en vivo.
* **Archivos Clave:**
  - Formularios de administración frontend.

### Tarea 12: Pruebas QA de Configuración Global en Tiempo Real
* **Objetivo:** Asegurar que los cambios aplicados en configuraciones impactan las consultas de usuarios de inmediato.
* **Detalles del Trabajo Realizado:**
  - Ejecución de pruebas automatizadas que verifican la alteración de cuotas al actualizar las variables maestras.
* **Archivos Clave:**
  - Suites de test de backoffice.

---

## 👤 Fase 4: Autenticación, Landing y Onboarding

### Tarea 13: JWT Bearer y Google OAuth 2.0 Backend Integration
* **Objetivo:** Habilitar autenticación federada y segura.
* **Detalles del Trabajo Realizado:**
  - Registro de middlewares de autorización y validadores del ID Token de Google SSO.
* **Archivos Clave:**
  - Middleware JWT en `Program.cs`.

### Tarea 14: Registro Local con Documento de Identidad Dinámico
* **Objetivo:** Validar la identidad de los usuarios de acuerdo a su país.
* **Detalles del Trabajo Realizado:**
  - Implementación del comando de registro que valida dinámicamente si el documento ingresado es coherente con el formato oficial del país seleccionado (RUT, RFC, etc.).
* **Archivos Clave:**
  - [RegisterUserCommand.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Application/Authentication/Commands/RegisterUserCommand.cs)

### Tarea 15: Modal Hard Gate de Bloqueo
* **Objetivo:** Impedir el uso de Swipe a usuarios invitados.
* **Detalles del Trabajo Realizado:**
  - Intercepción de clics en la interfaz y despliegue del modal bloqueador que obliga al registro/login.
* **Archivos Clave:**
  - Modales en el directorio de descubrimiento.

### Tarea 16: Integración SSO Google Frontend
* **Objetivo:** Permitir el registro rápido mediante un solo clic.
* **Detalles del Trabajo Realizado:**
  - Enlace del botón de acceso de Google con los callbacks del backend para crear el perfil automáticamente con datos de Google.
* **Archivos Clave:**
  - Pantallas de autenticación en frontend.

### Tarea 17: Wizard Dinámico del Cuestionario de Gustos
* **Objetivo:** Registrar las categorías literarias favoritas del usuario para personalizar recomendaciones.
* **Detalles del Trabajo Realizado:**
  - Formulario paso a paso (wizard) que consume la API de catálogo y registra las respuestas en el perfil del usuario.
* **Archivos Clave:**
  - Wizard interactivo en frontend.

---

## 📦 Fase 5: Inventario, Logística y Subida de Libros

### Tarea 18: Directorio Local de Imágenes en el Servidor (uploads)
* **Objetivo:** Configurar la ruta física del servidor VPS para recibir portadas de libros.
* **Detalles del Trabajo Realizado:**
  - Setup del directorio `/wwwroot/uploads` y mapeo de la URL estática para servir fotos de forma directa.
* **Archivos Clave:**
  - Mapeo de archivos estáticos en `Program.cs`.

### Tarea 19: Formulario de Subida Manual en React
* **Objetivo:** Permitir que usuarios gratuitos listen sus libros ofrecidos.
* **Detalles del Trabajo Realizado:**
  - Formulario en React que captura título, autor, reseña, estado de conservación y archivo de foto.
* **Archivos Clave:**
  - Componentes del feature de inventario (`inventory/`).

### Tarea 20: API de Subida de Libros Externos (IsExternalStock = true)
* **Objetivo:** Guardar en la base de datos el libro de intercambio cargado por un usuario.
* **Detalles del Trabajo Realizado:**
  - Endpoint multipart para subir archivo y registrar la entidad `Book` en base de datos.
* **Archivos Clave:**
  - [AddBookCommand.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Application/Books/Commands/AddBookCommand.cs) en el backend.

---

## 🎯 Fase 6: Motor de Recomendación, Swipe y Límites Diarios

### Tarea 21: Endpoint Público de Portadas Random para Invitados
* **Objetivo:** Servir un libro señuelo a usuarios no autenticados.
* **Detalles del Trabajo Realizado:**
  - Creación del endpoint `/api/books/guest-random` que extrae un libro al azar sin requerir tokens JWT.
* **Archivos Clave:**
  - [GetRandomGuestBookQuery.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Application/Books/Queries/GetRandomGuestBookQuery.cs)

### Tarea 22: Algoritmo de Recomendación Cruzada Nativo en C#
* **Objetivo:** Filtrar libros eficientemente en milisegundos sin consumir exceso de memoria.
* **Detalles del Trabajo Realizado:**
  - Motor nativo que busca coincidencia cruzada de etiquetas del cuestionario del usuario contra las propiedades del catálogo físico e inventario subido por terceros.
* **Archivos Clave:**
  - Comando de emparejamiento de libros en `Application`.

### Tarea 23: Contadores de Swipes Diarios y Control de Cuota
* **Objetivo:** Limitar a usuarios gratuitos para incentivar suscripciones premium.
* **Detalles del Trabajo Realizado:**
  - Middleware en el backend que suma visualizaciones en el perfil y arroja código HTTP 403 / límite excedido cuando se alcanza la cuota gratuita diaria.
* **Archivos Clave:**
  - Lógica de cuotas del perfil en backend.

### Tarea 24: Interfaz de Tarjetas de Libros Swipeables
* **Objetivo:** Diseñar la experiencia interactiva lúdica.
* **Detalles del Trabajo Realizado:**
  - Animaciones fluidas en CSS puro para mover tarjetas a la derecha ("Me interesa") e izquierda ("Descartar") con gestos rápidos de cursor o botones.
* **Archivos Clave:**
  - [SwipePage.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/features/discovery/SwipePage.tsx)

### Tarea 25: Desenfoque de Portada (Blur) y Upsell Modal
* **Objetivo:** Presentar el Paywall a usuarios gratuitos sin cuota de swipes.
* **Detalles del Trabajo Realizado:**
  - Si el backend devuelve cuota excedente, se aplica un filtro CSS de desenfoque (`blur`) a la tarjeta del libro y se levanta automáticamente un modal emergente para actualizar a planes de pago.
* **Archivos Clave:**
  - Componente de Upsell e inyección de clases CSS en `SwipePage.tsx`.

---

## 💳 Fase 7: Sistema de Transacciones y Pagos (Checkout)

### Tarea 26: Lógica de Estimación Matemática del Fee por IA
* **Objetivo:** Cobrar de forma transparente la tarifa de intercambio calculada dinámicamente.
* **Detalles del Trabajo Realizado:**
  - **Backend:** Desarrollé [EstimateFeeQuery.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Application/Transactions/Queries/EstimateFeeQuery.cs) que procesa la matemática del Fee del libro (asigna entre un 30% y 40% del valor base del libro) aplicando un límite máximo para proteger al consumidor de cobros desproporcionados, regulado por la variable de control maestro `FeeMaxLimit` del panel administrativo.
  - **Resultado:** Endpoint `/api/transactions/estimate-fee/{bookId}` seguro que evita que el frontend altere los montos.
* **Archivos Clave:**
  - [EstimateFeeQuery.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Application/Transactions/Queries/EstimateFeeQuery.cs)
  - [TransactionsController.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Api/Controllers/TransactionsController.cs)

### Tarea 27: UI de ¡Match Logrado! con Desglose Transparente
* **Objetivo:** Mostrar una pantalla de éxito cuando dos lectores coinciden en sus gustos de libros.
* **Detalles del Trabajo Realizado:**
  - **Frontend:** Creé el componente modal [MatchModal.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/features/transactions/components/MatchModal.tsx) que presenta la coincidencia y detalla el Fee exacto calculado y devuelto por la API del backend. Incluye un botón para proceder directamente al checkout de pago.
  - **Estilos:** Diseño oscuro Sleek Dark con fondo difuminado de cristal (glassmorphism) y efectos CSS de aparición.
* **Archivos Clave:**
  - [MatchModal.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/features/transactions/components/MatchModal.tsx)
  - [index.css](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/index.css)

### Tarea 28: Integración de SDKs de Pasarelas de Pago para Retención (Hold)
* **Objetivo:** Configurar la retención antifraude (Hold) en tarjetas antes de liberar la entrega.
* **Detalles del Trabajo Realizado:**
  - **Pasarelas:** Integración y configuración en C# de los SDKs para Mercado Pago (retenciones temporales contra tokenizaciones de tarjeta) y Transbank Webpay Plus (operaciones con la modalidad de Captura Diferida en el comercio de pruebas).
  - **Simulación:** Implementación del mock en [PaymentGatewayService.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Infrastructure/Payments/PaymentGatewayService.cs) que simula el commit de tokens autorizando transacciones con códigos de comercio mock de Transbank (`597038127347`).
* **Archivos Clave:**
  - [PaymentGatewayService.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Infrastructure/Payments/PaymentGatewayService.cs)

### Tarea 29: Vistas y Endpoints de Checkout
* **Objetivo:** Construir la interfaz de pasarela de pago del Fee.
* **Detalles del Trabajo Realizado:**
  - **Endpoints Backend:**
    - `/api/transactions/checkout-card`: Valida tokenizaciones de tarjetas.
    - `/api/transactions/webpay-start`: Inicializa sesiones diferidas de Webpay Plus y devuelve la URL de redirección.
    - `/api/transactions/webpay-confirm`: Endpoint de confirmación que realiza el Commit final de la transacción en Transbank tras la simulación de callback del usuario y actualiza la base de datos.
  - **Frontend:** Vista en [TransactionsPage.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/features/transactions/TransactionsPage.tsx) que contiene pestañas interactivas de método de pago, simulación estética de redirección a Transbank, y pantalla de confirmación exitosa con la transacción en estado **`Hold` (Pago Retenido)**.
* **Archivos Clave:**
  - [TransactionsPage.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/features/transactions/TransactionsPage.tsx)
  - [TransactionsController.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Api/Controllers/TransactionsController.cs)
  - [ConfirmCardCheckoutCommand.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Application/Transactions/Commands/ConfirmCardCheckoutCommand.cs)
  - [ConfirmWebpayCheckoutCommand.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Application/Transactions/Commands/ConfirmWebpayCheckoutCommand.cs)

### Tarea 30: Validación Geográfica y Warning UI Internacional
* **Objetivo:** Informar obligatoriamente al usuario sobre sobrecostos en envíos transfronterizos antes de comprometer fondos.
* **Detalles del Trabajo Realizado:**
  - **Backend:** Añadí el campo booleano `AcceptCrossBorder` a `CheckoutCardRequest` y `WebpayStartRequest` de API. Los comandos `ConfirmCardCheckoutCommand` y `StartWebpayCheckoutCommand` validan que si la transacción es internacional (`IsCrossBorder == true`) pero el parámetro `AcceptCrossBorder` es enviado como `false`, se aborte la transacción y se devuelva un error del servidor.
  - **Frontend:** Si el match de libros es transfronterizo, se dibuja un recuadro de advertencia que advierte sobre los altos costos logísticos internacionales y de aduana. Integra una casilla de verificación (`checkbox`) que obliga al usuario a aceptar la advertencia. Los botones de confirmación de pago se deshabilitan por completo hasta que el usuario marque la casilla de aceptación.
  - **Estilos:** Se agregaron clases CSS de checkbox y avisos de advertencia interactivos en `index.css` utilizando la paleta de color de advertencia `var(--accent-warning)`.
* **Archivos Clave:**
  - [TransactionsPage.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/features/transactions/TransactionsPage.tsx)
  - [TransactionsController.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Api/Controllers/TransactionsController.cs)
  - [ConfirmCardCheckoutCommand.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Application/Transactions/Commands/ConfirmCardCheckoutCommand.cs)
  - [StartWebpayCheckoutCommand.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Application/Transactions/Commands/StartWebpayCheckoutCommand.cs)
  - [CheckoutTests.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Tests/CheckoutTests.cs) (pruebas de bloqueo transfronterizo).

### Tarea 31: Formulario Selector Condicional del Método Logístico
* **Objetivo:** Permitir al usuario configurar cómo entregará su libro una vez que su pago sea pre-autorizado.
* **Detalles del Trabajo Realizado:**
  - **Backend:** Desarrollé el comando `UpdateLogisticsCommand` y lo expuse en el endpoint `/api/transactions/update-logistics` de `TransactionsController`. Recibe la selección y actualiza campos en la base de datos de acuerdo a reglas lógicas estrictas:
    - `Presencial` (Tienda): Transiciona el estado de logística del match a `Delivered` de inmediato.
    - `Bodega` (Despacho a Bookmachs): Exige obligatoriamente el ingreso de un Tracking ID del courier y transiciona a `InTransit`.
    - `P2P` (Despacho directo entre usuarios): Exige obligatoriamente el ingreso de un Tracking ID del courier y transiciona a `InTransit`.
    - `Donacion` (Dona en buzón y recibe): Exige la carga de una imagen binaria codificada en Base64 como evidencia física y transiciona a `Delivered`.
  - **Frontend:** Añadí la sección de selección de envío en `TransactionsPage.tsx` habilitada por el botón **"Configurar Entrega 📦"** (solo visible si el pago del match está pre-autorizado en Hold). El formulario se adapta condicionalmente mostrando inputs de texto para el Tracking ID o un input selector de archivos con previsualización para la foto de donación.
  - **Estilos:** Se incorporaron variables de badges logísticos (`badge-logistics-method`) y botones del color secundario en `index.css`.
* **Archivos Clave:**
  - [TransactionsPage.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/features/transactions/TransactionsPage.tsx)
  - [UpdateLogisticsCommand.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Application/Transactions/Commands/UpdateLogisticsCommand.cs)
  - [TransactionsController.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Api/Controllers/TransactionsController.cs)
  - [CheckoutTests.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Tests/CheckoutTests.cs) (pruebas de validación de tracking e imágenes de donación).
  - [index.css](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/index.css)

---

## 💎 Fase 8: Suscripciones Premium, Catálogos y Reservas

### Tarea 32: Cobro Recurrente (Suscripciones) e Integración de Webhooks con Pasarela
* **Objetivo:** Desarrollar el flujo para el procesamiento de cobros recurrentes de suscripciones mediante la recepción e interpretación de webhooks enviados por la pasarela de Mercado Pago, actualizando el estado de suscripción del usuario en la base de datos local y habilitando las funciones Premium.
* **Detalles del Trabajo Realizado:**
  - **Backend:**
    - Modificación del servicio de pasarela en [PaymentGatewayService.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Infrastructure/Payments/PaymentGatewayService.cs) para implementar el método `GetSubscriptionDetailsAsync`. En modo real realiza una petición GET al SDK de Mercado Pago (`PreapprovalClient`), y en modo simulación (mock) procesa y decodifica localmente el ID de la suscripción para resolver el correo electrónico del pagador y el estado correspondiente.
    - Creación del comando [ProcessMercadoPagoWebhookCommand.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Application/Subscriptions/Commands/ProcessMercadoPagoWebhookCommand.cs) y su respectivo handler en la capa Application. El manejador procesa eventos de tipo `preapproval` o `subscription`:
      - Si el estado de la suscripción es `authorized`, `active` o `approved`: Setea la bandera `IsPremium = true` y el plan en `"Premium"` para el usuario correspondiente en la base de datos, y registra una nueva entidad `Subscription` con vigencia de 1 mes en la tabla de base de datos.
      - Si el estado es `cancelled`, `suspended` o `cancelled_by_payer`: Desactiva la suscripción estableciendo al usuario en modo gratuito (`IsPremium = false`, `SubscriptionPlan = "Free"`) y marcando la suscripción como inactiva.
    - Creación de [WebhooksController.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Api/Controllers/WebhooksController.cs) expuesto en `/api/webhooks/mercadopago` con la anotación `[AllowAnonymous]` para omitir las validaciones de token JWT globales de la aplicación y así permitir a Mercado Pago entregar notificaciones de forma directa.
    - Implementación del endpoint utilitario `/api/webhooks/trigger-test` en el mismo controlador para simular webhooks localmente desde el frontend u otras herramientas de desarrollo en QA, codificando el email en el ID de la suscripción simulada para resolver la integración de base de datos.
  - **Pruebas:**
    - Creación de la suite de pruebas unitarias [SubscriptionTests.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Tests/SubscriptionTests.cs), verificando la correcta asignación del flag premium ante webhooks de creación/autorización y la reversión a plan gratuito ante webhooks de cancelación. Las pruebas se ejecutan de manera limpia y exitosa en memoria.
* **Archivos Clave:**
  - [IPaymentGatewayService.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Domain/Services/IPaymentGatewayService.cs)
  - [PaymentGatewayService.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Infrastructure/Payments/PaymentGatewayService.cs)
  - [ProcessMercadoPagoWebhookCommand.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Application/Subscriptions/Commands/ProcessMercadoPagoWebhookCommand.cs)
  - [WebhooksController.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Api/Controllers/WebhooksController.cs)
  - [SubscriptionTests.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Tests/SubscriptionTests.cs)

### Tarea 33: Página Web Comparativa de "Planes y Membresías"
* **Objetivo:** Desarrollar una interfaz interactiva de comparación de planes de membresía (Gratuito, Premium, Lector Infantil) en el frontend, integrada con el flujo de simulación de upgrades mediante webhooks para actualizar en tiempo real la experiencia del usuario y desbloquear funciones.
* **Detalles del Trabajo Realizado:**
  - **Backend:**
    - Creación de [GetUserProfileQuery.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Application/Authentication/Queries/GetUserProfileQuery.cs) para recuperar el perfil del usuario autenticado actual, incluyendo el flag premium (`IsPremium`) y el plan de suscripción (`SubscriptionPlan`).
    - Exposición del endpoint `GET /api/auth/me` en [AuthController.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Api/Controllers/AuthController.cs) para servir el perfil a peticiones del cliente y permitir refrescar el estado del usuario tras un upgrade.
  - **Frontend:**
    - Creación de [PlansPage.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/features/subscriptions/PlansPage.tsx) para presentar la comparación detallada de cuotas, precios, límites y características de cada nivel de membresía (Free, Premium, Infantil).
    - Integración con el store de autenticación `useAuthStore` para identificar el plan actual del usuario y renderizar badges ("Tu Plan Actual").
    - Implementación de gatillado del Upgrade: Cuando un usuario gratuito hace clic en el plan Premium, se envía una petición POST al endpoint de simulación de webhook `/api/webhooks/trigger-test`. Al completarse con éxito, se refresca el perfil del usuario mediante `GET /api/auth/me` y se actualiza el estado global en la aplicación React de forma inmediata.
    - Se agregaron las rutas correspondientes en [AppRouter.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/app/router/AppRouter.tsx) para el path `/planes`, y se enlazó en la barra de navegación del layout principal en [MainLayout.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/app/layout/MainLayout.tsx).
  - **Estilos:**
    - Se incorporaron las reglas de estilo CSS para el layout, grilla y tarjetas de precios en [index.css](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/index.css), empleando efectos hover, gradientes y colores acordes al diseño Sleek Dark Mode.
* **Archivos Clave:**
  - [PlansPage.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/features/subscriptions/PlansPage.tsx)
  - [AppRouter.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/app/router/AppRouter.tsx)
  - [MainLayout.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/app/layout/MainLayout.tsx)
  - [index.css](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/index.css)
  - [GetUserProfileQuery.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Application/Authentication/Queries/GetUserProfileQuery.cs)
  - [AuthController.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Api/Controllers/AuthController.cs)

### Tarea 34: Endpoints Protegidos de Búsqueda y Listado General (Catálogo Avanzado)
* **Objetivo:** Exponer en el Backend un endpoint protegido para la búsqueda y listado general del catálogo de libros (incluyendo recién llegados), aplicando filtros avanzados y paginación, con validación de acceso restringido solo a usuarios Premium.
* **Detalles del Trabajo Realizado:**
  - **Backend:**
    - Creación del modelo [PaginatedListDto.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Application/Common/Models/PaginatedListDto.cs) en la capa Application para encapsular los resultados paginados (Items, PageNumber, PageSize, TotalCount, TotalPages).
    - Creación de la consulta [GetAdvancedCatalogQuery.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Application/Books/Queries/GetAdvancedCatalogQuery.cs) y su respectivo handler en la capa Application.
      - Valida que el usuario solicitante exista y tenga el flag `IsPremium == true`. Si no lo es, arroja una excepción `UnauthorizedAccessException` que se mapea a un código HTTP 403 Forbidden.
      - Recupera los libros disponibles mediante el repositorio excluyendo los libros propios del usuario solicitante.
      - Aplica filtros en memoria para `SearchTerm` (búsqueda en Título, Autor y Descripción), `Category` (coincidencia de categorías con la presencia del término en Título, Autor o Descripción del libro) y `Condition` (estado físico exacto del libro).
      - Aplica ordenamiento dinámico por novedad (`createdAt` descendente, que lista los "Recién Llegados"), título (`title` ascendente) o valor base (`baseValue` ascendente).
      - Pagina la lista resultante utilizando la fórmula `.Skip((pageNumber - 1) * pageSize).Take(pageSize)`.
    - Exposición del endpoint `GET /api/books/catalog` en el controlador [BooksController.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Api/Controllers/BooksController.cs), protegido mediante el atributo `[Authorize]` y consumiendo la consulta mediada por MediatR.
  - **Pruebas:**
    - Creación de la suite de pruebas unitarias [CatalogTests.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Tests/CatalogTests.cs), verificando la protección para usuarios no Premium, la exclusión de libros propios, los filtros por texto, por categorías y por condiciones, y el correcto funcionamiento de la paginación y ordenamiento por fecha. Las pruebas se ejecutan de manera limpia y exitosa (36 pruebas totales aprobadas).
* **Archivos Clave:**
  - [PaginatedListDto.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Application/Common/Models/PaginatedListDto.cs)
  - [GetAdvancedCatalogQuery.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Application/Books/Queries/GetAdvancedCatalogQuery.cs)
  - [BooksController.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Api/Controllers/BooksController.cs)
  - [CatalogTests.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Tests/CatalogTests.cs)

### Tarea 35: Diseñar las vistas Grid/List en React para que el usuario Premium navegue el catálogo
* **Objetivo:** Desarrollar e integrar una interfaz de usuario avanzada que permita a los usuarios Premium navegar por el catálogo general mediante dos modos de visualización alternativos (Grilla y Lista), aplicando filtros en tiempo real (búsqueda por texto, dropdown de géneros/categorías cargados dinámicamente y dropdown de estado físico de conservación) y paginación, protegiendo el acceso a los usuarios gratuitos mediante una pantalla de Paywall informativa.
* **Detalles del Trabajo Realizado:**
  - **Frontend:**
    - Creación del componente de React [CatalogPage.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/features/discovery/CatalogPage.tsx).
      - **Validación del Lado del Cliente (Paywall):** Si el usuario no está autenticado o tiene `isPremium === false`, el componente bloquea de forma inmediata el acceso y renderiza un paywall de cristal pulido (glassmorphism) informándole los beneficios de la membresía premium con un botón directo para actualizar su plan en `/planes`.
      - **Búsqueda y Filtros en Vivo:** Implementa inputs controlados para búsqueda de texto libre, filtro de estado de conservación (Excelente, Bueno, Aceptable, Desgastado) y un filtro selector de géneros/categorías que consulta las etiquetas activas del backend en `/api/masterpreferencetags` (con fallback local seguro en caso de catálogo vacío).
      - **Ordenamiento y Paginación:** Permite ordenar los libros por fecha de creación (Recién Llegados 🆕), alfabéticamente (Título 🔤) o por valor base del libro (Precio 💰). Incluye una botonera de paginación que calcula dinámicamente la página actual y los límites permitidos.
      - **Toggle de Modos de Vista (Grid/List):** Permite cambiar al instante entre vista de Grilla (tarjetas cuadradas con foto de portada y badges) y vista de Lista (filas horizontales detalladas con descripción y sección lateral de precio y acción).
      - **Badge de Recién Llegado:** Muestra dinámicamente una etiqueta `✨ Recién Llegado` a los libros cuya fecha de registro sea igual o menor a 7 días.
      - **Acciones Directas (Reserva):** Agrega el botón de "Reservar 🔒" en las tarjetas/filas para gatillar de forma inmediata la retención del libro, simulado mediante alert en esta fase.
    - Registro de la ruta `/catalogo` dentro de [AppRouter.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/app/router/AppRouter.tsx).
    - Inclusión del enlace "Catálogo 💎" en la barra de navegación del layout principal en [MainLayout.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/app/layout/MainLayout.tsx).
  - **Estilos:**
    - Incorporación de reglas estéticas premium detalladas en [index.css](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/index.css) al final del archivo, incluyendo sombras degradadas, efectos de hover con escalado fluido de imagen de portada, adaptabilidad responsiva con *Media Queries* para dispositivos móviles, y la animación flotante para el ícono del Paywall.
  - **Validación de Compilación:**
    - Verificación satisfactoria de los tipos de TypeScript y del bundle general ejecutando `npm run build` sin errores.
* **Archivos Clave:**
  - [CatalogPage.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/features/discovery/CatalogPage.tsx)
  - [AppRouter.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/app/router/AppRouter.tsx)
  - [MainLayout.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/app/layout/MainLayout.tsx)
  - [index.css](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/index.css)

### Tarea 36: Lógica de Reservas de Stock Virtual por 48 horas en Base de Datos
* **Objetivo:** Desarrollar en el Backend la lógica de reservas temporales para usuarios Premium, bloqueando y disminuyendo el stock virtual del inventario de libros al establecer campos de control en la base de datos, e integrar las llamadas de acción en la interfaz del cliente.
* **Detalles del Trabajo Realizado:**
  - **Backend:**
    - Creación del comando [ReserveBookCommand.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Application/Books/Commands/ReserveBookCommand.cs) y su manejador.
      - Valida que el usuario exista y tenga la suscripción Premium activa.
      - Recupera el libro y valida que no sea del propio usuario solicitante y que esté disponible.
      - Controla la concurrencia: si el libro ya está reservado por otro usuario con fecha vigente, lanza una `InvalidOperationException`. Si es el mismo usuario, retorna éxito.
      - Activa los campos de bloqueo: `IsReserved = true`, `ReservedByUserId = userId` y `ReservedUntil = DateTime.UtcNow.AddHours(48)`.
      - Registra los cambios mediante `SaveChangesAsync` coordinado con `IUnitOfWork`.
    - Creación del comando [CancelReservationCommand.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Application/Books/Commands/CancelReservationCommand.cs) para liberar de forma manual y anticipada un bloqueo de libro por parte de su respectivo reservante.
    - Exposición de dos endpoints REST en [BooksController.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Api/Controllers/BooksController.cs):
      - `POST /api/books/{id}/reserve` (para solicitar el bloqueo).
      - `POST /api/books/{id}/cancel-reservation` (para liberar el bloqueo).
  - **Frontend:**
    - Modificación de [CatalogPage.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/features/discovery/CatalogPage.tsx) para conectar el botón interactivo **"Reservar 🔒"** de cada tarjeta de libro y fila de lista con la API del servidor.
    - Al confirmarse el bloqueo de 48 horas por parte del backend, se muestra una alerta informativa y se recarga automáticamente el catálogo. Dado que el catálogo excluye libros reservados, el libro bloqueado desaparece del stock virtual disponible de forma inmediata para el resto de usuarios.
  - **Pruebas:**
    - Creación de la suite de pruebas unitarias [ReservationTests.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Tests/ReservationTests.cs) cubriendo todos los límites comerciales (restricción premium, auto-reserva, doble reserva sobre el mismo libro, cancelación por parte del usuario correcto y denegación por parte de terceros). Se ejecutaron con éxito (42 pruebas totales aprobadas).
* **Archivos Clave:**
  - [ReserveBookCommand.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Application/Books/Commands/ReserveBookCommand.cs)
  - [CancelReservationCommand.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Application/Books/Commands/CancelReservationCommand.cs)
  - [BooksController.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Api/Controllers/BooksController.cs)
  - [CatalogPage.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/features/discovery/CatalogPage.tsx)
  - [ReservationTests.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Tests/ReservationTests.cs)

### Tarea 37: Integración de Hangfire y Tarea en Background (CRON) para Liberación de Stock
* **Objetivo:** Integrar el motor de tareas en segundo plano Hangfire en la API del backend, configurando persistencia sobre SQL Server y programando una tarea recurrente (CRON) por hora para liberar de forma automática los libros cuyas reservas de 48 horas hayan expirado y para anular las transacciones huérfanas sin pago, retornando sus libros al stock general.
* **Detalles del Trabajo Realizado:**
  - **Instalación de Paquetes NuGet:**
    - Instalación de `Hangfire.AspNetCore` (versión `1.8.14`) en los proyectos `Bookmachs.Api` y `Bookmachs.Infrastructure`.
    - Instalación de `Hangfire.SqlServer` (versión `1.8.14`) en el proyecto `Bookmachs.Infrastructure`.
  - **Backend - Infraestructura y Configuración:**
    - Registro de Hangfire utilizando la base de datos central de la solución en [DependencyInjection.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Infrastructure/DependencyInjection.cs) de la capa Infrastructure, configurando `UseSqlServerStorage` con opciones óptimas (aislamiento recomendado, reintentos y batches).
    - Inyección y puesta en marcha del servidor de procesamiento en background a través de `services.AddHangfireServer()`.
    - Activación del middleware del Dashboard de Hangfire mediante `app.UseHangfireDashboard()` en [Program.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Api/Program.cs), habilitando la ruta `/hangfire` para el monitoreo visual en QA/producción.
  - **Backend - Lógica del Job Recurrente (CRON):**
    - Creación de la clase de tarea [CleanupBooksJob.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Application/Books/Jobs/CleanupBooksJob.cs) en la capa Application.
      - Libera reservas de libros huérfanas: busca libros donde `IsReserved == true` y `ReservedUntil < DateTime.UtcNow` y remueve el bloqueo.
      - Anula transacciones pendientes: busca transacciones en estado `PaymentStatus == "Pending"` creadas hace más de 48 horas, marcándolas con estado `Failed`/`Cancelled` y liberando sus libros respectivos (estableciendo `IsAvailable = true`) para devolverlos al inventario disponible.
      - Registra y audita el proceso utilizando logs inyectados mediante `ILogger`.
    - Programación de la ejecución recurrente cada hora (`Cron.Hourly()`) de la tarea utilizando `IRecurringJobManager` dentro del método bootstrap del API en `Program.cs`.
    - Registro de la clase de job en el contenedor de Inyección de Dependencias como servicio Transient en [DependencyInjection.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Application/DependencyInjection.cs) de la capa Application.
  - **Pruebas:**
    - Creación de la suite de pruebas unitarias [CleanupJobTests.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Tests/CleanupJobTests.cs), validando de forma simulada en memoria que el job limpie adecuadamente reservas expiradas manteniendo reservas activas intactas, y anule de forma correcta transacciones huérfanas de 48 horas sin pago. Las pruebas se ejecutan satisfactoriamente (44 pruebas totales aprobadas).
* **Archivos Clave:**
  - [DependencyInjection.cs (Infrastructure)](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Infrastructure/DependencyInjection.cs)
  - [Program.cs (Api)](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Api/Program.cs)
  - [CleanupBooksJob.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Application/Books/Jobs/CleanupBooksJob.cs)
  - [CleanupJobTests.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Tests/CleanupJobTests.cs)

---

## 🍃 Fase 9: Capa Social y de Impacto Ambiental

### Tarea 38: Endpoint Estadístico de Impacto Ambiental (CO2 y Árboles Equivalentes)
* **Objetivo:** Implementar un endpoint estadístico en el Backend para calcular y retornar el impacto ambiental positivo (tanto del usuario individual como de toda la comunidad) derivado del intercambio y donación de libros, basándose en constantes físicas científicamente fundamentadas.
* **Detalles del Trabajo Realizado:**
  - **Constantes de Impacto Ambiental Establecidas:**
    - `AverageBookWeightKg = 0.4` (Peso promedio de un libro estándar: 400 gramos).
    - `Co2SavedPerKgOfPaper = 2.71` (Evita la emisión de 2.71 kg de CO2 por cada kilogramo de papel que se reutiliza o recicla en lugar de producir papel nuevo).
    - `AnnualTreeAbsorptionKg = 22.0` (Un árbol maduro promedio absorbe aproximadamente 22 kg de CO2 al año).
  - **Backend - Repositorio:**
    - Incorporación del método `GetAllCompletedTransactionsAsync` en la interfaz [IMatchTransactionRepository.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Domain/Repositories/IMatchTransactionRepository.cs) e implementación en [MatchTransactionRepository.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Infrastructure/Repositories/MatchTransactionRepository.cs). Recupera todas las transacciones de match cuyo estado de entrega (`LogisticsStatus`) sea `"Delivered"`.
  - **Backend - Lógica CQRS y DTO:**
    - Creación de [UserImpactMetricsDto.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Application/Social/UserImpactMetricsDto.cs) para estructurar la respuesta con métricas de usuario (libros intercambiados, donados, CO2 evitado y equivalencia en árboles) y métricas comunitarias.
    - Creación de la consulta [GetUserImpactMetricsQuery.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Application/Social/Queries/GetUserImpactMetricsQuery.cs) y su respectivo handler en la capa Application.
      - Valida la existencia del usuario solicitante, lanzando `KeyNotFoundException` en caso de no encontrarse.
      - Divide los libros del usuario en intercambios vs. donaciones: detecta las donaciones evaluando si el campo `LogisticsMethod` es `"Donacion"` (ignorando mayúsculas/minúsculas).
      - Multiplica el total de libros procesados por las constantes físicas para calcular el CO2 evitado (redondeado a 2 decimales) y los árboles equivalentes (CO2 evitado dividido por 22.0, redondeado a 2 decimales).
  - **Backend - Controlador:**
    - Exposición del endpoint protegido `GET /api/social/my-impact` en [SocialController.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Api/Controllers/SocialController.cs). Utiliza el atributo `[Authorize]` para garantizar que el usuario esté autenticado, extrayendo su ID directamente de los claims (`ClaimTypes.NameIdentifier`) de forma segura.
  - **Pruebas Unitarias:**
    - Creación e implementación de la suite de pruebas unitarias [SocialImpactTests.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Tests/SocialImpactTests.cs).
      - Verifica que se arroje una excepción si el usuario no existe.
      - Valida que los cálculos de CO2 y árboles sean matemáticamente correctos y que se descarten transacciones que no estén completadas (`Pending`).
      - Las pruebas se ejecutan de manera satisfactoria.
* **Archivos Clave:**
  - [IMatchTransactionRepository.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Domain/Repositories/IMatchTransactionRepository.cs)
  - [MatchTransactionRepository.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Infrastructure/Repositories/MatchTransactionRepository.cs)
  - [UserImpactMetricsDto.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Application/Social/UserImpactMetricsDto.cs)
  - [GetUserImpactMetricsQuery.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Application/Social/Queries/GetUserImpactMetricsQuery.cs)
  - [SocialController.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Api/Controllers/SocialController.cs)
  - [SocialImpactTests.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Tests/SocialImpactTests.cs)

### Tarea 39: Pantalla "Dashboard Perfil" con Visualización Gráfica e Indicadores de Impacto Ambiental
* **Objetivo:** Diseñar y desarrollar una interfaz premium e interactiva en el Frontend (React SPA) bajo el estándar FSD, que consuma el endpoint estadístico y presente al usuario su perfil, sus contadores de impacto ecológico individual, un bosque virtual interactivo y los totales acumulados por la comunidad de Bookmachs.
* **Detalles del Trabajo Realizado:**
  - **Frontend - Vista de Invitado (Guest Flow):**
    - Si el usuario no ha iniciado sesión, el componente renderiza un Hero Card con un badge ambiental animado y un botón de llamada a la acción ("Crear mi Cuenta de Impacto 🚀") que despliega el modal `HardGateModal` de forma directa para loguearse o registrarse.
    - Presenta un panel educativo detallando la metodología y constantes de cálculo ambiental (400g peso de libro, 2.71 kg CO₂ evitado por kg de papel, y 22.0 kg de absorción anual por árbol maduro).
  - **Frontend - Vista de Usuario Autenticado (Dashboard de Impacto):**
    - **Header de Perfil:** Muestra una cabecera con avatar personalizado (gradiente dinámico y las iniciales del usuario), nombre, email, país, documento de identidad y un badge animado que resalta su nivel de membresía (`🏆 Premium` vs `⭐ Plan Básico`).
    - **Grilla de Indicadores (Métricas del Usuario):** Tarjetas con efectos de desenfoque, bordes difuminados y un resplandor de color personalizado (`card-glow` mediante HSL y transparencias) que exponen de forma clara:
      - Libros Rescatados (con desglose detallado de Intercambios y Donaciones).
      - CO₂ Evitado (indicando el ahorro en kilogramos y su equivalencia en peso de papel reutilizado).
      - Bosque Personal (cantidad de árboles anuales equivalentes que ha salvado el lector).
    - **Simulador de Bosque Virtual Interactivo:** Genera dinámicamente un grid con ilustraciones SVG personalizadas de pinos de bosque. Si el valor es `0` dibuja un brote/semilla (🌱) con una animación de flote. Si es mayor a `0`, dibuja tantos árboles como equivalentes tenga el usuario (máximo de 12 visibles, añadiendo un badge con el conteo de árboles excedentes "+ X más"). Los árboles se balancean dinámicamente mediante la animación CSS `treeSway` al colocar el cursor encima.
    - **Indicador de Aporte Porcentual (Progress Ring):** Un gráfico circular SVG que dibuja el porcentaje de contribución que representa la huella del lector sobre el impacto total de la comunidad, acompañado de barras de progreso estéticas.
    - **Banner de Impacto Global de la Comunidad:** Un panel horizontal premium que totaliza el esfuerzo colectivo: libros circulados, CO₂ evitado y bosque comunitario consolidado.
  - **Estilos en index.css:**
    - Incorporación de todas las reglas CSS en [index.css](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/index.css), utilizando variables del sistema de estilos, media queries responsivas para pantallas móviles, animaciones fluidas (`spin`, `seedlingFloat`, `treeSway`, `shine`), efectos hover de escalamiento e iluminación con sombras.
  - **Validación del Bundle:**
    - Ejecución exitosa de `npm run build` en el frontend, confirmando la integración correcta de TypeScript y la generación limpia de los archivos productivos.
* **Archivos Clave:**
  - [SocialPage.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/features/social/SocialPage.tsx)
  - [index.css](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/index.css)
  - [AppRouter.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/app/router/AppRouter.tsx)
  - [MainLayout.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/app/layout/MainLayout.tsx)

### Tarea 40: Historial de Intercambios Global sin Restricciones de Cuenta
* **Objetivo:** Implementar un endpoint público (anónimo) en el Backend y una vista cronológica interactiva en el Frontend que permita a cualquier usuario (tanto visitantes no logueados como miembros autenticados) ver el historial de los últimos 50 intercambios y donaciones de libros completados con éxito en la plataforma.
* **Detalles del Trabajo Realizado:**
  - **Backend - Modificación de Repositorio:**
    - Incorporación de `GetGlobalHistoryAsync()` en la interfaz [IMatchTransactionRepository.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Domain/Repositories/IMatchTransactionRepository.cs) e implementado en [MatchTransactionRepository.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Infrastructure/Repositories/MatchTransactionRepository.cs). Retorna las últimas 50 transacciones en estado `Delivered` ordenadas de forma descendente por `StatusUpdatedAt` e incluyendo las relaciones de `Book`, `RequesterUser` y `OwnerUser` en una sola consulta optimizada.
  - **Backend - Caso de Uso (CQRS):**
    - Creación de [GlobalExchangeHistoryDto.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Application/Social/GlobalExchangeHistoryDto.cs) y la consulta [GetGlobalExchangeHistoryQuery.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Application/Social/Queries/GetGlobalExchangeHistoryQuery.cs) con su manejador en la capa Application.
    - El handler resuelve dinámicamente los nombres de los usuarios participantes, manejando de forma segura valores nulos en el propietario cuando se trata de donaciones (sustituyéndolo por `"Bookmachs (Donación)"` o `"Bookmachs"`).
  - **Backend - Controlador:**
    - Añadido el endpoint `GET /api/social/history` en [SocialController.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Api/Controllers/SocialController.cs). Se le asignó el atributo `[AllowAnonymous]` permitiendo su consumo público por el frontend sin enviar cabeceras Bearer JWT.
  - **Pruebas Unitarias del Backend:**
    - Creación del test `GetGlobalExchangeHistoryQuery_ShouldReturnOnlyDeliveredTransactionsSortedByDate` en [SocialImpactTests.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Tests/SocialImpactTests.cs). Confirma el correcto filtrado de estados, ordenamiento cronológico descendente y mapeo de nombres. Las pruebas de la solución se ejecutaron con éxito total (**47 aprobadas**).
  - **Frontend - Vista del Historial:**
    - Modificado [SocialPage.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/features/social/SocialPage.tsx) para definir la sección de historial. Consume el endpoint público mediante `apiClient` e implementa estados interactivos de carga (spinner), error con botón de reintento, y timeline vacío en caso de no haber datos.
    - Cada fila del timeline dibuja la foto de portada del libro (con fallback de icono de libro físico), los nombres del emisor y receptor resaltados con badges distintivos de colores (`requester` en turquesa, `owner` en azul), y un footer que detalla la fecha del intercambio formateada y un badge que describe el tipo de envío (Presencial, Envío a Bodega, P2P, Donación) con su emoji respectivo (🤝, 🏢, 📦, 🎁).
    - La sección se visualiza tanto en la vista de invitados (pública) como al fondo del dashboard de impacto del perfil de usuarios autenticados.
  - **Estilos en index.css:**
    - Incorporación de las reglas CSS de diseño del timeline al final de [index.css](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/index.css), definiendo bordes de cristal (glassmorphism), sombras fluidas, transiciones de hover y un diseño responsivo para dispositivos móviles que convierte el timeline en filas adaptables.
* **Archivos Clave:**
  - [IMatchTransactionRepository.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Domain/Repositories/IMatchTransactionRepository.cs)
  - [MatchTransactionRepository.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Infrastructure/Repositories/MatchTransactionRepository.cs)
  - [GlobalExchangeHistoryDto.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Application/Social/GlobalExchangeHistoryDto.cs)
  - [GetGlobalExchangeHistoryQuery.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Application/Social/Queries/GetGlobalExchangeHistoryQuery.cs)
  - [SocialController.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Api/Controllers/SocialController.cs)
  - [SocialImpactTests.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Tests/SocialImpactTests.cs)
  - [SocialPage.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/features/social/SocialPage.tsx)
  - [index.css](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/index.css)

### Tarea 41: Tabla Transaccional de Eventos del Timeline en Backend
* **Objetivo:** Diseñar y estructurar la base de datos y la lógica del Backend para registrar eventos en una tabla transaccional de timeline (`TimelineEvent`) de manera automática cada vez que un intercambio o donación de libros se complete con éxito (estado de entrega en `Delivered`), respetando las preferencias de visibilidad del usuario (si la transacción está marcada como pública `IsPublic == true`).
* **Detalles del Trabajo Realizado:**
  - **Backend - Entidad del Dominio:**
    - Creación de la entidad transaccional [TimelineEvent.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Domain/Entities/TimelineEvent.cs) con propiedades: `Id` (clave primaria), `MatchTransactionId` (clave foránea), `EventType` (Exchange, Donation), `Title` (encabezado del evento), `Description` (contenido narrativo del evento) y `CreatedAt` (marca de tiempo).
  - **Backend - Persistencia y DbContext:**
    - Registro del `DbSet<TimelineEvent> TimelineEvents` en [BookmachsDbContext.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Infrastructure/Persistence/BookmachsDbContext.cs).
    - Configuración mediante Fluent API para el mapeo estricto, especificando longitudes de caracteres máximas en `Title` (200) y `Description` (500), claves primarias, y configurando la regla de borrado en cascada (`OnDelete(DeleteBehavior.Cascade)`) en la relación con `MatchTransaction`.
    - Modificado `MatchTransaction.cs` para incorporar la propiedad boolean `IsPublic` (por defecto `true`) para guardar las preferencias de privacidad del intercambio.
  - **Backend - Repositorios & Unit of Work:**
    - Creada la interfaz de repositorio [ITimelineEventRepository.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Domain/Repositories/ITimelineEventRepository.cs) y su respectiva implementación [TimelineEventRepository.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Infrastructure/Repositories/TimelineEventRepository.cs).
    - Declarado e implementado el repositorio en [IUnitOfWork.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Domain/Repositories/IUnitOfWork.cs) and [UnitOfWork.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Infrastructure/Repositories/UnitOfWork.cs) para integrarlo en el flujo transaccional.
    - Registrado el repositorio en el contenedor de dependencias del archivo [DependencyInjection.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Infrastructure/DependencyInjection.cs).
  - **Backend - Migraciones:**
    - Generada la migración de Entity Framework Core (`AddTimelineEvents`) y aplicada con éxito a la base de datos SQL Server local (`dotnet ef database update`).
  - **Backend - Lógica de Registro Automático:**
    - Modificado el handler [UpdateLogisticsCommand.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Application/Transactions/Commands/UpdateLogisticsCommand.cs) para que, al transicionar la transacción de Match al estado `"Delivered"`, evalúe si la propiedad `IsPublic` de la transacción está habilitada.
    - En caso afirmativo, carga los perfiles del solicitante y del dueño, extrae la información del libro, y genera de forma automática un registro `TimelineEvent` (tipo `Exchange` o `Donation`) con títulos descriptivos y detalles del traspaso, guardándose de forma atómica en el mismo commit de base de datos a través de `SaveChangesAsync()`.
  - **Pruebas Unitarias del Backend:**
    - Añadida la prueba unitaria `UpdateLogistics_ShouldGenerateTimelineEvent_WhenStatusBecomesDeliveredAndIsPublic` en [CheckoutTests.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Tests/CheckoutTests.cs). Valida que al confirmar la entrega, la transacción se guarde como Delivered y se inserte con éxito un registro relacionado en la tabla de TimelineEvents. La suite completa de pruebas se ejecutó satisfactoriamente (**48 aprobadas**).
* **Archivos Clave:**
  - [TimelineEvent.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Domain/Entities/TimelineEvent.cs)
  - [MatchTransaction.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Domain/Entities/MatchTransaction.cs)
  - [BookmachsDbContext.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Infrastructure/Persistence/BookmachsDbContext.cs)
  - [ITimelineEventRepository.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Domain/Repositories/ITimelineEventRepository.cs)
  - [TimelineEventRepository.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Infrastructure/Repositories/TimelineEventRepository.cs)
  - [UnitOfWork.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Infrastructure/Repositories/UnitOfWork.cs)
  - [UpdateLogisticsCommand.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Application/Transactions/Commands/UpdateLogisticsCommand.cs)
  - [CheckoutTests.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Tests/CheckoutTests.cs)

### Tarea 42: Construir Frontend del Timeline Interactivo y modal de notas/reseñas usando CSS Puro
* **Objetivo:** Diseñar y desarrollar la interfaz del Timeline Público interactivo en el Frontend (React SPA) y crear un modal modalizado (empleando exclusivamente CSS Puro) que permita a los participantes calificar (1 a 5 estrellas) y redactar notas o reseñas detalladas sobre el estado de la entrega física de sus libros intercambiados.
* **Detalles del Trabajo Realizado:**
  - **Frontend - Visualización del Timeline Interactivo:**
    - Modificado [SocialPage.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/features/social/SocialPage.tsx) para renderizar dinámicamente el timeline de transacciones públicas (tipo `Exchange` o `Donation`) consumido desde la API `/api/social/history`.
    - Cada tarjeta del timeline presenta la foto de portada del libro (con fallback de icono de libro físico `📖` si no tiene imagen), nombres del receptor y emisor en badges estilizados con variables de colores (`requester` en verde esmeralda, `owner` en azul turquesa), desglose del método logístico con emojis distintivos y la fecha local del intercambio.
    - Se integró el bloque de reseñas `.timeline-item-review` que expone en cursiva y con estrellas doradas la calificación y comentarios que los usuarios han asignado al intercambio.
  - **Frontend - Modal de Notas y Reseñas:**
    - Se implementó un modal interactivo controlado por el estado `isReviewModalOpen` que se activa al hacer clic en el botón "✍️ Calificar Entrega".
    - El formulario dentro del modal permite elegir interactivamente entre 1 y 5 estrellas mediante el selector `.rating-stars-input`, coloreándose de dorado de forma fluida con sombras de resplandor.
    - Contiene una caja de texto `.modal-textarea` con límite máximo de 500 caracteres para describir la experiencia del envío y el estado del libro.
    - Permite enviar los datos asíncronamente mediante `apiClient.post` al endpoint de la API `/api/social/timeline/{eventId}/review`, actualizando la UI de inmediato tras cerrarse el modal recargando el timeline.
  - **Estilos en CSS Puro (index.css):**
    - Añadidas reglas detalladas en [index.css](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/index.css) (líneas 4790-4917) para dar soporte al timeline de reseñas y al formulario del modal:
      - `.timeline-item-review`: Fondo oscuro translúcido sutil con borde izquierdo dorado e inset shadows.
      - `.star-btn`: Botón interactivo de estrella transparente, con escalado dinámico al pasar el cursor (`:hover`) y efecto de brillo neon/dorado cuando está seleccionado (`.selected`).
      - `.modal-textarea`: Estilizado premium consistente con el tema oscuro de la plataforma, bordes adaptables y transiciones rápidas de enfoque.
      - `.modal-cancel-btn` y `.modal-submit-btn`: Botones y acciones de envío con soporte responsivo, efectos hover tridimensionales y opacidades para estados de carga (`disabled`).
  - **Validación y Pruebas:**
    - Compilación exitosa del frontend (`npm run build`), confirmando la correcta tipificación de TypeScript y generación de recursos finales de Vite.
    - Ejecución satisfactoria de todas las pruebas unitarias e integrales en el Backend mediante `dotnet test` (50 pruebas aprobadas exitosamente).


---

## Entrada de Bitácora: Alineación y Corrección de Pantallas 3, 4, 5 y Métodos Logísticos de Cumplimiento

* **Fecha:** 7 de Agosto, 2026
* **Objetivo:** Analizar en detalle la maqueta visual [pantallas-cliente.jpeg](file:///C:/Users/luis_/Proyectos/bookmachs/assets/pantallas-cliente.jpeg) y corregir la implementación de las Pantallas 3, 4, 5 y el flujo de cumplimiento de intercambio según las reglas explícitas del cliente:
  1. **Pantalla 3 (Descubre / Swipe):** Es exclusivamente para dar "like" (corazón / swipe derecha) o "dislike" (X / swipe izquierda) a los libros recomendados. Dar "like" guarda automáticamente el libro en la pestaña "Me interesan" de Tu Libreta sin aperturas forzadas de modals de pago/compra.
  2. **Pantalla 4 (Tu Libreta / Tus Matches y Tus Libros):** Organizada en 2 pestañas principales: **"Me interesan"** (libros con like, mostrando compatibilidad de match y el costo de intercambio calculado por las reglas del negocio) y **"Tengo para intercambiar"** (libros propios ofrecidos). **Corrección:** Se eliminó la solicitud de precio monetario al usuario al cargar libros, ya que Bookmachs calcula la tarifa de servicio de intercambio.
  3. **Pantalla 5 (Propuesta de Intercambio / Resumen Match IA):** Resumen desplegado desde "Ver propuestas de intercambio" en la libreta. Presenta el resumen del match ("¡Matchs! Bookmachs quiere intercambiar contigo"), la validación de compatibilidad con los libros disponibles del usuario, el costo estimado de intercambio ($3.200 CLP/COP con desglose desplegable) y la prohibición de compraventa directa (se intercambia un libro por otro).
  4. **Métodos Logísticos para Entrega del Libro Ofrecido (Pantalla 11):** Estructuradas las 3 únicas opciones de cumplimiento:
     - **Opción 1: Donación Comunitaria:** Donar el libro ofrecido en un colegio o espacio comunitario. El usuario sube la foto de evidencia y entra en **proceso de validación previa** por Bookmachs.
     - **Opción 2: Entrega presencial en local físico:** Llevar el libro ofrecido a la ubicación física del local en Santiago, Chile.
     - **Opción 3: Envío por encomienda a local físico:** Enviar el libro a la dirección física del local en Santiago, Chile, asumiendo el usuario el costo del envío y subiendo el comprobante/voucher de envío al sistema.


---

## Entrada de Bitácora: Confirmación del Libro Entregado a Cambio y Selección Logística (Pantalla 11) en Checkout

* **Fecha:** 7 de Agosto, 2026
* **Objetivo:** Garantizar que en la sección `/transacciones` y en la vista de Checkout se confirme explícitamente el libro que el usuario entregará a cambio y se le permita seleccionar la opción de cumplimiento logístico (Pantalla 11):
  1. **Confirmación del Libro a Entregar:** Se desplegó en el Checkout un selector interactivo donde el usuario elige cuál de sus libros cargados en *"Tengo para intercambiar"* entregará por el libro solicitado, mostrando portadas y datos frente a frente (*Libro que recibes <---> Libro que tú entregas*).
  2. **Selección de la Opción de Entrega (Pantalla 11):** Integrado directamente en la vista de Checkout el selector de los 3 métodos de cumplimiento autorizado:
     - Donación Comunitaria (cargando foto de evidencia para proceso de validación previa).
     - Entrega presencial en local físico en Santiago, Chile.
     - Envío por encomienda a local físico en Santiago, Chile (pagando el envío y subiendo comprobante).
  3. **Verificación y Seguridad:** Si el usuario posee 0 libros en *"Tengo para intercambiar"*, el Checkout deshabilita el botón de pago y lo redirige a cargar un libro antes de procesar el fee.

---

## Entrada de Bitácora: Rediseño UX / UI Senior - Flujo de Match, Intercambio y Logística (Pantallas 4, 5 y 11)

* **Fecha:** 7 de Agosto, 2026
* **Objetivo:** Elevar la experiencia de usuario del Checkout y Transacciones al estándar *UX/UI Expert* de alto rendimiento y bajo nivel de fricción:
  1. **Stepper Wizard de 3 Pasos:** Implementado un indicador de progreso superior interactivo que guía al usuario claramente a través de:
     - **Paso 1:** Confirmar Libros (Libro A ⇄ Libro B).
     - **Paso 2:** Opción de Entrega (Donación / Presencial / Envío).
     - **Paso 3:** Pago de Fee (Hold Webpay Plus).
  2. **Duet Swap Deck (Trading Cards 3D):** Presentación lado a lado del libro solicitado (*borde neón, insignia IA*) contra el libro propio ofrecido (*selector dinámico con vista previa de portada en tiempo real*).
  3. **Radio Cards de Selección Logística (Pantalla 11):** Tarjetas interactivas con glassmorphic hover, íconos Neón e insignias de estado para las 3 opciones (Donación Comunitaria con Dropzone para foto y validación previa, Entrega Presencial Santiago Chile, y Envío Encomienda con N° de voucher).
  4. **Modal Inline de Carga Rápida (30s):** Si el usuario tiene 0 libros en su libreta, puede agregar un ejemplar sin salir de la pantalla de checkout en un modal rápido con backdrop esmerilado.

---

## Entrada de Bitácora: Rediseño de Modal de Propuesta Match (Pantalla 5 - MatchModal.tsx)

* **Fecha:** 7 de Agosto, 2026
* **Objetivo:** Aplicar el estándar *UX/UI Expert* al modal de propuesta que se abre al hacer clic en *"Ver propuesta"* desde la libreta o tras un swipe:
  1. **Duet Swap Deck frente a frente:** Incorporadas las tarjetas visuales del **Libro que recibes** (*borde neón, insignia IA*) contra el **Libro que tú entregas** de tu libreta (*selector dinámico si tienes varios ejemplares, con portada y autor*).
  2. **Transparencia en el Intercambio:** Muestra de forma inmediata al usuario qué libro físico entregará y cuál recibirá antes de avanzar al pago del fee.
  3. **Control de Inventario Obligatorio:** Si el usuario no tiene libros cargados, la propuesta bloquea el botón principal y ofrece la acción directa: **[＋ Cargar un libro a mi libreta primero]**.

---

## Entrada de Bitácora: Sincronización y Configuración de Transbank en Backend Refactorizado (`backend_refactor`)

* **Fecha:** 8 de Agosto, 2026
* **Objetivo:** Asegurar que todas las configuraciones de pagos y reglas de negocio del Checkout residan en la base de código correcta del backend: **`backend_refactor/Bookmachs.Refactored.Api`**.
  1. **Configuración de Transbank Webpay Plus:** Actualizado [appsettings.json](file:///C:/Users/luis_/Proyectos/bookmachs/backend_refactor/Bookmachs.Refactored.Api/appsettings.json) con la sección `"Payments"` para utilizar el código de comercio e ApiKey oficiales de integración diferida de Transbank.
  2. **Servicio de Pagos Independiente:** En [PaymentGatewayService.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend_refactor/Bookmachs.Refactored.Api/Infrastructure/Payments/PaymentGatewayService.cs), se configuraron las opciones oficiales de Transbank SDK .NET.
  3. **Validación de Inventario Ofrecido:** En [TransactionService.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend_refactor/Bookmachs.Refactored.Api/Services/TransactionService.cs), se incorporó la regla de negocio para rechazar `CheckoutCardAsync` y `WebpayStartAsync` si el usuario no cuenta con libros en su inventario para ofrecer a cambio.

---

## Entrada de Bitácora: Reversión de `backend` previo y Eliminación de Mercado Pago en `backend_refactor`

* **Fecha:** 8 de Agosto, 2026
* **Objetivo:** 
  1. **Reversión del backend anterior:** Se ejecutó la restauración limpia del directorio `backend/` para mantenerlo intacto sin cambios desalineados.
  2. **Eliminación de Mercado Pago en `backend_refactor`:**
     - Eliminada la dependencia del SDK `mercadopago-sdk` en [Bookmachs.Refactored.Api.csproj](file:///C:/Users/luis_/Proyectos/bookmachs/backend_refactor/Bookmachs.Refactored.Api/Bookmachs.Refactored.Api.csproj).
     - Limpiadas las interfaces y métodos de tarjeta directa y suscripciones de Mercado Pago en [IPaymentGatewayService.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend_refactor/Bookmachs.Refactored.Api/Domain/Services/IPaymentGatewayService.cs) y [PaymentGatewayService.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend_refactor/Bookmachs.Refactored.Api/Infrastructure/Payments/PaymentGatewayService.cs).
     - Concentrada toda la arquitectura de pagos exclusivamente en **Transbank Webpay Plus** (Redirección por POST, Hold y Captura Diferida).

---

## Entrada de Bitácora: Integración de SendGrid (Dynamic Templates) y Job Diario de Expiración de Entregas (5 Días)

* **Fecha:** 8 de Agosto, 2026
* **Objetivo:** Implementar la lógica automatizada de envío diario de correos mediante **SendGrid Dynamic Templates** e imponer la regla de vencimiento de 5 días para la captura/retención en Transbank Webpay Plus.
  1. **Integración con SendGrid:**
     - Agregado el paquete oficial `SendGrid` en [Bookmachs.Refactored.Api.csproj](file:///C:/Users/luis_/Proyectos/bookmachs/backend_refactor/Bookmachs.Refactored.Api/Bookmachs.Refactored.Api.csproj).
     - Creado el servicio [SendGridEmailService.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend_refactor/Bookmachs.Refactored.Api/Services/SendGridEmailService.cs) con el modelo fuertemente tipado `ExchangeReminderEmailData` para abastecer las plantillas dinámicas de SendGrid.
     - Agregada la sección `"SendGrid"` en [appsettings.json](file:///C:/Users/luis_/Proyectos/bookmachs/backend_refactor/Bookmachs.Refactored.Api/appsettings.json).
  2. **Job Diario de Revisión y Expiración (`ExchangeFulfillmentJob.cs`):**
     - Creado [ExchangeFulfillmentJob.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend_refactor/Bookmachs.Refactored.Api/Jobs/ExchangeFulfillmentJob.cs) que procesa transacciones con pago retenido (`PaymentStatus = Hold`):
       - **Días 1 a 4:** Envía correo diario con todo el detalle de los libros a intercambiar/recibir, días restantes e instrucciones según el método de entrega seleccionado.
       - **Día 5 (Vencimiento):** Ejecuta automáticamente `RefundTransbankHoldAsync`, cancela la transacción y registra un evento en la línea de tiempo.
  3. **Endpoint de Ejecución:**
     - Expuesto el endpoint `POST api/transactions/run-daily-fulfillment-job` en [TransactionsController.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend_refactor/Bookmachs.Refactored.Api/Controllers/TransactionsController.cs) para la activación manual o vía Cron Task.

---

## Entrada de Bitácora: Implementación de la Thank You Page Post-Pago y Modal de Detalle de Intercambio / Evidencia Logística

* **Fecha:** 8 de Agosto, 2026
* **Objetivo:** Diseñar y desplegar la experiencia visual posterior al pago de Webpay Plus y el panel de detalle de transacciones activas.
  1. **Thank You Page Post-Pago (`MatchDetailModal.tsx`):**
     - Al confirmar exitosamente la sesión de Webpay Plus, se despliega automáticamente una **Thank You Page** en formato de tarjeta de confirmación neón.
     - Muestra el **Duet Swap Deck** con el libro que el usuario recibirá y el libro que entregará de su libreta.
     - Muestra la **Fecha y Hora exacta de la transacción/pago**, el monto retenido en Webpay Plus y el **contador límite de 5 días**.
  2. **Subida Interactiva de Evidencias Logísticas (`/transacciones`):**
     - Desde la vista general de `/transacciones`, al presionar **"🔍 Ver detalle e instrucciones"** o **"📋 Ver propuesta de libros y fecha límite"**:
       - Si la opción es **Donación Comunitaria**, despliega el Dropzone para cargar la **fotografía del colegio o espacio comunitario** (validación previa).
       - Si la opción es **Envío Encomienda**, permite ingresar el **N° de seguimiento** y adjuntar la captura del voucher de envío.
       - Si la opción es **Entrega Presencial**, muestra los datos del punto de encuentro en Santiago.

---

## Entrada de Bitácora: Actualización de Dirección Oficial de Entrega Presencial

* **Fecha:** 8 de Agosto, 2026
* **Objetivo:** Actualizar la dirección física del local de recepción y entrega presencial en todo el sistema.
  - **Nueva Dirección Oficial:** **`Patronato 447, Recoleta, Santiago, Chile`**.
  - Actualizados los textos informativos en:
    - [TransactionsPage.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/features/transactions/TransactionsPage.tsx) (Paso 2: Selección Logística de Entrega Presencial y Envío).
    - [MatchDetailModal.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/features/transactions/components/MatchDetailModal.tsx) (Tarjeta de Instrucciones Presenciales e Instrucciones Logísticas).
    - [ExchangeFulfillmentJob.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend_refactor/Bookmachs.Refactored.Api/Jobs/ExchangeFulfillmentJob.cs) (Instrucciones enviadas en plantillas de correos).

---

## Entrada de Bitácora: Rediseño UX/UI Master del Modal de Detalle y Corrección de Portadas

* **Fecha:** 8 de Agosto, 2026
* **Objetivo:** Rediseñar por completo la interfaz visual del modal de detalle de intercambio y Thank You Page ([MatchDetailModal.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/features/transactions/components/MatchDetailModal.tsx)) aplicando estándares de **UX/UI Master**.
  1. **Solución a la Visualización de Portadas:**
     - Incorporados fallbacks garantizados de portadas HD y manejadores de error `onError` para que ambos libros (*Recibido* y *Entregado*) se rendericen enmarcados en 3D sin importar que la URL sea vacía o inaccesible.
     - Integrada la carga automática del inventario propio del usuario en el modal para permitir cambiar o previsualizar el ejemplar a entregar.
  2. **Estética Visual UX/UI Master:**
     - **3D Duet Swap Showcase:** Tarjetas elevadas con auras de neón (*Esmeralda para el recibido* y *Ámbar para el entregado*) unidas por un nodo central animado de compatibilidad IA (`🤖 Match 100% IA`).
     - **Cronómetro & Dashboard de 5 Días:** Medidor visual de progreso en tiempo real con barra de color reactivo y tarjetas de métricas (*Fecha de Pago*, *Hold Webpay*, *Límite de Expiración*).
     - **Hub de Cumplimiento Logístico:** Dropzone interactivo para arrastrar fotografías de donación o vouchers de envío, y tarjeta de dirección presencial (**Patronato 447, Recoleta, Santiago, Chile**) con botón de un clic para copiar al portapapeles.

---

## Entrada de Bitácora: Formateo de Fechas en Zona Horaria del País del Usuario y Corrección del Cronómetro de 5 Días

* **Fecha:** 8 de Agosto, 2026
* **Objetivo:** Resolver la discrepancia en el cronómetro de vencimiento y adaptar la visualización de fechas y horas a la zona horaria local del país de registro del usuario.
  1. **Solución a la Discrepancia del Cronómetro (Bugfix):**
     - **Causa Raíz:** Las cadenas ISO de fecha devueltas por el servidor .NET eran interpretadas por el constructor `new Date()` del navegador en la zona horaria local sin indicar `Z` (UTC). Esto ocasionaba desfases de horas que hacían que `Math.ceil()` calculara `6 días` cuando en realidad el plazo era de 5 días (Día 1 de 5).
     - **Solución:** Creado la librería de utilidades [dateUtils.ts](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/lib/dateUtils.ts) con las funciones `parseUtcDate` y `calculateFulfillmentTiming`, las cuales fuerzan la lectura estricta en UTC y calculan de forma matemáticamente exacta las horas y días restantes sin discrepancias (*ej: Día 1 de 5 ➔ Quedan 4 días y 22 horas*).
  2. **Formateo en la Zona Horaria del País del Usuario:**
     - Implementado el helper `formatDateInUserTimezone` que detecta la zona horaria IANA del país de registro (Chile ➔ `America/Santiago`, México ➔ `America/Mexico_City`, Colombia ➔ `America/Bogota`, etc.).
     - Integrado en [MatchDetailModal.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/features/transactions/components/MatchDetailModal.tsx) y en el listado de tarjetas en [TransactionsPage.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/features/transactions/TransactionsPage.tsx).

---

## Entrada de Bitácora: Rediseño Mobile-First Master UX/UI del Modal de Detalle de Intercambio

* **Fecha:** 8 de Agosto, 2026
* **Objetivo:** Refactorizar la arquitectura visual y técnica del modal ([MatchDetailModal.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/features/transactions/components/MatchDetailModal.tsx)) bajo la filosofía **Mobile-First**.
  1. **Patrón Bottom Sheet Ultra-Ergonómico en Móviles:**
     - El contenedor pasa a comportarse como un *Bottom Sheet* deslizable con bordes superiores redondeados (`border-radius: 28px 28px 0 0`), handle bar superior visual de arrastre y fijación al fondo de pantalla (`align-items: flex-end`) en pantallas móviles y pequeñas.
     - Botón de cierre en la esquina superior adaptado para interacción táctil (zonas de toque de 38px).
  2. **Disposición Vertical Adaptativa (Duet Swap Deck):**
     - Distribución en stack vertical fluido (`flex-direction: column`) para las tarjetas de los libros a recibir y entregar, manteniendo marcos de portada 3D resplandecientes con portadas garantizadas visiblemente.
     - Centralización del nodo de compatibilidad IA (`🤖 Match 100% IA`).
  3. **Métricas Logísticas y Formularios Adaptados a Pulgar:**
     - Reestructuración de la cuadrícula de métricas (*Fecha de Pago*, *Fee Retenido*, *Fecha Límite*) a un stack horizontal limpio por filas de alto contraste.
     - Formulario de carga de donaciones/vouchers con zona de toque optimizada para galerías móviles y botón neón flotante.

---

## Entrada de Bitácora: Implementación de Overlay Estilo Bootstrap 5 y Adaptación Híbrida Desktop / Mobile (Media Queries)

* **Fecha:** 8 de Agosto, 2026
* **Objetivo:** Adaptar el modal [MatchDetailModal.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/features/transactions/components/MatchDetailModal.tsx) al comportamiento de superposición **Bootstrap 5** y separar la presentación visual mediante **Media Queries** (Desktop 3 columnas vs Mobile Bottom Sheet).
  1. **Comportamiento Overlay Estilo Bootstrap 5:**
     - Se asignó `z-index: 10000` a la clase `.modal-overlay` en [index.css](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/index.css), garantizando que el modal se posicione por encima de absolutamente todos los elementos de la interfaz (incluyendo Navbar sticky y Footer).
     - Se habilitó `overflow-y: auto` en la capa del overlay con scrollbar nativo independiente y centrado vertical automático (`margin: auto 0`).
  2. **Presentación Responsiva Dual con Media Queries:**
     - **Escritorio / Pantallas Anchas (`> 768px`):** Restablecido el diseño amplio de **3 columnas elegantes** para el *Duet Swap Deck* (Libro a recibir, Puente IA central `🤖 Match 100% IA`, y Libro a entregar) y la cuadrícula horizontal de 3 métricas (*Fecha de Pago*, *Fee Retenido*, *Límite de Expiración*).
     - **Dispositivos Móviles (`<= 768px`):** Adaptado mediante media queries a formato *Bottom Sheet* deslizable fijado al borde inferior con *Drag Handle Bar* visual superior y distribución en stack vertical.

---

## Entrada de Bitácora: Corrección de Jerarquía de Apilamiento (Stacking Context) y Centrado Exacto del Modal Bootstrap 5

* **Fecha:** 8 de Agosto, 2026
* **Objetivo:** Resolver el problema donde el modal se mostraba por debajo de la barra de navegación (`.app-header`) y ajustar la alineación horizontal/vertical.
  1. **Diagnóstico y Solución de Jerarquía de Apilamiento (Stacking Context):**
     - **Causa Raíz:** El contenedor principal `.app-main > div` tenía asignada la animación `fadeIn` con la propiedad `transform: translateY(...)`. En CSS, cualquier elemento con la propiedad `transform` distinta de `none` crea un **nuevo Stacking Context local**, lo que atrapaba al modal dentro del flujo hijo de la página y hacía que su `z-index: 10000` se calculara relativo al contenedor interno y quedara tapado por el `.app-header` (sticky con `z-index: 100`).
     - **Solución:** Se reemplazó la animación en `.app-main > div` por `fadeInNoTransform` (animando únicamente `opacity`), liberando al modal para posicionarse por encima de toda la viewport incluyendo Navbar y Footer.
  2. **Centrado Perfecto y Ajuste de Dimensiones (`margin: auto`):**
     - Se reemplazó la dimensión `100vw/100vh` con barras de desplazamiento laterales por la declaración limpia `top: 0; left: 0; right: 0; bottom: 0; width: 100%; height: 100%;` en el overlay.
     - Se aplicó `margin: auto` a la tarjeta `.detail-modal-card-master`, logrando un centrado horizontal y vertical exacto en pantalla.

---

## Entrada de Bitácora: Implementación de Navegación Offcanvas Móvil y Eliminación de Transparencias Distorsionadoras en Modales

* **Fecha:** 8 de Agosto, 2026
* **Objetivo:** Implementar la navegación lateral responsiva tipo **Offcanvas (Estilo Bootstrap 5)** para dispositivos móviles y eliminar los efectos de desenfoque/transparencia que distorsionaban el contenido de fondo detrás de los modales.
  1. **Navegación Móvil Lateral Offcanvas (`MainLayout.tsx`):**
     - En pantallas móviles (`<= 768px`), el menú horizontal superior se oculta automáticamente y da paso a un **botón de hamburguesa (`<i className="fa-solid fa-bars"></i>`)**.
     - Al hacer clic, se despliega desde la derecha un **panel lateral deslizable Offcanvas (320px)** de alto contraste con todas las opciones de navegación (*Descubrir, Catálogo, Tu Libreta, Matches, Planes, Impacto y Perfil/Salir*).
     - El menú se cierra automáticamente al seleccionar cualquier ruta o al presionar el botón de cierre/backdrop.
  2. **Eliminación de Transparencia y Blur Distorsionador en Modales (`MatchDetailModal.tsx` & `index.css`):**
     - Se removió la propiedad `backdrop-filter: blur(...)` y la opacidad translúcida que provocaba distorsión visual con los elementos de la página principal.
     - Se aplicó un **fondo oscuro sólido y elegante (`#070b14` / `rgba(5, 8, 16, 0.98)`)** con centrado geométrico perfecto, garantizando una lectura nítida del texto y portadas 3D sin ruido de fondo.

---

## Entrada de Bitácora: Corrección de Desbordamientos Responsivos en Móviles (Offcanvas & Match Card)

* **Fecha:** 8 de Agosto, 2026
* **Objetivo:** Analizar la captura [evidencia1.png](file:///C:/Users/luis_/Proyectos/bookmachs/evidencias/evidencia1.png) y corregir los problemas de desbordamiento horizontal (`overflow-x`), títulos cortados y alineación del panel Offcanvas.
  1. **Solución a la Alineación del Panel Offcanvas (`MainLayout.tsx` & `index.css`):**
     - Se ajustó el header móvil (`.app-header`) a `flex-direction: row; justify-content: space-between;` para evitar que el logo se superpusiera con el panel lateral.
     - Se fijó la posición del panel deslizable a la derecha con un ancho responsivo adaptable (`width: 82%; max-width: 320px;`).
  2. **Solución a los Desbordamientos de la Tarjeta Match (`TransactionsPage.tsx` & `index.css`):**
     - Se añadieron las reglas `word-break: break-word;` y `min-width: 0;` a los títulos y detalles de las tarjetas de intercambio (`.match-card-details`), evitando que títulos largos (como *Tus Matches y Transacciones* o *Cuentatrapos*) empujen la pantalla lateralmente.
     - Se reestructuró la sección de botones de acción en móviles (`.match-card-actions`) a una columna vertical fluida de alto contraste con ancho al 100%.

---

## Entrada de Bitácora: Solución al Posicionamiento y Stacking Context del Menú Offcanvas Móvil

* **Fecha:** 8 de Agosto, 2026
* **Objetivo:** Resolver el problema donde el menú Offcanvas únicamente se renderizaba dentro del espacio del `<header>` sticky y no cubría el 100% de la pantalla.
  1. **Causa Raíz de Stacking Context:**
     - El componente `<div className="offcanvas-backdrop">` estaba siendo renderizado como hijo directo del elemento `<header className="app-header">`.
     - Dado que `<header>` posee su propio contexto de apilamiento (`position: sticky; z-index: 100`), cualquier hijo con `position: fixed; inset: 0;` quedaba limitado espacialmente al área visual delimitada por el header.
  2. **Solución Aplicada (`MainLayout.tsx`):**
     - Se extrajo el bloque `{mobileMenuOpen && <div className="offcanvas-backdrop">...</div>}` fuera del tag `<header>` y se ubicó como hermano directo dentro de `<div className="app-container">`.
     - De este modo, la capa con `position: fixed; inset: 0; z-index: 10500` cubre la totalidad de la ventana gráfica (*viewport 100vw x 100vh*), oscureciendo el fondo completo y desplegando el panel lateral desde la derecha estilo **Bootstrap 5 Offcanvas**.

---

## Entrada de Bitácora: Bloqueo de Scroll Global (`html` y `body`) para Menú Offcanvas y Modales

* **Fecha:** 8 de Agosto, 2026
* **Objetivo:** Garantizar que cuando el menú lateral Offcanvas o un Modal de detalle se encuentre activo, se inhabilite el scroll del fondo (`html` y `body`), permitiendo únicamente el desplazamiento interno dentro del panel/modal.
  1. **Bloqueo en Menú Offcanvas (`MainLayout.tsx`):**
     - Se añadió un efecto `useEffect` que monitorea el estado `mobileMenuOpen`. Al activarse, aplica `document.documentElement.style.overflow = 'hidden'` y `document.body.style.overflow = 'hidden'`.
     - Al cerrarse o desmontarse el componente, restablece automáticamente el scroll normal.
  2. **Bloqueo en Modal de Detalle (`MatchDetailModal.tsx`):**
     - Se aplicó el mismo patrón de bloqueo en el `useEffect` dependiente de `isOpen`, previniendo que el usuario pueda desplazar la página de fondo mientras interactúa con el modal.

---

## Entrada de Bitácora: Solución Técnica al Bug de Cobertura del Header Mediante React Portal (`createPortal`)

* **Fecha:** 8 de Agosto, 2026
* **Objetivo:** Resolver definitivamente el bug donde, al encontrarse el scroll del usuario en la parte superior de la página, la barra de navegación sticky (`.app-header`) alcanzaba a tapar parcialmente la parte superior del modal al abrirlo.
  1. **Causa Raíz:**
     - El componente modal se renderizaba como hijo dentro de la jerarquía DOM de `TransactionsPage`, compartiendo los contextos de apilamiento (*Stacking Contexts*) de los contenedores intermedios del layout (`.app-container`, `.app-main`).
     - Cuando el scroll estaba hasta arriba, la posición sticky de la barra de navegación interactuaba en el mismo nivel visual del árbol DOM local.
  2. **Solución Definitiva (`createPortal`):**
     - Se implementó `createPortal` de `react-dom` en [MatchDetailModal.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/features/transactions/components/MatchDetailModal.tsx).
     - El modal ahora se teletransporta y renderiza **directamente como hijo de `document.body`**, completamente fuera del flujo y la jerarquía de la página.
     - Con `z-index: 99999` y renderizado en la raíz del documento, el modal queda por encima de absolutamente todos los elementos del sitio web (Header sticky, Footer y contenedores) independientemente de la posición del scroll.

---

## Entrada de Bitácora: Actualización de la Paleta de Colores a la Identidad Oficial Emerald Forest (`pantallas-cliente.jpeg`)

* **Fecha:** 8 de Agosto, 2026
* **Objetivo:** Transformar la paleta de colores de toda la interfaz de usuario en [index.css](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/index.css) para que coincida de forma exacta con la identidad visual oficial de las maquetas de cliente ([pantallas-cliente.jpeg](file:///C:/Users/luis_/Proyectos/bookmachs/assets/pantallas-cliente.jpeg)).
  1. **Paleta Botánica y Limpia (Emerald Forest):**
     - **Verde Principal (`--neon`):** `#0F9D58` (*Verde Esmeralda Botánico Orgánico* de los botones y elementos de acción principales).
     - **Fondo de Pantalla (`--bg-primary`):** `#F7F9F8` (*Gris Botánico Limpio de Alta Frescura Visual*).
     - **Tarjetas y Paneles (`--bg-card` / `--bg-secondary`):** `#FFFFFF` (*Blanco Puro con sombras suaves `#0F9D58`*).
     - **Tipografía y Textos (`--text-primary` / `--text-secondary`):** `#1A2621` (*Verde Bosque Oscuro* para máxima legibilidad e impacto ambiental).
  2. **Consistencia Visual Global:**
     - Aplicado automáticamente a todos los botones, tarjetas de matches, modales, barras de progreso, menús y formularios de la aplicación.

---

## Entrada de Bitácora: Auditoría y Corrección de Contrastes para el Tema Botánico Claro (`pantallas-cliente.jpeg`)

* **Fecha:** 8 de Agosto, 2026
* **Objetivo:** Auditar y corregir inconsistencias visuales de texto blanco sobre fondos claros o cajas oscuras aisladas reportadas en la interfaz de usuario tras el cambio de tema.
  1. **Ajustes en Tarjetas de Matches (`index.css`):**
     - Se actualizaron los titulares de las tarjetas de intercambio (`.match-card-details h3`) y la visualización de montos (`.fee-amount-display strong`) de `#fff` a `var(--text-primary)` (`#1A2621`), logrando un contraste perfecto e inmediato.
     - Se ajustaron todas las insignias de estado (*Pending, Hold, Captured, Failed, Logistics*) a fondos semitransparentes suaves con bordes claros y texto de alto contraste.
  2. **Ajustes en Modal de Detalle e Instrucciones ([MatchDetailModal.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/features/transactions/components/MatchDetailModal.tsx)):**
     - Se transformó el contenedor principal del modal a blanco puro (`#FFFFFF`) con bordes botánicos suaves (`#E1E8E4`) y sombras esmeralda.
     - Se actualizaron las tarjetas de libros a recibir y entregar, el cronómetro de 5 días, la caja de dirección presencial y el formulario de carga de vouchers a tonos botánicos claros con tipografía `#1A2621` de legibilidad máxima.

---

## Entrada de Bitácora: Creación de Archivos de Variables de Entorno por Ambiente (`.env.development` & `.env.production`)

* **Fecha:** 9 de Agosto, 2026
* **Objetivo:** Configurar el aislamiento de endpoints de la API para los entornos de desarrollo y producción en el cliente de React (Vite).
  1. **Configuración de Desarrollo (`.env.development`):**
     - Ubicación: [frontend/.env.development](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/.env.development)
     - Variable: `VITE_API_URL=https://localhost:7047/api`
  2. **Configuración de Producción (`.env.production`):**
     - Ubicación: [frontend/.env.production](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/.env.production)
     - Variable: `VITE_API_URL=/api`

---

## Entrada de Bitácora: Ocultación del "Plan Lector Infantil" en la Vista de Planes

* **Fecha:** 9 de Agosto, 2026
* **Objetivo:** Ocultar temporalmente el **Plan Lector Infantil** de la vista pública de membresías y suscripciones ([PlansPage.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/features/subscriptions/PlansPage.tsx)).
  1. **Ajuste en la Estructura de Planes (`PlansPage.tsx`):**
     - Se comentó la entrada del objeto `Plan Lector Infantil` del array `plans`.
     - Ahora únicamente se muestran las membresías principales (*Plan Gratuito / Básico* y *Plan Premium*), manteniendo el diseño de cuadrícula centrado y ordenado.

* **Archivos Clave Modificados:**
  - [PlansPage.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/features/subscriptions/PlansPage.tsx)
  - [bitacora_desarrollo.md](file:///C:/Users/luis_/Proyectos/bookmachs/bitacora_desarrollo.md)


































