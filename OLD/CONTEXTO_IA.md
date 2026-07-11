# Contexto para sesiones de desarrollo — Taratura

> Este archivo es el punto de entrada para cualquier sesión de trabajo con IA sobre este proyecto.
> Léelo antes de tocar cualquier archivo. Refleja el estado actual del proyecto y cómo trabajamos.

---

## Qué es este proyecto

**Taratura** es una web app mobile-first para asesores inmobiliarios que prospectan puerta a puerta en Zaragoza, España. El asesor la usa en su móvil mientras visita edificios: registra cada portal, cada planta, cada puerta y el estado de cada una. Los datos se envían automáticamente a Google Sheets.

**URL de producción:** `https://franciscoredpiso.github.io/taratura-form/`
**Repositorio:** `https://github.com/franciscoredpiso/taratura-form`

---

## Stack técnico

- **Frontend:** HTML + CSS + JS puros. Sin framework. Sin proceso de compilación.
- **Hosting:** GitHub Pages (rama `main`). Deploy automático tras cada merge.
- **Backend:** Google Apps Script publicado como Web App. Recibe POST desde el frontend y escribe en Google Sheets.
- **Base de datos:** Google Sheets (cuenta Gmail gratuita, sin Workspace). Hoja privada.
- **Autocomplete de calles:** archivo estático `calles_zaragoza.csv` en el repo (fuente: IGN).

---

## Estructura de archivos del repositorio

```
taratura-form/
├── index.html              ← Esqueleto HTML. 5 pantallas, ~420 líneas.
├── style.css               ← Todos los estilos visuales. ~1.216 líneas.
├── app.js                  ← Toda la lógica JavaScript. ~2.254 líneas.
├── calles_zaragoza.csv     ← Maestro de calles para autocompletado.
├── logo.png                ← Logo de la agencia.
├── ARCHITECTURE.md         ← Documentación técnica de los 3 archivos principales.
├── GUIA_ASESORES.md        ← Manual de uso para asesores (sin código).
└── GUIA_RAMAS.md           ← Guía de workflow dev/main (sin código).
```

**`index.html`** carga los otros dos así:
```html
<link rel="stylesheet" href="style.css">   <!-- en el <head> -->
<script src="app.js"></script>             <!-- al final del <body> -->
```

### Las 5 pantallas del index.html

| ID | Nombre | Cuándo aparece |
|---|---|---|
| `#setupScreen` | Configuración | Primera vez o al cambiar asesor/zona |
| `#homeSection` | Inicio | Menú principal: Taratura o Noticias |
| `#mainContainer` | Taratura | Formulario principal de prospección |
| `#noticiasSection` | Noticias | Buscador y gestión de fichas de seguimiento |
| `#buzSection` | Buzones | Registro de reparto de cartas con fotos |

`showScreen(name)` en `app.js` controla qué pantalla es visible.

### Secciones clave de app.js

| Sección | Líneas aprox. | Qué contiene |
|---|---|---|
| CONFIG | 1–24 | `ESTADOS`, `VINCULOS_BTN`, `INDICIOS`, `PISOS`, `PUERTAS` — **aquí se añaden opciones al formulario** |
| FECHA DE LA TARATURA | 25–104 | Flag `FECHA_VISITA_EDITABLE` — `true` mientras dure la carga histórica en papel |
| SETUP SCREEN | 112–197 | Selección de asesor y zona, guardado en `localStorage` |
| AUTOCOMPLETAR CALLE | 199–381 | Carga `calles_zaragoza.csv` vía `fetch`. Degrada a texto libre si no está disponible. |
| ADD FLOOR / ADD DOOR | 489–707 | Generación dinámica de plantas y puertas en el DOM |
| AUTO-SAVE / RESTORE | 855–1027 | Persistencia en `localStorage`. Se restaura al abrir la app. |
| ENVIAR AL SERVIDOR | 1035–1198 | `fetch POST` al Apps Script. Serializa el formulario en JSON. |
| MÓDULO NOTICIAS | 1264–1477 | Buscador, timeline, añadir nota, cerrar caso. **En desarrollo activo.** |
| MÓDULO BUZONES | 1485–2254 | Lista, captura de fotos, IndexedDB, subida a Drive, envío al servidor. |

### Constante crítica en app.js

```js
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/...';
```

Toda comunicación con Google Sheets pasa por aquí. Si el Apps Script se redespliega con nueva URL, esta es la única línea a cambiar en el frontend.

---

## Backend: Google Apps Script

**Archivo local:** `Codigo_Noticias_AppsScript.gs` (en la carpeta `Procesos de Captacion Inmobiliaria - Noticias`)

El script gestiona 4 hojas en Google Sheets:

| Hoja | Propósito |
|---|---|
| `Registros` | Tabla maestra. Una fila por puerta. Se actualiza en cada revisita (siempre refleja estado actual). |
| `Noticias` | Historial puro. Una fila nueva por cada visita, más reciente arriba. Nunca se edita. |
| `Fichas_Noticias` | Un caso por puerta marcada con Estado = "Noticia". |
| `Seguimiento_Noticias` | Histórico cronológico de notas por ficha. |

### Acciones que acepta el script (campo `action` en el POST)

| action | Qué hace |
|---|---|
| *(sin action)* | Guarda las filas del formulario en Registros y Noticias |
| `obtener_indice` | Devuelve índice plano de todas las puertas para el buscador de Noticias |
| `obtener_seguimiento` | Devuelve el historial de una ficha concreta |
| `agregar_seguimiento` | Añade una nota al histórico de una ficha |
| `cerrar_ficha` | Cambia Estado_Caso a "Cerrada" en Fichas_Noticias |
| `media` | Recibe foto en base64, la sube a Google Drive y devuelve la URL |

