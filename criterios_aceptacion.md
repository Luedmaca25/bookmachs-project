# Criterios de Aceptación - Proyecto Bookmachs

## EP-01: Autenticación y Onboarding

### US-01: Landing Swipe Modo Invitado
**Como** usuario invitado  
**Quiero** ver un libro aleatorio en la interfaz de Swipe y al interactuar visualizar un recuadro de bloqueo (Hard Gate)  
**Para** obligarme a registrar mi cuenta gratuita antes de continuar.

#### Escenario 1: Visualización inicial del invitado
* **Dado** que soy un usuario no autenticado en la plataforma
* **Cuando** accedo a la página principal de Swipe
* **Entonces** debo ver la tarjeta de un libro seleccionado aleatoriamente
* **Y** no debo ver los botones de acceso premium

#### Escenario 2: Interacción bloqueada por Hard Gate
* **Dado** que soy un usuario no autenticado en la página de Swipe
* **Cuando** intento deslizar la tarjeta del libro o hacer clic en "Me interesa"
* **Entonces** se debe mostrar un recuadro modal obligatorio
* **Y** el recuadro debe exigirme crear una cuenta o iniciar sesión para continuar

---

### US-02: Registro e Inicio de Sesión
**Como** nuevo usuario  
**Quiero** registrarme mediante Email o Google  
**Para** tener una cuenta propia en la plataforma.

#### Escenario 1: Registro exitoso con email
* **Dado** que estoy en el formulario de registro
* **Cuando** completo los datos obligatorios correctamente
* **Y** acepto las políticas de uso
* **Y** hago clic en "Registrarme"
* **Entonces** mi cuenta debe ser creada
* **Y** debo ser redirigido al cuestionario de gustos

#### Escenario 2: Registro con Google SSO
* **Dado** que estoy en la pantalla de bienvenida
* **Cuando** selecciono la opción "Continuar con Google"
* **Y** autorizo el acceso
* **Entonces** el sistema debe crear mi cuenta extrayendo mi correo y nombre
* **Y** debo ser redirigido a completar mis datos faltantes o al cuestionario

---

### US-03: Cuestionario de Gustos Dinámico
**Como** usuario registrado  
**Quiero** contestar un cuestionario dinámico de gustos  
**Para** que la IA personalice mis recomendaciones.

#### Escenario 1: Carga dinámica del cuestionario
* **Dado** que acabo de registrar mi cuenta
* **Cuando** soy redirigido al cuestionario de gustos
* **Entonces** las preguntas y opciones mostradas deben cargarse desde el catálogo maestro del backend

#### Escenario 2: Finalización obligatoria del cuestionario
* **Dado** que estoy respondiendo el cuestionario de gustos
* **Cuando** intento saltar el paso sin seleccionar al menos una preferencia
* **Entonces** el sistema debe mostrar un mensaje de error
* **Y** el botón de continuar debe permanecer deshabilitado

---

## EP-02: Descubrimiento y Matching (Swipe)

### US-04: Motor de Swipe Gratuito/Premium (Pantalla 3)
**Como** usuario  
**Quiero** dar "like" o "dislike" a las tarjetas de libros  
**Para** guardar de forma transparente mis intereses en mi libreta sin interrupciones de compra.

#### Escenario 1: Guardado automático de Like en Tu Libreta
* **Dado** que soy un usuario autenticado en la Pantalla 3
* **Cuando** presiono el botón "Me interesa" (corazón) o deslizo la tarjeta hacia la derecha
* **Entonces** el libro debe agregarse automáticamente a mi lista "Me interesan" en Tu Libreta
* **Y** debo poder continuar navegando de forma lúdica sin aperturas forzadas de modals de compra

---

### US-05: Propuesta de Intercambio IA (Pantalla 5)
**Como** usuario  
**Quiero** consultar la propuesta de intercambio de un libro desde mi libreta  
**Para** revisar el costo de intercambio calculado por la IA y la compatibilidad con los libros que tengo para ofrecer.

