# Taratura — Arquitectura General

## Qué es
Web app mobile-first para asesores inmobiliarios que hacen prospección puerta a puerta en Zaragoza. Los datos se guardan en un Google Spreadsheet privado mediante Google Apps Script.

## Stack
- **Frontend:** HTML + CSS + JS puros. Sin framework. Hosted en GitHub Pages.
- **Backend:** Google Apps Script (un solo endpoint POST, sin autenticación)
- **Base de datos:** Google Spreadsheet (ID: `1mUPD1fJ9mJ_ZuJDnh8pRb-qjsdhVag8fkKfftrUGXWc`)
- **Archivos locales:** `C:\Users\maria\Claude\Projects\Procesos de Captacion Inmobiliaria\`
- **URL producción:** https://franciscoredpiso.github.io/taratura-form/
- **Repo GitHub:** https://github.com/franciscoredpiso/taratura-form

## Archivos principales
| Archivo | Descripción |
|---------|-------------|
| `index.html` | Esqueleto HTML, todas las pantallas |
| `style.css` | Estilos |
| `app.js` | Toda la lógica (~5000+ líneas) |
| `app script de la base de datos.txt` | Script de Apps Script (se sube manualmente) |

## Módulos
| Módulo | Estado | Descripción |
|--------|--------|-------------|
| Taratura | ✅ Producción | Formulario de captación puerta a puerta |
| Portales | ✅ Producción | Gestión y seguimiento de edificios completos |
| Noticias | ✅ Producción | CRM de investigaciones de puertas vacías |
| Buzones | ✅ Producción | Captura de fotos y nombres de buzones (integrado en Portales) |
| Tareas | ✅ Producción | Gestión de próximas acciones |

## Hojas del Spreadsheet
| Hoja | Quién escribe | Quién lee |
|------|--------------|-----------|
| `Registros` | Taratura, Portales | Portales, Noticias |
| `Noticias` | Taratura | — |
| `Fichas_Noticias` | Taratura (auto), Noticias | Noticias, Tareas |
| `Seguimiento_Noticias` | Noticias, Portales | Noticias |
| `Candidatos_Noticias` | Noticias | Noticias |
| `Fichas_Portales` | Portales, Taratura (auto) | Portales |
| `Visitas_Portales` | Portales, Taratura (auto) | Portales |
| `Notas_Portales` | Portales | Portales |
| `Observaciones_Puertas` | Portales | Portales |

## Flujo de datos entre módulos

```
TARATURA (formulario)
    ↓ al enviar
    ├→ Registros (nueva puerta o actualización)
    ├→ Noticias (histórico — siempre se inserta)
    ├→ Fichas_Noticias + Seguimiento_Noticias (solo si Estado = "Noticia")
    └→ Fichas_Portales + Visitas_Portales (vinculación automática por Calle+Número)

PORTALES
    ├→ Fichas_Portales, Visitas_Portales, Notas_Portales, Observaciones_Puertas
    └→ Registros (actualiza nombre vecino / teléfono / administración)
           └→ Seguimiento_Noticias (si hay ficha abierta para esa puerta)

NOTICIAS
    ├→ Fichas_Noticias (etapa, estado, próxima acción)
    ├→ Seguimiento_Noticias (todo evento queda registrado)
    └→ Candidatos_Noticias (agregar / editar / eliminar personas)

TAREAS
    ├← Fichas_Noticias (lee próximas acciones)
    └→ Fichas_Noticias (limpia próxima acción al completar tarea de Noticia)

BUZONES (dentro de Portales)
    ├→ Google Drive (sube foto)
    ├→ Fichas_Portales (guarda texto de buzones)
    └→ Registros (actualiza Nombre_Buzón puerta a puerta)
```

## Navegación y UX
- Pantalla de inicio con 4 botones en grid 2×2 (Portales, Taratura, Noticias, Tareas)
- Barra de navegación inferior fija con los 4 módulos (Buzones oculto, accesible desde Portales)
- Swipe horizontal entre módulos: deslizar izquierda = avanzar, derecha = retroceder (orden: Portales → Taratura → Noticias → Tareas)
- En Noticias con ficha abierta: deslizar derecha cierra la ficha y vuelve a la lista de cards
- Animaciones de entrada: fade + blur (`filter: blur(5px)→0`) + subida al navegar por tabs; slide izquierda/derecha al hacer swipe
- Bottom nav con **pill deslizante** (`.nav-pill` en `index.html`): rectángulo semitransparente que se desliza con spring entre pestañas activas. En pantalla home se oculta. Función `movePill()` en `app.js`.
- Todos los botones primarios con efecto **3D inner glow**: gradiente de fondo + highlight blanco interior + glow de color exterior. Al pulsar se hunden ligeramente (`translateY(1px) scale(0.98)`).
- Botones de agregar planta/puerta: sólidos (ya no punteados dashed)

## Autenticación y acceso
- Backend sin autenticación formal (protegido por URL opaca de Apps Script)
- El asesor se identifica con su nombre al entrar (guardado en localStorage)
- No hay login ni sesiones

## localStorage (datos en el navegador)
| Clave | Contenido |
|-------|-----------|
| `tz_asesor` | Nombre del asesor |
| `tz_zona` | Zona asignada |
| `tz_state` | Estado del formulario de Taratura en curso |
| `tz_lastScreen` | Última pantalla visitada |
| `tz_tareas_generales` | Tareas generales creadas manualmente |
| `tz_tareas_not_comp` | Tareas de Noticias completadas |

## Workflow de desarrollo
- Rama `dev` para todos los cambios de código
- Rama `main` = producción (GitHub Pages)
- El usuario sube archivos manualmente desde la web de GitHub
- El script de Apps Script se sube manualmente desde el editor de Google
- **Actualizar el MD del módulo correspondiente al final de cada sesión**
