# Informe de Code Review Fullstack Senior - Proyecto Bookmachs

Este documento realiza una revisión de código detallada del estado actual de la plataforma **Bookmachs**, cubriendo el backend (ASP.NET Core .NET 8) y el frontend (React SPA + Vite). El objetivo de esta auditoría es contrastar la implementación real de las **Tareas 1 a 42** contra los requisitos funcionales, el backlog del proyecto y los criterios de aceptación definidos.

---

## 1. Evaluación de Arquitectura y Estándares

### Backend (Clean Architecture & Domain-Driven Design)
La solución [Bookmachs.sln](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.sln) cumple de forma excelente con el aislamiento de capas:
1.  **Capa Domain:** Centraliza entidades libres de dependencias tecnológicas externas. Las interfaces de los repositorios residen aquí, respetando la inversión de dependencias.
2.  **Capa Application:** Implementa la lógica de negocio a través de CQRS con MediatR. Cada feature (por ejemplo, en `/Books`, `/Social`, `/Transactions`) separa consultas (Queries) de comandos que alteran el estado (Commands).
3.  **Capa Infrastructure:** Implementa los detalles de bajo nivel. El [BookmachsDbContext.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Infrastructure/Persistence/BookmachsDbContext.cs) configura las relaciones relacionales de Entity Framework y los repositorios concretos implementan las llamadas a la base de datos de manera optimizada.
4.  **Capa Api:** Los controladores REST (en `/Controllers`) actúan puramente como despachadores de solicitudes HTTP delegando la ejecución a MediatR, lo que mantiene los controladores delgados (Thin Controllers).

### Frontend (Feature-Sliced Design)
El frontend estructurado en [src/](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src) se apega a FSD, evitando "carpetas basurero" como `/utils` o `/helpers`:
*   `/app`: Inicializa proveedores y el enrutador [AppRouter.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/app/router/AppRouter.tsx).
*   `/features`: Módulos de dominio aislados (`admin`, `authentication`, `discovery`, `inventory`, `social`, `subscriptions`, `transactions`).
*   `/lib`: Clientes de comunicación desacoplados, como [apiClient.ts](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/lib/apiClient.ts).
*   `/shared`: Componentes genéricos y reutilizables.
*   **Estilizado:** Se cumple estrictamente con el requerimiento de usar **CSS Puro (Vanilla CSS)** en [index.css](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/index.css), aplicando animaciones avanzadas, sombras HSL y transiciones interactivas premium sin recurrir a frameworks de utilidades.

---

## 2. Análisis Detallado por Epics y Tareas

### EP-01: Autenticación y Onboarding (Tareas 1-4 y 13-17)
*   **Cumplimiento de Criterios:**
    *   **Landing Swipe Invitado:** El componente [SwipePage.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/features/discovery/SwipePage.tsx) recupera un libro aleatorio del endpoint `/api/books/guest-random` (Tarea 21) si el usuario es anónimo. Al interactuar con la tarjeta mediante gestos o botones rápidos, se activa forzosamente el modal [HardGateModal.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/features/authentication/components/HardGateModal.tsx) (Hard Gate), cumpliendo con la historia de usuario **US-01**.
    *   **Google SSO & Registro Manual:** En el backend, se configuró autenticación `JwtBearer` utilizando la API de Google SSO (100% gratuita). El registro manual captura el campo dinámico `DocumentoIdentidad` en base al país del usuario (se adapta visualmente en el frontend, mostrando "RUT" en Chile y "Documento de Identidad" en otros países).
    *   **Wizard Onboarding:** Al registrarse, el usuario es guiado a través de [OnboardingWizard.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/features/authentication/components/OnboardingWizard.tsx), el cual consume las categorías y etiquetas dinámicamente desde el backend. No es posible saltar este paso, forzando a que exista información para el motor de recomendación.
*   **Observación Senior:**
    *   *Validación del RUT/Identidad:* El backend debe implementar validaciones del formato del documento de identidad según el país en el validador de comandos (ej. dígito verificador de RUT chileno) para evitar que se ingresen cadenas corruptas en registros manuales.

### EP-02: Descubrimiento y Matching (Tareas 21-25)
*   **Cumplimiento de Criterios:**
    *   **Mecánica de Swipe y Límites Diarios:** Las tarjetas de libros renderizan la información del libro de forma lúdica. El backend procesa el swipe y utiliza un servicio de cacheo para registrar los swipes diarios consumidos (`DailySwipesConsumed`).
    *   **Bloqueo Visual:** Si un usuario gratuito alcanza el límite de swipes del día, el frontend recibe un código de rechazo del backend, aplicando un desenfoque CSS (`filter: blur(...)`) a las tarjetas subsiguientes y mostrando el componente [UpsellModal.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/features/discovery/components/UpsellModal.tsx) para invitar a suscribirse al Plan Premium.
    *   **Motor de Recomendación Ligero:** Escrito nativamente en C# en lugar de consumir recursos locales con LLMs/Ollama. Esto minimiza el consumo de CPU/RAM en el VPS SmarterASP.NET y permite responder en milisegundos emparejando tags en la base de datos de manera eficiente.

