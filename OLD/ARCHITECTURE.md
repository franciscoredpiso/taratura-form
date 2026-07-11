# Taratura — Arquitectura del proyecto

## Visión general

La aplicación es una **Single-Page App (SPA) mobile-first** sin framework ni proceso de compilación. Todo corre directamente en el navegador del asesor. Está publicada en GitHub Pages y se sirve como archivos estáticos.

El código fuente está dividido en tres archivos que el navegador carga juntos:

```
index.html   ← estructura HTML (420 líneas)
style.css    ← estilos visuales (1.216 líneas)
app.js       ← lógica y comportamiento (2.254 líneas)
```

`index.html` es el punto de entrada. Declara el enlace a los otros dos:

```html
<link rel="stylesheet" href="style.css">   <!-- en el <head> -->
<script src="app.js"></script>             <!-- al final del <body> -->
```

---

## index.html

### Propósito
Define la estructura estática de la aplicación: qué pantallas existen, qué elementos contienen, y en qué orden está el DOM. No contiene lógica ni estilos.

### Contenido

El `<body>` está organizado en **cinco pantallas** que coexisten en el DOM simultáneamente. Solo una es visible en cada momento — `app.js` las muestra u oculta según la navegación del usuario.

| ID del elemento | Pantalla | Descripción |
|---|---|---|
| `#setupScreen` | Configuración | Primera pantalla al abrir la app. El asesor elige su nombre y zona. Se oculta tras confirmar y no vuelve a aparecer salvo que el asesor pulse el badge del header. |
| `#homeSection` | Inicio | Menú principal con dos botones: acceso a Taratura y a Noticias. |
| `#mainContainer` | Taratura | El formulario principal. Contiene los campos del edificio (calle, portal, fecha, tipo de inmueble, características), el contenedor de plantas/puertas (`#floorsWrap`), el resumen de cartas (`#cartaCard`) y el botón de envío. |
| `#noticiasSection` | Noticias | Buscador de fichas de seguimiento. Tiene dos vistas internas: lista de resultados (`#noticiasListView`) y detalle de una ficha (`#noticiasDetailView`). |
| `#buzSection` | Buzones | Módulo de registro de buzones. Tiene tres vistas internas: lista de portales pendientes/historial (`#buzListView`), revisión de un portal (`#buzReviewView`) y un modal para añadir portales nuevos (`#buzModal`). |

Además hay elementos globales fuera de las pantallas:

- **Header** — sticky, contiene el título, el botón Home y el badge de asesor/zona.
- **Bottom nav** — barra de navegación fija en la parte inferior con las pestañas Taratura y Buzones.
- **`#toast`** — elemento para notificaciones flotantes, controlado desde `app.js`.
- **Cuatro `<input type="file">`** ocultos — para captura de fotos/vídeo en el módulo de Buzones.

### Relación con los otros archivos

- Las clases CSS que aparecen en el HTML (`.card`, `.feat-item`, `.floor-card`, etc.) están definidas en `style.css`.
- Los atributos `onclick`, `oninput`, `onchange` llaman a funciones definidas en `app.js`.
- Los IDs (`id="fCalle"`, `id="floorsWrap"`, etc.) son los puntos de anclaje que `app.js` usa para leer y escribir en el DOM.

---

## style.css

### Propósito
Define toda la apariencia visual de la aplicación: colores, tipografía, espaciado, animaciones y el sistema de layout. No contiene lógica.

### Contenido

El archivo está organizado en **20 secciones** marcadas con comentarios `/* ── NOMBRE ── */`:

