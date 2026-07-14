# Módulo Buzones — Captura de fotos y nombres

## Qué hace
Permite al asesor fotografiar los buzones de un edificio y registrar los nombres de los vecinos que aparecen en ellos. Los nombres se sincronizan automáticamente con las puertas correspondientes en Registros.

## Estado
✅ En producción — integrado dentro del módulo Portales (no es pantalla independiente)

## Dónde está
No tiene pantalla propia. Se accede desde **Detalle de Portal → sección Buzones**.

## Pantallas

### Sección Buzones (dentro de Detalle de Portal)
- Vista previa del texto de buzones guardado
- Galería de miniaturas de fotos subidas a Drive (enlace para ver)
- Botón "Editar buzones"

### Modal Editar Buzones
- **Textarea** con el formato: `4º A: Felipe Prua / Pepito Pepito`
- Una línea por buzón, formato `Piso Puerta: Nombre / Nombre`
- Botón "Capturar foto" — abre cámara o galería del móvil
- Preview de fotos subidas
- Botón "Guardar"

## Funcionalidades
- Escribir o editar el texto de nombres de buzones
- Tomar foto o subir imagen desde galería
- Guardar texto + foto simultáneamente
- Al guardar: el script parsea el texto y actualiza el campo `Nombre_Buzón` en cada puerta de Registros que coincida por Piso+Puerta

## Formato del texto de buzones
```
4º A: Felipe Prua / Pepito Pepito
4º B: Maria García
5º A: Juan López
```
- Formato: `{Piso} {Puerta}: {Nombre 1} / {Nombre 2}`
- Una línea por buzón
- Múltiples nombres separados por `/`

## Campos
| Campo | Descripción |
|-------|-------------|
| ID_Portal | Portal al que pertenecen los buzones |
| Buzones (texto) | Multilinea con nombres por piso/puerta |
| Foto_URL | URL pública en Google Drive |

## Hojas que toca
| Hoja | Operación |
|------|-----------|
| `Fichas_Portales` | Escribe el texto completo de buzones en columna `Buzones` |
| `Registros` | Actualiza `Nombre_Buzón` (col S) en cada puerta del edificio que coincida. Si la ficha tiene `Escalera_Portal` informado (edificio con varias escaleras, ver `docs/PORTALES.md`), solo actualiza las puertas de esa escalera |

## Archivos en Drive
Carpeta: `Taratura Fotos Buzones / {Zona} / {Calle} {Portal}`

## Acciones al Apps Script
| Action | Qué hace |
|--------|----------|
| `media` | Sube foto (base64) a Google Drive, devuelve URL |
| `actualizar_buzones` | Guarda texto, parsea líneas y actualiza Nombre_Buzón en Registros fila a fila |

## Interacción con otros módulos
- **→ Registros:** actualiza `Nombre_Buzón` por cada puerta cuyo Piso+Puerta coincida con una línea del texto
