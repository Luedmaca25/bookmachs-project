# Documento de Especificación de Requerimientos de Software (SRS)
## Proyecto: Bookmachs - Red Social Cultural y Ambiental

### 1. Introducción
**1.1. Propósito del Documento**
Este documento especifica los requerimientos de software y reglas de negocio para la plataforma "Bookmachs", una red social cultural y ambiental diseñada para descubrir, hacer "match", intercambiar y donar libros físicos. 

**1.2. Alcance**
El sistema incluirá aplicaciones móviles/web con registro de usuarios, perfiles, sistema de descubrimiento tipo "swipe" (algoritmo basado en IA y gustos), gestión de intercambios logísticos (envío, presencial, donación) y una capa social. Adicionalmente, cuenta con un modelo de membresías (freemium/premium) y gestión de inventario mixto (stock de Bookmachs y stock de terceros).

---

### 2. Descripción General y Modelo de Negocio
**Propuesta de Valor:**
Permitir a los usuarios descubrir e intercambiar libros físicos de un catálogo de más de 100.000 libros mediante recomendaciones por IA, contribuyendo a la disminución de la huella de carbono a través de la reutilización y donación cultural.

**Modelo de Ingresos:**
1. **Membresías (Suscripciones):** Planes (Gratuito, Básico, Premium, Plan Lector, Educacional) que desbloquean limitaciones (reservas, vistas ilimitadas tipo catálogo, ver recién llegados).
2. **Fee por Intercambio:** Cobro dinámico calculado por IA (entre $1.000 a $14.990 CLP, o desde $1 USD, representando ~30%-40% del valor base del libro) que se paga al concretar el "match".

---

### 3. Especificación por Pantalla y Reglas de Negocio

#### Pantalla 1: Bienvenido (Login / Registro)
* **Descripción:** Pantalla de aterrizaje e inicio de sesión ("Red social cultural y ambiental").
* **Funcionalidades:** 
  * Registro/Login mediante Email o Google (SSO).
  * Creación de cuenta gratuita.
  * Captura de datos obligatorios: Nombre, Apellido, Celular, Correo, RUT y Dirección (editable o agregable).
* **Reglas de Negocio:**
  * Al registrarse, el usuario acepta la política de uso (ej. cede derechos a Bookmachs para publicar su perfil si el usuario decide hacerlo público).
  * Todos los correos de registro deben almacenarse en una base de datos propia.

#### Pantalla 2: Cuestionario de Gustos (Onboarding)
* **Descripción:** Recopilación de preferencias del usuario para alimentar el algoritmo de recomendación de IA.
* **Funcionalidades:**
  * Preguntas (máximo 3-4): **Géneros** preferidos, **Intensidad** (Casual, Lector frecuente, Apasionado), **Formatos** (Corto, Largo, Físico, Audiolibro), **Intención** (Entretenerme, Aprender, Desconectarme).
* **Reglas de Negocio:**
  * Obligatorio tras el registro. La IA utiliza estos datos, cruzados con categorías de libros subidos por el usuario, para personalizar el catálogo del *swipe*.

#### Pantalla 3: Descubre (Swipe)
* **Descripción:** Interfaz lúdica para descubrir libros uno a uno mediante gestos (swipe derecha para "Me interesa", izquierda para descartar).
* **Funcionalidades:**
  * Visualización personificada del libro: *"Me llamo: [Título]. Mi idioma es: [Idioma]. Me dicen que soy de: [Categoría]. Mi bio es: [Descripción lúdica]"*.
  * Botones de acción rápida, retroceso (hasta 5 swipes hacia atrás) y atajos a Libreta/Perfil.
* **Reglas de Negocio:**
  * **Cuenta Gratuita:** Límite de 100 visualizaciones (swipes). Después de las 100, los siguientes libros se ven borrosos invitando al "Upgrade". Las 100 visualizaciones se restablecen cada 10 días.
  * **Cuenta Premium:** Swipes ilimitados. Opción de ver libros en formato catálogo web (de a 100).
  * **Algoritmo (IA):** Muestra aleatoriamente libros de Bookmachs y de otros usuarios según gustos, insertando opciones aleatorias para evitar encasillar al lector.
  * **Libros Externos:** Los libros subidos por usuarios deben incluir la etiqueta *"Libro subido por [Nombre]. Stock externo - Sujeto a confirmación del dueño"*. Los libros propios dirán *"Stock Bookmachs - Confirmación al instante"*.

#### Pantalla 4: Tu Libreta (Tus Matches y Tus Libros)
* **Descripción:** Sección para gestionar "Me interesan" (likes) y los libros que el usuario sube ("Tengo para intercambiar").
* **Funcionalidades:**
  * Módulo para subir fotos de libros propios a ofrecer.
  * **Premium:** La IA lee la portada subida y autocompleta Nombre, Autor y Resumen al instante (usuarios gratis ven el aviso de esta función Premium y deben rellenar a mano).
* **Reglas de Negocio:**
  * Los libros subidos por el usuario formarán parte del catálogo general de la plataforma, pudiendo ser intercambiados por otros miembros.
  * El sistema calcula y muestra un "Costo de intercambio" preliminar validado por IA.

#### Pantalla 5: Propuesta de Intercambio (Match IA)
* **Descripción:** Notificación de match confirmado entre el usuario y otro libro.
* **Funcionalidades:**
  * Resumen del match y costo estimado.
  * Botones para "Aceptar intercambio" y continuar al pago/logística.
* **Reglas de Negocio:**
  * Al proceder, el sistema debe retener el pago mediante tarjeta (Hold) para evitar fraudes, hasta que se complete satisfactoriamente el envío y recepción del libro.

