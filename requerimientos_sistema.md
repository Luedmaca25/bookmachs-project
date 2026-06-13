# Documento de Especificación de Requerimientos de Software (SRS)
## Proyecto: Bookmachs - Red Social Cultural y Ambiental

### 1. Introducción
**1.1. Propósito del Documento**
Este documento especifica los requerimientos de software y reglas de negocio para la plataforma "Bookmachs", una red social cultural y ambiental diseñada para descubrir, hacer "match", intercambiar y donar libros físicos. 

**1.2. Alcance**
El sistema se desarrollará en esta primera etapa de manera exclusiva como una **Aplicación Web** (Responsive Web App). Incluirá registro de usuarios, perfiles, sistema de descubrimiento tipo "swipe" (algoritmo basado en IA y gustos), gestión de intercambios logísticos (envío, presencial, donación) y una capa social. Adicionalmente, cuenta con un modelo de membresías (freemium/premium) y gestión de inventario mixto (stock de Bookmachs y stock de terceros).

---

### 2. Descripción General y Modelo de Negocio
**Propuesta de Valor:**
Permitir a los usuarios descubrir e intercambiar libros físicos de un catálogo de más de 100.000 libros mediante recomendaciones por IA, contribuyendo a la disminución de la huella de carbono a través de la reutilización y donación cultural.

**Modelo de Ingresos:**
1. **Membresías (Suscripciones):** Planes (Gratuito, Básico, Premium, Plan Lector, Educacional) que otorgan cupos de intercambio y desbloquean funciones adicionales (reservas, vistas tipo catálogo, ver recién llegados). *Todos los precios y límites de los planes son administrables desde el backend.*
2. **Fee por Intercambio:** Cobro dinámico calculado por IA (ej. $1.000 a $14.990 CLP, o desde $1 USD, representando ~30%-40% del valor base del libro) que se paga **siempre** al concretar un "match", independientemente del plan. *Los rangos y bases de cálculo son configurables desde el backend.*

---

### 3. Especificación por Pantalla y Reglas de Negocio

#### Modo Invitado (Landing Swipe)
* **Descripción:** Al ingresar a la web sin sesión iniciada, la pantalla de "Swipe" carga inicialmente mostrando un libro aleatorio para enganchar al usuario.
* **Reglas de Negocio:**
  * Al intentar realizar cualquier acción (swipe izquierda/derecha, "Me interesa", ver info), el sistema despliega un *modal* o recuadro de bloqueo (Hard Gate).
  * Este recuadro obliga al usuario a crear su cuenta gratuita y contestar el cuestionario de gustos para poder continuar navegando.

#### Pantalla 1: Bienvenido (Login / Registro)
* **Descripción:** Pantalla de inicio de sesión y registro formal.
* **Funcionalidades:** 
  * Registro/Login mediante Email o Google (SSO).
  * Creación de cuenta gratuita.
  * Captura de datos obligatorios: Nombre, Apellido, Celular, Correo, RUT y Dirección (editable o agregable).
* **Reglas de Negocio:**
  * Al registrarse, el usuario acepta la política de uso (ej. cede derechos a Bookmachs para publicar su perfil en el timeline público si decide hacerlo público).
  * Todos los correos de registro deben almacenarse en una base de datos propia.

#### Pantalla 2: Cuestionario de Gustos (Onboarding)
* **Descripción:** Recopilación de preferencias del usuario para alimentar el algoritmo de recomendación de IA.
* **Funcionalidades:**
  * Cuestionario dinámico: Las preguntas y opciones (Ej. Géneros, Intensidad, Formatos, Intención) se alimentan de un **catálogo maestro configurable desde el backend**.
* **Reglas de Negocio:**
  * Obligatorio tras el registro. La IA tendrá la capacidad de leer este catálogo dinámico e interpretar correctamente los gustos para mostrar el inventario adecuado.

#### Pantalla 3: Descubre (Swipe)
* **Descripción:** Interfaz lúdica para descubrir libros uno a uno mediante gestos (swipe derecha para "Me interesa", izquierda para descartar).
* **Funcionalidades:**
  * Visualización personificada del libro: *"Me llamo: [Título]. Mi idioma es: [Idioma]. Me dicen que soy de: [Categoría]. Mi bio es: [Descripción lúdica]"*.
  * Botones de acción rápida, retroceso (hasta 5 swipes hacia atrás) y atajos a Libreta/Perfil.
* **Reglas de Negocio:**
  * **Cuenta Gratuita:** Límite configurable de visualizaciones (Por defecto: 100 swipes **diarios**). Al superar el límite, los libros se ven borrosos invitando al Upgrade.
  * **Cuenta Premium:** Límite extendido o ilimitado (Por defecto: 1000 diarios o ilimitado, configurable). Opción de ver libros en formato catálogo web (de a 100).
  * **Algoritmo de Muestra:** Los libros mostrados se basan *estrictamente en los intereses del usuario*, sin importar si provienen de la base de datos central de Bookmachs o si fueron subidos por otros usuarios.
  * **Transparencia de Stock:** Los libros externos dirán *"Libro subido por [Nombre]. Stock externo - Sujeto a confirmación"*. Los propios dirán *"Stock Bookmachs - Confirmación al instante"*.

#### Pantalla 4: Tu Libreta (Tus Matches y Tus Libros)
* **Descripción:** Sección para gestionar "Me interesan" (likes) y los libros que el usuario sube ("Tengo para intercambiar").
* **Funcionalidades:**
  * Módulo para subir fotos de libros propios a ofrecer.
  * **Premium:** La IA lee la portada subida y autocompleta Nombre, Autor y Resumen al instante (usuarios gratis deben rellenar a mano).

