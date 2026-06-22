# Guía de ramas: main y dev

## La analogía del escaparate y el taller

Imagina que tienes una tienda física.

El **escaparate** es lo que los clientes ven cuando pasan por la calle. Está siempre ordenado, siempre presentable. No puedes ponerte a reorganizarlo en plena hora punta con clientes dentro — si lo haces y algo sale mal, todos lo ven.

El **taller trasero** es donde preparas las cosas antes de sacarlas al escaparate. Puedes probar una nueva disposición, cambiar algo, equivocarte y corregirlo. Nadie lo ve hasta que tú decides que está listo y lo sacas adelante.

En este proyecto:

- **`main`** es el escaparate → la app que usan los asesores en su móvil ahora mismo
- **`dev`** es el taller → donde hacemos cambios sin que nadie los vea

---

## Por qué los separamos

Sin esta separación, cada cambio que hacemos va directamente a la app en vivo. Si cometemos un error — un botón que deja de funcionar, un formulario que no guarda — los asesores lo encuentran mientras están en la calle trabajando.

Con la separación, el flujo es:

```
Hacemos el cambio en dev
        ↓
Lo probamos (sin que nadie lo vea)
        ↓
Si funciona bien → lo pasamos a main
        ↓
Los asesores reciben la versión ya verificada
```

**`main` nunca recibe un cambio que no haya pasado antes por `dev`.**

---

## Cómo se ve esto en GitHub

Cuando entras al repositorio en `github.com/franciscoredpiso/taratura-form`, verás un botón arriba a la izquierda que dice `main` o `dev`. Ese botón te dice en qué rama estás mirando.

- Si dice **`main`** → estás viendo lo que tienen los asesores ahora mismo
- Si dice **`dev`** → estás viendo la versión de trabajo, donde están los cambios en curso

Son como dos "fotos" del proyecto que existen al mismo tiempo. Cada una tiene sus propios archivos.

---

## El proceso paso a paso para hacer un cambio

Cada vez que queramos añadir o modificar algo en la app, seguimos siempre el mismo orden:

### Paso 1 — Asegurarte de estar en `dev`
En GitHub, comprueba que el desplegable de rama dice `dev` antes de subir cualquier archivo.

### Paso 2 — Subir los archivos modificados a `dev`
- **Add file → Upload files**
- Arrastra solo los archivos que hayas cambiado (`index.html`, `app.js` o `style.css`)
- Escribe un mensaje breve que describa qué cambiaste (ej: *"Añadir campo de notas en buzones"*)
- Confirma que dice **"Commit directly to the `dev` branch"**

### Paso 3 — Probar
Abre el archivo `index.html` desde tu carpeta en el ordenador con Chrome. Verifica que el cambio funciona correctamente y que nada de lo que ya funcionaba se ha roto.

### Paso 4 — Pasar a producción (fusionar `dev` → `main`)
Cuando el cambio está verificado y listo:

1. Ve al repositorio en GitHub
2. Haz clic en **"Compare & pull request"** (aparece un banner cuando `dev` tiene cambios que `main` no tiene) — o ve a **Pull requests → New pull request**
3. Comprueba que dice `base: main ← compare: dev`
4. Haz clic en **"Merge pull request"** → **"Confirm merge"**
5. En 1-2 minutos, GitHub actualiza automáticamente la app en producción

---

## Qué NO hacer nunca

- **No subas archivos directamente a `main`** salvo que sea documentación que no afecte al funcionamiento de la app (como este mismo documento).
- **No fusiones `dev` en `main` sin haber probado** que la app funciona correctamente en local primero.

---

## Resumen en una frase

> `dev` es donde se trabaja. `main` es donde viven los asesores. Solo pasa algo de `dev` a `main` cuando está verificado.

---

## Señales de que algo salió mal en producción

Si después de un merge los asesores reportan que algo no funciona:

1. No entres en pánico — el historial de cambios en GitHub guarda todas las versiones anteriores
2. Avisa al desarrollador con el que estés trabajando y describe qué dejó de funcionar
3. Se puede revertir cualquier cambio de forma segura
