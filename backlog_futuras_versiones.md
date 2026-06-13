# Backlog y Requerimientos para Futuras Versiones
## Proyecto: Bookmachs

Este documento recopila las funcionalidades, reglas de negocio y características que han sido conversadas con el cliente pero descartadas para el MVP (Producto Mínimo Viable). Estos requerimientos deben mantenerse documentados para su análisis e inclusión en futuras iteraciones del sistema.

---

### 1. Función "Cita a Ciegas"
* **Descripción General:** Una modalidad de intercambio especial, sugerida en las notas iniciales como una potencial funcionalidad premium.
* **Definición Pendiente / Para Análisis Futuro:** Se debe diseñar la mecánica exacta en la interfaz de usuario. Posibles rutas:
  * Ocultar la portada y título del libro en la pantalla de Swipe, dejando que el usuario decida hacer el "match" guiándose únicamente por una descripción atractiva generada por la IA.
  * Ocultar al autor y el título pero revelar tags o categorías.
  * Definir si tiene un Fee de IA distinto o reglas de envío especiales.

### 2. Microtransacciones por Extralimitación de Cupos de Intercambio
* **Descripción General:** Manejo de usuarios que agotan su límite o "cupo" de intercambios permitidos por su plan suscrito (Ej. un usuario gratuito que ya consumió sus 2 intercambios mensuales).
* **Definición Pendiente / Para Análisis Futuro:** 
  * Se requiere definir con el cliente si el sistema ofrecerá la posibilidad de pagar una tarifa extra (*Pay-as-you-go*) por cada intercambio que supere el cupo.
  * Determinar cuál sería el costo de esta penalidad.
  * Como alternativa, definir si el sistema cerrará las compuertas y obligará siempre al usuario a comprar la Suscripción Premium para seguir intercambiando durante ese mes.