#### Pantalla 5: Propuesta de Intercambio (Match IA)
* **Descripción:** Notificación de match confirmado entre el usuario y otro libro.
* **Funcionalidades:**
  * Resumen del match y desglose del Fee calculado por la IA.
  * Botones para "Aceptar intercambio" y continuar al pago/logística.
* **Reglas de Negocio:**
  * Todo intercambio exige el pago del Fee correspondiente al libro, sin excepciones por tipo de plan. El plan solo determina "cuántos" intercambios puedes hacer al mes.
  * Se debe retener el pago mediante tarjeta (Hold pre-autorizado) para evitar fraudes, hasta confirmar que la logística se completó.

#### Pantalla 6: Funciones Premium (Paywall)
* **Descripción:** Hub visual para mostrar las ventajas del Upgrade.
* **Funcionalidades Bloqueadas (Solo Premium):**
  * Ver más libros en formato catálogo web.
  * Reservas de stock.
  * Acceso anticipado a libros recién llegados.
  * Autocompletado con IA al subir portadas.
  * Mayor cupo de intercambios mensuales.

#### Pantalla 7: Reservas (Premium)
* **Descripción:** Función para "congelar" un libro de interés.
* **Reglas de Negocio:**
  * Bloquea el stock temporalmente (ej. 48 hrs) sin duplicarlo en la base de datos. Si no se concreta, se libera automáticamente.

#### Pantalla 8: Nuevos Libros (Premium)
* **Descripción:** Acceso exclusivo ("Early Access") a los libros recién llegados.

#### Pantalla 9: Planes y Membresías (Pricing)
* **Descripción:** Módulo de suscripción. **(Todos los valores, nombres y límites son 100% configurables en el panel de administrador)**.
* **Ejemplo Referencial de Configuración:**
  * **Plan Gratuito:** 100 swipes diarios. Cupo máximo para concretar 2 intercambios por mes (pagando el Fee de IA).
  * **Plan Premium:** Swipes ilimitados. Cupo máximo de 10 intercambios al mes. Funciones pro habilitadas.
  * **Plan Lector Infantil:** Cupo de 4 intercambios mensuales orientados a público de 8 a 12 años.

#### Pantalla 10: Importante antes de comprar
* **Descripción:** Transparencia de cobros antes del pago.
* **Textos Legales Base:**
  * "Los envíos son por cargo del usuario".
  * "Los intercambios tienen un valor (Fee) calculado por IA".
  * "La membresía permite ampliar los cupos mensuales y desbloquear funciones de la plataforma, el Fee por cada libro se paga aparte".

#### Pantalla 11: Intercambio / Donación (Logística)
* **Descripción:** Selección del método de entrega y recepción.
* **Opciones de Logística:**
  1. **Intercambio Presencial:** En tienda física.
  2. **Intercambio con Envío a Bookmachs:** El usuario envía su libro y paga transporte, y recibe el nuevo pagando el despacho correspondiente.
  3. **Dona y Recibe:** El usuario dona físicamente su libro (plaza/colegio), sube una foto de validación a la app, y luego Bookmachs le envía el libro escogido.
  4. **Intercambio P2P (Nacional e Internacional):** Usuarios se envían los libros mutuamente previo pago del fee a Bookmachs.
     * *Alerta Internacional:* Si hay match entre usuarios de diferentes países, el sistema debe arrojar una alerta (warning) clara indicando que el usuario debe asumir un alto costo de envío transfronterizo antes de aceptar.

#### Pantalla 12: Tu Impacto, Historial y Comparte (Capa Social)
* **Descripción:** Perfil público, tracking de impacto ambiental y feed de la red social.
* **Funcionalidades (Disponibles para todos los planes):**
  * **Historial de Intercambios:** Listado completo de todas las transacciones pasadas del usuario.
  * **Timeline General:** Feed de actividad con intercambios y fotos de donaciones de la comunidad.
  * **Métricas:** Huella de carbono evitada (CO2) y total de libros donados/intercambiados.
  * **Notas:** Opción de reseñar libros leídos (privado o público).

---

### 4. Requerimientos Transversales e Integraciones

**4.1. Integración de Pasarelas de Pago:**
* Integrar **Transbank (Webpay)** para operaciones locales en Chile.
* Integrar pasarela internacional o billetera virtual (Ej. **Mercado Pago**, Stripe) para cobros de suscripciones recurrentes en distintos países y retenciones temporales ("Hold") contra fraudes.

**4.2. Parámetros Configurables (Backend):**
El sistema debe proveer una consola de administración donde el cliente pueda configurar:
* Elementos del catálogo del cuestionario de gustos.
* Límites de swipes diarios (por plan).
* Cupo de intercambios mensuales (por plan).
* Precios de suscripciones.
* Rangos mínimos y máximos para el cálculo del Fee de la IA.

**4.3. Bookmachs Educacional (B2B):**
* Módulo derivado para instituciones (colegios, empresas) que permite crear comunidades privadas conectadas al catálogo general, con reportes estadísticos organizacionales.

### 5. Resumen del Flujo Ideal del Usuario
1. Ingresa a la Web App en "Modo Invitado" y ve un libro aleatorio en la interfaz Swipe.
2. Al intentar deslizar o hacer clic, se levanta obligatoriamente el Registro.
3. Completa el Cuestionario Dinámico de gustos.
4. Hace Swipe gratuito (limitado a la cuota diaria configurada, ej. 100 libros).
5. Hace "Match" con un libro y acepta la propuesta.
6. Paga el Fee calculado por la IA (se retiene el cargo como pre-autorización).
7. Selecciona método logístico (Aceptando los costos y advirtiendo si es internacional).
8. Comparte el éxito en el Timeline y verifica sus estadísticas de Huella de Carbono e Historial.
