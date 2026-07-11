# Módulo Radar — Seguimiento de desarrollo

## Qué es
Base de datos compartida de demanda inmobiliaria. Registra personas que buscan alquilar, comprar o vender una propiedad y que han contactado con la oficina de forma inbound (llegaron solos, no por captación puerta a puerta).

El nombre del módulo en la app es **Radar**.

## Origen de los datos
Spreadsheet externo "Copia de Registro_Clientes_Inmobiliaria REDPISO SAN JOSÉ" (~40 registros).
Confirmar con el equipo si este archivo es el vivo o existe un original en paralelo, y en qué cuenta de Google vive.

---

## Decisiones tomadas

| | |
|---|---|
| **Nombre** | Radar |
| **Ubicación de datos** | Nueva hoja `Radar` en el spreadsheet master (`1mUPD1fJ9mJ...`) |
| **Visibilidad** | Todos los asesores ven todos los registros (sin filtro por asesor) |
| **Asignación** | Campo `Asesor_Asignado` opcional — se asigna por zona de interés del cliente |
| **Acceso en la app** | Desde home (grid) + desde ficha de Noticia para matching |
| **Navegación** | No entra en el tab bar inferior |
| **Home** | Grid 3 columnas × 2 filas (flexbox). Con 5 módulos los 2 de abajo se centran. Al agregar el 6º se alinean solos. |
| **Rol** | `Demandante` / `Oferente` |
| **Operación** | `Alquiler` / `Compra` / `Venta` |

---

## Esquema de la hoja `Radar`

| Campo | Valores / Tipo | Notas |
|-------|---------------|-------|
| `Radar_ID` | `RD-1234567890` | Único, generado al crear |
| `Fecha_Alta` | Fecha | Cuándo se registró |
| `Nombre` | Texto | |
| `Apellidos` | Texto | |
| `Telefono` | Texto | |
| `Rol` | `Demandante` / `Oferente` | |
| `Operacion` | `Alquiler` / `Compra` / `Venta` | |
| `Zonas_Interes` | Texto (múltiple) | **Pendiente: definir lista de zonas** |
| `Presupuesto_Max` | Número (€) | |
| `Plazo` | `Inmediato` / `1-3 meses` / `3-6 meses` / `+6 meses` | |
| `Hab_Min` | Número | |
| `Banos_Min` | Número | |
| `Requisitos` | Texto libre | |
| `Financiacion` | `Al contado` / `Hipoteca confirmada` / `Sin hipoteca` / `Pendiente` | |
| `Estado` | `Activo` / `En gestión` / `Cerrado` | |
| `Asesor_Asignado` | Nombre del asesor | Opcional |
| `Fecha_Ultimo_Contacto` | Fecha | |
| `Notas` | Texto libre | |

---

## Decisiones pendientes antes de arrancar desarrollo

1. **¿Seguimiento de contactos con historial?**
   - Opción simple: solo `Fecha_Ultimo_Contacto` + `Notas` (un campo, se sobreescribe)
   - Opción completa: hoja `Seguimiento_Radar` con timeline de cada llamada (igual que Noticias)
   - La opción completa añade más valor pero más desarrollo

2. **Zonas exactas de Zaragoza**
   - Necesarias para el filtro en la lista y para el matching con Noticias
   - Confirmar los nombres exactos que se usan en la app actualmente

3. **Criterios de matching con Noticias**
   - Cuando se abre una Noticia, ¿qué campos cruza con Radar? (Operación + Zona + Presupuesto)
   - ¿El match se muestra como lista dentro de la ficha de Noticia o abre la pantalla de Radar filtrada?

4. **Estado de cierre**
   - ¿Qué motivos de cierre se registran? (Encontró piso / Perdió interés / Sin respuesta / Caducó)
   - ¿O simplemente se marca Cerrado sin motivo?

5. **Migración de los 40 registros actuales**
   - Confirmar archivo vivo
   - Normalizar fechas y campos antes de importar (el spreadsheet actual tiene formatos irregulares)

---

## Qué hay que construir

### 1. Spreadsheet master
- Añadir hoja `Radar` con las columnas del esquema
- (Opcional) Añadir hoja `Seguimiento_Radar` si se elige historial completo

### 2. Apps Script
Nuevas acciones a añadir al script existente:

| Acción | Qué hace |
|--------|----------|
| `listar_radar` | Devuelve todos los contactos (sin filtro por asesor) |
| `get_ficha_radar` | Detalle de un contacto por `Radar_ID` |
| `crear_radar` | Agrega nuevo contacto a la hoja |
| `actualizar_radar` | Edita cualquier campo de un contacto |
| `cerrar_radar` | Marca contacto como Cerrado |
| `buscar_match_radar` | Filtra contactos por Operación + Zona (para matching desde Noticias) |

### 3. Frontend (`index.html` + `app.js` + `style.css`)

**Home**
- Cambiar grid de 2×2 a 3 columnas × 2 filas (flexbox, centrado automático)
- Botones ligeramente más pequeños
- Añadir botón Radar

**Pantalla Lista Radar**
- Buscador por nombre / teléfono / zona
- Filtros: Rol / Operación / Estado / Asesor
- Tarjetas: Nombre, Operación, Zonas, Presupuesto, Estado, Asesor_Asignado
- Botón "Nuevo contacto"

**Pantalla Ficha Radar**
- Header: Nombre completo + fecha de alta + Estado
- Campos: Rol, Operación, Zonas, Presupuesto, Plazo, Hab_Min, Baños_Min
- Requisitos, Financiación
- Asesor_Asignado
- Último contacto + Notas
- Botón cerrar contacto

**Integración en Noticias**
- Botón "Ver en Radar" dentro de la ficha de Noticia
- Llama a `buscar_match_radar` con la Operación y Zona de la noticia
- Muestra lista de contactos compatibles

---

## Checklist de deploy

- [ ] Confirmar archivo de datos vivo y cuenta de Google propietaria
- [ ] Resolver decisiones pendientes (historial, zonas, matching, cierre)
- [ ] Migrar y limpiar los ~40 registros existentes a la hoja `Radar`
- [ ] Añadir acciones al Apps Script y redesplegar el Web App (nueva URL o mismo deployment)
- [ ] Actualizar `APPS_SCRIPT_URL` en `app.js` si cambia la URL del deployment
- [ ] Desarrollar cambios en `index.html`, `app.js`, `style.css` en rama `dev`
- [ ] Probar en móvil antes de mergear a `main`
- [ ] Merge `dev` → `main` (producción en GitHub Pages)
- [ ] Actualizar `docs/GENERAL.md` con la nueva hoja y el nuevo módulo
