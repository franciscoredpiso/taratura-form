# Módulo Tareas — Gestión de próximas acciones

## Qué hace
Vista centralizada de todas las cosas pendientes del asesor. Combina dos tipos de tareas: las que vienen automáticamente de las fichas de Noticias (próxima acción) y las tareas generales que el asesor crea manualmente.

## Estado
✅ En producción

## Importante
- Las **tareas de Noticias** vienen del campo `Proxima_Accion` de `Fichas_Noticias`. Al completarlas, se limpia ese campo en el servidor.
- Las **tareas generales** se guardan solo en localStorage del navegador (no van al spreadsheet).
- No necesita hojas nuevas ni cambios en el script — reutiliza todo lo de Noticias.

## Pantallas

### Vista principal — Lista de Tareas
- **Resumen** — 4 badges: Vencidas / Para hoy / Total pendientes / Completadas
- **Tabs** — Pendientes / Completadas
- **Filtros pendientes** — Todas / Vencidas / Hoy / Mañana / Esta semana / Sin fecha
- **Filtros completadas** — Última semana / 14 días / Mes / Todas
- **Ordenar** — Por fecha / Por prioridad
- Listado de tarjetas con acciones

### Tarjeta de tarea
- Tipo: "Noticia" (viene de ficha) o "General" (creada manualmente)
- Descripción de la acción
- Dirección (si es tarea de Noticia)
- Fecha límite + indicador relativo ("hoy", "mañana", "vencida")
- Prioridad: Alta / Media / Baja
- Botones: ✓ Listo / ✏️ Editar (solo generales) / 🗑 Eliminar (solo generales)
- Botón "↩ Reabrir" (en completadas)

### Modal Nueva Tarea / Editar Tarea
- Qué hay que hacer (obligatorio)
- Descripción / notas (opcional)
- Fecha (opcional)
- Prioridad: Alta / Media / Baja

### Modal "Crear tarea rápida" (FAB)
- Botón flotante "+" para crear tarea general rápidamente

## Funcionalidades
- Ver todas las tareas pendientes en un solo lugar (Noticias + generales)
- Crear tareas generales manualmente
- Editar y eliminar tareas generales
- Completar tarea: si es de Noticia, limpia la próxima acción en el servidor
- Reabrir tarea completada: si es de Noticia, restaura la próxima acción en el servidor
- Filtrar por fecha (vencidas, hoy, mañana, semana)
- Ordenar por fecha o por prioridad
- Buscar por dirección o descripción (buscador incremental desde Registros)

## Almacenamiento
| Dato | Dónde |
|------|-------|
| Tareas de Noticias | `Fichas_Noticias` (servidor) — campo `Proxima_Accion` + `Fecha_Proxima_Accion` |
| Tareas generales pendientes | `localStorage` (`tz_tareas_generales`) |
| Tareas de Noticias completadas | `localStorage` (`tz_tareas_not_comp`) — temporal, solo para la sesión |

## Hojas que toca
| Hoja | Operación |
|------|-----------|
| `Fichas_Noticias` | Lee próximas acciones para mostrar como tareas |
| `Fichas_Noticias` | Escribe (limpia o restaura `Proxima_Accion`) al completar/reabrir |
| `Registros` | Lee índice de puertas para buscador de direcciones |

## Acciones al Apps Script
| Action | Cuándo |
|--------|--------|
| `listar_noticias` | Al entrar al módulo — carga fichas con próxima acción |
| `actualizar_ficha_noticia` | Al completar tarea de Noticia — limpia `proxima_accion: ''` |
| `actualizar_ficha_noticia` | Al reabrir tarea de Noticia — restaura `proxima_accion` original |
| `obtener_indice` | Para el buscador de direcciones |

## Interacción con otros módulos
- **← Noticias:** las fichas con `Proxima_Accion` rellena aparecen automáticamente como tareas
- **→ Noticias:** al completar una tarea de Noticia, se limpia el campo en la ficha correspondiente