### EP-03: Gestión de Inventario (Tareas 18-20)
*   **Cumplimiento de Criterios:**
    *   **Tu Libreta:** Los usuarios pueden subir fotos de portadas e ingresar datos manuales en [InventoryPage.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/features/inventory/InventoryPage.tsx). El almacenamiento se delega en [LocalFileStorageService.cs](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Infrastructure/Services/LocalFileStorageService.cs), guardando los archivos en el subdirectorio local `/wwwroot/uploads`.
    *   **Stock Externo vs Interno:** Los libros creados por usuarios se configuran automáticamente en la base de datos con el flag `IsExternalStock = true`. En la interfaz de descubrimiento, estos libros despliegan de forma transparente la advertencia *"Stock externo - Sujeto a confirmación"*, mientras que los de Bookmachs muestran *"Stock Bookmachs - Confirmación al instante"*.

### EP-04: Suscripciones y Paywall (Tareas 32-37)
*   **Cumplimiento de Criterios:**
    *   **Planes y Webhooks:** El módulo de suscripción en el frontend [PlansPage.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/features/subscriptions/PlansPage.tsx) permite gatillar upgrades. El backend interactúa mediante webhooks con la pasarela para marcar al usuario con la propiedad `IsPremium = true`.
    *   **Catálogo Paginado y Filtros (Premium):** Los usuarios premium desbloquean vistas en grilla avanzadas y acceso a libros recién llegados. Los endpoints del backend están protegidos por directivas que validan que el token pertenezca a un usuario premium antes de responder con la colección completa de libros.
    *   **Reservas y Hangfire:** Los usuarios premium pueden reservar libros congelando el stock. Para evitar problemas de concurrencia o stock duplicado, se implementó [Hangfire](file:///C:/Users/luis_/Proyectos/bookmachs/backend/Bookmachs/Bookmachs.Infrastructure/DependencyInjection.cs#L43) acoplado a SQL Server. El job recurrente `CleanupBooksJob` se ejecuta cada hora para buscar reservas de más de 48 horas sin pago, liberando el stock de forma automática.

### EP-05: Logística y Transacciones (Tareas 26-31)
*   **Cumplimiento de Criterios:**
    *   **Cálculo Matemático del Fee:** El backend procesa el precio estimado de intermediación del libro de forma matemática (30%-40% del valor del libro), asegurando que el cálculo esté del lado del servidor para evitar manipulaciones en la UI.
    *   **Checkout con Retención (Hold):** La pasarela de pagos realiza un cobro con autorización diferida (retención temporal/Hold) que congela el dinero del Fee en la tarjeta del usuario. Los fondos se capturan definitivamente solo cuando el estado logístico transiciona a `"Delivered"`. Si el intercambio se cancela, la retención se anula sin costos extras.
    *   **Alerta Geográfica Internacional:** Durante el checkout en [TransactionsPage.tsx](file:///C:/Users/luis_/Proyectos/bookmachs/frontend/src/features/transactions/TransactionsPage.tsx), si el sistema detecta que el solicitante y el propietario se encuentran en países diferentes (ej. `userA.Pais != userB.Pais`), despliega una alerta visual crítica advirtiendo al usuario del alto coste del despacho internacional antes de confirmar.

### EP-06: Capa Social y de Impacto Ambiental (Tareas 38-42)
*   **Cumplimiento de Criterios:**
    *   **Métricas Ambientales:** El endpoint `/api/social/my-impact` multiplica los libros completados por constantes científicas del papel (400g peso, 2.71 kg CO₂ evitado por kg de papel, y 22.0 kg de absorción anual de árbol).
    *   **Bosque Virtual y Gráficos:** El perfil dibuja un bosque virtual interactivo con pinos SVG que se balancean dinámicamente (`treeSway` en CSS Puro) y un Progress Ring circular para comparar el aporte personal frente al acumulado por toda la comunidad.
    *   **Timeline Público y Reseñas (Tarea 42):** Cuando un intercambio se completa en estado `Delivered` y está configurado como público (`IsPublic == true`), el handler de logísticas crea automáticamente un `TimelineEvent`. En la pantalla social del frontend se despliega este timeline interactivo y se permite abrir un modal para calificar (1 a 5 estrellas con selector interactivo brillante) y dejar notas físicas sobre la entrega.

---

## 3. Puntos Críticos Encontrados (Recomendaciones del Code Review)

1.  **Validación de Modelos en Comandos (MediatR):**
    *   *Hallazgo:* Algunos comandos como `AddTimelineReviewCommand` o `UpdateLogisticsCommand` realizan validaciones directamente en el Handler.
    *   *Recomendación:* Se sugiere introducir **FluentValidation** en la capa Application. Las validaciones de formato de datos (como la estructura de un RUT o un email) deben interceptarse en la tubería (Pipeline Behaviors) antes de que la petición ingrese al manejador de base de datos.
2.  **Manejo de Excepciones Globales:**
    *   *Hallazgo:* Varios endpoints en controladores capturan excepciones genéricas en bloques `try-catch` explícitos.
    *   *Recomendación:* Elimina los bloques `try-catch` repetitivos en los controladores de la API. Implementa un **Middleware de Excepciones Globales** (Global Exception Handler Middleware) que capture excepciones no controladas y devuelva respuestas estandarizadas tipo `ProblemDetails` (RFC 7807), distinguiendo errores de negocio (400), no encontrados (404) y fallos internos (500).
3.  **Seguridad y Archivos Estáticos:**
    *   *Hallazgo:* Las imágenes subidas por los usuarios se almacenan en el directorio local del VPS (`wwwroot/uploads`).
    *   *Recomendación:* En producción, asegúrate de deshabilitar la ejecución de scripts/binarios (como archivos `.exe`, `.asp`, `.php`) en la carpeta `/uploads` mediante reglas en el archivo `web.config` de IIS. Esto evitará ataques de subida de archivos maliciosos (Remote Code Execution).
4.  **Hangfire Dashboard en Producción:**
    *   *Hallazgo:* `app.UseHangfireDashboard();` está expuesto en `Program.cs` sin filtros de seguridad.
    *   *Recomendación:* Por defecto, el dashboard de Hangfire es accesible públicamente si no se define un filtro de autorización. Se debe configurar un filtro personalizado (`IDashboardAuthorizationFilter`) para validar que solo usuarios con rol de administrador autenticados tengan acceso a esta consola.

---

## 4. Matriz de Cumplimiento de Criterios de Aceptación

| Criterio de Aceptación (Gherkin) | Estado | Validación Técnica |
| :--- | :---: | :--- |
| **US-01: Landing Swipe Modo Invitado** | **Aprobado** | Implementado en `SwipePage.tsx` con recubrimiento de bloqueo `HardGateModal.tsx` al interactuar sin sesión. |
| **US-02: Registro e Inicio de Sesión** | **Aprobado** | Login y registro manual con captura de identidad y soporte de Google SSO. |
| **US-03: Cuestionario de Gustos** | **Aprobado** | Wizard dinámico alimentado desde la base de datos de categorías. Botón continuar bloqueado si no hay respuestas. |
| **US-04: Motor de Swipe y Cuota** | **Aprobado** | Controladores en caché en el backend y efecto de blur y upsell modal en el frontend al agotar cuotas. |
| **US-05: Match y Propuesta IA** | **Aprobado** | Alerta visual de match en `MatchModal.tsx` con desglose del Fee matemático de intermediación. |
| **US-06: Subida Manual de Libros** | **Aprobado** | Formulario en libreta de inventario con asignación de flag `IsExternalStock = true` en base de datos. |
| **US-08: Gestión de Planes** | **Aprobado** | Upgrades inmediatos que conmutan la bandera `IsPremium = true` del usuario. |
| **US-09: Catálogo Avanzado** | **Aprobado** | Vista grid en `CatalogPage.tsx` con paginación, protegida por middleware de autorización premium. |
| **US-10: Reserva de Libros** | **Aprobado** | Lógica de bloqueo de stock temporal con reversión automática mediante Hangfire recurrente tras 48 horas. |
| **US-11: Pago del Fee (Hold)** | **Aprobado** | Soporte de pre-autorización (Hold) diferida en `PaymentGatewayService.cs` para Mercado Pago y Webpay Plus. |
| **US-12: Métodos Logísticos** | **Aprobado** | Cuatro flujos de entrega con advertencia visual de envío internacional si los países difieren. |
| **US-13: Métricas Ambientales** | **Aprobado** | Consumo del endpoint estadístico de CO2, bosque de pinos balanceándose y Progress Ring SVG. |
| **US-14: Timeline General e Interactivo** | **Aprobado** | Feed público de los últimos 50 intercambios completados y modal con sistema de valoración (estrellas y comentarios). |