#### Pantalla 6: Funciones Premium (Paywall)
* **Descripción:** Hub visual (siempre accesible) de las funciones de pago. 
* **Reglas de Negocio:**
  * Deben estar visibles en todas las cuentas. Si un usuario gratuito hace clic en "Ver más libros", "Reservas", "Nuevos libros diarios" o "Historial", se levanta el modal de *Upgrade*.

#### Pantalla 7: Reservas (Premium)
* **Descripción:** Función para "congelar" un libro de interés.
* **Reglas de Negocio:**
  * Bloquea el stock del libro hasta por 48 horas sin duplicarlo. Si no se realiza el intercambio, se libera.

#### Pantalla 8: Nuevos Libros (Premium)
* **Descripción:** Acceso exclusivo ("Early Access") a los libros recién llegados.
* **Reglas de Negocio:**
  * Opción de visualizar 100 recién llegados sin buscador, exclusivo para Premium. Cuentas gratuitas los verán borrosos.

#### Pantalla 9: Planes y Membresías (Pricing)
* **Descripción:** Selección del nivel de suscripción, cobrado mensual o quincenalmente.
* **Tipos de Planes (Precios administrables desde Backend):**
  * **Plan Gratuito:** 100 swipes cada 10 días, hasta 2 intercambios mensuales pagando fee.
  * **Plan Premium ($7.9 USD / 15 días o mensual):** Incluye 1 intercambio gratis, hasta 10 intercambios al mes (máximo 5 a la vez), lectura de portadas con IA, reservas de 48h, ver 100 libros en catálogo y retroceder swipes.
  * **Plan Lector Infantil ($3.9 USD / mes):** Dirigido a 8-12 años, incluye 4 intercambios para fomentar el hábito.

#### Pantalla 10: Importante antes de comprar
* **Descripción:** Condiciones legales y transparencia de los cobros.
* **Reglas de Negocio:**
  * Informar explícitamente: "Los envíos son por cargo del usuario". "Los intercambios tienen valor desde $1 USD". "La suscripción es para visualizar, reservar y tener acceso anticipado a los libros".

#### Pantalla 11: Intercambio / Donación (Logística)
* **Descripción:** Selección del método de entrega y recepción.
* **Reglas de Negocio (4 Métodos Posibles):**
  1. **Intercambio Presencial:** En tienda física (Ej. Patronato 447, Recoleta).
  2. **Intercambio con Envío (Bookmachs):** El usuario paga y envía su libro a Bookmachs, y paga el envío para recibir el libro escogido en su domicilio.
  3. **Dona y Recibe:** El usuario dona físicamente su libro ofrecido a una plaza, colegio o comunidad, *sube una foto validatoria a la plataforma*, y a cambio recibe su libro deseado en su domicilio (Premium tiene hasta 2 envíos mensuales permitidos bajo este método).
  4. **Intercambio entre Usuarios (P2P):** Los usuarios acuerdan internamente el envío, Bookmachs actúa de garante cobrando el fee del intercambio previo al proceso.

#### Pantalla 12: Tu Impacto y Comparte (Capa Social)
* **Descripción:** Perfil público, tracking de impacto ambiental y feed de la red social.
* **Funcionalidades:**
  * **Timeline General:** Muestra actividad (intercambios y donaciones con fotos) de los usuarios que hayan hecho su perfil público.
  * **Social:** Sistema para seguir a otros lectores ("Followers").
  * **Métricas:** Huella de carbono evitada, libros donados e intercambiados.
  * **Notas:** Función para dejar notas y resúmenes del libro leído (privado o público para la comunidad).

---

### 4. Requerimientos Transversales e Integraciones

**4.1. Integración de Pasarelas de Pago:**
* Integrar **Transbank (Webpay)** para operaciones locales.
* Integrar una pasarela internacional o billetera virtual (Ej. **Mercado Pago**, Stripe) para manejar cobros recurrentes de suscripciones internacionales y retenciones temporales en tarjetas ("Hold") como política antifraude y de garantía durante intercambios logísticos P2P.

**4.2. Bookmachs Educacional (B2B):**
* Plataforma derivada para colegios, empresas o municipios. Permite crear redes y comunidades privadas/mixtas. Sus miembros pueden intercambiar entre ellos o conectarse al catálogo general de Bookmachs, con reportes estadísticos institucionales de impacto cultural y ambiental.

**4.3. Atención al Cliente y Postventa:**
* Habilitar un canal nativo (chat o tickets) para resolver incidencias de envíos, libros no recibidos y disputas entre usuarios.

**4.4. Modelo de Datos y Límites de Búsqueda:**
* **Sin Buscador Abierto:** El sistema fomenta el "descubrimiento" (Swipe). No hay un buscador de texto libre por títulos, para evitar que la plataforma funcione como un ecommerce tradicional.
* **Techo de Precios:** Opción sistémica para excluir temporalmente libros que superen un tope de valor comercial (ej. $25.000 CLP), con opción a desbloquearse como un beneficio Premium futuro.

### 5. Resumen del Flujo Ideal del Usuario
1. Registro gratuito.
2. Responde cuestionario (3 a 4 preguntas).
3. Empieza el Swipe gratuito (hasta 100 libros, personificados).
4. El sistema acumula intereses y hace "Match" con libros subidos a la Libreta.
5. Paga el fee del intercambio usando la pasarela (se retiene monto hasta conformar envío).
6. Elige método logístico (enviar, ir a sucursal, o donar subiendo foto de evidencia).
7. Finaliza el proceso, recibe estadísticas de huella de carbono y comparte en el Timeline público.
8. Es invitado al *Upsell* (Suscripción) al toparse con límites o intentar ver listas amplias, hacer reservas o ver libros recién llegados.
