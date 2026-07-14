# Módulo Noticias — CRM de investigaciones

## Qué hace
CRM para investigar puertas que parecen vacías o tienen potencial. Cada puerta marcada con Estado = "Noticia" en Taratura genera una ficha de investigación. El asesor gestiona etapas, candidatos a contactar, llamadas y seguimiento hasta conseguir el encargo o cerrar el caso.

## Estado
✅ En producción

## Pantallas

### Layout (mobile: tabs / desktop: 2 columnas)

**Panel izquierdo — Lista de Noticias**
- Buscador incremental (por calle, portal, piso, nombre)
- Toggle "Por portal" (agrupa fichas del mismo edificio)
- Filtro por etapa: Todas / Detectada / Investigando / Llamando / Cerradas
- Ordenar: Por actividad / Alfabético / Por etapa
- Tarjetas: Calle+Portal, Piso/Puerta, Fecha detección, Etapa (badge), Próxima acción
- Badge con total de fichas
- Botón "Importar nuevos" (migra puertas históricas con Estado=Noticia que no tienen ficha)

**Panel derecho — Ficha detallada**
Se abre al tocar una tarjeta. Secciones:

1. **Header** — Dirección, Fecha detección, Zona, Asesor, ID (copiable), Etapa (badge), botón "Avanzar"
2. **Panel Rápido** — Estado piso, Situación, Nota propietario, Fecha contrato inquilino (2 columnas)
3. **Pipeline de investigación** — 7 etapas visuales con conectores (Detectada → ... → Contactado)
4. **Candidatos** — personas a contactar, con acciones (editar, llamar, descartar)
5. **Notas de Inglobably** — información encontrada en el buscador de propietarios
6. **Próxima acción** — qué hay que hacer y cuándo
7. **Bloqueado** — botones "Solicitar teléfono a Esther" y "Pedir Nota Simple"
8. **Historial** — timeline cronológico de todos los eventos (colapsable)
9. **Cerrar caso** — botón para cerrar con motivo

## Modales
| Modal | Para qué |
|-------|----------|
| Avanzar etapa | Seleccionar nueva etapa + nota opcional |
| Registrar llamada | Resultado de llamada a candidato (suena, no suena, resultado, próxima acción) |
| Agregar candidato | Nombre, teléfono, vínculo, fuente |
| Panel Candidatos | Listado completo con filtros: pendientes / descartados |
| Importar candidatos ABC | URL de Google Sheet (no implementado aún) |
| Agregar propietario | Nombre, NIF, parentesco, fecha nacimiento, teléfono |
| Panel Propietarios | Listado editable |
| Solicitar a Esther | Lista de propietarios con NIF, notas |
| Pedir Nota Simple | Fecha solicitud, notas |
| Estado del piso | 4 botones rápidos: Vacío / Alquilado / Propietario vive / Solicitud de valoración |
| Editar info piso | Estado, situación, nota propietario, fecha contrato inquilino |
| Próxima acción | Qué hay que hacer, descripción, fecha |
| Nota Inglobably | Textarea libre |
| Cerrar noticia | Motivo, notas finales |

## Etapas del pipeline
1. Detectada
2. Investigando (ABC)
3. Solicitar teléfonos Esther
4. Esperando Nota Simple
5. Llamando
6. Nota Simple recibida
7. Contactado / Cerrada

## Campos

### Ficha (Fichas_Noticias)
| Campo | Descripción |
|-------|-------------|
| Ficha_ID | Único, ej: F-1234567890 |
| Clave | Calle\|\|Número\|\|Escalera\|\|Piso\|\|Puerta (minúsculas) |
| Calle, Número, Escalera, Piso, Puerta | Dirección exacta. **Escalera es una foto fija**: se copia de `Registros` en el momento en que se crea la ficha (`procesarFichaNoticia`) y no se vuelve a sincronizar después. Si se corrige la columna Escalera en Registros más tarde, las fichas ya abiertas siguen mostrando el valor viejo — hay que corregirlas a mano en `Fichas_Noticias` si hace falta |
| Fecha_Deteccion | Cuándo se detectó |
| Propietario | Nombre encontrado |
| Telefono | Del propietario |
| Estado_Caso | En Investigación / Cerrada |
| Asesor, Zona | |
| Etapa_Actual | Etapa del pipeline |
| Estado_Piso | Parece vacío / Alquilado / Propietario vive / Solicitó Valoración |
| Situacion | Descripción libre del estado del piso |
| Proxima_Accion | Qué hay que hacer |
| Fecha_Proxima_Accion | Cuándo |
| Fecha_Contrato_Inquilino | Si aplica |

### Candidato (Candidatos_Noticias)
| Campo | Descripción |
|-------|-------------|
| Ficha_ID | Referencia a la ficha |
| Nombre | |
| NIF | Para Nota Simple / Esther |
| Parentesco | Propietario, Cónyuge, Hijo/a, Padre/Madre, Hermano/a, Heredero/a, Otro |
| Fecha_Nacimiento | |
| Telefono | |
| Fuente | ABC / Esther / Nota Simple / Manual |
| Estado | Pendiente / Sin respuesta / Descartado / Confirmado |
| Proxima_Accion | |
| Fecha_Proxima_Accion | |

### Seguimiento (Seguimiento_Noticias)
| Campo | Descripción |
|-------|-------------|
| Ficha_ID | Referencia |
| Fecha | Timestamp del evento |
| Autor | Asesor |
| Nota | Texto del evento |

## Hojas que toca
| Hoja | Operación |
|------|-----------|
| `Fichas_Noticias` | Leer listado y detalle / Actualizar etapa, estado, próxima acción |
| `Seguimiento_Noticias` | Leer timeline / Insertar evento en cada cambio |
| `Candidatos_Noticias` | Leer, agregar, editar, eliminar candidatos |
| `Registros` | Leer datos originales de la taratura |

## Acciones al Apps Script
| Action | Qué hace |
|--------|----------|
| `listar_noticias` | Lista fichas del asesor (todos los campos de Fichas_Noticias) |
| `get_ficha_noticia` | Detalle: ficha + candidatos + seguimiento |
| `actualizar_ficha_noticia` | Actualiza cualquier campo de la ficha (etapa, estado, próxima acción, etc.) |
| `agregar_candidato` | Agrega candidato a Candidatos_Noticias |
| `actualizar_candidato` | Edita candidato (datos, estado, próxima acción) |
| `eliminar_candidato` | Elimina candidato por row_num |
| `registrar_seguimiento_candidato` | Actualiza estado/próxima acción del candidato tras llamada |
| `agregar_seguimiento` | Inserta entrada en Seguimiento_Noticias |
| `obtener_seguimiento` | Lee timeline de una ficha |
| `obtener_indice` | Carga índice de todas las puertas (para buscador, 1 vez por sesión) |
| `cerrar_ficha` | Marca ficha como Cerrada |
| `migrar_sospechosos` | Crea fichas para puertas históricas con Estado=Noticia sin ficha |
| `importar_candidatos_abc` | *(No implementado aún)* |

## Interacción con otros módulos
- **← Taratura:** las fichas se crean automáticamente cuando una puerta se marca con Estado = "Noticia"
- **← Portales:** si se edita nombre/teléfono de una puerta, se registra en Seguimiento_Noticias
- **→ Tareas:** la Próxima_Acción y Fecha_Proxima_Accion de cada ficha aparecen como tareas en el módulo Tareas
