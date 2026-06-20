# Bitácora de Desarrollo Detallada e Historial de Ejecución - Bookmachs
## Proyecto: Bookmachs (ASP.NET Core + React SPA)

Este documento contiene un registro técnico detallado de cada una de las tareas ejecutadas desde la **Fase 1** hasta la **Fase 7**, reflejando las implementaciones específicas, flujos lógicos, DTOs, componentes de frontend, reglas CSS y pruebas aplicadas.

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
