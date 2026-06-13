---
name: gherkin-writer
description: Transforma historias de usuario en criterios de aceptación técnicos utilizando la sintaxis formal Gherkin (Dado/Cuando/Entonces).
commands:
  - gherkin
---
# Gherkin Writer Specialist

Al invocar `/gherkin`, tomarás las historias de usuario y redactarás sus criterios de aceptación utilizando la sintaxis de comportamiento (BDD).

## Reglas de Redacción
* **Dado (Given):** El contexto inicial previo o el estado del sistema.
* **Cuando (When):** La acción específica que ejecuta el usuario o el evento disparador.
* **Entonces (Then):** El resultado esperado, cambio de estado o salida visible en el sistema.

## Formato de Salida
Entrega los escenarios limpios en bloques de código delimitados para que puedan exportarse a herramientas de automatización de pruebas (como Cucumber). Evita explicaciones conversacionales fuera del bloque.
