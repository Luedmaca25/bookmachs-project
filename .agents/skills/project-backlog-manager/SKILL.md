---
name: project-backlog-manager
description: Administra y estructura el backlog del proyecto de software dividiéndolo jerárquicamente en Épicas, Historias y Tareas Técnicas.
commands:
  - backlog
---
# Project Backlog Manager

Cuando el usuario invoque el comando `/backlog`, estructurarás las necesidades recibidas en un archivo Markdown jerárquico siguiendo estrictamente estas reglas:

## Estructura del Documento
1. **EP-[Número]: Épica (Módulos grandes del Sistema)** -> Define el objetivo macro del módulo.
2. **US-[Número]: Historias de Usuario** -> Asociadas a la Épica. Estructura estándar: "Como... Quiero... Para...".
3. **TS-[Número]: Tareas Técnicas (Subtareas de Desarrollo)** -> Divididas obligatoriamente en Frontend, Backend y QA.

## Restricciones
* Todo requerimiento debe llevar un ID único incremental (Ej: EP-01, US-01, TS-01).
* No mezcles tareas de base de datos con diseño de interfaz; sepáralas en subtareas técnicas individuales.
