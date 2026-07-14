# Módulo Taratura — Formulario de captación

## Qué hace
Formulario principal de la app. El asesor lo usa en la calle para registrar cada edificio que visita puerta a puerta. Registra el estado de cada puerta y la información del edificio.

## Estado
✅ En producción

## Pantallas

### Setup (primera vez)
- Selección de asesor (nombre libre)
- Selección de zona (5 zonas de Zaragoza)
- Se guarda en localStorage y no vuelve a pedirse

### Home
- Menú de 5 botones: Taratura, Portales, Noticias, Tareas, (Buzones integrado en Portales)

### Formulario Taratura
Dividido en secciones:

1. **Edificio** — datos comunes a todas las puertas
2. **Notas del edificio** — texto libre
3. **Administración** — empresa y teléfono (panel colapsable)
4. **Plantas** — sección dinámica, N plantas con N puertas cada una
5. **Cartas a dejar** — resumen de puertas que recibirán carta (tachable)
6. **Resumen de envío** — total plantas y puertas antes de enviar

## Funcionalidades

- Registrar un edificio con todas sus puertas en una sola sesión
- Agregar y eliminar plantas dinámicamente
- Agregar múltiples puertas por planta
- Autoguardado continuo en localStorage (no se pierde si se cierra accidentalmente)
- Restaurar sesión anterior al volver a abrir la app
- Autocompletado de calles (fuente: callejero IGN de Zaragoza)
- Fecha de taratura editable (para cargar históricas en papel) — se puede bloquear con `FECHA_VISITA_EDITABLE = false`
- Enviar todas las puertas del edificio en un lote al servidor

## Campos

### Por edificio
| Campo | Tipo | Obligatorio |
|-------|------|-------------|
| Calle | texto con autocompletado | Sí |
| Nº Portal | texto (para evitar problemas con "13-15") | Sí |
| Fecha de visita | fecha | Sí |
| Tipo de Inmueble | multiselect: Edificio, Casa, Local, Terreno, Otro | Sí |
| Características | multiselect: Garaje, Trastero, Ascensor, Amenities, Administración | No |
| Otras características | tags libres | No |
| Notas del edificio | textarea | No |
| Admin Empresa | texto | No |
| Admin Teléfono | teléfono | No |

### Por puerta
| Campo | Tipo | Obligatorio |
|-------|------|-------------|
| Piso | select (Bajo, Entrepiso, Principal, 1º–15º, Ático, Sobreático, Personalizado) | Sí |
| Escalera/Bloque | select (Centro, Izq, Dcha, Torre 1-3, Bloque A-C, Personalizado) | No |
| Puerta | select (A, B, C, D, E, F, Dcha, Izda, Único, texto libre) | Sí |
| Estado | select: Habitado, Deshabitado, No Contesta, Noticia, Otro | Sí |
| Vínculo | multiselect (Propietario, Inquilino, Familiar, Viven, En Venta, En Alquiler, Sospechoso, Vacío, Vecino amigo, Portero, Presidente, Administrador, Visitar de Nuevo, Sin vínculo) | No |
| Indicios | multiselect con emoji (Persianas, Timbre, Niños, Perro, Felpudo, Puerta sucia, Alarma, Mirilla...) | No |
| Nombre Vecino | texto (RGPD) | No |
| Teléfono | teléfono (RGPD) | No |
| Observaciones | textarea | No |
| Carta a dejar | Sí/No | No |
| Nombre Buzón | texto | No |

## Hojas que toca
| Hoja | Operación |
|------|-----------|
| `Registros` | Inserta nueva fila (primera visita) o actualiza fila existente (revisita). Clave única: Calle\|\|Número\|\|Escalera\|\|Piso\|\|Puerta |
| `Noticias` | Inserta siempre una fila nueva al inicio (histórico puro) |
| `Fichas_Noticias` | Crea ficha si Estado = "Noticia" y no existe una abierta |
| `Seguimiento_Noticias` | Añade entrada si Estado = "Noticia" |
| `Fichas_Portales` | Vinculación automática por Calle+Número |
| `Visitas_Portales` | Registra visita automática al portal |

## Acciones al Apps Script
| Action | Cuándo |
|--------|--------|
| *(sin action — envío directo)* | Al pulsar "Guardar" — envía array de puertas |
| `media` | Al subir foto de buzón |

## Efectos secundarios al guardar
1. Si Estado = "Noticia": se crea/actualiza ficha en `Fichas_Noticias`
2. Vinculación automática con portal existente por Calle+Número. Si hay más de un portal con la misma Calle+Número (edificio con varias escaleras, ver `docs/PORTALES.md`), se desambigua usando la Escalera/Bloque de la puerta tarada contra el campo `Escalera_Portal` de cada ficha; si no se puede identificar con certeza, no vincula automáticamente
3. Si no existe portal para esa Calle+Número: se crea uno automáticamente

## Interacción con otros módulos
- **→ Noticias:** crear ficha de investigación cuando Estado = "Noticia"
- **→ Portales:** vincular automáticamente cada taratura a su portal
- **← Portales:** si Portales actualiza buzones, Registros recibe el Nombre_Buzón de cada puerta
