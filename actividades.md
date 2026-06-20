# Guía de Actividades y Tareas de Desarrollo (Checklist Técnico)
## Proyecto: Bookmachs (ASP.NET Core + React SPA)

Este archivo enumera la secuencia lógica de ejecución de tareas para garantizar que la arquitectura técnica, el backlog de usuario y los criterios de aceptación Gherkin se desarrollen paso a paso sin perder requisitos.

---

### Fase 1: Setup Inicial del Proyecto y Arquitectura
- [x] **Tarea 1:** Crear la solución de Visual Studio `Bookmachs.sln` y generar los 4 proyectos base siguiendo Clean Architecture (`Bookmachs.Domain`, `Bookmachs.Application`, `Bookmachs.Infrastructure`, `Bookmachs.Api`).
- [x] **Tarea 2:** Configurar la Inyección de Dependencias, patrón CQRS (instalando MediatR) y Swagger en el proyecto `Bookmachs.Api`.
- [x] **Tarea 3:** Inicializar el proyecto Frontend con React + Vite (`npm create vite@latest`).
- [x] **Tarea 4:** Instalar dependencias core en el frontend (React Router, Zustand para estado, React Query) y aplicar diseño usando **CSS Puro (Vanilla CSS)**, estructurando carpetas bajo el estándar Feature-Sliced Design (`app`, `features`, `lib`, `shared`).

---

### Fase 2: Modelado de Datos y Base de Datos (EF Core Code-First)
- [x] **Tarea 5:** Codificar las Entidades del Dominio en C#: `User`, `Book`, `MatchTransaction`, `Subscription`, `UserPreference` y `GlobalSettings`.
- [x] **Tarea 6:** Crear el contexto de base de datos (`BookmachsDbContext`) en la capa `Infrastructure`, definiendo claves foráneas, reglas de modelo y relaciones.
- [x] **Tarea 7:** Generar la migración inicial (`dotnet ef migrations add InitialCreate`) y aplicarla a la base de datos local de SQL Server.
- [x] **Tarea 8:** Implementar el Patrón Repositorio y *Unit of Work* en la infraestructura, dejando las interfaces puras en la capa Domain.

---

### Fase 3: Backoffice y Parametrización Global
- [x] **Tarea 9:** Desarrollar Endpoints CRUD (API) para la administración de la tabla `GlobalSettings` (Control de límites de swipes, costos de planes, y tope de cálculo de Fee).
- [x] **Tarea 10:** Desarrollar Endpoint (API) de administración para alimentar el catálogo maestro dinámico del cuestionario de gustos.
- [ ] **Tarea 11:** Desarrollar interfaz del Panel CMS Web (Frontend Admin) para visualizar y editar configuraciones.
- [ ] **Tarea 12:** Pruebas QA (Unitarias y E2E): Confirmar que la actualización de estas variables alteran el comportamiento del sistema en tiempo real.

---

### Fase 4: Autenticación, Landing y Onboarding
- [ ] **Tarea 13:** Configurar Autenticación `JwtBearer` y API de **Google OAuth 2.0 (Servicio de SSO 100% Gratuito de Google)** en la capa de API.
- [ ] **Tarea 14:** Desarrollar API de Registro Manual e Inicio de Sesión de usuario almacenando correo, nombre, y **Documento de Identidad (Dato dinámico que se adapta al país ingresado)**, validando campos de seguridad.
- [ ] **Tarea 15:** Construir el "Modal Hard Gate" en Frontend para que la interacción inicial del Swipe obligue al usuario no logueado a registrarse.
- [ ] **Tarea 16:** Integrar botón "Continuar con Google" (SSO Frontend) y enlazarlo con el backend.
- [ ] **Tarea 17:** Construir el Wizard dinámico (Frontend) del cuestionario de gustos, alimentado en vivo por el endpoint del catálogo maestro (Backend).

---

### Fase 5: Inventario, Logística y Subida de Libros
- [ ] **Tarea 18:** Configurar la infraestructura del proyecto Backend para recibir y almacenar los archivos de imagen de los libros subidos en un **Directorio Local (`/wwwroot/uploads`)** en el VPS.
- [ ] **Tarea 19:** Desarrollar formulario de ingreso manual (Frontend - Tu Libreta) para Título, Autor, Resumen y Estado físico. Todos los usuarios registrarán su stock de esta forma.
- [ ] **Tarea 20:** Desarrollar API para procesar la subida del libro creando la entidad en la base de datos con flag `IsExternalStock = true` y linkeando la imagen local.

---