### Columnas de la hoja Registros (A→V, 22 columnas)

```
A Timestamp · B Zona · C Asesor · D Calle · E Numero · F Tipo_Inmueble
G Caracteristicas · H Notas_Edificio · I Piso · J Escalera · K Puerta
L Estado · M Vinculo · N Info_Adicional · O Observaciones
P Nombre_Contacto* · Q Telefono* · R Carta · S Nombre_Buzon
T Admin_Empresa · U Admin_Tel · V Foto_Buzon_URL
```
*Campos RGPD — no exponer en dashboards ni herramientas de IA.

### Trigger especial: Estado = "Noticia"

Es el único estado con lógica backend adicional. Cuando una puerta llega con `Estado === 'Noticia'`, el script:
1. Busca si ya existe una ficha abierta para esa puerta (por clave: calle + portal + escalera + piso + puerta)
2. Si no existe, crea una nueva en `Fichas_Noticias`
3. Siempre añade una entrada en `Seguimiento_Noticias`

---

## El equipo

**Asesores activos:**
- Edis Irene
- María José
- Francisco

**Zonas con color:**
- Zona 1 — Rosa
- Zona 2 — Naranja
- Zona 3 — Verde
- Zona 4 — Morado
- Zona 5 — Amarilla

*(Dos slots comentados en el código para futuros asesores — buscar `<!-- Próximas incorporaciones` en `index.html`)*

---

## Opciones actuales del formulario

### Estados de puerta (`ESTADOS` en app.js, línea ~69)
```
Habitado · Deshabitado · No Contesta · Noticia · Otro
```

### Vínculos con el inmueble (`VINCULOS_BTN` en app.js, línea ~77)
```
Propietario/a · Inquilino/a · Familiar · Viven (no especifica)
En Venta · En Alquiler · Sospechoso (parece vacío) · Vacío
Vecino amigo · Portero / Conserje · Presidente de Comunidad
Administrador · Visitar de Nuevo · Sin vínculo
```

### Indicios (`INDICIOS` en app.js, línea ~93)
```
Persianas siempre bajas · Timbre no funciona · Niños/bebés
Perro ladrando · Con felpudo · Sin felpudo
Puerta en mal estado · Cartel de alarma · Mirilla
```

---

## Workflow de desarrollo

**El usuario no tiene experiencia en programación ni en Git. No usa GitHub Desktop ni CLI.**

Todo el desarrollo sigue este flujo:

```
1. La IA modifica los archivos localmente
        ↓
2. El usuario sube los archivos modificados a la rama DEV en GitHub
   (Add file → Upload files → rama dev)
        ↓
3. El usuario prueba abriendo index.html en Chrome desde su carpeta
   (el autocompletado de calles falla en local por file://, es esperado)
        ↓
4. Si funciona → el usuario fusiona dev → main en GitHub
   (Compare & pull request → Merge)
        ↓
5. GitHub Actions despliega automáticamente a producción en ~2 minutos
```

**Rama `main`** = producción. Los asesores trabajan en esta versión ahora mismo. No se toca directamente salvo para subir documentación `.md`.

**Rama `dev`** = desarrollo. Todo cambio de código va aquí primero.

---

## Archivos locales relevantes (NO están en GitHub)

Ubicación: `C:\Users\maria\Claude\Projects\`

```
Procesos de Captacion Inmobiliaria\
├── index.html                    ← versión local (puede tener cambios no subidos)
├── style.css
├── app.js
├── Codigo_Noticias_AppsScript.gs ← NO está en el repo de GitHub
├── CONTEXTO_DESARROLLO.md        ← contexto antiguo (pre-separación de archivos)
└── PROMPT_CONTINUACION.md        ← prompts de sesiones anteriores

Procesos de Captacion Inmobiliaria - Noticias\
├── Codigo_Noticias_AppsScript.gs ← versión de referencia del backend
└── index_NUEVO_con_Noticias.html ← versión intermedia ya superada, ignorar
```

---

## Estado actual del proyecto

### Completado ✅
- Formulario Taratura completo (edificio, plantas, puertas, estados, vínculos, indicios, cartas)
- Pantalla de configuración de asesor y zona
- Autoguardado en localStorage + restauración al reabrir
- Exportación a Google Sheets vía Apps Script
- Módulo Buzones completo (lista, captura de fotos, IndexedDB, subida a Drive)
- Módulo Noticias básico (buscador, timeline, añadir nota, cerrar caso)
- Campo "Fecha de la Taratura" con flag para carga histórica en papel
- Vínculo "Visitar de Nuevo" añadido a VINCULOS_BTN
- Separación del código en index.html + style.css + app.js
- Rama `dev` creada en GitHub
- Documentación: ARCHITECTURE.md, GUIA_ASESORES.md, GUIA_RAMAS.md

### En desarrollo 🔧
- **Módulo Noticias** — la funcionalidad base existe pero necesita desarrollo adicional

### Pendiente 📋
- Dashboard en Google Sheets (con restricción RGPD: sin Nombre_Contacto ni Teléfono)
- Nuevos botones / funcionalidades por definir

---

## Restricciones importantes

- **RGPD España:** `Nombre_Contacto` (columna P) y `Telefono` (columna Q) son datos personales. No deben aparecer en dashboards, herramientas de análisis ni compartirse fuera de las hojas privadas.
- **Cuenta Gmail gratuita** (sin Google Workspace). El Apps Script tiene límites de cuota diaria.
- **Google Sheets debe permanecer privado.** No publicar la hoja ni compartir con acceso general.
- **Sin proceso de compilación.** Cualquier cambio debe funcionar directamente en el navegador sin pasos intermedios.
- **Sin dependencias externas.** No añadir librerías npm, CDN de terceros ni frameworks sin discutirlo antes.
