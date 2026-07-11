# Taratura — Pendiente: Sistema de Autenticación

**Estado:** Pendiente de desarrollo  
**Prioridad:** Alta — la app tiene datos sensibles y el repo es público

---

## Objetivo

Proteger la web app para que solo los asesores autorizados puedan acceder. Actualmente cualquiera con el link entra sin restricción.

---

## Qué se protege

- **La app** — pantalla de login antes de la home
- **El Apps Script** — cada llamada al servidor requiere un token válido, sin token se rechaza

---

## Cómo funciona

### Login
1. La app abre en una pantalla de login (nombre + contraseña)
2. El Apps Script valida las credenciales contra la hoja `Usuarios`
3. Si son correctas, devuelve un token de sesión
4. El token se guarda en `localStorage` del navegador — la sesión dura **30 días**
5. Las siguientes veces que abren la app, el token sigue válido y entran directo sin pedir nada

### Cada llamada al servidor
- Todas las acciones existentes (`listar_noticias`, `registrar`, etc.) incluirán el token
- El Apps Script lo valida antes de hacer nada
- Si no hay token o es inválido: respuesta de error, la app redirige al login

---

## Usuarios actuales

| Nombre | Estado |
|--------|--------|
| Francisco | Activo (admin) |
| Edis Irene | Activo |
| Maria Jose | Activo |
| Vanessa | Activo |

Los nombres ya están en la app (selector de asesor al inicio). El login reutilizará esa lista.

---

## Gestión de usuarios — panel de admin

Francisco tiene acceso a una sección **Usuarios** dentro de la app (solo visible para él). Desde ahí puede:

- **Crear** usuario nuevo: nombre, email, contraseña temporal
- **Desactivar** usuario: la cuenta queda bloqueada, los datos no se borran
- **Reactivar** usuario si vuelve

Los asesores desde su propia cuenta pueden:

- **Cambiar** su contraseña (desde ajustes de la app)
- **Resetear** si la olvidan (ver abajo)

---

## Reset de contraseña olvidada

1. En la pantalla de login, botón "Olvidé mi contraseña"
2. Eligen su nombre
3. El Apps Script genera un código temporal y lo envía a su email corporativo
4. Abren el email, pegan el código en la app
5. Crean contraseña nueva

### Email de envío — PENDIENTE DE DEFINIR

El Apps Script actualmente solo puede enviar desde la cuenta Google donde está instalado (`francisco@iamelia.com`).

**Lo que se quiere:** enviar desde el correo corporativo de redpiso.

**Opciones a evaluar cuando se retome:**
- `francisco.carracedo@redpiso.es` — email personal de Francisco en redpiso
- `sanjosezaragoza@redpiso.es` — email general de la oficina

**Cómo se haría técnicamente:** configurar "Enviar como" en Gmail apuntando al servidor IMAP de redpiso, o usar Apps Script con SMTP externo via `UrlFetchApp`. A definir.

**Mientras tanto:** el código llega desde `francisco@iamelia.com` con asunto claro *"Taratura — Código de recuperación"*. Funcional desde el primer día.

---

## Estructura técnica

### Hoja nueva en el Spreadsheet: `Usuarios`

| Columna | Descripción |
|---------|-------------|
| `Nombre` | Nombre del asesor (coincide con el selector actual) |
| `Email` | Email corporativo para reset |
| `Password_Hash` | Contraseña hasheada (no en texto plano) |
| `Activo` | TRUE / FALSE |
| `Token` | Token de sesión activo |
| `Token_Expira` | Fecha de expiración del token |
| `Reset_Codigo` | Código temporal de reset |
| `Reset_Expira` | Expiración del código (15 minutos) |
| `Es_Admin` | TRUE solo para Francisco |

### Acciones nuevas en Apps Script

| Acción | Qué hace |
|--------|----------|
| `login` | Valida nombre + password, devuelve token |
| `logout` | Invalida el token |
| `cambiar_password` | Valida password actual, actualiza hash |
| `solicitar_reset` | Genera código y envía email |
| `confirmar_reset` | Valida código y actualiza password |
| `crear_usuario` | Solo admin — crea nuevo usuario |
| `desactivar_usuario` | Solo admin — bloquea acceso |
| `reactivar_usuario` | Solo admin — restaura acceso |

### Cambios en acciones existentes

Todas las acciones actuales (`listar_noticias`, `registrar`, etc.) recibirán un campo `token` y lo validarán antes de ejecutarse.

### Frontend (`app.js` + `index.html`)

- Pantalla de login nueva (antes de la home)
- Al arrancar: comprobar token en `localStorage` → si válido, saltar al home → si no, mostrar login
- Sección "Usuarios" en ajustes (solo visible para admin)
- Opción "Cambiar contraseña" en ajustes (todos)
- Botón "Olvidé mi contraseña" en la pantalla de login

---

## Lo que queda por definir antes de desarrollar

- [ ] Emails corporativos de Edis Irene, Maria Jose y Vanessa
- [ ] Email de envío del reset (iamelia.com de momento, redpiso cuando se configure)
- [ ] Duración de la sesión (propuesta: 30 días)
- [ ] Duración del código de reset (propuesta: 15 minutos)