### Fase 6: Motor de Recomendación, Swipe y Límites Diarios
- [ ] **Tarea 21:** Desarrollar Endpoint público (`/api/books/guest-random`) que devuelva el libro señuelo de portada para invitados (Sin Auth).
- [ ] **Tarea 22:** Desarrollar **Algoritmo de Recomendación de libros Ligero (API en C#)**. El motor nativo filtrará eficientemente por coincidencia cruzada de gustos del usuario y etiquetas del catálogo para garantizar rendimiento alto en el VPS.
- [ ] **Tarea 23:** Implementar en Backend la lógica de contadores de visualizaciones en caché para controlar la cuota gratuita diaria.
- [ ] **Tarea 24:** Construir visual de tarjeta (UI Frontend) en CSS Puro, incluyendo animaciones de drag/swipe, y manejo de botones (corazón, equis).
- [ ] **Tarea 25:** Desarrollar mecánica condicional (Frontend): Renderizar blur (desenfoque) y ventana modal Upsell al recibir el código de rechazo por sobrepasar la cuota diaria gratuita de visualización.

---

### Fase 7: Sistema de Transacciones y Pagos (Checkout)
- [ ] **Tarea 26:** Programar la lógica matemática en el backend para retornar dinámicamente el precio estimado del *Fee* de intercambio.
- [ ] **Tarea 27:** Diseñar la UI de "¡Match Logrado!" que muestra el desglose del Fee calculado.
- [ ] **Tarea 28:** Integración Library-First (Backend): Instalar y configurar librerías de pasarela (Transbank Webpay Plus y/o Mercado Pago) orientadas a pagos con retención ("Hold").
- [ ] **Tarea 29:** Construir vistas de Checkout y validación (Frontend), junto a los Endpoints de confirmación que cambien el estado de la transacción.
- [ ] **Tarea 30:** Implementar validación geográfica: Generar *Warning UI* internacional, forzando la confirmación por el alto costo del envío si un match es transfronterizo.
- [ ] **Tarea 31:** Construir formulario selector condicional del método logístico (Presencial, Envío Bodega, P2P, o Donar con subida fotográfica).

---

### Fase 8: Suscripciones Premium, Catálogos y Reservas
- [ ] **Tarea 32:** Desarrollar cobro recurrente (Suscripciones) interactuando vía Webhooks con la pasarela para setear bandera `is_premium = true`.
- [ ] **Tarea 33:** Desarrollar página web comparativa interactiva "Planes y Membresías" para gatillar upgrades.
- [ ] **Tarea 34:** Exponer Endpoints protegidos (Backend) de búsqueda y listado general (Catálogo Avanzado web y libros Recién Llegados), aplicando filtros y paginación.
- [ ] **Tarea 35:** Diseñar las vistas Grid/List en React para que el usuario Premium navegue el catálogo.
- [ ] **Tarea 36:** Implementar la lógica de "Reservas" en base de datos. Bloquear y disminuir stock virtual del inventario.
- [ ] **Tarea 37:** Integración Library-First (Backend): Instalar **Hangfire** y programar un Job (CRON) en background que devuelva el stock automáticamente y anule transacciones pasadas las 48 horas sin pago.

---

### Fase 9: Capa Social y de Impacto Ambiental
- [ ] **Tarea 38:** Implementar Endpoint estadístico (Backend) que multiplique libros intercambiados/donados por las constantes de emisiones de CO2.
- [ ] **Tarea 39:** Desarrollar pantalla "Dashboard Perfil" con visualización gráfica y contadores de impacto.
- [ ] **Tarea 40:** Integrar endpoint y vista del "Historial de Intercambios" global sin restricciones de cuenta.
- [ ] **Tarea 41:** Desarrollar tabla transaccional (Backend) de Eventos de Timeline, generando registros cuando el sistema gatilla un intercambio exitoso marcado como público.
- [ ] **Tarea 42:** Construir Frontend del *Timeline Interactivo* y modal de notas/reseñas usando CSS Puro.

---

### Fase 10: Despliegue, Testing QA y Refinamiento (SmarterASP.NET)
- [ ] **Tarea 43:** Ejecutar scripts de migraciones SQL sobre la base de datos de producción en el VPS SmarterASP.NET.
- [ ] **Tarea 44:** Compilar y publicar `Bookmachs.Api` vía Web Deploy/FTP (Modo Release) hacia el IIS remoto.
- [ ] **Tarea 45:** Setear entorno seguro (Variables, Tokens, API Keys de Pasarelas) en el Host de Producción.
- [ ] **Tarea 46:** Compilar el frontend localmente mediante `npm run build`.
- [ ] **Tarea 47:** Cargar los archivos estáticos generados (`/dist`) al directorio raíz del Frontend alojado en IIS.
- [ ] **Tarea 48:** Configurar archivo `web.config` instalando las reglas de módulo `URL Rewrite` para forzar a que rutas huérfanas regresen a `/index.html` (vital para navegación SPA en React).
- [ ] **Tarea 49:** Realizar el conjunto de pruebas End-to-End validando comportamientos definidos en el archivo de los criterios de aceptación Gherkin.
