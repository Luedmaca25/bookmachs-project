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

### US-04: Motor de Swipe Gratuito/Premium
**Como** usuario  
**Quiero** deslizar tarjetas de libros hacia la derecha o izquierda  
**Para** seleccionar mis intereses diarios dentro de mis límites establecidos.

#### Escenario 1: Swipe dentro del límite diario gratuito
* **Dado** que soy un usuario gratuito con visualizaciones disponibles hoy
* **Cuando** deslizo la tarjeta de un libro hacia la derecha
* **Entonces** el libro se agrega a mi lista de "Me interesan"
* **Y** mi contador de visualizaciones diarias disminuye en 1

#### Escenario 2: Límite de swipe alcanzado
* **Dado** que soy un usuario gratuito
* **Y** he consumido todas mis visualizaciones diarias
* **Cuando** intento ver el siguiente libro
* **Entonces** la tarjeta del libro debe mostrarse borrosa
* **Y** el sistema debe mostrarme un aviso para hacer Upgrade a Premium

---

### US-05: Match y Propuesta IA
**Como** usuario  
**Quiero** recibir una alerta de "Match" cuando mis gustos coincidan con los libros disponibles  
**Para** proceder a iniciar un intercambio.

#### Escenario 1: Generación exitosa de Match
* **Dado** que he deslizado un libro a "Me interesa"
* **Y** existe coincidencia cruzada con mi inventario ofrecido
* **Cuando** el sistema valida la disponibilidad de ambas partes
* **Entonces** debe aparecer un modal de celebración de Match
* **Y** el modal debe mostrar el costo del Fee de intercambio calculado por la IA

---

## EP-03: Gestión de Inventario (Tu Libreta)

### US-06: Subida de libros manual
**Como** usuario gratuito  
**Quiero** subir las portadas e información de mis libros manuales  
**Para** ofrecerlos a la red.

#### Escenario 1: Creación manual de stock externo
* **Dado** que estoy en Tu Libreta
* **Cuando** subo una foto válida de la portada de mi libro
* **Y** completo manualmente los campos obligatorios
* **Y** hago clic en Guardar libro
* **Entonces** el sistema debe guardar la información
* **Y** el libro debe etiquetarse como Stock externo en la base de datos

---

### US-07: Subida de libros Autocompletada por IA (Premium)
**Como** usuario Premium  
**Quiero** que la plataforma lea la portada de mi libro  
**Para** autocompletar la información instantáneamente.

#### Escenario 1: Autocompletado exitoso vía OCR/IA
* **Dado** que soy un usuario Premium en Tu Libreta
* **Cuando** selecciono la opción Escanear Portada IA
* **Y** subo una foto legible de la portada
* **Entonces** el sistema debe procesar la imagen
* **Y** los campos de Título, Autor y Sinopsis deben llenarse automáticamente

---

## EP-04: Suscripciones y Paywall

### US-08: Gestión de Planes
**Como** usuario  
**Quiero** visualizar los diferentes planes de membresía  
**Para** hacer un Upgrade y mejorar mis beneficios.

#### Escenario 1: Upgrade exitoso a Premium
* **Dado** que estoy en la pantalla de Planes y Membresías
* **Cuando** selecciono el Plan Premium
* **Y** completo el pago exitosamente
* **Entonces** mi cuenta debe actualizarse inmediatamente con el flag Premium
* **Y** se deben desbloquear todas mis funciones avanzadas

---

### US-09: Catálogo de libros y Recién Llegados (Premium)
**Como** usuario Premium  
**Quiero** ver listas avanzadas de libros y recién llegados  
**Para** explorar más allá de la mecánica de Swipe.

#### Escenario 1: Acceso al catálogo avanzado
* **Dado** que soy un usuario Premium autenticado
* **Cuando** navego a la sección Catálogo web
* **Entonces** debo ver una grilla con múltiples libros al mismo tiempo
* **Y** debo poder filtrar los resultados por categorías

#### Escenario 2: Acceso denegado a catálogo avanzado
* **Dado** que soy un usuario gratuito autenticado
* **Cuando** intento acceder al catálogo web
* **Entonces** el sistema debe mostrar un modal de Upsell invitándome a ser Premium

---

### US-10: Reserva de Libros
**Como** usuario Premium  
**Quiero** reservar un libro por 48 horas  
**Para** asegurar su disponibilidad antes de procesar el pago.

#### Escenario 1: Reserva exitosa de un libro
* **Dado** que soy un usuario Premium
* **Y** el libro tiene stock disponible
* **Cuando** hago clic en el botón Reservar
* **Entonces** el stock de ese libro debe bloquearse temporalmente
* **Y** debe iniciar un temporizador de 48 horas

#### Escenario 2: Liberación automática tras expiración
* **Dado** que he reservado un libro
* **Y** han transcurrido 48 horas sin concretar el intercambio
* **Cuando** el proceso en background revisa el estado
* **Entonces** la reserva debe cancelarse automáticamente
* **Y** el stock del libro debe volver a estar disponible

---

## EP-05: Logística y Transacciones (Checkout)

### US-11: Pago del Fee de Intercambio (Hold)
**Como** usuario  
**Quiero** pagar el Fee del intercambio calculado por IA  
**Para** concretar la operación con seguridad.

#### Escenario 1: Retención exitosa en el checkout
* **Dado** que he aceptado una propuesta de Match
* **Y** estoy en la pantalla de Checkout
* **Cuando** ingreso los datos de mi tarjeta y confirmo el pago del Fee
* **Entonces** la pasarela debe generar una pre-autorización (Hold) en mi tarjeta
* **Y** el estado del intercambio debe actualizarse a Pago Retenido

---

### US-12: Selección de Métodos Logísticos
**Como** usuario  
**Quiero** seleccionar cómo enviaré y recibiré mi libro  
**Para** avanzar en la logística.

#### Escenario 1: Selección de intercambio P2P Internacional
* **Dado** que tengo un Match con un usuario en un país diferente al mío
* **Cuando** ingreso a la selección de métodos logísticos
* **Y** el sistema detecta que el intercambio es transfronterizo
* **Entonces** se debe mostrar una alerta explícita informando sobre los altos costos de envío internacional
* **Y** debo confirmar que asumo los costos antes de avanzar

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
