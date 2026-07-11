# Módulo Portales — Gestión de edificios

## Qué hace
Permite gestionar el seguimiento completo de un edificio (portal) como unidad. El asesor puede ver el historial de visitas, el estado de cada puerta, los buzones capturados y agregar notas de seguimiento.

## Estado
✅ En producción

## Pantallas

### Lista de Portales
- Buscador por calle/portal
- Filtro por estado: Pendiente, Visitado, Parcial
- Tarjetas: Calle+Número, Plantas/Puertas/Escaleras, Última visita, Total vueltas
- Botón "Nuevo Portal"

### Detalle de Portal
Se abre al tocar una tarjeta. Contiene:

1. **Header** — Calle+Número, última visita, vueltas totales
2. **Datos del edificio** — Plantas, Puertas/planta, Escaleras, Observaciones (editable)
3. **Notas del edificio** — Portero, acceso, referencias (viene de Taratura, editable)
4. **Administración** — Empresa y teléfono (editable)
5. **Buzones** — Texto y fotos capturadas, botón editar
6. **Puertas registradas** — Tabla con estado actual de cada puerta (desde Registros), editable
7. **Historial de visitas** — Tabla con vuelta, fecha, asesor, resultado
8. **Notas de portal** — Listado de notas con fecha y autor
9. **Acciones** — Registrar visita, Editar buzones, Agregar nota, Eliminar portal

## Funcionalidades

- Crear portal manualmente con su estructura (plantas, puertas/planta, escaleras)
- Ver el estado actualizado de cada puerta registrada en Taratura
- Registrar visita al edificio (vuelta N, resultado, puertas visitadas)
- Capturar buzones: texto con nombres de vecinos + foto subida a Drive
- Editar nombre de vecino o teléfono directamente desde el portal (se sincroniza con Registros)
- Editar notas del edificio y datos de administración (se actualiza en todas las puertas de Registros)
- Agregar observación rápida a una puerta específica (sin pasar por Taratura)
- Agregar nota general del edificio
- Eliminar portal

## Campos

### Portal (Fichas_Portales)
| Campo | Descripción |
|-------|-------------|
| ID_Portal | Único, ej: PORT-1234567890 |
| Fecha_Creación | Cuándo se creó |
| Asesor, Zona | Quién lo gestiona |
| Calle, Número | Dirección |
| Plantas | Número de plantas |
| Puertas_Planta | Puertas por planta |
| Escaleras | Número de escaleras |
| Estado_Actual | Pendiente / Visitado / Parcial |
| Total_Vueltas | Contador de visitas |
| Última_Visita | Fecha |
| Buzones | Texto multilinea: "4º A: Felipe / Pepito\n5º B: Maria" |
| Observaciones | Texto libre |

### Visita (Visitas_Portales)
| Campo | Descripción |
|-------|-------------|
| ID_Visita | Único |
| ID_Portal | Referencia |
| Vuelta | Número de visita (1, 2, 3...) |
| Fecha | |
| Asesor | |
| Resultado_General | Completada / Parcial |
| Carta_Enviada | Sí / No |
| Puertas_Visitadas | Número |
| Observaciones | Texto libre |

### Nota de Portal (Notas_Portales)
| Campo | Descripción |
|-------|-------------|
| ID_Nota | Único |
| ID_Portal | Referencia |
| Fecha, Autor, Nota | |

### Observación de Puerta (Observaciones_Puertas)
| Campo | Descripción |
|-------|-------------|
| Clave | Calle\|\|Número\|\|Escalera\|\|Piso\|\|Puerta (minúsculas) |
| Calle, Número, Escalera, Piso, Puerta | |
| Fecha, Autor, Obs | |

## Hojas que toca
| Hoja | Operación |
|------|-----------|
| `Fichas_Portales` | Crear portal, actualizar datos, estado, buzones |
| `Visitas_Portales` | Agregar visita |
| `Notas_Portales` | Agregar nota |
| `Observaciones_Puertas` | Agregar observación de puerta |
| `Registros` | Leer puertas por Calle+Número / Actualizar nombre vecino, teléfono, notas edificio, administración |
| `Seguimiento_Noticias` | Registrar cambio si la puerta tiene ficha abierta en Noticias |

## Acciones al Apps Script
| Action | Qué hace |
|--------|----------|
| `listar_portales` | Lista portales filtrados por asesor/zona |
| `obtener_portal` | Detalle completo: ficha + visitas + notas + obs_puertas |
| `crear_portal` | Crear nuevo portal |
| `registrar_visita` | Registrar visita a un portal (incrementa vuelta, actualiza estado) |
| `actualizar_buzones` | Guarda texto buzones + actualiza Nombre_Buzón en Registros |
| `actualizar_portal` | Editar datos del portal (plantas, puertas, escaleras, observaciones) |
| `actualizar_puerta` | Editar nombre/teléfono/vínculo de una puerta (afecta Registros y Noticias) |
| `actualizar_datos_edificio` | Editar notas/admin del edificio (afecta todas las filas en Registros) |
| `añadir_nota_portal` | Agregar nota al portal |
| `añadir_observacion_puerta` | Agregar observación a una puerta |
| `eliminar_portal` | Borrar portal completo |
| `media` | Subir foto de buzón a Google Drive |

## Interacción con otros módulos
- **← Taratura:** cada taratura enviada vincula automáticamente su Calle+Número a un portal (o crea uno)
- **→ Registros:** editar nombre/teléfono o notas del edificio se propaga a Registros
- **→ Noticias:** si una puerta tiene ficha abierta, cualquier cambio de nombre/teléfono registra entrada en Seguimiento_Noticias
