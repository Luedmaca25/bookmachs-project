# Backlog Maestro Ágil
## Proyecto: Bookmachs - Aplicación Web

---

### EP-01: Autenticación y Onboarding
**Objetivo:** Permitir el acceso al sistema desde la visualización de invitado, hasta el registro y la definición de perfil mediante el cuestionario de gustos.

**US-01: Como** usuario invitado **Quiero** ver un libro aleatorio en la interfaz de Swipe y al interactuar visualizar un recuadro de bloqueo (Hard Gate) **Para** obligarme a registrar mi cuenta gratuita antes de continuar.
* **TS-01 (Frontend):** Desarrollar UI del Landing de Swipe para modo invitado y el Modal de bloqueo que redirige al registro.
* **TS-02 (Backend):** Crear endpoint público `GET /api/books/guest-random` que retorne información básica de un libro al azar sin requerir token.
* **TS-03 (QA):** Validar que cualquier interacción (click, drag) levante el bloqueo y que los libros cargados sean consistentes visualmente.

**US-02: Como** nuevo usuario **Quiero** registrarme mediante Email o Google **Para** tener una cuenta propia en la plataforma.
* **TS-04 (Frontend):** Desarrollar pantallas de login/registro (SSO Google y correo tradicional) y formularios de captura de datos (Nombre, RUT, Dirección).
* **TS-05 (Backend):** Integrar SDK de Auth (Google) y crear base de datos de usuarios (`users` y `user_addresses`).
* **TS-06 (QA):** Probar flujos de registro exitoso, control de errores (RUT inválido o email duplicado) e inyección SQL.

**US-03: Como** usuario registrado **Quiero** contestar un cuestionario dinámico de gustos **Para** que la IA personalice mis recomendaciones.
* **TS-07 (Frontend):** Crear flujo por pasos (Wizard) iterativo que renderice dinámicamente las preguntas basadas en el catálogo del backend.
* **TS-08 (Backend):** Desarrollar endpoint `GET /api/catalogs/questions` y guardar preferencias en perfil del usuario.
* **TS-09 (QA):** Verificar que un usuario no pueda saltar este paso y que sus preferencias se guarden intactas.

---

### EP-02: Descubrimiento y Matching (Swipe)
**Objetivo:** Motor principal de interacción para el descubrimiento lúdico de libros e invitación al intercambio guiada por algoritmos de IA.

**US-04: Como** usuario **Quiero** deslizar tarjetas de libros hacia la derecha o izquierda **Para** seleccionar mis intereses diarios dentro de mis límites establecidos.
* **TS-10 (Frontend):** Implementar la mecánica de Swipe (drag and drop horizontal), botones rápidos y retroceso (undo swipe).
* **TS-11 (Backend):** Desarrollar algoritmo de recomendación que filtre stock basado en gustos del usuario e implementar validador de límites diarios en caché (Ej: Redis).
* **TS-12 (QA):** Pruebas de estrés y validación del corte automático cuando el usuario gratuito llega al límite diario (Renderizado de Blur / Upsell).

**US-05: Como** usuario **Quiero** recibir una alerta de "Match" cuando mis gustos coincidan con los libros disponibles **Para** proceder a iniciar un intercambio.
* **TS-13 (Frontend):** Pantalla o Pop-up de celebración de Match mostrando desglose de Fee.
* **TS-14 (Backend):** API que calcule dinámicamente el valor del "Fee" basado en el parámetro IA y costo del libro.
* **TS-15 (QA):** Asegurar que la matemática del cobro corresponda a las variables maestras de precios base.

---

### EP-03: Gestión de Inventario (Tu Libreta)
**Objetivo:** Permitir a los usuarios cargar libros para intercambiar y manejar el origen mixto del stock.

**US-06: Como** usuario gratuito **Quiero** subir las portadas e información de mis libros manuales **Para** ofrecerlos a la red.
* **TS-16 (Frontend):** Formulario de carga de imágenes e ingreso manual de Título, Autor, Resumen y Estado físico.
* **TS-17 (Backend):** API de subida de imágenes a S3/Cloud Storage y creación de registro en BD con flag `external_stock = true`.
* **TS-18 (QA):** Pruebas de formatos de imagen, tamaños máximos y obligatoriedad de campos.

**US-07: Como** usuario Premium **Quiero** que la plataforma lea la portada de mi libro **Para** autocompletar la información instantáneamente.
* **TS-19 (Frontend):** Modificar UI de Tu Libreta para habilitar el botón de "Escanear Portada IA" y mostrar spinners de carga.
* **TS-20 (Backend):** Integrar servicio de OCR/Visión IA para procesar la imagen y devolver Título, Autor y Sinopsis generada.
* **TS-21 (QA):** Medir la precisión de textos devueltos bajo distintas calidades de foto.

---

