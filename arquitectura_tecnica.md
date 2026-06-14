# Documento de Arquitectura Técnica - Bookmachs

## 1. Visión General y Stack Tecnológico
Basado en los requerimientos funcionales, el backlog maestro y los criterios de aceptación, Bookmachs se diseñará como una **Single Page Application (SPA)** moderna, separando el Frontend y el Backend mediante una arquitectura RESTful robusta. Esto cumple con los principios de **Clean Architecture** y **Domain-Driven Design (DDD)** para garantizar mantenibilidad.

*   **Frontend:** **React** (usando Vite para empaquetado optimizado). 
    *   *Gestión de estado:* Zustand (estado global) y React Query (estado asíncrono y caché de servidor). 
    *   *Estilos:* CSS modular o TailwindCSS.
*   **Backend:** **ASP.NET Core Web API (.NET 8)**.
*   **Base de Datos:** **SQL Server** gestionado mediante **Entity Framework Core** (Enfoque Code-First).
*   **Hosting / Despliegue:** **VPS en SmarterASP.NET** (Entorno Windows/IIS optimizado para stack de Microsoft).

---

## 2. Enfoque Clean Architecture & DDD

El backend se estructurará para mantener la lógica de negocio independiente de frameworks de UI o bases de datos, evitando los "anti-patrones" genéricos y priorizando nombres ligados al dominio.

### 2.1 Estructura de Proyectos en ASP.NET Core (Solución: `Bookmachs.sln`)

La solución se divide en 4 capas estrictas (dependencias apuntando siempre hacia el centro: Domain):

```text
Bookmachs.sln
├── src/
│   ├── Bookmachs.Domain/         (Centro: Entidades de negocio, Interfaces de Repositorios, Excepciones, Reglas puras)
│   ├── Bookmachs.Application/    (Casos de uso/Features, CQRS con MediatR, DTOs de entrada/salida)
│   ├── Bookmachs.Infrastructure/ (Servicios externos: EF Core DbContext, Migrations, Webpay, Pasarelas IA)
│   └── Bookmachs.Api/            (Controladores REST, Configuración de Inyección de Dependencias, Middlewares)
```

### 2.2 Estructura de Carpetas Frontend (React + Vite)

Se adoptará la convención basada en dominios de negocio (*Feature-Sliced Design*), evitando carpetas basurero como `/utils` o `/helpers`.

```text
src/
├── app/                  (Providers globales, Router principal, Layout base)
├── features/             (Módulos del negocio aislados)
│   ├── authentication/   (Login, Formulario de Registro, Cuestionario Onboarding)
│   ├── discovery/        (Motor de Swipe, Tarjetas de libros, Límites diarios)
│   ├── inventory/        (Tu Libreta, Subida de fotos, Scanner IA)
│   ├── transactions/     (Match, Cálculo de Fee, Checkout de pago, Selección de logística)
│   └── social/           (Perfil, Huella de Carbono, Timeline Público)
├── lib/                  (Configuraciones encapsuladas de librerías de 3ros ej: apiClient, react-query)
└── shared/               (Componentes UI reutilizables y tipados genéricos: Buttons, Modals)
```

---

## 3. Modelado de Datos (Entity Framework Core - Code-First)

Definiremos las entidades en la capa `Domain` y gestionaremos las migraciones desde `Infrastructure`. El contexto (*Bounded Context*) central involucra las siguientes relaciones:

*   **`User`**: Administra datos, `SubscriptionPlan` actual, contador de `DailySwipesConsumed` y rol.
*   **`Book`**: La unidad de intercambio. Define propiedades como `Title`, `Author`, `Condition` y un flag `IsInternalStock` (Bookmachs vs Usuarios).
*   **`MatchTransaction`**: Entidad crítica transaccional. Enlaza a un `UserId` con un `BookId`, calcula el `FeeAmount` base de la IA, guarda el `PaymentHoldId` (id de retención en la pasarela) y actualiza el `LogisticsStatus`.
*   **`UserPreference`**: Registros asociados al cuestionario dinámico.

*Nota Arquitectónica:* Nunca inyectaremos el `DbContext` directamente en la capa `Api`. Se utilizará el patrón **Repository** e interfaces inyectadas a través de la capa `Application`.

---

## 4. Integraciones y Estrategia "Library-First"

No reinventaremos la rueda. Toda lógica transversal y compleja que ya esté resuelta por la industria se manejará integrando librerías o APIs sólidas:

1.  **Manejo de Fallos y Reintentos de Red:**
    *   Uso de **Polly** (en .NET) para definir políticas de reintento ante fallos temporales al comunicarse con las APIs de pasarelas de pago o motores de IA.
2.  **Procesamiento de IA (Lectura de Portadas):**
    *   No entrenaremos modelos locales. `Infrastructure` consumirá la API de **Google Cloud Vision** o **OpenAI GPT-4o Vision** para extraer Título/Autor/Sinopsis desde la imagen cargada por el usuario Premium.
3.  **Pagos y Retenciones (Holds):**
    *   Integración del SDK oficial de **Mercado Pago** (que soporta suscripciones y retenciones temporales) y SDK de **Transbank Webpay Plus** para transacciones locales en Chile.
4.  **Tareas en Segundo Plano (CRON):**
    *   Para la "Liberación de Reservas en 48 hrs" exigida en el backlog, se implementará **Hangfire** en ASP.NET Core. Evita depender de temporizadores frágiles en memoria que mueren si el App Pool de IIS en SmarterASP se recicla.
5.  **Autenticación SSO:**
    *   Uso estricto de `Microsoft.AspNetCore.Authentication.JwtBearer` y `Google.Apis.Auth` para certificar el token de Google, emitiendo JWTs seguros al frontend.

---

## 5. Estrategia de Despliegue en VPS (SmarterASP.NET)

El proveedor SmarterASP.NET utiliza infraestructura IIS (Internet Information Services) y SQL Server.

### 5.1 Despliegue del Backend (API)
*   Se publicará `Bookmachs.Api` utilizando Visual Studio Web Deploy o FTP. 
*   **Base de Datos:** En el entorno de producción, las migraciones (*Code-First*) se aplicarán de forma controlada utilizando scripts generados (`dotnet ef migrations script`) aplicados directamente al SQL Server, evitando que la API intente mutar esquemas estructurales en tiempo de ejecución de alto tráfico.

### 5.2 Despliegue del Frontend (React SPA)
*   Se generará el *build* productivo (`npm run build`).
*   Los archivos estáticos se subirán a la raíz pública del sitio.
*   **Regla Crítica (web.config):** Para que las rutas del Router de React funcionen correctamente (ej. `/tu-libreta`) sin devolver error `404 Not Found` en IIS, se debe crear un módulo de reescritura de URL (`URL Rewrite`) en el archivo `web.config` que redirija todas las peticiones no resueltas hacia el `index.html`.

---

## 6. Estándares y Reglas Clínicas de Código

1.  **Early Returns (Retornos Tempranos):** Obligatorio en controladores y servicios. Validar primero permisos y parámetros, retornando errores 400/401 inmediatamente para evitar la anidación de condicionales (If-Else blocks profundos).
2.  **Separación Pura de Intereses:** 
    *   Ningún componente de React en el Frontend debe calcular el precio del Fee de un libro. La API enviará el costo exacto procesado y encriptado como única fuente de verdad.
    *   Ningún controlador ASP.NET en la API debe tener sentencias LINQ para buscar en base de datos.
3.  **Archivos Cortos y Enfocados:** Clases y componentes que superen las 200 líneas de código deben ser refactorizados y extraídos utilizando el principio de Responsabilidad Única (SRP).
