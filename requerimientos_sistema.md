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
  * Obligatorio tras el registro. La IA tendrá la capacidad de leer este catálogo dinámico e interpretar correctamente #### Pantalla 3: Descubre (Swipe)
* **Descripción:** Interfaz lúdica para que los usuarios puedan dar "like" (corazón / swipe derecha) o "dislike" (X / swipe izquierda) a los libros recomendados según sus gustos del cuestionario.
* **Funcionalidades:**
  * Visualización personificada del libro: *"Me llamo: [Título]. Mi idioma es: [Idioma]. Me dicen que soy de: [Categoría]"*.
  * Botones de acción rápida (X: No me interesa, i: Más info, Heart: Me interesa) y atajos a Libreta/Perfil.
  * Leyenda informativa: *"Intercambiálos en tu libreta - Tus likes se guardan automáticamente"*.
* **Reglas de Negocio:**
  * **Exclusividad de Descubrimiento:** Esta pantalla es únicamente para dar like o dislike. Dar "like" guarda automáticamente el libro en la pestaña "Me interesan" de Tu Libreta.
  * **Cuenta Gratuita:** Límite configurable de visualizaciones (Por defecto: 100 swipes **diarios**). Al superar el límite, los libros se muestran borrosos invitando al Upgrade.
  * **Cuenta Premium:** Swipes ilimitados o cuota ampliada.
  * **Algoritmo de Muestra:** Los libros mostrados se basan *estrictamente en las preferencias del usuario*.

#### Pantalla 4: Tu Libreta (Tus Matches y Tus Libros)
* **Descripción:** Centro de gestión dividido en dos pestañas principales: **"Me interesan"** y **"Tengo para intercambiar"**.
* **Funcionalidades:**
  * **Pestaña "Me interesan":** Muestra la lista de libros a los que el usuario les dio "like" en la Pantalla 3. Para cada libro, la plataforma muestra el estado de compatibilidad (ej. *"Match con 2 tuyos"*) y el **Costo de Intercambio (Fee)** calculado según las reglas predefinidas de la plataforma. Incluye el botón *"Ver propuestas de intercambio"*.
  * **Pestaña "Tengo para intercambiar":** Muestra los libros que el usuario ha cargado en la plataforma para ofrecer a cambio, con la opción de agregar nuevos libros.
* **Reglas de Negocio:**
  * **Sin Precio por el Usuario:** El usuario **NUNCA** le asigna un precio monetario a su libro. Solamente registra Título, Autor, Estado Físico, Resumen y Foto de Portada.
  * **Cálculo Transparente:** La plataforma/IA calcula automáticamente la tarifa o costo de intercambio basada en las reglas predefinidas del negocio (demanda, características, distancia).

#### Pantalla 5: Propuesta de Intercambio y Checkout (Resumen Match IA)
* **Descripción:** Resumen detallado con toda la información cuando el usuario decide consultar o hacer "match" de un libro desde su libreta y proceder al pago de la tarifa (Fee).
* **Funcionalidades:**
  * Encabezado: *"¡Matchs! Bookmachs quiere intercambiar contigo"*.
  * Explicación del Match: La IA valida la compatibilidad entre el libro de interés del usuario y los libros que él tiene disponibles para ofrecer.
  * **Confirmación del Libro a Entregar:** En la pantalla de checkout (`/transacciones`), el sistema exige al usuario **seleccionar expresamente cuál de sus libros cargados en "Tengo para intercambiar" entregará a cambio** del libro solicitado.
  * **Selección del Método de Entrega (Pantalla 11):** Permite configurar el método de cumplimiento logístico para la entrega de su libro (Donación con foto de evidencia para validación previa, Entrega presencial en Santiago Chile, o Envío a Santiago Chile con comprobante).
  * Desglose del Costo Estimado de Intercambio (Fee) y detalle del cálculo.
  * Botones de acción: **[Pagar Fee con Webpay Plus]** y **[Volver a mis matches / Seguir descubriendo]**.
* **Reglas de Negocio:**
  * **Prohibición de Compra Directa:** **LOS LIBROS NO SE PUEDEN COMPRAR CON DINERO.** Bookmachs es un sistema exclusivo de intercambio donde el usuario SIEMPRE debe ofrecer un libro de su libreta a cambio (más el pago del Fee de servicio). Si el usuario no tiene libros cargados en su libreta, el botón de pago permanece bloqueado y se solicita la carga de al menos un ejemplar.

#### Pantalla 6: Funciones Premium (Paywall)
* **Descripción:** Hub visual para mostrar las ventajas del Upgrade.
* **Funcionalidades Bloqueadas (Solo Premium):**
  * Ver más libros en formato catálogo web.
  * Reservas de stock.
  * Acceso anticipado a libros recién llegados.
  * Autocompletado con IA al subir portadas.
  * Mayor cupo de intercambios mensuales.

#### Pantalla 7: Reservas (Premium)
* **Descripción:** Función para "congelar" un libro de interés por 48 horas.

#### Pantalla 8: Nuevos Libros (Premium)
* **Descripción:** Acceso exclusivo a títulos recién incorporados.

#### Pantalla 9: Planes y Membresías (Pricing)
* **Descripción:** Módulo de suscripción con límites configurables desde el backend.

#### Pantalla 10: Importante antes de intercambiar
* **Descripción:** Transparencia sobre reglas de intercambio y despacho antes de confirmar.
* **Textos Legales Base:**
  * "Los envíos son por cargo del usuario".
  * "Los intercambios tienen un valor (Fee) calculado por IA".
  * "Bookmachs es una plataforma de intercambio físico de libros; no se permite la compraventa directa con dinero".

#### Pantalla 11: Intercambio / Donación (Logística de Cumplimiento)
* **Descripción:** Selección del método para entregar el libro que el usuario ofrece a cambio.
* **Opciones Únicas de Cumplimiento Logístico:**
  1. **Opción 1: Donar el libro ofrecido:** El usuario dona su libro a una institución o espacio comunitario (ej. colegio o centro vecinal). El usuario debe **cargar una foto de evidencia** del lugar donde lo donó. Dicha foto pasará por un **proceso de validación previa** por parte del equipo de Bookmachs antes de dar por completado el intercambio.
  2. **Opción 2: Entrega presencial en local físico:** El usuario lleva el libro a intercambiar directamente a la ubicación física del local de Bookmachs en **Santiago, Chile**.
  3. **Opción 3: Envío por encomienda a la ubicación física:** El usuario envía el libro a la dirección física del local en **Santiago, Chile**, siempre y cuando el usuario **pague el envío y suba su comprobante de envío (voucher/boleta)** al sistema.alerta (warning) clara indicando que el usuario debe asumir un alto costo de envío transfronterizo antes de aceptar.

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