#### Escenario 1: Resumen de Match e Imposibilidad de Compra Directa
* **Dado** que selecciono un libro de mi lista "Me interesan" en Tu Libreta
* **Cuando** presiono "Ver propuestas de intercambio"
* **Entonces** se despliega el resumen de Match IA mostrando la compatibilidad con los libros que tengo cargados
* **Y** se muestra el costo estimado de intercambio (Fee) calculado por las reglas del negocio
* **Y** no se permite la compra monetaria directa del libro, exigiendo dar un libro a cambio

---

## EP-03: Gestión de Inventario (Tu Libreta - Pantalla 4)

### US-06: Carga de Libros para Intercambiar (Sin precio asignado por usuario)
**Como** usuario  
**Quiero** subir los libros que tengo disponibles para ofrecer  
**Para** que la plataforma los considere en los cruces de intercambio.

#### Escenario 1: Carga de libro propio sin precio monetario
* **Dado** que estoy en Tu Libreta en la pestaña "Tengo para intercambiar"
* **Cuando** agrego un nuevo libro completando Título, Autor, Estado Físico, Sinopsis y Portada
* **Entonces** el sistema debe registrar el libro sin solicitar ningún valor monetario al usuario
* **Y** el precio/costo de intercambio de ese libro será determinado de forma exclusiva por las reglas de Bookmachs

---

## EP-05: Logística y Cumplimiento de Intercambio (Pantalla 11)

### US-12: Métodos Logísticos para Entrega del Libro Ofrecido
**Como** usuario  
**Quiero** seleccionar uno de los 3 métodos autorizados para entregar el libro que ofrecí a cambio  
**Para** cumplir con mi parte del intercambio.

#### Escenario 1: Entrega por Donación con Validación Previa
* **Dado** que selecciono el método "Donar el libro"
* **Cuando** subo la fotografía de evidencia del lugar donde doné el libro (colegio o espacio comunitario)
* **Entonces** la orden entra en estado "Pendiente de Validación Previa"
* **Y** el equipo de Bookmachs debe validar la foto antes de dar por completado el proceso

#### Escenario 2: Entrega Presencial en Local Físico
* **Dado** que selecciono "Entrega Presencial"
* **Cuando** confirmo mi selección
* **Entonces** el sistema indica las instrucciones y dirección del local físico en Santiago, Chile

#### Escenario 3: Envío por Encomienda con Comprobante
* **Dado** que selecciono "Envío por Encomienda"
* **Cuando** realizo el despacho a la dirección del local en Santiago, Chile y asumo el costo de envío
* **Y** subo el comprobante de envío (voucher/boleta) al sistema
* **Entonces** la plataforma actualiza el estado del envío para su verificación

---

## EP-06: Social e Impacto

### US-13: Métricas ambientales (Huella de carbono)
**Como** usuario  
**Quiero** visualizar métricas ambientales en mi perfil  
**Para** ver cuánta huella de carbono he evitado y cuántos libros he donado.

#### Escenario 1: Cálculo y visualización de Huella de Carbono
* **Dado** que he completado exitosamente múltiples intercambios
* **Cuando** accedo al dashboard de mi Perfil
* **Entonces** debo ver un indicador de Huella de Carbono evitada
* **Y** el valor mostrado debe corresponder al cálculo de libros por constante de emisiones CO2

---

### US-14: Timeline General
**Como** usuario  
**Quiero** ver un Timeline interactivo  
**Para** conocer qué está leyendo e intercambiando la comunidad.

#### Escenario 1: Visualización de evento público
* **Dado** que un usuario completó un intercambio
* **Y** tiene configurado su perfil como público
* **Cuando** entro a la sección de Timeline General
* **Entonces** debo ver una publicación indicando su intercambio
* **Y** debo poder ver reseñas asociadas si el usuario las dejó

---

## EP-07: Backoffice y Parametrización

### US-15: Panel Administrativo de Variables
**Como** Administrador  
**Quiero** tener un Panel Web (CMS)  
**Para** modificar precios, cuotas y catálogo de gustos en tiempo real.

#### Escenario 1: Actualización de configuración global
* **Dado** que soy un Administrador autenticado en el Backoffice
* **Cuando** actualizo el valor de un límite diario
* **Y** guardo los cambios
* **Entonces** la base de datos de configuraciones globales debe actualizarse
* **Y** los usuarios deben ver el nuevo límite reflejado inmediatamente en la Web App