### EP-04: Suscripciones y Paywall
**Objetivo:** Convertir usuarios a planes de pago habilitándoles funciones pro y aumento de cuotas de intercambio.

**US-08: Como** usuario **Quiero** visualizar los diferentes planes de membresía **Para** hacer un Upgrade y mejorar mis beneficios.
* **TS-22 (Frontend):** Pantalla comparativa de precios (Pricing) y pop-ups de Upsell generados al clickear elementos bloqueados.
* **TS-23 (Backend):** Integrar pasarela de pago internacional/billetera (Mercado Pago/Stripe) para tokenización y cobro recurrente.
* **TS-24 (QA):** Pruebas de cobros recurrentes de prueba y actualización de flag `is_premium` en el usuario.

**US-09: Como** usuario Premium **Quiero** ver listas avanzadas de libros y recién llegados **Para** explorar más allá de la mecánica de Swipe.
* **TS-25 (Frontend):** Vista en grilla web o lista con filtros y etiquetas de "Recién Llegado".
* **TS-26 (Backend):** Endpoints paginados de catálogo general ordenados por fecha y restringidos por middleware de autorización Premium.
* **TS-27 (QA):** Validación de seguridad (un usuario gratuito interceptando el request no debe poder descargar la lista).

**US-10: Como** usuario Premium **Quiero** reservar un libro por 48 horas **Para** asegurar su disponibilidad antes de procesar el pago.
* **TS-28 (Frontend):** Añadir botón y badge de "Reserva" con temporizador regresivo.
* **TS-29 (Backend):** Lógica de Bloqueo de registro (Lock) y Tarea de sistema (CRON Job) para liberar stock automáticamente a las 48 horas.
* **TS-30 (QA):** Pruebas de concurrencia: dos usuarios intentando reservar el mismo libro en el mismo milisegundo.

---

### EP-05: Logística y Transacciones (Checkout)
**Objetivo:** Flujo de pago y selección de métodos de envío con retención antifraude.

**US-11: Como** usuario **Quiero** pagar el Fee del intercambio calculado por IA **Para** concretar la operación con seguridad.
* **TS-31 (Frontend):** Pantalla de Checkout mostrando montos transparentes ("Tu pago del Fee", "Cargos de envío no incluidos").
* **TS-32 (Backend):** Integración de Transbank/Webpay para generar transacción de Pre-autorización (Hold).
* **TS-33 (QA):** Simulaciones de pago aprobado, rechazado y Hold capturado/reversado.

**US-12: Como** usuario **Quiero** seleccionar cómo enviaré y recibiré mi libro **Para** avanzar en la logística.
* **TS-34 (Frontend):** Componentes para 4 flujos (Presencial, Envío a Bookmachs, Donar c/foto, P2P), con alerta visual fuerte para "P2P Internacional".
* **TS-35 (Backend):** Tablas de orden de intercambio, actualización de tracking y motor de subida de fotos de evidencia (para Donación o Recibo de envío).
* **TS-36 (QA):** Verificar que la alerta internacional dispare solo cuando `country_A != country_B`.

---

### EP-06: Social e Impacto
**Objetivo:** Fomentar el componente de red social comunitaria y gamificar el impacto ecológico.

**US-13: Como** usuario **Quiero** visualizar métricas ambientales en mi perfil **Para** ver cuánta huella de carbono he evitado y cuántos libros he donado.
* **TS-37 (Frontend):** UI Dashboard en Perfil con gráficos, contadores e insignias de impacto.
* **TS-38 (Backend):** API que multiplique el peso estándar promedio de un libro por la constante de emisiones CO2 para entregar "Métricas Ambientales".
* **TS-39 (QA):** Asegurar consistencia de la sumatoria a medida que se completan intercambios.

**US-14: Como** usuario **Quiero** ver un Timeline interactivo **Para** conocer qué está leyendo e intercambiando la comunidad.
* **TS-40 (Frontend):** Pantalla de Feed vertical y sistema para dejar Notas/Reseñas de libros.
* **TS-41 (Backend):** Crear tabla `posts`/`timeline_events` y generar triggers cuando alguien completa un intercambio exitoso marcado como público.
* **TS-42 (QA):** Verificar paginación del Feed y privacidad (que usuarios privados no salgan publicados).

---

### EP-07: Backoffice y Parametrización
**Objetivo:** Control administrativo para modificar reglas comerciales y planes sin afectar el código.

**US-15: Como** Administrador **Quiero** tener un Panel Web (CMS) **Para** modificar precios, cuotas y catálogo de gustos en tiempo real.
* **TS-43 (Frontend):** Interfaz Backoffice privada con Formularios de edición para "Configuraciones Globales".
* **TS-44 (Backend):** Endpoints CRUD protegidos para actualizar tabla `global_settings` (Límites diarios, Rango de Fee, Costo Planes).
* **TS-45 (QA):** Modificar variables en QA y verificar su impacto en milisegundos en la Web App del usuario.