| Sección | Qué controla |
|---|---|
| `HEADER` | Barra superior fija con el título y el badge de zona |
| `LAYOUT` | Contenedor central con ancho máximo de 640 px |
| `CARDS` | Tarjetas blancas con borde redondeado que agrupan campos |
| `FIELDS` | Inputs, selects y textareas del formulario |
| `AUTOCOMPLETAR CALLE` | Dropdown de sugerencias de calles |
| `ATRIBUCIÓN CALLEJERO IGN` | Texto de atribución de la fuente de datos cartográficos |
| `BUILDING FEATURES` | Botones de características del edificio (checkboxes visuales) |
| `FLOOR CARD` | Tarjeta de cada planta, con su header, el panel de escalera/bloque y las puertas |
| `DOORS` | Botones de estado por puerta, campos de vínculo, indicios y observaciones |
| `ADD BUTTONS` | Botones "Añadir planta" y "Añadir puerta" |
| `CARTA SUMMARY` | Resumen de cartas a dejar por puerta |
| `SUBMIT` | Botón principal de guardar/enviar |
| `TOAST` | Notificaciones flotantes temporales |
| `SETUP SCREEN` | Pantalla de configuración inicial |
| `ZONE COLOR BUTTONS` | Botones de selección de zona con color por zona |
| `BOTTOM NAV` | Barra de navegación inferior |
| `HOME SCREEN` | Pantalla de inicio con los dos botones principales |
| `NOTICIAS SECTION` | Buscador y detalle de fichas de seguimiento |
| `BUZONES SECTION` | Lista de portales, vista de revisión y modal |

#### Sistema de colores para estados de puerta

Los estados de puerta tienen clases CSS dedicadas que colorean el botón al seleccionarse:

```css
.s-habit    /* Habitado       — verde azulado */
.s-deshab   /* Deshabitado    — gris */
.s-no-cont  /* No Contesta    — naranja */
.s-noticia  /* Noticia        — rojo */
.s-sin-dat  /* Otro           — gris claro */
```

Estas clases se asignan dinámicamente desde `app.js` cuando el asesor selecciona un estado.

### Relación con los otros archivos

- `index.html` declara `<link rel="stylesheet" href="style.css">` en el `<head>`.
- `app.js` añade y quita clases CSS en tiempo de ejecución (p. ej. `.hidden`, `.on`, `.open`, `.selected`, clases de estado de puerta) — nunca escribe estilos inline salvo excepciones puntuales documentadas en el propio JS.

---

## app.js

### Propósito
Contiene toda la lógica de la aplicación: inicialización, navegación entre pantallas, generación dinámica del DOM, persistencia local, comunicación con el backend (Google Sheets vía Apps Script) y los dos módulos especializados (Noticias y Buzones).

### Contenido

El archivo está organizado en **secciones** marcadas con comentarios `// ── NOMBRE ──`:

| Sección | Líneas aprox. | Qué hace |
|---|---|---|
| `CONFIG` | 1–24 | Constantes globales: lista de pisos, puertas, estados, vínculos, indicios. **Aquí se añaden o eliminan opciones del formulario.** |
| `FECHA DE LA TARATURA` | 25–104 | Gestión del campo de fecha. Incluye el flag `FECHA_VISITA_EDITABLE` — mientras sea `true`, el asesor puede editar la fecha (útil para digitalizar taraturas en papel). Cambiar a `false` cuando se cierre esa carga histórica. |
| `STATE` | 105–111 | Variables de estado de sesión (`floorSeq`, `doorSeq`, `savedSinceLastEdit`). |
| `SETUP SCREEN` | 112–197 | Lógica de la pantalla de configuración: selección de asesor y zona, persistencia en `localStorage`. |
| `INIT` + `AUTOCOMPLETAR CALLE` | 198–381 | Inicialización al cargar la página. Carga el CSV de calles (`calles_zaragoza.csv`) vía `fetch` para el autocompletado. Si el CSV no está disponible, el campo funciona como texto libre sin error. |
| `BUILDING FEATURES` | 382–488 | Renderizado y toggle de los botones de características del edificio y del panel de administración. |
| `ADD FLOOR` / `ADD DOOR` | 489–707 | Generación dinámica de tarjetas de planta y de botones de puerta. Cada planta y puerta se construye como HTML insertado en `#floorsWrap`. |
| `UI HELPERS` | 708–773 | Funciones auxiliares de UI: scroll, focus, visibilidad de paneles. |
| `CARTA CHECKLIST` | 774–844 | Lógica del resumen de cartas: detecta qué puertas tienen `Carta = Sí` y construye el checklist. |
| `SUMMARY` | 845–854 | Actualiza el contador "X plantas · Y puertas" del botón de envío. |
| `AUTO-SAVE` | 855–933 | Guarda el estado completo del formulario en `localStorage` tras cada cambio, para recuperarlo si el asesor cierra la app accidentalmente. |
| `RESTORE STATE` | 934–1027 | Reconstituye el formulario desde `localStorage` al arrancar la app. |
| `ENVIAR AL SERVIDOR` | 1035–1198 | Serializa el formulario en un array de objetos JSON y hace `fetch POST` al endpoint de Google Apps Script (`APPS_SCRIPT_URL`). Gestiona reintentos, errores y el feedback visual al asesor. |
| `NEW BUILDING` | 1199–1252 | Lógica del botón "Nuevo edificio": pregunta confirmación si hay datos sin guardar y limpia el formulario. |
| `TOAST` | 1253–1263 | Sistema de notificaciones flotantes temporales. |
| `MÓDULO NOTICIAS` | 1264–1477 | Buscador incremental de fichas de Noticia. Carga el índice una sola vez por sesión desde Apps Script (`action: 'obtener_indice'`), filtra en cliente, y muestra el timeline de seguimiento de cada ficha. |
| `START` | 1478–1484 | Punto de entrada: llama a `initApp()` al cargar el DOM. |
| `MÓDULO BUZONES` | 1485–2254 | Módulo completo de gestión de buzones: navegación entre vistas, captura y preview de fotos/vídeo, almacenamiento en IndexedDB, estructura de piso/escalera/puerta, subida de imágenes a Google Drive y envío de datos al servidor. |

#### Constante crítica: `APPS_SCRIPT_URL`

```js
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/...';
```

Es la URL del Web App de Google Apps Script que actúa como backend. **Toda comunicación con Google Sheets pasa por aquí.** Si el Apps Script se redespliega con una URL nueva, esta constante es el único lugar a actualizar en el frontend.

#### Estado que dispara lógica especial en el backend

El estado `'Noticia'` es el único que tiene tratamiento especial: cuando el Apps Script recibe una puerta con `Estado === 'Noticia'`, abre (o alimenta) una ficha en la hoja `Fichas_Noticias` y registra una entrada en `Seguimiento_Noticias`. El resto de estados se guardan en `Registros` sin lógica adicional.

### Relación con los otros archivos

- Lee y escribe en el DOM usando los IDs definidos en `index.html`.
- Añade y quita clases CSS definidas en `style.css` (nunca duplica estilos inline que ya existan en el CSS).
- Es el único archivo que hace llamadas de red (`fetch`): al CSV de calles y al Apps Script.

---

## Flujo de datos

```
Asesor rellena el formulario (index.html + app.js)
        │
        ├─ autoSave() → localStorage (persistencia local en el móvil)
        │
        └─ sendToServer() → fetch POST → Apps Script (Google Sheets)
                                  │
                                  ├─ Hoja "Registros"      (estado actual de cada puerta)
                                  ├─ Hoja "Noticias"       (historial cronológico)
                                  ├─ Hoja "Fichas_Noticias"      (solo si Estado = "Noticia")
                                  └─ Hoja "Seguimiento_Noticias" (solo si Estado = "Noticia")
```

---

## Archivos de soporte

| Archivo | Descripción |
|---|---|
| `calles_zaragoza.csv` | Maestro de calles de Zaragoza (fuente: IGN — Redes de Transporte). Lo consume `app.js` vía `fetch` para el autocompletado. Si no está disponible, el campo funciona como texto libre. |
| `logo.png` | Logotipo que aparece en la pantalla de inicio. Referenciado directamente desde `index.html`. |

---

## Workflow de desarrollo

La rama `main` es producción. Nunca se modifica directamente.

Todo el desarrollo se hace en la rama `dev`:
1. Modificar los archivos en local
2. Subir los archivos modificados a la rama `dev` en GitHub
3. Probar abriendo `index.html` directamente en Chrome (el autocompletado de calles no funciona en local por restricciones de `file://`, pero el resto sí)
4. Cuando el cambio está validado: fusionar `dev` → `main` vía Pull Request en GitHub

GitHub Actions se encarga automáticamente del deploy a GitHub Pages tras cada merge a `main`.
