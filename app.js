// ─────────────────────────────────────────────
//  CONFIG
// ─────────────────────────────────────────────
const PISOS = [
    'Bajo', 'Entrepiso', 'Principal',
    '1º', '2º', '3º', '4º', '5º', '6º', '7º', '8º',
    '9º', '10º', '11º', '12º', '13º', '14º', '15º',
    'Ático', 'Sobreático'
]; // '_custom' se añade al final del select automáticamente
const PUERTAS = ['A', 'B', 'C', 'D', 'E', 'F', 'Dcha', 'Izda', 'Único'];
const ESC_OPTIONS = [
    'Escalera Centro', 'Escalera Izquierda', 'Escalera Derecha',
    'Torre 1', 'Torre 2', 'Torre 3',
    'Bloque A', 'Bloque B', 'Bloque C',
    '_custom'
];
const ESC_LABELS = {
    'Escalera Centro': 'Escalera Centro',
    'Escalera Izquierda': 'Escalera Izquierda',
    'Escalera Derecha': 'Escalera Derecha',
    'Torre 1': 'Torre 1', 'Torre 2': 'Torre 2', 'Torre 3': 'Torre 3',
    'Bloque A': 'Bloque A', 'Bloque B': 'Bloque B', 'Bloque C': 'Bloque C',
    '_custom': 'Personalizado...'
};
// ─────────────────────────────────────────────
//  FECHA DE LA TARATURA
// ─────────────────────────────────────────────
// ⚠️ TEMPORAL: mientras se digitaliza el histórico en papel, el asesor
// puede corregir la fecha para que refleje cuándo se hizo la visita real,
// no el día en que se carga el dato. Cuando se termine esa carga, cambiar
// esto a `false` — es la ÚNICA línea que hay que tocar. El campo se
// bloquea solo y siempre se fuerza a "hoy" (también del lado del
// servidor, ver Fecha_Visita en taratura_script.gs, por si alguien edita
// el HTML con las herramientas de desarrollador para saltarse el bloqueo).
const FECHA_VISITA_EDITABLE = true;

function todayLocalISO(d = new Date()) {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function isoToEsDate(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
}
function setFechaHoy() {
    document.getElementById('fFecha').value = todayLocalISO();
    autoSave();
}
function applyFechaPolicy() {
    const el   = document.getElementById('fFecha');
    const hint = document.getElementById('fFechaHint');
    const hoy  = document.getElementById('fFechaHoyWrap');
    if (!el.value) el.value = todayLocalISO();
    if (!FECHA_VISITA_EDITABLE) {
        el.value    = todayLocalISO();   // ignora cualquier fecha restaurada de localStorage
        el.readOnly = true;
        el.disabled = true;
        hint.textContent = '🔒 Bloqueada — se registra siempre la fecha de hoy.';
        hoy.style.display = 'none';
    } else {
        el.readOnly = false;
        el.disabled = false;
        hint.textContent = 'Se autocompleta con hoy. Cámbiala solo para cargar taraturas en papel ya realizadas.';
        hoy.style.display = '';
    }
}

const ESTADOS = [
    { v: '',                 l: '★ Estado (obligatorio)', c: '' },
    { v: 'Habitado',         l: '🏘️ Habitado',            c: 's-habit' },
    { v: 'Deshabitado',      l: '⚫ Deshabitado',          c: 's-deshab' },
    { v: 'No Contesta',      l: '🟠 No Contesta',         c: 's-no-cont' },
    { v: 'Noticia',          l: '🔎 Noticia',             c: 's-noticia' },
    { v: '_otro',            l: '✏️ Otro',                c: 's-sin-dat' },
];
const VINCULOS_BTN = [
    { v: 'Propietario/a',            icon: '🏠' },
    { v: 'Inquilino/a',              icon: '🔑' },
    { v: 'Familiar',                 icon: '👨‍👩‍👧' },
    { v: 'Viven (no especifica)',    icon: '👥' },
    { v: 'En Venta',                 icon: '🏷️' },
    { v: 'En Alquiler',              icon: '🔖' },
    { v: 'Sospechoso (parece vacío)', icon: '🕵️' },
    { v: 'Vacío',                    icon: '📭' },
    { v: 'Vecino amigo',             icon: '🤝' },
    { v: 'Portero / Conserje',       icon: '🏢' },
    { v: 'Presidente de Comunidad',  icon: '👔' },
    { v: 'Administrador',            icon: '📋' },
    { v: 'Visitar de Nuevo',         icon: '🔁' },
    { v: 'Sin vínculo',              icon: '—' },
];
const INDICIOS = [
    { icon: '🪟', label: 'Persianas siempre bajas' },
    { icon: '🔔', label: 'Timbre no funciona' },
    { icon: '👶', label: 'Niños / bebés' },
    { icon: '🐕', label: 'Perro ladrando' },
    { icon: '🟫', label: 'Con felpudo' },
    { icon: '⬜', label: 'Sin felpudo' },
    { icon: '🚪', label: 'Puerta en mal estado (sucia, polvo, telarañas)' },
    { icon: '🚨', label: 'Cartel de alarma' },
    { icon: '🕳️', label: 'Mirilla' },
];

// ─────────────────────────────────────────────
//  STATE
// ─────────────────────────────────────────────
let floorSeq = 0;
let doorSeq  = 0;
let savedSinceLastEdit = false; // true después de exportar; false cuando el usuario edita

// ─────────────────────────────────────────────
//  SETUP SCREEN
// ─────────────────────────────────────────────
function selectZona(btn) {
    // Deselect all zona buttons
    document.querySelectorAll('.zona-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    document.getElementById('setupZona').value = btn.dataset.zona;
    checkSetupReady();
}

function showSetup(fromHeader) {
    const screen     = document.getElementById('setupScreen');
    const asesorSel  = document.getElementById('setupAsesor');
    const savedPill  = document.getElementById('setupSavedPill');
    const cancelWrap = document.getElementById('setupCancelWrap');

    // Pre-fill with current values if already set
    const currentAsesor = localStorage.getItem('tz_asesor') || '';
    let   currentZona   = localStorage.getItem('tz_zona')   || '';
    if (currentAsesor) asesorSel.value = currentAsesor;

    // Migrar zona antigua sin color
    const zonaMigration = {'Zona 1':'Zona 1 - Rosa','Zona 2':'Zona 2 - Naranja','Zona 3':'Zona 3 - Verde','Zona 4':'Zona 4 - Morado','Zona 5':'Zona 5 - Amarilla'};
    if (currentZona && zonaMigration[currentZona]) {
        currentZona = zonaMigration[currentZona];
        localStorage.setItem('tz_zona', currentZona);
    }

    // Re-apply selected zona button
    document.querySelectorAll('.zona-btn').forEach(b => b.classList.remove('selected'));
    if (currentZona) {
        const match = document.querySelector(`.zona-btn[data-zona="${currentZona}"]`);
        if (match) {
            match.classList.add('selected');
            document.getElementById('setupZona').value = currentZona;
        }
    }

    // If called from header, show cancel button and saved indicator
    if (fromHeader && currentAsesor && currentZona) {
        savedPill.classList.add('show');
        cancelWrap.style.display = 'block';
    } else {
        savedPill.classList.remove('show');
        cancelWrap.style.display = 'none';
    }

    checkSetupReady();
    screen.classList.remove('hidden');
}

function cancelSetup() {
    document.getElementById('setupScreen').classList.add('hidden');
}

function checkSetupReady() {
    const asesor = document.getElementById('setupAsesor').value;
    const zona   = document.getElementById('setupZona').value;
    document.getElementById('setupBtn').disabled = !(asesor && zona);
}

function completeSetup() {
    const asesor = document.getElementById('setupAsesor').value;
    const zona   = document.getElementById('setupZona').value;
    if (!asesor || !zona) return;

    localStorage.setItem('tz_asesor', asesor);
    localStorage.setItem('tz_zona',   zona);

    document.getElementById('fAsesor').value = asesor;
    document.getElementById('fZona').value   = zona;

    // Update header badge with zone color dot
    const zonaBtn = document.querySelector(`.zona-btn[data-zona="${zona}"]`);
    const dotClass = zonaBtn ? [...zonaBtn.classList].find(c => c.startsWith('zona-') && c !== 'zona-btn') : '';
    const colorMap = { 'zona-1':'#f472b6','zona-2':'#fb923c','zona-3':'#4ade80','zona-4':'#a78bfa','zona-5':'#facc15' };
    const color = colorMap[dotClass] || '#94a3b8';
    const badge = document.getElementById('headerBadge');
    badge.innerHTML = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:5px;vertical-align:middle"></span>${asesor} · ${zona}`;

    document.getElementById('setupScreen').classList.add('hidden');
    showToast(`Sesión iniciada: ${asesor} · ${zona}`);
    showScreen('home');
}

// ─────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
//  AUTOCOMPLETAR CALLE — maestro IGN (Redes de Transporte, IGR-RT)
//  Fuente: calles_zaragoza.csv en la raíz del repo (mismo nivel que
//  index.html y logo.png). Si el archivo no existe todavía, el campo
//  se comporta exactamente igual que antes (texto libre, sin romper nada).
//  Formato esperado del CSV: cabecera con una columna "nombre" (y opcional
//  "codigo"). Si no hay cabecera "nombre", se usa la primera columna.
// ─────────────────────────────────────────────
const CALLE_AC = { entries: [], available: false, loading: false, timers: {} };

function normCalle(s) {
    return (s || '')
        .toString()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar tildes
        .toLowerCase()
        .replace(/[.,;:()]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function tokenizeCalle(s) {
    const n = normCalle(s);
    return n ? n.split(' ').filter(Boolean) : [];
}

function parseCallesCsv(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (!lines.length) return [];
    const splitRow = (line) => {
        // CSV simple con soporte de campos entre comillas
        const out = []; let cur = ''; let inQ = false;
        for (let i = 0; i < line.length; i++) {
            const c = line[i];
            if (inQ) {
                if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
                else cur += c;
            } else {
                if (c === '"') inQ = true;
                else if (c === ',') { out.push(cur); cur = ''; }
                else cur += c;
            }
        }
        out.push(cur);
        return out.map(v => v.trim());
    };
    const header = splitRow(lines[0]).map(h => h.toLowerCase());
    let idxNombre = header.indexOf('nombre');
    let idxCodigo = header.indexOf('codigo');
    let startRow = 1;
    if (idxNombre === -1) { idxNombre = 0; startRow = 0; } // no hay cabecera reconocible, usar 1ª columna desde la fila 0
    const out = [];
    for (let i = startRow; i < lines.length; i++) {
        const row = splitRow(lines[i]);
        const nombre = (row[idxNombre] || '').trim();
        if (!nombre) continue;
        out.push({ nombre, codigo: idxCodigo > -1 ? row[idxCodigo] : '', tokens: tokenizeCalle(nombre) });
    }
    return out;
}

async function loadCallesIndex() {
    if (CALLE_AC.loading || CALLE_AC.available) return;
    CALLE_AC.loading = true;
    try {
        const res = await fetch('calles_zaragoza.csv', { cache: 'no-cache' });
        if (!res.ok) throw new Error('sin maestro de calles (HTTP ' + res.status + ')');
        const text = await res.text();
        CALLE_AC.entries = parseCallesCsv(text);
        CALLE_AC.available = CALLE_AC.entries.length > 0;
        if (CALLE_AC.available) console.info(`Callejero IGR-RT cargado: ${CALLE_AC.entries.length} calles`);
    } catch (e) {
        // Degradación esperada hasta que se suba calles_zaragoza.csv: el campo sigue funcionando como texto libre.
        console.warn('Autocompletar de calle inactivo:', e.message);
        CALLE_AC.available = false;
    } finally {
        CALLE_AC.loading = false;
    }
}

function matchCalles(query, limit = 8) {
    const qTokens = tokenizeCalle(query);
    if (!qTokens.length) return [];
    const matches = [];
    for (const entry of CALLE_AC.entries) {
        const ok = qTokens.every(qt => entry.tokens.some(t => t.startsWith(qt)));
        if (ok) matches.push(entry);
    }
    matches.sort((a, b) => a.nombre.length - b.nombre.length || a.nombre.localeCompare(b.nombre));
    return matches.slice(0, limit);
}

function calleAcInput(fieldId) {
    if (!CALLE_AC.available) return; // sin maestro cargado: comportamiento de texto libre, sin tocar nada más
    clearTimeout(CALLE_AC.timers[fieldId]);
    CALLE_AC.timers[fieldId] = setTimeout(() => renderCalleAc(fieldId), 100);
}

function renderCalleAc(fieldId) {
    const input = document.getElementById(fieldId);
    const list = document.getElementById(fieldId + '_ac');
    const hint = document.getElementById(fieldId + '_hint');
    if (!input || !list) return;
    const val = input.value;
    const matches = val.trim() ? matchCalles(val) : [];
    list.innerHTML = '';
    if (matches.length) {
        matches.forEach(m => {
            const item = document.createElement('div');
            item.className = 'calle-ac-item';
            item.textContent = m.nombre;
            item.onmousedown = (ev) => { ev.preventDefault(); calleAcPick(fieldId, m.nombre); };
            list.appendChild(item);
        });
        list.classList.add('open');
    } else {
        list.classList.remove('open');
    }
    if (hint) {
        const exacto = CALLE_AC.entries.some(e => normCalle(e.nombre) === normCalle(val));
        if (val.trim() && !exacto && !matches.length) {
            hint.style.display = 'block';
            hint.classList.add('warn');
            hint.textContent = '⚠ No está en el callejero oficial IGN — se guardará igual, revisa la grafía.';
        } else {
            hint.style.display = 'none';
        }
    }
}

function calleAcPick(fieldId, nombre) {
    const input = document.getElementById(fieldId);
    input.value = nombre;
    const list = document.getElementById(fieldId + '_ac');
    if (list) { list.classList.remove('open'); list.innerHTML = ''; }
    const hint = document.getElementById(fieldId + '_hint');
    if (hint) hint.style.display = 'none';
    if (fieldId === 'fCalle') autoSave();
    input.focus();
}

function calleAcBlur(fieldId) {
    setTimeout(() => {
        const list = document.getElementById(fieldId + '_ac');
        if (list) list.classList.remove('open');
    }, 150);
}

function init() {
    const p = new URLSearchParams(location.search);
    // URL params override localStorage (útil para QR codes por asesor)
    const zona   = p.get('zona')   || localStorage.getItem('tz_zona')   || '';
    const asesor = p.get('asesor') || localStorage.getItem('tz_asesor') || '';

    if (zona)   { document.getElementById('fZona').value   = zona;   localStorage.setItem('tz_zona', zona); }
    if (asesor) { document.getElementById('fAsesor').value = asesor; localStorage.setItem('tz_asesor', asesor); }

    // Build header badge with color dot if zona is set
    const colorMap = { 'Zona 1 - Rosa':'#f472b6','Zona 2 - Naranja':'#fb923c','Zona 3 - Verde':'#4ade80','Zona 4 - Morado':'#a78bfa','Zona 5 - Amarilla':'#facc15' };
    const color = colorMap[zona] || '';
    const badge = document.getElementById('headerBadge');
    const label = [asesor, zona].filter(Boolean).join(' · ') || 'Sin asignar';
    if (color && asesor) {
        badge.innerHTML = `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color};margin-right:5px;vertical-align:middle"></span>${label}`;
    } else {
        badge.textContent = label;
    }

    // Si no hay asesor o zona → mostrar pantalla de configuración
    if (!asesor || !zona) {
        showSetup(false);
    }

    restoreState();
    applyFechaPolicy();
    if (!document.querySelector('.floor-card')) addFloor();

    loadCallesIndex();

    initSwipe();
    const lastScreen = localStorage.getItem('tz_lastScreen') || 'home';
    showScreen((asesor && zona) ? lastScreen : 'home');
}

// ─────────────────────────────────────────────
//  BUILDING FEATURES
// ─────────────────────────────────────────────
function toggleFeat(el) {
    el.classList.toggle('on');
    autoSave();
}

function toggleAdminFeat(el) {
    el.classList.toggle('on');
    const isOn = el.classList.contains('on');
    const panel = document.getElementById('adminPanel');
    panel.style.display = isOn ? 'flex' : 'none';
    if (!isOn) {
        document.getElementById('adminEmpresa').value = '';
        document.getElementById('adminTelefono').value = '';
    }
    autoSave();
}

function toggleOtros() {
    const feat = document.getElementById('otrosFeat');
    const wrap = document.getElementById('otrosWrap');
    feat.classList.toggle('on');
    const isOn = feat.classList.contains('on');
    wrap.classList.toggle('show', isOn);
    if (isOn) document.getElementById('otrosTagInput').focus();
    autoSave();
}

function toggleTipoOtros() {
    const feat = document.getElementById('tipoOtrosFeat');
    const wrap = document.getElementById('tipoOtrosWrap');
    feat.classList.toggle('on');
    const isOn = feat.classList.contains('on');
    wrap.classList.toggle('show', isOn);
    if (isOn) document.getElementById('tipoOtrosTagInput').focus();
    autoSave();
}

function otrosKeydown(e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    otrosAddBtn();
}
function otrosAddBtn() {
    const input = document.getElementById('otrosTagInput');
    const val   = input.value.trim();
    if (!val) return;
    addOtrosTag(val, 'otrosList');
    input.value = '';
    autoSave();
}

function tipoOtrosKeydown(e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    tipoOtrosAddBtn();
}
function tipoOtrosAddBtn() {
    const input = document.getElementById('tipoOtrosTagInput');
    const val   = input.value.trim();
    if (!val) return;
    addOtrosTag(val, 'tipoOtrosList');
    input.value = '';
    autoSave();
}

function addOtrosTag(text, listId) {
    const list = document.getElementById(listId || 'otrosList');
    const tag  = document.createElement('div');
    tag.className = 'otros-tag';
    tag.innerHTML = `${text}<button class="otros-tag-del" onclick="removeOtrosTag(this)" title="Eliminar">×</button>`;
    list.appendChild(tag);
}

function removeOtrosTag(btn) {
    btn.closest('.otros-tag').remove();
    autoSave();
}

function getOtrosTags() {
    return [...document.querySelectorAll('#otrosList .otros-tag')]
           .map(t => t.childNodes[0].textContent.trim());
}

function getTipoOtrosTags() {
    return [...document.querySelectorAll('#tipoOtrosList .otros-tag')]
           .map(t => t.childNodes[0].textContent.trim());
}

// ── Vínculo multi-select helpers ──
function toggleVinculo(el, did) {
    el.classList.toggle('on');
    autoSave();
    refreshSectionChips(did + 'VincBtns', did + 'VincChips');
    scheduleSectionClose(did + 'VincToggle');
}
function getVinculos(did) {
    return [...document.querySelectorAll(`#${did}VincBtns .vinculo-btn.on`)]
           .map(el => el.dataset.value);
}
function setVinculos(did, values) {
    document.querySelectorAll(`#${did}VincBtns .vinculo-btn`).forEach(btn => {
        btn.classList.toggle('on', values.includes(btn.dataset.value));
    });
}


// ─────────────────────────────────────────────
//  ADD FLOOR
// ─────────────────────────────────────────────
function addFloor(savedPiso, fromRestore) {
    // Colapsar pisos existentes al añadir uno nuevo (solo desde botón, no desde restore)
    if (!fromRestore) {
        document.querySelectorAll('#floorsWrap .floor-card').forEach(card => {
            if (!card.classList.contains('collapsed')) {
                card.classList.add('collapsed');
                const b = document.getElementById(card.id + 'CollapseBtn');
                if (b) b.textContent = '▶';
                refreshFloorSummary(card.id);
            }
        });
    }

    floorSeq++;
    const fid = 'f' + floorSeq;

    const used = [...document.querySelectorAll('.piso-select')].map(s => s.value);
    let suggestion = savedPiso || '';
    if (!suggestion) {
        // Sugerir el piso inmediatamente inferior al último añadido (orden descendente)
        const existingCards = [...document.querySelectorAll('#floorsWrap .floor-card')];
        if (existingCards.length > 0) {
            const lastFid  = existingCards[existingCards.length - 1].id;
            const lastPiso = getPisoValue(lastFid);
            const idx      = PISOS.indexOf(lastPiso);
            if (idx > 0) {
                for (let i = idx - 1; i >= 0; i--) {
                    if (!used.includes(PISOS[i])) { suggestion = PISOS[i]; break; }
                }
            }
        }
        // Fallback: primer piso sin usar en orden ascendente
        if (!suggestion) {
            for (const p of PISOS) { if (!used.includes(p)) { suggestion = p; break; } }
        }
    }

    const pisoOpts = PISOS.map(p =>
        `<option value="${p}"${p === suggestion ? ' selected' : ''}>${p}</option>`
    ).join('') + `<option value="_custom"${suggestion === '_custom' ? ' selected' : ''}>✏️ Otro (escribir)...</option>`;

    const escOpts = Object.entries(ESC_LABELS).map(([v, l]) =>
        `<option value="${v}">${l}</option>`
    ).join('');

    const div = document.createElement('div');
    div.className = 'floor-card';
    div.id = fid;
    div.innerHTML = `
        <div class="floor-header">
            <button class="btn-icon btn-collapse" id="${fid}CollapseBtn"
                    onclick="toggleFloor('${fid}')" title="Expandir / Colapsar">▼</button>
            <span class="floor-num">Planta</span>
            <select class="piso-select" id="${fid}P" onchange="onPisoChange('${fid}')">${pisoOpts}</select>
            <input type="text" class="piso-custom" id="${fid}PCustom"
                   placeholder="Ej: Entresuelo, 16º..." oninput="autoSave()">
            <span class="floor-summary" id="${fid}Summary"></span>
            <button class="btn-icon btn-esc" id="${fid}EscBtn"
                    onclick="toggleEsc('${fid}')" title="Escalera / Bloque">🏗️</button>
            <button class="btn-icon btn-del" onclick="removeFloor('${fid}')">×</button>
        </div>
        <div class="esc-panel" id="${fid}EscPanel">
            <select class="esc-select" id="${fid}EscSel" onchange="onEscChange('${fid}')">
                <option value="">Escalera / Bloque...</option>
                ${escOpts}
            </select>
            <input type="text" class="esc-custom" id="${fid}EscCustom"
                   placeholder="Nombre escalera o bloque..." oninput="onEscCustomInput('${fid}')">
        </div>
        <div class="doors-list" id="${fid}D"></div>
        <div class="floor-add-row" style="padding:0 12px 4px">
            <button class="btn-add-door" onclick="addDoor('${fid}')">+ Añadir Puerta</button>
        </div>
    `;
    document.getElementById('floorsWrap').appendChild(div);

    // Heredar escalera de la planta anterior (solo al añadir manualmente, no en restore)
    if (!fromRestore) {
        const allFloors = [...document.querySelectorAll('#floorsWrap .floor-card')];
        if (allFloors.length >= 2) {
            const prevFid = allFloors[allFloors.length - 2].id;
            const prevSel = document.getElementById(prevFid + 'EscSel');
            if (prevSel?.value) {
                const prevCustom = document.getElementById(prevFid + 'EscCustom');
                propagateEscalera(prevFid, prevSel.value, prevCustom?.value || '');
            }
        }
    }

    if (!fromRestore) {
        // Copiar los nombres de puerta de la planta anterior (A/B/C, Izq/Dcha, 1/2/3...)
        const allFloors = [...document.querySelectorAll('#floorsWrap .floor-card')];
        let copied = false;
        if (allFloors.length >= 2) {
            const prevFid      = allFloors[allFloors.length - 2].id;
            const prevDoorNames = [...document.querySelectorAll(`#${prevFid}D .puerta-input`)]
                                    .map(i => i.value).filter(Boolean);
            if (prevDoorNames.length > 0) {
                prevDoorNames.forEach(puerta => addDoor(fid, { puerta }));
                copied = true;
            }
        }
        if (!copied) addDoor(fid);
    } else {
        addDoor(fid); // restore lo limpia inmediatamente y repone las puertas guardadas
    }
    refreshSummary();
}

function removeFloor(fid) {
    if (document.querySelectorAll('.floor-card').length <= 1) {
        showToast('Debe quedar al menos una planta');
        return;
    }
    if (!confirm('¿Eliminar esta planta y todas sus puertas?')) return;
    document.getElementById(fid).remove();
    refreshSummary();
    refreshCartaList();
    autoSave();
}

function onPisoChange(fid) {
    const sel    = document.getElementById(fid + 'P');
    const custom = document.getElementById(fid + 'PCustom');
    if (sel.value === '_custom') {
        custom.classList.add('show');
        custom.focus();
    } else {
        custom.classList.remove('show');
        custom.value = '';
    }
    autoSave();
}

// Returns the display value of piso (custom text if selected, otherwise select value)
function getPisoValue(fid) {
    const sel = document.getElementById(fid + 'P');
    if (sel?.value === '_custom') {
        return document.getElementById(fid + 'PCustom')?.value.trim() || 'Planta personalizada';
    }
    return sel?.value ?? '';
}

function toggleEsc(fid) {
    const panel = document.getElementById(fid + 'EscPanel');
    const btn   = document.getElementById(fid + 'EscBtn');
    panel.classList.toggle('open');
    btn.classList.toggle('on');
    autoSave();
}

function onEscChange(fid) {
    const sel    = document.getElementById(fid + 'EscSel');
    const custom = document.getElementById(fid + 'EscCustom');
    custom.classList.toggle('show', sel.value === '_custom');
    if (sel.value === '_custom') custom.focus();
    propagateEscalera(fid, sel.value, custom.value);
    autoSave();
}

function onEscCustomInput(fid) {
    const sel    = document.getElementById(fid + 'EscSel');
    const custom = document.getElementById(fid + 'EscCustom');
    if (sel?.value === '_custom') propagateEscalera(fid, '_custom', custom.value);
    autoSave();
}

function propagateEscalera(fid, escVal, escCustomVal) {
    const allFloors = [...document.querySelectorAll('#floorsWrap .floor-card')];
    const idx = allFloors.findIndex(f => f.id === fid);
    if (idx === -1) return;
    allFloors.slice(idx + 1).forEach(floorEl => {
        const nfid    = floorEl.id;
        const nSel    = document.getElementById(nfid + 'EscSel');
        const nCustom = document.getElementById(nfid + 'EscCustom');
        const nPanel  = document.getElementById(nfid + 'EscPanel');
        const nBtn    = document.getElementById(nfid + 'EscBtn');
        if (!nSel) return;
        if (escVal && !nPanel.classList.contains('open')) {
            nPanel.classList.add('open');
            if (nBtn) nBtn.classList.add('on');
        } else if (!escVal) {
            nPanel.classList.remove('open');
            if (nBtn) nBtn.classList.remove('on');
        }
        nSel.value = escVal;
        if (escVal === '_custom') {
            nCustom.classList.add('show');
            nCustom.value = escCustomVal;
        } else {
            nCustom.classList.remove('show');
            nCustom.value = '';
        }
    });
}

function toggleFloor(fid) {
    const card = document.getElementById(fid);
    const btn  = document.getElementById(fid + 'CollapseBtn');
    const isCollapsed = card.classList.toggle('collapsed');
    btn.textContent = isCollapsed ? '▶' : '▼';
    if (isCollapsed) refreshFloorSummary(fid);
    autoSave();
}

function refreshFloorSummary(fid) {
    const summary = document.getElementById(fid + 'Summary');
    if (!summary) return;
    const piso = getPisoValue(fid) || 'Planta';
    const escSel    = document.getElementById(fid + 'EscSel');
    const escCustom = document.getElementById(fid + 'EscCustom');
    let esc = '';
    if (escSel?.value === '_custom') {
        esc = escCustom?.value.trim() || 'Personalizada';
    } else if (escSel?.value) {
        esc = ESC_LABELS[escSel.value] || escSel.value;
    }
    const doorCount = document.querySelectorAll(`#${fid}D .door-wrap`).length;
    let text = piso;
    if (esc) text += ' · ' + esc;
    text += ' · ' + doorCount + (doorCount === 1 ? ' puerta' : ' puertas');
    summary.textContent = text;
}

// ─────────────────────────────────────────────
//  ADD DOOR
// ─────────────────────────────────────────────
function addDoor(fid, data) {
    doorSeq++;
    const did = 'd' + doorSeq;

    const used = [...document.querySelectorAll(`#${fid}D .puerta-input`)].map(i => i.value);
    let sugPuerta = data?.puerta ?? '';
    if (!sugPuerta) {
        for (const l of PUERTAS) { if (!used.includes(l)) { sugPuerta = l; break; } }
    }

    const selectedEstado = data?.estado ?? '';
    const estadoOpts = ESTADOS.map(e => {
        let attrs = '';
        if (e.v === '') attrs += ' disabled';
        if (e.v === selectedEstado) attrs += ' selected';
        if (e.v === '' && !selectedEstado) attrs += ' selected';
        return `<option value="${e.v}"${attrs}>${e.l}</option>`;
    }).join('');

    // Backward compat: vinculo (string) → vinculos (array)
    const savedVinculos = data?.vinculos ?? (data?.vinculo ? [data.vinculo] : []);
    const vincGrid = VINCULOS_BTN.map(v =>
        `<div class="vinculo-btn${savedVinculos.includes(v.v) ? ' on' : ''}" data-value="${v.v}" onclick="toggleVinculo(this,'${did}')">
            <span class="vb-icon">${v.icon}</span> ${v.v}
        </div>`
    ).join('');

    const isOtroEst  = selectedEstado === '_otro';
    const otroEstVal = data?.otroEst ?? '';
    const cartaOn    = data?.carta   ?? false;

    const indiciosHtml = INDICIOS.map((ind, i) => {
        const isOn = data?.indicios?.includes(ind.label);
        return `
        <div class="indicio-item${isOn ? ' on' : ''}" id="${did}Ind${i}" onclick="toggleIndicio('${did}Ind${i}')">
            <input type="checkbox"${isOn ? ' checked' : ''}>
            <span class="ind-icon">${ind.icon}</span> ${ind.label}
        </div>`;
    }).join('');

    const wrap = document.createElement('div');
    wrap.className = 'door-wrap';
    wrap.id = did + 'W';
    wrap.innerHTML = `
        <div class="door-row">
            <input class="puerta-input" id="${did}Pta"
                   value="${sugPuerta}" placeholder="Pta"
                   oninput="autoSave()">
            <select class="estado-select" id="${did}Est" required
                    onchange="onEstadoChange(this, '${did}')">
                ${estadoOpts}
            </select>
            <button class="btn-carta${cartaOn ? ' on' : ''}" id="${did}Carta"
                    onclick="toggleCarta('${did}')" title="Dejar carta">✉️</button>
            <button class="btn-more" id="${did}Btn" onclick="toggleDetail('${did}')" title="Ver / cerrar detalles"></button>
            <button class="btn-icon btn-del" onclick="removeDoor('${fid}','${did}')">×</button>
        </div>
        <div class="otro-est-panel${isOtroEst ? ' show' : ''}" id="${did}OtroPanel">
            <input type="text" id="${did}OtroEst"
                   placeholder="Describe el estado (ej: Vacío legal, Herencia...)"
                   value="${otroEstVal}" oninput="autoSave()">
        </div>
        <div class="door-detail" id="${did}Det">
            <div class="detail-section">
                <button class="ds-toggle" id="${did}VincToggle" onclick="toggleDoorSection(this)">
                    Vínculo con el Inmueble
                    <span class="ds-chips" id="${did}VincChips"></span>
                    <span class="ds-chevron">▶</span>
                </button>
                <div class="ds-body">
                    <div class="vinculo-grid" id="${did}VincBtns">${vincGrid}</div>
                </div>
            </div>
            <div class="detail-section">
                <button class="ds-toggle" id="${did}IndToggle" onclick="toggleDoorSection(this)">
                    Información adicional
                    <span class="ds-chips" id="${did}IndChips"></span>
                    <span class="ds-chevron">▶</span>
                </button>
                <div class="ds-body">
                    <div class="indicios-grid" id="${did}IndGrid">${indiciosHtml}</div>
                </div>
            </div>
            <div>
                <div class="mini-label">Observaciones</div>
                <textarea id="${did}Obs" placeholder="Notas libres..." oninput="autoSave()">${data?.obs ?? ''}</textarea>
            </div>
            <div>
                <div class="mini-label">Nombre contacto (opcional)</div>
                <input type="text" id="${did}Nom" placeholder="Solo si hubo contacto directo"
                       value="${data?.nombre ?? ''}" oninput="autoSave()">
            </div>
            <div>
                <div class="mini-label">Teléfono (opcional)</div>
                <input type="tel" id="${did}Tel" placeholder="612 345 678"
                       value="${data?.tel ?? ''}" oninput="autoSave()">
            </div>
        </div>
    `;

    document.getElementById(fid + 'D').appendChild(wrap);

    const sel = document.getElementById(did + 'Est');
    paintEstado(sel);

    // Al añadir puerta nueva (no desde restore), colapsar las otras puertas del piso
    if (!data) {
        document.querySelectorAll(`#${fid}D .door-wrap`).forEach(wrap => {
            const otherId = wrap.id.replace('W', '');
            document.getElementById(otherId + 'Det')?.classList.remove('open');
            document.getElementById(otherId + 'Btn')?.classList.remove('open');
        });
    }

    // Open detail panel by default (unless explicitly saved as closed)
    if (data?.detailOpen ?? true) {
        document.getElementById(did + 'Det').classList.add('open');
        document.getElementById(did + 'Btn').classList.add('open');
    }

    // Mostrar resumen de chips si hay datos guardados
    refreshSectionChips(did + 'VincBtns', did + 'VincChips');
    refreshSectionChips(did + 'IndGrid',  did + 'IndChips');

    refreshSummary();
    refreshCartaList();
}

function removeDoor(fid, did) {
    if (document.querySelectorAll(`#${fid}D .door-wrap`).length <= 1) {
        showToast('Debe quedar al menos una puerta');
        return;
    }
    document.getElementById(did + 'W').remove();
    refreshSummary();
    refreshCartaList();
    autoSave();
}

// ─────────────────────────────────────────────
//  UI HELPERS
// ─────────────────────────────────────────────
function toggleDetail(did) {
    const det = document.getElementById(did + 'Det');
    const isOpening = !det.classList.contains('open');

    if (isOpening) {
        // Cerrar todas las demás puertas de la misma planta
        const thisWrap = document.getElementById(did + 'W');
        thisWrap?.closest('.doors-list')?.querySelectorAll('.door-wrap').forEach(wrap => {
            const otherId = wrap.id.replace('W', '');
            if (otherId !== did) {
                document.getElementById(otherId + 'Det')?.classList.remove('open');
                document.getElementById(otherId + 'Btn')?.classList.remove('open');
            }
        });
    }

    det.classList.toggle('open');
    document.getElementById(did + 'Btn').classList.toggle('open');

    if (isOpening) {
        requestAnimationFrame(() => {
            document.getElementById(did + 'W')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    autoSave();
}

function toggleDoorSection(btn) {
    btn.classList.toggle('open');
}

const _sectionTimers = {};
function scheduleSectionClose(toggleId) {
    clearTimeout(_sectionTimers[toggleId]);
    _sectionTimers[toggleId] = setTimeout(() => {
        document.getElementById(toggleId)?.classList.remove('open');
    }, 3000);
}

function refreshSectionChips(gridId, chipsId) {
    const chipsEl = document.getElementById(chipsId);
    if (!chipsEl) return;
    const icons = [...document.querySelectorAll(`#${gridId} .on`)]
        .map(el => (el.querySelector('.vb-icon, .ind-icon')?.textContent || '').trim())
        .filter(Boolean);
    chipsEl.textContent = icons.join(' ');
}

function toggleIndicio(id) {
    const el = document.getElementById(id);
    el.classList.toggle('on');
    el.querySelector('input').checked = el.classList.contains('on');
    autoSave();
    const did = id.match(/^(d\d+)Ind/)?.[1];
    if (did) {
        refreshSectionChips(did + 'IndGrid', did + 'IndChips');
        scheduleSectionClose(did + 'IndToggle');
    }
}

function toggleCarta(did) {
    const btn = document.getElementById(did + 'Carta');
    btn.classList.toggle('on');
    refreshCartaList();
    autoSave();
}

function onEstadoChange(sel, did) {
    paintEstado(sel);
    const cartaBtn  = document.getElementById(did + 'Carta');
    const otroPanel = document.getElementById(did + 'OtroPanel');
    const otroInp   = document.getElementById(did + 'OtroEst');

    // Mostrar/ocultar panel Otro
    if (sel.value === '_otro') {
        otroPanel?.classList.add('show');
        otroInp?.focus();
    } else {
        otroPanel?.classList.remove('show');
        if (otroInp) otroInp.value = '';
    }

    if (sel.value === 'No Contesta') {
        setVinculos(did, ['Sin vínculo']);
        if (cartaBtn && !cartaBtn.classList.contains('on')) {
            cartaBtn.classList.add('on');
            refreshCartaList();
        }
    } else if (sel.value === 'Alquilado') {
        setVinculos(did, ['Inquilino/a']);
    } else if (sel.value === 'Habitado') {
        // Habitado no implica saber quién vive: abrir el detalle para que
        // el asesor marque Propietario / Inquilino / Viven (si no lo sabe).
        const det = document.getElementById(did + 'Det');
        const btn = document.getElementById(did + 'Btn');
        if (det && !det.classList.contains('open')) {
            det.classList.add('open');
            btn?.classList.add('open');
        }
    }
    autoSave();
}

function paintEstado(sel) {
    const allC = ESTADOS.map(e => e.c).filter(Boolean);
    sel.classList.remove(...allC);
    const match = ESTADOS.find(e => e.v === sel.value);
    if (match?.c) sel.classList.add(match.c);
}

// ─────────────────────────────────────────────
//  CARTA CHECKLIST
// ─────────────────────────────────────────────
function refreshCartaList() {
    const card = document.getElementById('cartaCard');
    const list = document.getElementById('cartaList');
    const allDone = document.getElementById('cartaAllDone');

    // Collect all doors with carta ON
    const items = [];
    document.querySelectorAll('.floor-card').forEach(floorEl => {
        const fid  = floorEl.id;
        const piso = getPisoValue(fid);
        const escSel = document.getElementById(fid + 'EscSel');
        const escPanel = document.getElementById(fid + 'EscPanel');
        let esc = '';
        if (escPanel?.classList.contains('open') && escSel) {
            esc = escSel.value === '_custom'
                ? (document.getElementById(fid + 'EscCustom')?.value ?? '')
                : escSel.value;
        }

        floorEl.querySelectorAll('.door-wrap').forEach(dWrap => {
            const did = dWrap.id.replace('W', '');
            const cartaBtn = document.getElementById(did + 'Carta');
            if (cartaBtn?.classList.contains('on')) {
                const puerta = document.getElementById(did + 'Pta')?.value ?? '';
                const label  = [piso, esc, puerta ? `Puerta ${puerta}` : ''].filter(Boolean).join(' — ');
                const vinculos = [...document.querySelectorAll(`#${did}VincBtns .vinculo-btn.on`)]
                    .map(btn => btn.dataset.value);
                const esVacio      = vinculos.includes('Vacío');
                const esSospechoso = vinculos.includes('Sospechoso (parece vacío)');
                items.push({ label, did, esVacio, esSospechoso });
            }
        });
    });

    if (items.length === 0) {
        card.classList.remove('show');
        return;
    }

    card.classList.add('show');

    // Preserve check state
    const checkedDids = new Set(
        [...list.querySelectorAll('.carta-check-item.done')].map(el => el.dataset.did)
    );

    list.innerHTML = '';
    items.forEach(item => {
        const done = checkedDids.has(item.did);
        const div  = document.createElement('div');
        div.className = 'carta-check-item' + (done ? ' done' : '');
        div.dataset.did = item.did;
        let tipoClass, tipoText;
        if (item.esVacio) {
            tipoClass = 'vacio';
            tipoText  = '📭 Carta captación — piso vacío';
        } else if (item.esSospechoso) {
            tipoClass = 'sospechoso';
            tipoText  = '🕵️ Carta captación — parece vacío';
        } else {
            tipoClass = 'normal';
            tipoText  = '✉️ Carta sin contacto';
        }
        div.innerHTML = `<div class="carta-box">${done ? '✓' : ''}</div><div class="carta-item-info"><div class="carta-item-label">${item.label}</div><div class="carta-tipo ${tipoClass}">${tipoText}</div></div>`;
        div.onclick = () => {
            div.classList.toggle('done');
            const box = div.querySelector('.carta-box');
            box.textContent = div.classList.contains('done') ? '✓' : '';
            checkAllCartasDone();
        };
        list.appendChild(div);
    });

    checkAllCartasDone();
}

function checkAllCartasDone() {
    const items = document.querySelectorAll('.carta-check-item');
    const done  = document.querySelectorAll('.carta-check-item.done');
    const allDone = document.getElementById('cartaAllDone');
    allDone.classList.toggle('show', items.length > 0 && items.length === done.length);
}

// ─────────────────────────────────────────────
//  SUMMARY
// ─────────────────────────────────────────────
function refreshSummary() {
    const floors = document.querySelectorAll('.floor-card').length;
    const doors  = document.querySelectorAll('.puerta-input').length;
    document.getElementById('summaryPill').textContent =
        `${floors} planta${floors !== 1 ? 's' : ''} · ${doors} puerta${doors !== 1 ? 's' : ''}`;
}

// ─────────────────────────────────────────────
//  AUTO-SAVE
// ─────────────────────────────────────────────
let saveTimer = null;
function autoSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(_doSave, 400);
}

function _doSave() {
    // Gather building features
    const tipos        = [...document.querySelectorAll('#tipoGrid .feat-item.on')]
                          .map(el => el.textContent.trim());
    const tipoOtrosOn  = document.getElementById('tipoOtrosFeat')?.classList.contains('on') ?? false;
    const tipoOtrosTags = getTipoOtrosTags();
    const feats        = [...document.querySelectorAll('#featGrid .feat-item.on')]
                          .filter(el => el.id !== 'adminFeat')
                          .map(el => el.textContent.trim());
    const otrosOn      = document.getElementById('otrosFeat').classList.contains('on');
    const otrosTags    = getOtrosTags();
    const adminOn      = document.getElementById('adminFeat').classList.contains('on');
    const adminEmpresa = document.getElementById('adminEmpresa').value;
    const adminTelefono = document.getElementById('adminTelefono').value;

    const state = {
        calle:      document.getElementById('fCalle').value,
        portal:     document.getElementById('fPortal').value,
        fecha:      document.getElementById('fFecha').value,
        tipos,
        tipoOtrosOn,
        tipoOtrosTags,
        feats,
        otrosOn,
        otrosTags,
        adminOn,
        adminEmpresa,
        adminTelefono,
        notes:     document.getElementById('fEdificioNotes').value,
        floors:    []
    };

    document.querySelectorAll('.floor-card').forEach(floorEl => {
        const fid       = floorEl.id;
        const piso      = document.getElementById(fid + 'P')?.value ?? '';
        const pisoCustom = document.getElementById(fid + 'PCustom')?.value ?? '';
        const escOpen   = document.getElementById(fid + 'EscPanel')?.classList.contains('open') ?? false;
        const escVal    = document.getElementById(fid + 'EscSel')?.value ?? '';
        const escCustom = document.getElementById(fid + 'EscCustom')?.value ?? '';
        const doors = [];

        floorEl.querySelectorAll('.door-wrap').forEach(dWrap => {
            const did = dWrap.id.replace('W', '');
            const indicios = [...document.querySelectorAll(`#${did}Det .indicio-item.on`)]
                              .map(el => el.textContent.trim());
            doors.push({
                puerta:     document.getElementById(did + 'Pta')?.value  ?? '',
                estado:     document.getElementById(did + 'Est')?.value  ?? '',
                vinculos:   getVinculos(did),
                otroEst:    document.getElementById(did + 'OtroEst')?.value ?? '',
                indicios,
                obs:        document.getElementById(did + 'Obs')?.value  ?? '',
                // Nombre_Contacto y Telefono NO se persisten en localStorage (RGPD)
                carta:      document.getElementById(did + 'Carta')?.classList.contains('on') ?? false,
                detailOpen: document.getElementById(did + 'Det')?.classList.contains('open')  ?? false,
            });
        });

        const collapsed = floorEl.classList.contains('collapsed');
        state.floors.push({ piso, pisoCustom, escOpen, escVal, escCustom, collapsed, doors });
    });

    savedSinceLastEdit = false;
    localStorage.setItem('tz_state', JSON.stringify(state));
    const bar = document.getElementById('autosaveBar');
    bar.textContent = '✓ Guardado automáticamente';
    bar.className = 'autosave-bar ok';
    setTimeout(() => { bar.textContent = 'Auto-guardado activo'; bar.className = 'autosave-bar'; }, 2000);
    refreshSummary();
}

// ─────────────────────────────────────────────
//  RESTORE STATE
// ─────────────────────────────────────────────
function restoreState() {
    const raw = localStorage.getItem('tz_state');
    if (!raw) return;
    try {
        const s = JSON.parse(raw);
        document.getElementById('fCalle').value  = s.calle  ?? '';
        document.getElementById('fPortal').value = s.portal ?? '';
        document.getElementById('fFecha').value  = s.fecha  ?? '';
        document.getElementById('fEdificioNotes').value = s.notes ?? '';

        // Restore tipo de inmueble
        if (s.tipos?.length) {
            document.querySelectorAll('#tipoGrid .feat-item').forEach(el => {
                const label = el.textContent.trim();
                if (s.tipos.some(f => label.includes(f.replace(/^[^\wÀ-ſ]*/, '').trim().split(' ')[0]))) {
                    el.classList.add('on');
                }
            });
        }
        if (s.tipoOtrosOn) {
            const feat = document.getElementById('tipoOtrosFeat');
            const wrap = document.getElementById('tipoOtrosWrap');
            if (feat) { feat.classList.add('on'); wrap?.classList.add('show'); }
            (s.tipoOtrosTags ?? []).forEach(t => addOtrosTag(t, 'tipoOtrosList'));
        }

        // Restore features
        if (s.feats?.length) {
            document.querySelectorAll('#featGrid .feat-item').forEach(el => {
                if (el.id === 'adminFeat') return; // handled separately
                const label = el.textContent.trim();
                if (s.feats.some(f => label.includes(f.replace(/^[^\wÀ-ſ]*/, '').trim().split(' ')[0]))) {
                    el.classList.add('on');
                }
            });
        }
        if (s.otrosOn) {
            const feat = document.getElementById('otrosFeat');
            const wrap = document.getElementById('otrosWrap');
            feat.classList.add('on');
            feat.querySelector('input').checked = true;
            wrap.classList.add('show');
            (s.otrosTags ?? (s.otrosVal ? [s.otrosVal] : [])).forEach(t => addOtrosTag(t));
        }
        if (s.adminOn) {
            document.getElementById('adminFeat').classList.add('on');
            document.getElementById('adminPanel').style.display = 'flex';
            document.getElementById('adminEmpresa').value = s.adminEmpresa ?? '';
            document.getElementById('adminTelefono').value = s.adminTelefono ?? '';
        }

        // Restore floors
        if (s.floors?.length) {
            s.floors.forEach(fl => {
                const nextFid = 'f' + (floorSeq + 1);
                addFloor(fl.piso, true);

                // Clear default door
                document.getElementById(nextFid + 'D').innerHTML = '';

                // Restore custom piso
                if (fl.piso === '_custom') {
                    const pisoCustomEl = document.getElementById(nextFid + 'PCustom');
                    if (pisoCustomEl) {
                        pisoCustomEl.classList.add('show');
                        pisoCustomEl.value = fl.pisoCustom ?? '';
                    }
                }

                // Restore escalera
                if (fl.escOpen) {
                    document.getElementById(nextFid + 'EscPanel').classList.add('open');
                    document.getElementById(nextFid + 'EscBtn').classList.add('on');
                    const escSel = document.getElementById(nextFid + 'EscSel');
                    if (escSel) { escSel.value = fl.escVal ?? ''; }
                    if (fl.escVal === '_custom') {
                        const custom = document.getElementById(nextFid + 'EscCustom');
                        if (custom) { custom.classList.add('show'); custom.value = fl.escCustom ?? ''; }
                    }
                }

                // Restore doors
                fl.doors?.forEach(d => addDoor(nextFid, d));

                // Restore collapsed state
                if (fl.collapsed) {
                    const card = document.getElementById(nextFid);
                    card.classList.add('collapsed');
                    const btn = document.getElementById(nextFid + 'CollapseBtn');
                    if (btn) btn.textContent = '▶';
                    refreshFloorSummary(nextFid);
                }
            });
        }
        refreshCartaList();
    } catch(e) {
        localStorage.removeItem('tz_state');
    }
}

// ─────────────────────────────────────────────
//  STRIP EMOJI
// ─────────────────────────────────────────────
function stripEmoji(s) {
    return (s || '').replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{20D0}-\u{20FF}]/gu, '').replace(/\s+/g, ' ').trim();
}

// ─────────────────────────────────────────────
//  ENVIAR AL SERVIDOR
// ─────────────────────────────────────────────
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxYgKuAzNJazgAuCy2Li9lVwC4Alajf2QwkBFclX9-qrxUUC9hKy0oYUKnqw-ipXQ8P/exec';

async function sendToServer() {
    const zona   = document.getElementById('fZona').value;
    const asesor = document.getElementById('fAsesor').value;
    const calle  = document.getElementById('fCalle').value.trim();
    const portal = document.getElementById('fPortal').value.trim();
    // Si el campo está bloqueado (FECHA_VISITA_EDITABLE = false), se ignora
    // cualquier valor que tenga el input y se fuerza "hoy" — defensa en
    // profundidad por si alguien lo reactiva desde las herramientas de
    // desarrollador del navegador.
    const fecha  = FECHA_VISITA_EDITABLE
        ? document.getElementById('fFecha').value.trim()
        : todayLocalISO();

    if (!calle || !portal || !fecha) {
        showToast(!fecha ? 'Completa la Fecha de la Taratura' : 'Completa Calle y Nº Portal primero');
        document.getElementById(!calle ? 'fCalle' : (!portal ? 'fPortal' : 'fFecha')).focus();
        return;
    }

    // Validar Tipo de Inmueble
    const tiposSeleccionados = document.querySelectorAll('#tipoGrid .feat-item.on').length
        + (document.getElementById('tipoOtrosFeat')?.classList.contains('on') && getTipoOtrosTags().length > 0 ? 1 : 0);
    if (tiposSeleccionados === 0) {
        showToast('Selecciona al menos un Tipo de Inmueble');
        document.getElementById('tipoGrid').scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }

    // Validar que todas las puertas tengan identificador (letra/número)
    const emptyPuertas = [...document.querySelectorAll('.puerta-input')].filter(i => !i.value.trim());
    if (emptyPuertas.length > 0) {
        emptyPuertas[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        emptyPuertas[0].focus();
        showToast(`⚠️ ${emptyPuertas.length} puerta${emptyPuertas.length > 1 ? 's' : ''} sin letra o número`);
        return;
    }

    // Validar que todas las puertas tengan estado
    const emptyEstados = [...document.querySelectorAll('.estado-select')].filter(s => !s.value);
    if (emptyEstados.length > 0) {
        emptyEstados[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        showToast(`⚠️ ${emptyEstados.length} puerta${emptyEstados.length > 1 ? 's' : ''} sin estado seleccionado`);
        return;
    }
    // Validar que "Otro" tenga descripción
    const otrosVacios = [...document.querySelectorAll('.estado-select')]
        .filter(s => s.value === '_otro')
        .map(s => s.id.replace('Est', ''))
        .filter(did => !document.getElementById(did + 'OtroEst')?.value.trim());
    if (otrosVacios.length > 0) {
        document.getElementById(otrosVacios[0] + 'OtroEst')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        showToast('⚠️ Describe el estado en las puertas marcadas como "Otro"');
        return;
    }
    // Habitado sin vínculo elegido (el asesor no supo si era propietario o
    // inquilino): por defecto se registra "Viven" en lugar de dejarlo vacío.
    [...document.querySelectorAll('.estado-select')]
        .filter(s => s.value === 'Habitado')
        .map(s => s.id.replace('Est', ''))
        .filter(did => getVinculos(did).length === 0)
        .forEach(did => setVinculos(did, ['Viven (no especifica)']));

    const ts          = new Date().toLocaleString('es-ES');
    const tiposBase   = [...document.querySelectorAll('#tipoGrid .feat-item.on')].map(el => { const cl=el.cloneNode(true); cl.querySelectorAll('.feat-icon,input').forEach(n=>n.remove()); return cl.textContent.trim(); });
    const tipoOtrosOn = document.getElementById('tipoOtrosFeat')?.classList.contains('on');
    const tipoOtrosTags = getTipoOtrosTags();
    if (tipoOtrosOn && tipoOtrosTags.length) tiposBase.push('Otro: ' + tipoOtrosTags.join(', '));
    const tipos     = tiposBase.join(' | ');
    const feats     = [...document.querySelectorAll('#featGrid .feat-item.on')].filter(el => el.id !== 'adminFeat').map(el => { const cl=el.cloneNode(true); cl.querySelectorAll('.feat-icon,input').forEach(n=>n.remove()); return cl.textContent.trim(); }).join(' | ');
    const otrosOn   = document.getElementById('otrosFeat').classList.contains('on');
    const otrosTags = getOtrosTags();
    const adminOn_s      = document.getElementById('adminFeat').classList.contains('on');
    const adminEmpresaVal = adminOn_s ? document.getElementById('adminEmpresa').value.trim() : '';
    const adminTelefonoVal = adminOn_s ? document.getElementById('adminTelefono').value.trim() : '';
    const adminFeatLabel = adminOn_s ? 'Administración' : '';
    const featsFull = [feats, otrosOn && otrosTags.length ? 'Otros: ' + otrosTags.join(', ') : '', adminFeatLabel].filter(Boolean).join(' | ');
    const notes     = document.getElementById('fEdificioNotes').value;

    const rows = [];
    document.querySelectorAll('.floor-card').forEach(floorEl => {
        const fid  = floorEl.id;
        const piso = getPisoValue(fid);
        const escPanel = document.getElementById(fid + 'EscPanel');
        const escSel   = document.getElementById(fid + 'EscSel');
        let esc = '';
        if (escPanel?.classList.contains('open') && escSel) {
            esc = escSel.value === '_custom'
                ? (document.getElementById(fid + 'EscCustom')?.value ?? '')
                : escSel.value;
        }
        floorEl.querySelectorAll('.door-wrap').forEach(dWrap => {
            const did      = dWrap.id.replace('W', '');
            const indicios = [...document.querySelectorAll(`#${did}Det .indicio-item.on`)]
                              .map(el => { const cl=el.cloneNode(true); cl.querySelectorAll('.ind-icon,input').forEach(n=>n.remove()); return cl.textContent.trim(); }).join(' | ');
            rows.push({
                Timestamp:                ts,
                Fecha_Visita:             isoToEsDate(fecha),
                Zona:                     zona,
                Asesor:                   asesor,
                Calle:                    calle,
                Portal:                   portal,
                Tipo_Inmueble:            tipos,
                Caracteristicas_Edificio: featsFull,
                Notas_Edificio:           notes,
                Piso:                     piso,
                Escalera_Bloque:          esc,
                Puerta:                   document.getElementById(did + 'Pta')?.value  ?? '',
                Estado:                   (() => {
                                              const v = document.getElementById(did + 'Est')?.value ?? '';
                                              if (v === '_otro') return 'Otro: ' + (document.getElementById(did + 'OtroEst')?.value.trim() ?? '');
                                              return v;
                                          })(),
                Vinculo:                  getVinculos(did).join(' | '),
                Indicios:                 indicios,
                Observaciones:            document.getElementById(did + 'Obs')?.value  ?? '',
                Nombre_Contacto:          document.getElementById(did + 'Nom')?.value  ?? '',
                Telefono:                 document.getElementById(did + 'Tel')?.value  ?? '',
                Carta:                    document.getElementById(did + 'Carta')?.classList.contains('on') ? 'Sí' : 'No',
                Admin_Empresa:            adminEmpresaVal,
                Admin_Tel:                adminTelefonoVal,
            });
        });
    });

    const btn = document.getElementById('btnGuardar');
    btn.disabled    = true;
    btn.textContent = 'Enviando...';

    try {
        const res    = await fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ rows }) });
        const result = await res.json();
        if (!result.ok) throw new Error(result.error || 'Error en el servidor');

        savedSinceLastEdit  = true;
        showSuccessOverlay();
        btn.textContent     = '✓ Guardado';
        showToast(`✓ ${result.rows_written} puerta${result.rows_written !== 1 ? 's' : ''} guardadas · Abriendo buzones…`);
        setTimeout(() => { btn.textContent = '⬇ Guardar'; btn.disabled = false; }, 2500);

        // Crear registro de buzones para este portal y navegar
        // Si ya existe uno pendiente para el mismo portal, reutilizarlo (evita duplicados)
        const _calle  = document.getElementById('fCalle').value.trim();
        const _portal = document.getElementById('fPortal').value.trim();
        if (_calle && _portal) {
            const _today = new Date().toDateString();
            const _existing = (await idbGetAll()).find(r => {
                if (r.calle.trim().toLowerCase()  !== _calle.toLowerCase())  return false;
                if (r.portal.trim().toLowerCase() !== _portal.toLowerCase()) return false;
                if (!r.registrado) return true; // pendiente → reutilizar siempre
                // ya registrado → reutilizar si es de hoy (evita crear vacío al volver a guardar taratura)
                const d = new Date(r.fechaRegistrado || r.timestamp).toDateString();
                return d === _today;
            });
            const _buzId = _existing
                ? _existing.id
                : 'buz_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
            if (!_existing) {
                await idbPut({ id: _buzId, calle: _calle, portal: _portal, timestamp: Date.now(), files: [], floors: [] });
            }
        }

    } catch (err) {
        showToast('Error al guardar: ' + err.message);
        btn.textContent = '⬇ Guardar';
        btn.disabled    = false;
    }
}

// ─────────────────────────────────────────────
//  NEW BUILDING
// ─────────────────────────────────────────────
function _clearAll() {
    document.getElementById('fCalle').value  = '';
    document.getElementById('fPortal').value = '';
    // fFecha NO se limpia a propósito: al cargar varias taraturas en papel
    // del mismo día por lote, no tiene sentido reescribirla en cada edificio.
    // Si hace falta, está el botón "Volver a hoy" junto al campo.
    document.getElementById('fEdificioNotes').value = '';
    document.querySelectorAll('#tipoGrid .feat-item.on, #featGrid .feat-item.on').forEach(el => el.classList.remove('on'));
    document.getElementById('tipoOtrosFeat')?.classList.remove('on');
    document.getElementById('tipoOtrosWrap')?.classList.remove('show');
    document.getElementById('tipoOtrosList').innerHTML = '';
    document.getElementById('tipoOtrosTagInput').value = '';
    document.getElementById('otrosFeat').classList.remove('on');
    document.getElementById('otrosWrap').classList.remove('show');
    document.getElementById('otrosList').innerHTML = '';
    document.getElementById('otrosTagInput').value = '';
    document.getElementById('adminFeat').classList.remove('on');
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('adminEmpresa').value = '';
    document.getElementById('adminTelefono').value = '';
    document.getElementById('floorsWrap').innerHTML = '';
    document.getElementById('cartaCard').classList.remove('show');
    floorSeq = 0; doorSeq = 0;
    localStorage.removeItem('tz_state');
    savedSinceLastEdit = false;
    addFloor();
}

async function newBuilding() {
    const calle  = document.getElementById('fCalle').value.trim();
    const portal = document.getElementById('fPortal').value.trim();
    const hayDatos = calle || portal;

    if (hayDatos && !savedSinceLastEdit) {
        const wantSend = confirm('¿Guardar los datos de este edificio antes de continuar?\n\nAceptar → Guardar y limpiar\nCancelar → Limpiar sin guardar');
        if (wantSend) {
            await sendToServer();
            if (!savedSinceLastEdit) return; // el envío falló, no limpiar
        }
    }

    _clearAll();
    showToast('Listo para nuevo edificio');
}

function resetForm() {
    if (!confirm('¿Estás seguro que quieres restablecer? Todos los datos del formulario se borrarán.')) return;
    _clearAll();
    showToast('Formulario restablecido');
}

// ─────────────────────────────────────────────
//  SUCCESS OVERLAY
// ─────────────────────────────────────────────
function showSuccessOverlay() {
    const overlay = document.getElementById('successOverlay');
    overlay.classList.add('show');
    setTimeout(() => overlay.classList.remove('show'), 1800);
}

// ─────────────────────────────────────────────
//  TOAST
// ─────────────────────────────────────────────
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

// ═════════════════════════════════════════════
//  MÓDULO NOTICIAS V2
// ═════════════════════════════════════════════
let asesorActual    = '';
let noticias        = [];
let fichaData       = null;
let candidatoActivo = null;
let filtroTexto     = '';
let filtroEtapa     = '';
let sortMode        = 'actividad';
let sortDir         = 'desc';
let agrupadoActivo  = false;

function isDesktop() { return window.innerWidth >= 800; }

const PIP_STEPS = [
  { label: 'Detectada',    note: '',               etapas: ['Detectada'],                       setEtapa: 'Detectada' },
  { label: 'Inglobably',   note: 'investigar',     etapas: ['Investigando'],                    setEtapa: 'Investigando' },
  { label: 'ABC',          note: '',               etapas: ['Llamando (ABC)'],                  setEtapa: 'Llamando (ABC)' },
  { label: 'Esther',       note: 'si ABC falla',   etapas: ['Solicitar teléfonos Esther'],      setEtapa: 'Solicitar teléfonos Esther' },
  { label: 'Nota Simple',  note: 'último recurso', etapas: ['Esperando Nota Simple', 'Nota Simple recibida'], setEtapa: 'Esperando Nota Simple' }
];
const ETAPA_ORDER = ['Detectada','Investigando','Llamando (ABC)','Solicitar teléfonos Esther',
                     'Esperando Nota Simple','Nota Simple recibida','Contactado','Cerrada'];

function pipState(step, etapa) {
  const curIdx  = ETAPA_ORDER.indexOf(etapa);
  const stepMax = Math.max(...step.etapas.map(e => ETAPA_ORDER.indexOf(e)));
  if (step.etapas.includes(etapa)) return 'active';
  if (curIdx > stepMax) return 'done';
  return 'pending';
}

function badgeClass(etapa) {
  const map = {
    'Detectada':                 'b-detectada',
    'Investigando':              'b-invest',
    'Llamando (ABC)':            'b-abc',
    'Solicitar teléfonos Esther':'b-esther',
    'Esperando Nota Simple':     'b-notasimple',
    'Nota Simple recibida':      'b-notarec',
    'Contactado':                'b-contactado',
    'Cerrada':                   'b-cerrada'
  };
  return map[etapa] || 'b-detectada';
}

function tiempoDesde(fechaStr) {
  if (!fechaStr) return null;
  const d = new Date(fechaStr);
  if (isNaN(d)) return null;
  const diff = Date.now() - d.getTime();
  if (diff < 0) return null;
  const dias  = Math.floor(diff / 86400000);
  if (dias === 0) return 'hoy';
  if (dias === 1) return 'ayer';
  if (dias < 7)  return `hace ${dias} días`;
  return `hace ${Math.floor(dias/7)} sem.`;
}

async function ntApi(payload) {
  const res = await fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
  let data;
  try { data = await res.json(); }
  catch(e) { throw new Error('El servidor no respondió con JSON válido.'); }
  if (!data.ok) throw new Error(data.error || 'Error desconocido del servidor');
  return data;
}

function initNoticias() {
  asesorActual = localStorage.getItem('tz_asesor') || '';
  // Siempre arrancar sin ficha seleccionada
  fichaData = null;
  document.querySelectorAll('.noticia-card').forEach(c => c.classList.remove('card-sel'));
  document.getElementById('fichaContent').style.display     = 'none';
  document.getElementById('fichaPlaceholder').style.display = '';
  document.getElementById('screenFicha').classList.remove('ficha-abierta');
  document.getElementById('screenNoticias').classList.add('active');
  if (isDesktop()) {
    document.getElementById('screenFicha').classList.add('active');
  } else {
    document.getElementById('screenFicha').classList.remove('active');
  }
  const hoy = new Date().toISOString().split('T')[0];
  const fns = document.getElementById('notasimpleFecha');
  const flp = document.getElementById('llamadaFechaProx');
  if (fns && !fns.value) fns.value = hoy;
  if (flp && !flp.value) flp.value = hoy;
  cargarNoticias();
}

function ntShowTab(name) {
  document.getElementById('tabLista').style.display    = name === 'lista'    ? '' : 'none';
  document.getElementById('tabReportes').style.display = name === 'reportes' ? '' : 'none';
  document.querySelectorAll('#screenNoticias .nt-nav-tab').forEach((t, i) =>
    t.classList.toggle('active', i === (name === 'lista' ? 0 : 1)));
  if (name === 'reportes') renderReportes();
}

function filtrarNoticias() {
  filtroTexto = document.getElementById('buscarInput').value.toLowerCase().trim();
  renderLista();
}

function setFiltroEtapa(etapa) {
  filtroEtapa = etapa;
  renderLista();
}

function setSortMode(mode) {
  sortMode = mode;
  renderLista();
}

function toggleSortDir() {
  sortDir = sortDir === 'desc' ? 'asc' : 'desc';
  const btn = document.getElementById('btnOrdenDir');
  if (btn) btn.textContent = sortDir === 'asc' ? '↑' : '↓';
  renderLista();
}

function toggleAgrupar() {
  agrupadoActivo = !agrupadoActivo;
  document.getElementById('btnAgrupar').classList.toggle('on', agrupadoActivo);
  renderLista();
}

function noticiasFiltradas() {
  let lista = noticias.map((n, i) => ({ n, i }));
  if (filtroTexto) {
    lista = lista.filter(({ n }) => {
      const texto = [n.calle, n.numero, n.escalera, n.piso, n.puerta, n.zona].join(' ').toLowerCase();
      return texto.includes(filtroTexto);
    });
  }
  if (filtroEtapa === 'Cerrada') {
    lista = lista.filter(({ n }) => (n.etapa_actual || '') === 'Cerrada');
  } else if (filtroEtapa) {
    lista = lista.filter(({ n }) => {
      const e = (n.etapa_actual || '').toLowerCase();
      return e.includes(filtroEtapa.toLowerCase());
    });
    lista = lista.filter(({ n }) => (n.etapa_actual || '') !== 'Cerrada');
  } else {
    lista = lista.filter(({ n }) => (n.etapa_actual || '') !== 'Cerrada');
  }
  const hoy = new Date().toISOString().split('T')[0];
  const d = sortDir === 'asc' ? 1 : -1;
  return lista.sort((a, b) => {
    if (sortMode === 'alfa') {
      const dirA = [limpiaTexto(a.n.calle), limpiaTexto(a.n.numero)].filter(Boolean).join(' ');
      const dirB = [limpiaTexto(b.n.calle), limpiaTexto(b.n.numero)].filter(Boolean).join(' ');
      return d * dirA.localeCompare(dirB, 'es');
    }
    if (sortMode === 'etapa') {
      const eA = ETAPA_ORDER.indexOf(a.n.etapa_actual || 'Detectada');
      const eB = ETAPA_ORDER.indexOf(b.n.etapa_actual || 'Detectada');
      if (eA !== eB) return d * (eA - eB);
      const dirA = [limpiaTexto(a.n.calle), limpiaTexto(a.n.numero)].filter(Boolean).join(' ');
      const dirB = [limpiaTexto(b.n.calle), limpiaTexto(b.n.numero)].filter(Boolean).join(' ');
      return dirA.localeCompare(dirB, 'es');
    }
    // actividad: parked cards go to bottom, rest alphabetical
    const fa = a.n.fecha_proxima_accion ? String(a.n.fecha_proxima_accion).slice(0, 10) : '';
    const fb = b.n.fecha_proxima_accion ? String(b.n.fecha_proxima_accion).slice(0, 10) : '';
    const aparcadaA = fa && fa > hoy;
    const aparcadaB = fb && fb > hoy;
    if (aparcadaA !== aparcadaB) return aparcadaA ? 1 : -1;
    const dirA = [limpiaTexto(a.n.calle), limpiaTexto(a.n.numero)].filter(Boolean).join(' ');
    const dirB = [limpiaTexto(b.n.calle), limpiaTexto(b.n.numero)].filter(Boolean).join(' ');
    return d * dirA.localeCompare(dirB, 'es');
  });
}

function renderCard(n, i) {
  const dir    = [limpiaTexto(n.calle), limpiaTexto(n.numero)].filter(Boolean).join(' ');
  const ubi    = [limpiaTexto(n.escalera), limpiaTexto(n.piso), n.puerta ? `Puerta ${limpiaTexto(n.puerta)}` : ''].filter(Boolean).join(' · ');
  const prox   = noEsTexto(n.proxima_accion) ? formatFecha(n.proxima_accion) : (n.proxima_accion || '');
  const cuando = tiempoDesde(n.fecha_proxima_accion);
  return `
  <div class="noticia-card" id="nt-card-${i}" onclick="abrirFichaNoticia(${i})">
    <div class="card-top">
      <div>
        <div class="card-addr">${dir || 'Sin dirección'}</div>
        <div class="card-meta">${ubi}${n.zona ? ' · ' + n.zona : ''}</div>
      </div>
      <span class="nt-badge ${badgeClass(n.etapa_actual)}">${n.etapa_actual || 'Detectada'}</span>
    </div>
    <div class="card-bottom">
      <span class="card-last">${n.estado_piso || '—'}</span>
      <span class="card-prox">${prox ? '→ ' + prox.slice(0,28) + (prox.length > 28 ? '…' : '') + (cuando ? ' · ' + cuando : '') : ''}</span>
    </div>
  </div>`;
}

async function cargarNoticias() {
  document.getElementById('listaCards').innerHTML = `
    <div class="nt-empty-state">
      <div style="width:24px;height:24px;border:2px solid rgba(0,0,0,.1);border-top-color:#1d4ed8;border-radius:50%;animation:ntSpin .6s linear infinite;margin:0 auto 12px"></div>
      Cargando…
    </div>`;
  try {
    const data = await ntApi({ action: 'listar_noticias', asesor: asesorActual });
    noticias = data.noticias || [];
    renderLista();
  } catch (err) {
    document.getElementById('listaCards').innerHTML = `
      <div class="nt-empty-state">
        <div style="font-weight:700;color:#b91c1c;margin-bottom:6px">Error al conectar</div>
        <div style="font-size:12px;background:#fee2e2;padding:10px;border-radius:8px;text-align:left;word-break:break-word;max-width:320px;margin:0 auto">${err.message}</div>
        <button class="btn-sm" style="margin-top:14px" onclick="cargarNoticias()">Reintentar</button>
      </div>`;
  }
}

function renderLista() {
  const box = document.getElementById('listaCards');
  if (!noticias.length) {
    document.getElementById('listaCount').textContent = '0';
    box.innerHTML = `
      <div class="nt-empty-state">
        <div style="font-size:32px;margin-bottom:8px">🔔</div>
        <div style="margin-bottom:16px">No hay noticias abiertas para <strong>${asesorActual}</strong>.</div>
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:14px;max-width:300px;margin:0 auto;text-align:left">
          <div style="font-size:12px;font-weight:700;color:#92400e;margin-bottom:6px">¿Tenés puertas marcadas como "Sospechoso" en Taratura?</div>
          <div style="font-size:12px;color:#78350f;margin-bottom:12px">Usá este botón para importarlas todas de una vez. Solo hay que hacerlo una vez.</div>
          <button class="nt-btn-primary" id="btnMigrar" onclick="migrarSospechosos()" style="width:100%">Importar Sospechosos existentes</button>
        </div>
      </div>`;
    return;
  }
  const lista = noticiasFiltradas();
  document.getElementById('listaCount').textContent = lista.length;
  if (!lista.length) {
    const motivo = filtroTexto ? `"${filtroTexto}"` : filtroEtapa || 'este filtro';
    box.innerHTML = `<div style="padding:14px 16px;font-size:13px;color:#888">Sin resultados para <strong>${motivo}</strong></div>`;
    return;
  }
  if (agrupadoActivo) {
    const grupos = {};
    lista.forEach(({ n, i }) => {
      const key = [limpiaTexto(n.calle), limpiaTexto(n.numero)].filter(Boolean).join(' ') || 'Sin dirección';
      if (!grupos[key]) grupos[key] = [];
      grupos[key].push({ n, i });
    });
    box.innerHTML = Object.entries(grupos).map(([portal, items]) => `
      <div class="grupo-hdr">
        <span class="grupo-portal">${portal}</span>
        <span class="count-badge">${items.length}</span>
      </div>
      <div class="grupo-cards">${items.map(({ n, i }) => renderCard(n, i)).join('')}</div>
    `).join('');
  } else {
    box.innerHTML = lista.map(({ n, i }) => renderCard(n, i)).join('');
  }
}

async function abrirFichaNoticia(idx) {
  const n = noticias[idx];
  if (!n) return;
  document.querySelectorAll('.noticia-card').forEach(c => c.classList.remove('card-sel'));
  const card = document.getElementById('nt-card-' + idx);
  if (card) card.classList.add('card-sel');
  if (!isDesktop()) {
    document.getElementById('screenNoticias').classList.remove('active');
    document.getElementById('screenFicha').classList.add('active');
  }
  document.getElementById('screenFicha').classList.add('ficha-abierta');
  document.getElementById('fichaPlaceholder').style.display = 'none';
  document.getElementById('fichaContent').style.display     = '';
  setFichaAddr(document.getElementById('fichaAddr'), n);
  document.getElementById('fichaDate').textContent  = formatFecha(n.fecha_deteccion);
  document.getElementById('fichaMeta').innerHTML    = `<span>${n.zona || ''}</span>`;
  document.getElementById('fichaEtapaBadge').textContent = n.etapa_actual || 'Detectada';
  document.getElementById('fichaEtapaBadge').className   = 'nt-badge ' + badgeClass(n.etapa_actual);
  document.getElementById('panelRapidoGrid').innerHTML    = '<div class="pr-item full"><div class="pr-item-label">Cargando…</div></div>';
  document.getElementById('candidatosResumen').innerHTML  = '<span style="color:#888;font-style:italic">Cargando…</span>';
  document.getElementById('historialBox').innerHTML       = '<div style="color:#888;font-size:13px;padding:4px 0">Cargando historial…</div>';
  try {
    const data = await ntApi({ action: 'get_ficha_noticia', ficha_id: n.ficha_id });
    fichaData = data;
    renderFicha();
  } catch (err) {
    showToast('Error cargando ficha: ' + err.message);
  }
}

function copiarFichaId() {
  if (!fichaData) return;
  const id = fichaData.ficha.ficha_id;
  navigator.clipboard.writeText(id).then(() => showToast('✓ ID copiado: ' + id)).catch(() => showToast('ID: ' + id));
}

function renderFicha() {
  if (!fichaData) return;
  const { ficha, candidatos, seguimiento } = fichaData;
  document.getElementById('fichaAddr').textContent = buildAddr(ficha);
  document.getElementById('fichaDate').textContent  = formatFecha(ficha.fecha_deteccion);
  document.getElementById('fichaMeta').innerHTML    = `<span>${ficha.zona || ''}</span><span>${ficha.asesor || ''}</span>`;
  const idRef = document.getElementById('fichaIdRef');
  if (idRef) idRef.textContent = 'ID: ' + ficha.ficha_id + ' — toca para copiar';
  document.getElementById('fichaEtapaBadge').textContent = ficha.etapa_actual || 'Detectada';
  document.getElementById('fichaEtapaBadge').className   = 'nt-badge ' + badgeClass(ficha.etapa_actual);
  document.getElementById('selectEtapa').value           = ficha.etapa_actual || 'Detectada';
  renderPipeline(ficha.etapa_actual);
  renderPanelRapido(ficha, candidatos, seguimiento);
  renderDatosTaratura(ficha);
  renderInglobably(ficha, seguimiento);
  const ingPropsAll = (candidatos || []).filter(c => c.fuente === 'Inglobably');
  const llamarAll   = (candidatos || []).filter(c => c.fuente !== 'Inglobably');
  renderPropietarios(ingPropsAll);
  renderCandidatos(llamarAll);
  renderProximaAccion(ficha);
  renderHistorial(seguimiento);
  renderSeccionCerrar();
}

function renderPipeline(etapa) {
  document.getElementById('pipeline').innerHTML = PIP_STEPS.map((step, i) => {
    const state = pipState(step, etapa || 'Detectada');
    const num   = state === 'done' ? '✓' : (i + 1);
    return `
      <div class="pip-step ${state}" style="cursor:pointer" onclick="setEtapaPipeline('${step.setEtapa}')" title="Cambiar a ${step.label}">
        <div class="pip-dot">${num}</div>
        <div class="pip-name">${step.label}</div>
        ${step.note ? `<div class="pip-note">${step.note}</div>` : ''}
      </div>`;
  }).join('');
}

async function setEtapaPipeline(etapa) {
  if (!fichaData) return;
  if (etapa === fichaData.ficha.etapa_actual) return;
  if (!confirm(`¿Cambiar etapa a "${etapa}"?`)) return;
  try {
    await ntApi({ action: 'actualizar_ficha_noticia', ficha_id: fichaData.ficha.ficha_id, etapa_actual: etapa });
    await ntApi({ action: 'agregar_seguimiento', fichaId: fichaData.ficha.ficha_id,
                  autor: asesorActual, nota: `Etapa → ${etapa}` });
    showToast('✓ ' + etapa);
    await recargarFicha();
  } catch(err) { showToast('Error: ' + err.message); }
}

function renderPanelRapido(ficha, candidatos, seguimiento) {
  const grid   = document.getElementById('panelRapidoGrid');
  const parts  = [];
  const epMap  = { 'Parece vacío': 'ep-vacio', 'Alquilado': 'ep-alquilado', 'Propietario vive': 'ep-prop', 'Solicitó Valoración': 'ep-valoracion' };
  const epClass = epMap[ficha.estado_piso] || 'ep-sin-datos';
  parts.push(`
    <div class="pr-item pr-item-btn" onclick="ntOpenModal('quickEstado')" title="Toca para cambiar">
      <div class="pr-item-label">Estado del piso ›</div>
      ${ficha.estado_piso
        ? `<span class="estado-piso ${epClass}">${ficha.estado_piso}</span>
           ${ficha.situacion ? `<div class="pr-item-sub">${ficha.situacion}</div>` : ''}`
        : `<div class="pr-item-placeholder">Toca para establecer</div>`}
    </div>`);
  if (ficha.nombre_buzon) {
    parts.push(`
      <div class="pr-item">
        <div class="pr-item-label">Nombre en buzón</div>
        <div class="pr-item-val" style="font-size:15px;font-weight:700">${ficha.nombre_buzon}</div>
      </div>`);
  }
  const ingProps  = (candidatos || []).filter(c => c.fuente === 'Inglobably');
  const firstProp = ingProps[0];
  const propLabel = ingProps.length ? `Propietarios (${ingProps.length}) ›` : 'Propietarios ›';
  parts.push(`
    <div class="pr-item pr-item-btn" onclick="abrirPropietariosPanel()" title="Ver propietarios">
      <div class="pr-item-label">${propLabel}</div>
      ${firstProp
        ? `<div class="pr-item-val">${firstProp.nombre}${ingProps.length > 1 ? `<span style="font-size:11px;color:#888;font-weight:400"> +${ingProps.length - 1} más</span>` : ''}</div>
           <div class="pr-item-sub">${firstProp.nif ? 'NIF: ' + firstProp.nif : '<span style="color:#888;font-style:italic">Sin NIF</span>'}</div>`
        : `<div class="pr-item-placeholder">Toca para agregar</div>`}
    </div>`);
  if (ficha.fecha_contrato_inquilino) {
    parts.push(`
      <div class="inquilino-alert">
        <div class="ia-icon">⚠️</div>
        <div>
          <div class="ia-title">Inquilino podría irse pronto</div>
          <div class="ia-sub">Contrato vence: ${formatFecha(ficha.fecha_contrato_inquilino)} · buen momento para contactar</div>
        </div>
      </div>`);
  }
  const ultimoSeg = seguimiento && seguimiento.length ? seguimiento[seguimiento.length - 1] : null;
  const hace      = ultimoSeg ? tiempoDesde(ultimoSeg.fecha) : null;
  const dotMap    = { 'Pendiente': 'pend', 'Suena / sin respuesta': 'sinresp',
                      'Suena / no relacionado': 'sinresp', 'No existe': 'descart',
                      'Descartado': 'descart', 'Confirmado propietario': 'confirm' };
  const dots = (candidatos || []).map(c =>
    `<div class="int-dot ${dotMap[c.estado] || 'pend'}" title="${c.nombre} — ${c.estado}"></div>`
  ).join('');
  const totalIntentos = (candidatos || []).filter(c => c.estado !== 'Pendiente').length;
  parts.push(`
    <div class="ultimo-intento">
      <div class="ui-label">Último intento</div>
      ${ultimoSeg ? `
        <div class="ui-row">
          <div class="ui-desc">${ultimoSeg.nota || 'Nota sin descripción'}</div>
          ${hace ? `<span class="ui-hace">${hace}</span>` : ''}
        </div>
        <div class="ui-sub">${formatFecha(ultimoSeg.fecha)} · ${ultimoSeg.autor || ''}</div>
      ` : '<div class="ui-sub" style="color:#888;font-style:italic">Sin intentos todavía</div>'}
      ${dots ? `<div class="intentos-row">${dots}<span class="int-label">${totalIntentos} intento${totalIntentos !== 1 ? 's' : ''}</span></div>` : ''}
    </div>`);
  if (ficha.proxima_accion) {
    const cuando = tiempoDesde(ficha.fecha_proxima_accion);
    parts.push(`
      <div class="pr-item full">
        <div class="pr-item-label">Próxima acción</div>
        <div class="pr-item-val">${ficha.proxima_accion}</div>
        <div class="pr-item-sub" style="color:#1d4ed8;font-weight:600">${formatFecha(ficha.fecha_proxima_accion)}${cuando ? ' · ' + cuando : ''}</div>
      </div>`);
  }
  grid.innerHTML = parts.join('');
}

function renderDatosTaratura(ficha) {
  const sec = document.getElementById('secTaratura');
  const box = document.getElementById('datosTaraturaBox');
  const partes = [];

  // Contacto registrado en esa puerta (si el vínculo es relevante)
  const vincIgnorar = ['sospechoso (parece vacío)', 'noticia', 'sin vínculo', ''];
  const vinc = (ficha.reg_vinculo || '').trim();
  if (vinc && !vincIgnorar.includes(vinc.toLowerCase())) {
    partes.push(`
      <div style="margin-bottom:10px">
        <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Contacto registrado</div>
        <div style="font-weight:600">${ficha.reg_nombre || '—'}</div>
        <div style="font-size:12px;color:#64748b">${vinc}</div>
        ${ficha.reg_telefono ? `<div style="font-size:13px;margin-top:2px">${ficha.reg_telefono}</div>` : ''}
      </div>`);
  }

  // Administrador del edificio
  if (ficha.reg_admin_empresa || ficha.reg_admin_tel) {
    partes.push(`
      <div style="margin-bottom:10px">
        <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Administrador del edificio</div>
        ${ficha.reg_admin_empresa ? `<div style="font-weight:600">${ficha.reg_admin_empresa}</div>` : ''}
        ${ficha.reg_admin_tel    ? `<div style="font-size:13px">${ficha.reg_admin_tel}</div>` : ''}
      </div>`);
  }

  // Notas y observaciones
  const notas = [ficha.reg_notas_ed, ficha.reg_observ, ficha.reg_info_adic].filter(Boolean);
  if (notas.length) {
    partes.push(`
      <div style="margin-bottom:10px">
        <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">Notas</div>
        ${notas.map(n => `<div style="font-size:13px;color:#334155;margin-bottom:3px">${n}</div>`).join('')}
      </div>`);
  }

  // Carta en buzón
  if (ficha.reg_carta) {
    partes.push(`<div style="font-size:12px;color:#92400e;background:#fef3c7;padding:6px 10px;border-radius:6px;margin-bottom:8px">Carta en buzón: ${ficha.reg_carta}</div>`);
  }

  if (partes.length) {
    box.innerHTML = partes.join('');
    sec.style.display = '';
  } else {
    sec.style.display = 'none';
  }
}

function renderInglobably(ficha, seguimiento) {
  const box   = document.getElementById('inglobablyInfo');
  const notas = (seguimiento || []).map(s => `
    <div style="margin-bottom:6px">
      <div style="font-size:10px;color:#888;margin-bottom:4px">${s.autor || ''} · ${formatFecha(s.fecha)}</div>
      ${s.nota || '—'}
    </div>`).join('');
  box.innerHTML = notas || '<div style="color:#888;font-size:13px;font-style:italic">Sin notas de Inglobably todavía.</div>';
}

function renderPropietarios(props) {
  propietariosActuales = props || [];
  // propietarios se muestran en el panel popout, no inline
}

async function eliminarPropietario(rowNum) {
  if (!fichaData) return;
  if (!confirm('¿Eliminar este propietario?')) return;
  try {
    await ntApi({ action: 'eliminar_candidato', ficha_id: fichaData.ficha.ficha_id, row_num: rowNum });
    showToast('✓ Propietario eliminado');
    await recargarFicha();
  } catch(err) { showToast('Error: ' + err.message); }
}

// ── Propietarios panel ──────────────────────────────────────────────────────

let propietariosActuales = [];

function abrirPropietariosPanel() {
  renderPropietariosPanel();
  ntOpenModal('propietariosPanel');
}

function renderPropietariosPanel() {
  const box = document.getElementById('propietariosPanelList');
  const lista = propietariosActuales;
  if (!lista.length) {
    box.innerHTML = `
      <div style="padding:24px;text-align:center;color:#888;font-size:13px;font-style:italic">
        Sin propietarios registrados.
      </div>`;
    return;
  }
  box.innerHTML = lista.map(p => `
    <div style="padding:14px 0;border-bottom:1px solid #f1f5f9">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div>
          <div style="font-weight:700;font-size:15px">${p.nombre || '—'}</div>
          ${p.nif      ? `<div style="font-size:12px;color:#64748b">NIF: ${p.nif}</div>` : ''}
          ${p.parentesco ? `<div style="font-size:12px;color:#64748b">${p.parentesco}</div>` : ''}
          ${p.telefono ? `<div style="font-size:13px;margin-top:3px;font-weight:600">${p.telefono}</div>` : ''}
          ${p.fecha_nacimiento ? `<div style="font-size:12px;color:#94a3b8">Nacimiento: ${String(p.fecha_nacimiento).slice(0,10)}</div>` : ''}
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0;margin-left:10px">
          <button class="btn-sm" onclick="ntCloseModal('propietariosPanel');abrirEditarPropietario(${p.row_num})">Editar</button>
          <button class="btn-sm" style="background:#fee2e2;border-color:#fca5a5;color:#b91c1c" onclick="eliminarPropietario(${p.row_num})">Borrar</button>
        </div>
      </div>
    </div>`).join('');
}

// ── Candidatos ──────────────────────────────────────────────────────────────

let candidatosActuales = [];
let filtroCandidatos   = 'todos';

function renderCandidatos(candidatos) {
  candidatosActuales = candidatos || [];
  const box = document.getElementById('candidatosResumen');
  if (!candidatosActuales.length) {
    box.innerHTML = '<span style="color:#888;font-style:italic">Sin candidatos cargados.</span>';
    return;
  }
  const total    = candidatosActuales.length;
  const activos  = candidatosActuales.filter(c => c.estado !== 'Descartado' && c.estado !== 'No existe');
  const estadoIcon = { 'Pendiente': '🕐', 'Suena / sin respuesta': '📵', 'Suena / no relacionado': '🔇',
                       'No existe': '❌', 'Descartado': '❌', 'Confirmado propietario': '✅' };
  const primeros = candidatosActuales.slice(0, 3);
  const html = primeros.map(c => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid #f1f5f9">
      <div>
        <div style="font-weight:600;font-size:13px">${c.nombre || '—'}</div>
        <div style="font-size:12px;color:#64748b">${c.telefono || 'Sin tel.'}${c.parentesco ? ' · ' + c.parentesco : ''}</div>
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        <span style="font-size:12px">${estadoIcon[c.estado] || '🕐'}</span>
        <button class="btn-sm" onclick="abrirLlamadaDesdePanel(${c.row_num})">Llamar</button>
      </div>
    </div>`).join('');
  const verTodos = total > 3
    ? `<button class="btn-link" style="margin-top:8px;width:100%;text-align:center" onclick="abrirPanelCandidatos()">Ver todos (${total}) →</button>`
    : (total > 0 ? `<button class="btn-link" style="margin-top:8px;width:100%;text-align:center" onclick="abrirPanelCandidatos()">Ver todos →</button>` : '');
  box.innerHTML = html + verTodos;
}

function abrirPanelCandidatos() {
  filtroCandidatos = 'todos';
  document.querySelectorAll('.cp-filtro').forEach(b => b.classList.remove('active'));
  document.getElementById('cpFiltro-todos').classList.add('active');
  renderCandidatosPanel();
  ntOpenModal('candidatosPanel');
}

function filtrarCandidatosPanel(filtro) {
  filtroCandidatos = filtro;
  document.querySelectorAll('.cp-filtro').forEach(b => b.classList.remove('active'));
  document.getElementById('cpFiltro-' + filtro).classList.add('active');
  renderCandidatosPanel();
}

function renderCandidatosPanel() {
  const box = document.getElementById('candidatosPanelList');
  const esDescartado = c => c.estado === 'Descartado' || c.estado === 'No existe';
  let lista = candidatosActuales;
  if (filtroCandidatos === 'pendientes')  lista = lista.filter(c => !esDescartado(c));
  if (filtroCandidatos === 'descartados') lista = lista.filter(esDescartado);

  if (!lista.length) {
    box.innerHTML = '<div style="padding:20px;text-align:center;color:#888;font-size:13px;font-style:italic">Sin candidatos para este filtro.</div>';
    return;
  }
  const fuenteClass = { ABC: 'f-abc', Esther: 'f-esther', 'Nota Simple': 'f-nota', Manual: 'f-manual' };
  const estadoIcon  = { 'Pendiente': '🕐', 'Suena / sin respuesta': '📵', 'Suena / no relacionado': '🔇',
                        'No existe': '❌', 'Descartado': '❌', 'Confirmado propietario': '✅' };
  box.innerHTML = lista.map(c => `
    <div class="cand-item${esDescartado(c) ? ' cand-descartado' : ''}">
      <div class="cand-top">
        <div>
          <div class="cand-nombre">${c.nombre || '—'}</div>
          <div class="cand-tel">${c.telefono || '—'}${c.parentesco ? ' · <em style="color:#94a3b8">' + c.parentesco + '</em>' : ''}</div>
        </div>
        <span class="nt-fuente ${fuenteClass[c.fuente] || 'f-manual'}">${c.fuente || '—'}</span>
      </div>
      <div class="cand-bottom">
        <span class="cand-estado">${estadoIcon[c.estado] || '🕐'} ${c.estado || 'Pendiente'}</span>
        <button class="btn-sm" onclick="abrirLlamadaDesdePanel(${c.row_num})">Registrar llamada</button>
      </div>
      ${c.proxima_accion ? `<div class="cand-prox" style="margin-top:4px">→ ${c.proxima_accion}${c.fecha_proxima_accion ? ' · ' + formatFecha(c.fecha_proxima_accion) : ''}</div>` : ''}
    </div>`).join('');
}

function abrirLlamadaDesdePanel(rowNum) {
  ntCloseModal('candidatosPanel');
  abrirLlamada(rowNum);
}

function renderProximaAccion(ficha) {
  const pb = document.getElementById('proximaAccionBox');
  if (ficha.proxima_accion) {
    const cuando = tiempoDesde(ficha.fecha_proxima_accion);
    pb.innerHTML = `
      <div class="prox-box">
        <div class="prox-box-row">
          <div>
            <div class="prox-text">${ficha.proxima_accion}</div>
            <div class="prox-fecha">${formatFecha(ficha.fecha_proxima_accion)}${cuando ? ' · ' + cuando : ''}</div>
          </div>
          <button class="prox-edit-btn" onclick="abrirModalTarea()">Editar</button>
        </div>
      </div>`;
  } else {
    pb.innerHTML = `<button class="prox-add-btn" onclick="abrirModalTarea()">+ Agregar próxima acción</button>`;
  }
}

function abrirModalTarea() {
  const ficha = fichaData?.ficha;
  if (!ficha) return;
  document.getElementById('tareaAccion').value = ficha.proxima_accion || '';
  document.getElementById('tareaFecha').value  = ficha.fecha_proxima_accion
    ? new Date(ficha.fecha_proxima_accion).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];
  document.getElementById('tareaDesc').value = '';
  ntOpenModal('tarea');
}

async function guardarTarea() {
  const accion = document.getElementById('tareaAccion').value.trim();
  const fecha  = document.getElementById('tareaFecha').value;
  const desc   = document.getElementById('tareaDesc').value.trim();
  if (!accion) { showToast('Escribí qué hay que hacer'); return; }
  const btn = document.getElementById('btnGuardarTarea');
  btn.disabled = true; btn.textContent = 'Guardando…';
  try {
    await ntApi({ action: 'actualizar_ficha_noticia', ficha_id: fichaData.ficha.ficha_id,
                  proxima_accion: accion, fecha_proxima_accion: fecha });
    if (desc) {
      await ntApi({ action: 'agregar_seguimiento', fichaId: fichaData.ficha.ficha_id,
                    autor: asesorActual, nota: `Tarea: ${accion}${desc ? ' — ' + desc : ''}` });
    }
    ntCloseModal('tarea');
    showToast('✓ Próxima acción guardada');
    await recargarFicha();
  } catch(err) { showToast('Error: ' + err.message); }
  finally { btn.disabled = false; btn.textContent = 'Guardar tarea'; }
}

function renderHistorial(seguimiento) {
  const box = document.getElementById('historialBox');
  if (!seguimiento || !seguimiento.length) {
    box.innerHTML = '<div style="color:#888;font-size:13px;font-style:italic">Sin historial todavía.</div>';
    return;
  }
  box.innerHTML = [...seguimiento].reverse().map(s => `
    <div class="hist-item">
      <div class="hist-fecha">${formatFechaCorta(s.fecha)}</div>
      <div>
        <div class="hist-accion">${s.autor || 'Sistema'}</div>
        <div class="hist-res">${s.nota || '—'}</div>
      </div>
    </div>`).join('');
}

function renderReportes() {
  const esther = noticias.filter(n => n.etapa_actual === 'Solicitar teléfonos Esther');
  document.getElementById('repEstherCount').textContent = esther.length;
  document.getElementById('repEstherList').innerHTML = esther.length
    ? esther.map(n => `
      <div class="rep-row">
        <div class="rep-addr">${[n.calle, n.numero].filter(Boolean).join(' ')} · ${[n.escalera, n.piso, n.puerta].filter(Boolean).join(' ')}</div>
        <div class="rep-meta">${n.asesor || ''} · ${n.zona || ''}</div>
      </div>`).join('')
    : '<div style="padding:14px 16px;font-size:13px;color:#888">Sin solicitudes pendientes.</div>';
  const notas = noticias.filter(n => n.etapa_actual === 'Esperando Nota Simple');
  document.getElementById('repNotaCount').textContent = notas.length;
  document.getElementById('repNotaList').innerHTML = notas.length
    ? notas.map(n => `
      <div class="rep-row">
        <div class="rep-addr">${[n.calle, n.numero].filter(Boolean).join(' ')} · ${[n.escalera, n.piso, n.puerta].filter(Boolean).join(' ')}</div>
        <div class="rep-meta">${n.asesor || ''} · ${n.zona || ''}</div>
      </div>`).join('')
    : '<div style="padding:14px 16px;font-size:13px;color:#888">Sin notas simples solicitadas.</div>';
}

async function migrarSospechosos() {
  const btn = document.getElementById('btnMigrar');
  if (btn) { btn.disabled = true; btn.textContent = 'Importando…'; }
  try {
    const data = await ntApi({ action: 'migrar_sospechosos' });
    showToast(`✓ ${data.creadas} ficha${data.creadas !== 1 ? 's' : ''} creada${data.creadas !== 1 ? 's' : ''}`);
    await cargarNoticias();
  } catch (err) {
    showToast('Error: ' + err.message);
    if (btn) { btn.disabled = false; btn.textContent = 'Importar Sospechosos existentes'; }
  }
}

function volverLista() {
  fichaData = null;
  document.querySelectorAll('.noticia-card').forEach(c => c.classList.remove('card-sel'));
  document.getElementById('screenFicha').classList.remove('ficha-abierta');
  document.getElementById('fichaContent').style.display     = 'none';
  document.getElementById('fichaPlaceholder').style.display = '';
  if (!isDesktop()) {
    document.getElementById('screenFicha').classList.remove('active');
    document.getElementById('screenNoticias').classList.add('active');
  }
  cargarNoticias();
}

async function confirmarEtapa() {
  const etapa = document.getElementById('selectEtapa').value;
  const nota  = document.getElementById('notaEtapa').value.trim();
  const btn   = document.getElementById('btnConfirmEtapa');
  btn.disabled = true; btn.textContent = 'Guardando…';
  try {
    await ntApi({ action: 'actualizar_ficha_noticia', ficha_id: fichaData.ficha.ficha_id, etapa_actual: etapa });
    if (nota) {
      await ntApi({ action: 'agregar_seguimiento', fichaId: fichaData.ficha.ficha_id,
                    autor: asesorActual, nota: `Etapa → ${etapa}${nota ? ': ' + nota : ''}` });
    }
    ntCloseModal('avanzar');
    document.getElementById('notaEtapa').value = '';
    showToast('✓ Etapa actualizada');
    await recargarFicha();
  } catch(err) { showToast('Error: ' + err.message); }
  finally { btn.disabled = false; btn.textContent = 'Confirmar'; }
}

function onSuenaChange() {
  const v = document.getElementById('llamadaSuena').value;
  document.getElementById('llamadaResultadoGroup').style.display = (v === 'Si') ? '' : 'none';
  document.getElementById('llamadaProxGroup').style.display      = (v === 'No existe') ? 'none' : '';
}

function abrirLlamada(rowNum) {
  candidatoActivo = fichaData.candidatos.find(c => c.row_num === rowNum);
  document.getElementById('llamadaCandInfo').innerHTML =
    `<strong>${candidatoActivo.nombre || '—'}</strong><br>${candidatoActivo.telefono || '—'} · <span style="font-size:11px;color:#888">${[candidatoActivo.fuente, candidatoActivo.parentesco].filter(Boolean).join(' · ')}</span>`;
  document.getElementById('llamadaSuena').value    = 'Si';
  document.getElementById('llamadaEstado').value   = candidatoActivo.estado === 'Pendiente' ? 'Suena / sin respuesta' : (candidatoActivo.estado || 'Suena / sin respuesta');
  document.getElementById('llamadaNotas').value        = '';
  document.getElementById('llamadaTipoAccion').value       = 'Llamada';
  document.getElementById('llamadaProxAccion').placeholder = TIPO_PLACEHOLDER['Llamada'];
  document.getElementById('llamadaProxAccion').value       = candidatoActivo.proxima_accion || '';
  const fp = candidatoActivo.fecha_proxima_accion;
  document.getElementById('llamadaFechaProx').value = fp
    ? (String(fp).includes('T') ? String(fp).split('T')[0] : String(fp).slice(0,10))
    : new Date().toISOString().split('T')[0];
  onSuenaChange();
  ntOpenModal('llamada');
}

async function guardarLlamada() {
  if (!candidatoActivo) return;
  const btn   = document.getElementById('btnGuardarLlamada');
  const suena = document.getElementById('llamadaSuena').value;

  let estadoNuevo, proxAccion, fechaProx;
  if (suena === 'No existe') {
    estadoNuevo = 'Descartado';
    proxAccion  = '';
    fechaProx   = '';
  } else if (suena === 'No disponible') {
    estadoNuevo = candidatoActivo.estado || 'Pendiente';
    proxAccion  = buildProxAccion();
    fechaProx   = document.getElementById('llamadaFechaProx').value;
  } else {
    estadoNuevo = document.getElementById('llamadaEstado').value;
    proxAccion  = buildProxAccion();
    fechaProx   = document.getElementById('llamadaFechaProx').value;
  }

  btn.disabled = true; btn.textContent = 'Guardando…';
  try {
    await ntApi({
      action:               'registrar_seguimiento_candidato',
      ficha_id:             fichaData.ficha.ficha_id,
      telefono:             candidatoActivo.telefono,
      row_num:              candidatoActivo.row_num,
      asesor:               asesorActual,
      tipo_accion:          'Llamada',
      suena,
      resultado:            document.getElementById('llamadaNotas').value.trim(),
      estado_nuevo:         estadoNuevo,
      proxima_accion:       proxAccion,
      fecha_proxima_accion: fechaProx
    });
    const resDesc = document.getElementById('llamadaNotas').value.trim();
    if (resDesc) {
      await ntApi({ action: 'agregar_seguimiento', fichaId: fichaData.ficha.ficha_id,
                    autor: asesorActual, nota: `Llamada a ${candidatoActivo.nombre}: ${resDesc}` });
    }
    ntCloseModal('llamada');
    document.getElementById('llamadaNotas').value      = '';
    document.getElementById('llamadaProxAccion').value = '';
    showToast('✓ Llamada registrada');
    await recargarFicha();
  } catch(err) { showToast('Error: ' + err.message); }
  finally { btn.disabled = false; btn.textContent = 'Guardar'; candidatoActivo = null; }
}

async function guardarCandidato() {
  const nombre = document.getElementById('candNombre').value.trim();
  const tel    = document.getElementById('candTelefono').value.trim();
  if (!nombre || !tel) { showToast('Nombre y teléfono son obligatorios'); return; }
  const btn = document.getElementById('btnGuardarCandidato');
  btn.disabled = true; btn.textContent = 'Guardando…';
  try {
    await ntApi({
      action:      'agregar_candidato',
      ficha_id:    fichaData.ficha.ficha_id,
      nombre, telefono: tel,
      parentesco:  document.getElementById('candVinculo').value,
      fuente:      document.getElementById('candFuente').value,
      asesor:      asesorActual
    });
    ntCloseModal('candidato');
    ['candNombre','candTelefono'].forEach(id => document.getElementById(id).value = '');
    showToast('✓ Candidato agregado');
    await recargarFicha();
  } catch(err) { showToast('Error: ' + err.message); }
  finally { btn.disabled = false; btn.textContent = 'Agregar'; }
}

async function guardarNotaInglobably() {
  const nota = document.getElementById('inglobablyNota').value.trim();
  if (!nota) { showToast('Escribí algo antes de guardar'); return; }
  const btn = document.getElementById('btnGuardarInglobably');
  btn.disabled = true; btn.textContent = 'Guardando…';
  try {
    await ntApi({ action: 'agregar_seguimiento', fichaId: fichaData.ficha.ficha_id,
                  autor: asesorActual, nota });
    ntCloseModal('notaInglobably');
    document.getElementById('inglobablyNota').value = '';
    showToast('✓ Nota guardada');
    await recargarFicha();
  } catch(err) { showToast('Error: ' + err.message); }
  finally { btn.disabled = false; btn.textContent = 'Guardar'; }
}

function abrirAgregarPropietario() {
  document.getElementById('propRowNum').value         = '';
  document.getElementById('addPropTitle').textContent  = 'Agregar propietario';
  document.getElementById('btnGuardarProp').textContent = 'Agregar';
  ['propNombre','propNIF','propTel','propFechaNac'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('propParentesco').value = '';
  ntOpenModal('addProp');
}

function abrirEditarPropietario(rowNum) {
  if (!fichaData || !fichaData.candidatos) { showToast('Error: ficha no cargada'); return; }
  const p = fichaData.candidatos.find(c => String(c.row_num) === String(rowNum));
  if (!p) { showToast('No se encontró el propietario'); return; }
  document.getElementById('propRowNum').value        = rowNum;
  document.getElementById('addPropTitle').textContent = 'Editar propietario';
  document.getElementById('btnGuardarProp').textContent = 'Guardar cambios';
  document.getElementById('propNombre').value      = p.nombre        || '';
  document.getElementById('propNIF').value         = p.nif           || '';
  document.getElementById('propParentesco').value  = p.parentesco    || '';
  document.getElementById('propTel').value         = p.telefono      || '';
  const fn = p.fecha_nacimiento;
  document.getElementById('propFechaNac').value = fn
    ? (String(fn).includes('T') ? String(fn).split('T')[0] : String(fn).slice(0, 10))
    : '';
  ntOpenModal('addProp');
}

async function guardarPropietario() {
  const nombre           = document.getElementById('propNombre').value.trim();
  const nif              = document.getElementById('propNIF').value.trim().toUpperCase();
  const parentesco       = document.getElementById('propParentesco').value;
  const fecha_nacimiento = document.getElementById('propFechaNac').value;
  const tel              = document.getElementById('propTel').value.trim();
  const rowNum           = document.getElementById('propRowNum').value;
  if (!nombre) { showToast('El nombre es obligatorio'); return; }
  const esEdicion = !!rowNum;
  const btn = document.getElementById('btnGuardarProp');
  const textoOriginal = btn.textContent;
  btn.disabled = true; btn.textContent = 'Guardando…';
  try {
    if (esEdicion) {
      await ntApi({
        action:    'actualizar_candidato',
        ficha_id:  fichaData.ficha.ficha_id,
        row_num:   Number(rowNum),
        nombre, nif, parentesco, fecha_nacimiento, telefono: tel
      });
    } else {
      await ntApi({
        action:   'agregar_candidato',
        ficha_id: fichaData.ficha.ficha_id,
        nombre, nif, parentesco, fecha_nacimiento, telefono: tel,
        fuente:   'Inglobably',
        estado:   'Pendiente',
        asesor:   asesorActual
      });
      // Si tiene teléfono, también lo agrega como candidato a llamar
      if (tel) {
        await ntApi({
          action:     'agregar_candidato',
          ficha_id:   fichaData.ficha.ficha_id,
          nombre, telefono: tel,
          parentesco: 'Propietario probable',
          fuente:     'Manual',
          estado:     'Pendiente',
          asesor:     asesorActual
        });
      }
    }
    ntCloseModal('addProp');
    ['propNombre','propNIF','propTel','propFechaNac'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('propParentesco').value = '';
    document.getElementById('propRowNum').value     = '';
    showToast(esEdicion ? '✓ Propietario actualizado' : '✓ Propietario agregado');
    await recargarFicha();
  } catch(err) { showToast('Error: ' + err.message); }
  finally { btn.disabled = false; btn.textContent = textoOriginal; }
}

async function ejecutarImportABC() {
  const url = document.getElementById('importarAbcUrl').value.trim();
  if (!url) { showToast('Pegá la URL del sheet'); return; }
  const btn = document.getElementById('btnImportarABC');
  const res = document.getElementById('importarAbcResult');
  btn.disabled = true; btn.textContent = 'Importando…';
  res.style.display = 'none';
  try {
    const data = await ntApi({
      action:    'importar_candidatos_abc',
      ficha_id:  fichaData.ficha.ficha_id,
      sheet_url: url,
      asesor:    asesorActual
    });
    res.style.cssText = 'display:block;background:#dcfce7;color:#166534;padding:10px;border-radius:8px;font-size:13px;margin-top:4px';
    res.innerHTML = `✓ <strong>${data.importados}</strong> candidatos importados${data.omitidos ? ` · ${data.omitidos} omitidos (sin teléfono o ya existían)` : ''}`;
    showToast(`✓ ${data.importados} candidatos importados`);
    await recargarFicha();
  } catch(err) {
    res.style.cssText = 'display:block;background:#fee2e2;color:#b91c1c;padding:10px;border-radius:8px;font-size:13px;margin-top:4px';
    res.textContent = err.message;
  }
  finally { btn.disabled = false; btn.textContent = 'Importar'; }
}

async function confirmarEsther() {
  const nota  = document.getElementById('estherNotas').value.trim();
  const ficha = fichaData.ficha;
  const btn   = document.getElementById('btnConfirmEsther');
  btn.disabled = true; btn.textContent = 'Guardando…';
  try {
    await ntApi({ action: 'actualizar_ficha_noticia', ficha_id: ficha.ficha_id, etapa_actual: 'Solicitar teléfonos Esther' });
    await ntApi({ action: 'agregar_seguimiento', fichaId: ficha.ficha_id, autor: asesorActual,
                  nota: 'Solicitud enviada a Esther' + (nota ? ': ' + nota : '') });
    ntCloseModal('esther');
    document.getElementById('estherNotas').value = '';
    showToast('✓ Solicitud a Esther registrada');
    await recargarFicha();
  } catch(err) { showToast('Error: ' + err.message); }
  finally { btn.disabled = false; btn.textContent = 'Confirmar solicitud'; }
}

async function confirmarNotaSimple() {
  const fecha = document.getElementById('notasimpleFecha').value;
  const nota  = document.getElementById('notasimpleNotas').value.trim();
  const btn   = document.getElementById('btnConfirmNota');
  btn.disabled = true; btn.textContent = 'Guardando…';
  try {
    await ntApi({ action: 'actualizar_ficha_noticia', ficha_id: fichaData.ficha.ficha_id, etapa_actual: 'Esperando Nota Simple' });
    await ntApi({ action: 'agregar_seguimiento', fichaId: fichaData.ficha.ficha_id, autor: asesorActual,
                  nota: `Nota Simple solicitada ${fecha ? '(' + fecha + ')' : ''}${nota ? ': ' + nota : ''}` });
    ntCloseModal('notasimple');
    document.getElementById('notasimpleNotas').value = '';
    showToast('✓ Nota Simple registrada');
    await recargarFicha();
  } catch(err) { showToast('Error: ' + err.message); }
  finally { btn.disabled = false; btn.textContent = 'Registrar'; }
}

async function confirmarCerrar() {
  const motivo = document.getElementById('cerrarMotivo').value;
  const notas  = document.getElementById('cerrarNotas').value.trim();
  if (!confirm('¿Cerrar esta noticia? No aparecerá más en tu lista.')) return;
  const btn = document.getElementById('btnConfirmCerrar');
  btn.disabled = true; btn.textContent = 'Cerrando…';
  try {
    await ntApi({ action: 'actualizar_ficha_noticia', ficha_id: fichaData.ficha.ficha_id,
                  estado_caso: 'Cerrada', etapa_actual: 'Cerrada' });
    await ntApi({ action: 'agregar_seguimiento', fichaId: fichaData.ficha.ficha_id, autor: asesorActual,
                  nota: `Caso cerrado: ${motivo}${notas ? '. ' + notas : ''}` });
    ntCloseModal('cerrar');
    showToast('✓ Noticia cerrada');
    volverLista();
  } catch(err) { showToast('Error: ' + err.message); }
  finally { btn.disabled = false; btn.textContent = 'Cerrar noticia'; }
}

function renderSeccionCerrar() {
  const sec = document.getElementById('seccionCerrar');
  if (!sec) return;
  const etapa = fichaData?.ficha?.etapa_actual || '';
  if (etapa === 'Cerrada') {
    sec.innerHTML = `<button class="btn-acc" style="width:100%;background:#059669;color:white;border-color:#059669" onclick="reabrirNoticia()">Reabrir noticia</button>`;
  } else {
    sec.innerHTML = `<button class="btn-acc btn-danger" style="width:100%" onclick="ntOpenModal('cerrar')">Cerrar noticia</button>`;
  }
}

async function reabrirNoticia() {
  if (!confirm('¿Reabrir esta noticia? Volverá a aparecer en tu lista de activas.')) return;
  try {
    await ntApi({ action: 'actualizar_ficha_noticia', ficha_id: fichaData.ficha.ficha_id,
                  estado_caso: 'Abierta', etapa_actual: 'Detectada' });
    await ntApi({ action: 'agregar_seguimiento', fichaId: fichaData.ficha.ficha_id, autor: asesorActual,
                  nota: 'Noticia reabierta' });
    showToast('✓ Noticia reabierta');
    await recargarFicha();
  } catch(err) { showToast('Error: ' + err.message); }
}

async function recargarFicha() {
  if (!fichaData) return;
  const data = await ntApi({ action: 'get_ficha_noticia', ficha_id: fichaData.ficha.ficha_id });
  fichaData = data;
  renderFicha();
}

const TIPO_PLACEHOLDER = {
  'Llamada': 'Reintentar, buscar otro número…',
  'Visita':  'Al portal, al piso, a la administración…',
  'Gestión': 'Nota simple, contactar Esther…'
};

function onTipoAccionChange() {
  const tipo = document.getElementById('llamadaTipoAccion').value;
  document.getElementById('llamadaProxAccion').placeholder = TIPO_PLACEHOLDER[tipo] || 'Detalle…';
}

function buildProxAccion() {
  const tipo  = document.getElementById('llamadaTipoAccion').value;
  const texto = document.getElementById('llamadaProxAccion').value.trim();
  if (!texto) return '';
  return tipo + ': ' + texto;
}

function noEsTexto(s) {
  // Detecta ISO dates u otros valores claramente no-textuales
  return /^\d{4}-\d{2}-\d{2}T/.test(String(s || ''));
}
function limpiaTexto(s) {
  return noEsTexto(s) ? '' : String(s || '').trim();
}

function buildAddr(f) {
  const calle  = limpiaTexto(f.calle);
  const numero = limpiaTexto(f.numero);
  const partes = [[calle, numero].filter(Boolean).join(' ')];
  if (f.escalera && !noEsTexto(f.escalera)) partes.push(f.escalera);
  if (f.piso     && !noEsTexto(f.piso))     partes.push(f.piso);
  if (f.puerta   && !noEsTexto(f.puerta))   partes.push('Puerta ' + f.puerta);
  return partes.filter(Boolean).join(' — ');
}

function setFichaAddr(el, f) {
  const calle  = limpiaTexto(f.calle);
  const numero = limpiaTexto(f.numero);
  const esc    = limpiaTexto(f.escalera);
  const piso   = limpiaTexto(f.piso);
  const puerta = limpiaTexto(f.puerta);
  const linea1 = [calle, numero].filter(Boolean).join(' ') || '—';
  const linea2 = [esc, piso, puerta ? 'Pta. ' + puerta : ''].filter(Boolean).join(' · ');
  el.innerHTML = `<strong style="font-size:17px;font-weight:800">${linea1}</strong>${
    linea2 ? `<br><span style="font-size:13px;color:#94a3b8">${linea2}</span>` : ''}`;
}

function formatFecha(f) {
  if (!f) return '—';
  const d = new Date(f);
  if (!isNaN(d)) return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  // Fallback para strings tipo "7/7/2026, 10:30:00" (toLocaleString de Apps Script)
  const dateOnly = String(f).split(',')[0].trim();
  const parts = dateOnly.split('/');
  if (parts.length === 3) return parts[0].padStart(2,'0') + '/' + parts[1].padStart(2,'0') + '/' + parts[2];
  return dateOnly.slice(0, 10);
}

function formatFechaCorta(f) {
  if (!f) return '—';
  const d = new Date(f);
  if (isNaN(d)) return String(f).slice(0, 5);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
}

function ntToggleSec(header) {
  const body  = header.nextElementSibling;
  const arrow = header.querySelector('span:last-child');
  const open  = body.style.display !== 'none';
  body.style.display = open ? 'none' : '';
  if (arrow) arrow.textContent = open ? '›' : '▾';
}

function ntOpenModal(name) {
  if (name === 'esther' && fichaData) {
    const f     = fichaData.ficha;
    const props = (fichaData.candidatos || []).filter(c => c.fuente === 'Inglobably');
    const addr  = `${[f.calle, f.numero].filter(Boolean).join(' ')} · ${[f.escalera, f.piso, f.puerta].filter(Boolean).join(' ')}`;
    let info = `<strong>${addr}</strong>`;
    if (props.length) {
      info += '<div style="margin-top:8px;font-size:11px;color:#888;font-weight:700;text-transform:uppercase;letter-spacing:.4px">Propietarios identificados</div>';
      info += props.map(p =>
        `<div style="margin-top:4px">${p.nombre}${p.nif ? ' — <strong>NIF: ' + p.nif + '</strong>' : ' — <span style="color:#b91c1c;font-size:11px">sin NIF</span>'}</div>`
      ).join('');
    } else {
      info += '<br><span style="color:#b91c1c;font-size:12px">⚠️ Sin propietarios con NIF — agregá los datos de Inglobably primero</span>';
    }
    document.getElementById('estherInfo').innerHTML = info;
  }
  if (name === 'notasimple' && fichaData) {
    const f     = fichaData.ficha;
    const props = (fichaData.candidatos || []).filter(c => c.fuente === 'Inglobably');
    const addr  = buildAddr(f);
    const el    = document.getElementById('notasimplePropInfo');
    if (props.length) {
      el.innerHTML = '<strong>Datos para la solicitud en el Registro:</strong>' +
        props.map(p =>
          `<div style="margin-top:4px">· ${p.nombre}${p.nif ? ' — NIF: <strong>' + p.nif + '</strong>' : ' — <span style="color:#b91c1c">sin NIF</span>'}</div>`
        ).join('') +
        `<div style="margin-top:4px;color:#888">Dirección: ${addr}</div>`;
    } else {
      el.innerHTML = '⚠️ Sin propietarios identificados con NIF. El Registro pedirá nombre + NIF + dirección.';
    }
    el.style.display = '';
  }
  if (name === 'editarPiso' && fichaData) {
    const f = fichaData.ficha;
    document.getElementById('editPisoEstado').value    = f.estado_piso || '';
    document.getElementById('editPisoSituacion').value = f.situacion   || '';
    document.getElementById('editPisoProp').value      = f.propietario || '';
    document.getElementById('editPisoFechaInquilino').value = f.fecha_contrato_inquilino
      ? new Date(f.fecha_contrato_inquilino).toISOString().split('T')[0] : '';
  }
  document.getElementById('nt-modal-' + name).classList.add('open');
}

async function setEstadoPiso(estado) {
  ntCloseModal('quickEstado');
  try {
    await ntApi({ action: 'actualizar_ficha_noticia', ficha_id: fichaData.ficha.ficha_id, estado_piso: estado });
    showToast('✓ ' + estado);
    await recargarFicha();
  } catch(err) { showToast('Error: ' + err.message); }
}

async function guardarInfoPiso() {
  const btn = document.getElementById('btnGuardarPiso');
  btn.disabled = true; btn.textContent = 'Guardando…';
  try {
    await ntApi({
      action:                   'actualizar_ficha_noticia',
      ficha_id:                 fichaData.ficha.ficha_id,
      estado_piso:              document.getElementById('editPisoEstado').value,
      situacion:                document.getElementById('editPisoSituacion').value.trim(),
      propietario:              document.getElementById('editPisoProp').value.trim(),
      fecha_contrato_inquilino: document.getElementById('editPisoFechaInquilino').value
    });
    ntCloseModal('editarPiso');
    showToast('✓ Información guardada');
    await recargarFicha();
  } catch(err) { showToast('Error: ' + err.message); }
  finally { btn.disabled = false; btn.textContent = 'Guardar'; }
}

function ntCloseModal(name) {
  document.getElementById('nt-modal-' + name).classList.remove('open');
}

document.querySelectorAll('.nt-modal-overlay').forEach(o => {
  o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); });
});

// ─────────────────────────────────────────────
//  START
// ─────────────────────────────────────────────
init();

// ═════════════════════════════════════════════
//  MÓDULO BUZONES
// ═════════════════════════════════════════════

// ── Navegación entre pantallas ──────────────
let _swipeDir = 'none';
const SWIPE_SCREENS = ['portales', 'taratura', 'noticias', 'tareas'];

function applyScreenAnim(el) {
    const cls = _swipeDir === 'fwd' ? 'screen-enter-fwd'
              : _swipeDir === 'bwd' ? 'screen-enter-bwd'
              : 'screen-enter';
    _swipeDir = 'none';
    void el.offsetHeight;
    el.classList.add(cls);
}

function initSwipe() {
    let startX = 0, startY = 0, startTime = 0;
    document.addEventListener('touchstart', e => {
        startX    = e.touches[0].clientX;
        startY    = e.touches[0].clientY;
        startTime = Date.now();
    }, { passive: true });
    document.addEventListener('touchend', e => {
        if (Date.now() - startTime > 500) return;
        const dx = e.changedTouches[0].clientX - startX;
        const dy = e.changedTouches[0].clientY - startY;
        if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return;
        const ficha = document.getElementById('screenFicha');
        if (ficha && ficha.classList.contains('ficha-abierta')) {
            if (dx > 0) volverLista();
            return;
        }
        const current = localStorage.getItem('tz_lastScreen');
        const idx = SWIPE_SCREENS.indexOf(current);
        if (idx === -1) return;
        if (dx < 0 && idx < SWIPE_SCREENS.length - 1) {
            _swipeDir = 'fwd';
            showScreen(SWIPE_SCREENS[idx + 1]);
        } else if (dx > 0 && idx > 0) {
            _swipeDir = 'bwd';
            showScreen(SWIPE_SCREENS[idx - 1]);
        }
    }, { passive: true });
}

function showScreen(screen) {
    const home        = document.getElementById('homeSection');
    const main        = document.getElementById('mainContainer');
    const not         = document.getElementById('noticiasSection');
    const buz         = document.getElementById('buzSection');
    const por         = document.getElementById('portalesSection');
    const tzSec       = document.getElementById('tareasSection');
    const tzFab       = document.getElementById('tzFabBtn');
    const tabPortales = document.getElementById('tabPortales');
    const tabTaratura = document.getElementById('tabTaratura');
    const tabNoticias = document.getElementById('tabNoticias');
    const tabBuzones  = document.getElementById('tabBuzones');
    const tabTareas   = document.getElementById('tabTareas');
    const title       = document.querySelector('.header-title');
    const homeBtn     = document.getElementById('headerHomeBtn');

    // Ocultar todas las pantallas principales antes de mostrar la elegida
    home.style.display   = 'none';
    main.style.display   = 'none';
    not.style.display    = 'none';
    buz.style.display    = 'none';
    por.style.display    = 'none';
    tzSec.style.display  = 'none';
    if (tzFab) tzFab.style.display = 'none';
    [home, main, not, buz, por, tzSec].forEach(el => el.classList.remove('screen-enter', 'screen-enter-fwd', 'screen-enter-bwd'));
    tabPortales.classList.remove('active');
    tabTaratura.classList.remove('active');
    tabNoticias.classList.remove('active');
    tabBuzones.classList.remove('active');
    tabTareas.classList.remove('active');

    localStorage.setItem('tz_lastScreen', screen);

    if (screen === 'home') {
        home.style.display = 'flex';
        applyScreenAnim(home);
        title.textContent  = 'Captación de Inmuebles';
        homeBtn.classList.add('hidden');

    } else if (screen === 'taratura') {
        main.style.display = '';
        applyScreenAnim(main);
        tabTaratura.classList.add('active');
        title.textContent = 'Taratura';
        homeBtn.classList.remove('hidden');

    } else if (screen === 'noticias') {
        not.style.display = 'block';
        applyScreenAnim(not);
        tabNoticias.classList.add('active');
        title.textContent = 'Noticias';
        homeBtn.classList.remove('hidden');
        initNoticias();

    } else if (screen === 'portales') {
        por.style.display = 'block';
        applyScreenAnim(por);
        tabPortales.classList.add('active');
        title.textContent = 'Portales';
        homeBtn.classList.remove('hidden');
        initPortales();

    } else if (screen === 'tareas') {
        tzSec.style.display = 'block';
        applyScreenAnim(tzSec);
        tabTareas.classList.add('active');
        title.textContent = 'Tareas';
        homeBtn.classList.remove('hidden');
        if (tzFab) tzFab.style.display = '';
        initTareas();

    } else if (screen === 'buzones') {
        buz.style.display = 'block';
        applyScreenAnim(buz);
        tabBuzones.classList.add('active');
        title.textContent = 'Buzones';
        homeBtn.classList.remove('hidden');
        // Siempre arrancar en Pendientes al entrar a la sección
        buzFilter = 'pending';
        document.getElementById('btnFilterPending').classList.add('active');
        document.getElementById('btnFilterDone').classList.remove('active');
        document.getElementById('buzDateBar').style.display  = 'none';
        document.getElementById('buzClearAll').style.display = 'none';
        const capGrid = document.querySelector('.capture-grid');
        if (capGrid) capGrid.style.display = '';
        loadBuzList();
    }
}

// ── IndexedDB ───────────────────────────────
let buzDB = null;

function openBuzDB() {
    return new Promise((resolve, reject) => {
        if (buzDB) { resolve(buzDB); return; }
        const req = indexedDB.open('TaraturaBuzones', 1);
        req.onupgradeneeded = e => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('portales')) {
                db.createObjectStore('portales', { keyPath: 'id' });
            }
        };
        req.onsuccess = e => { buzDB = e.target.result; resolve(buzDB); };
        req.onerror   = e => reject(e.target.error);
    });
}

async function idbPut(record) {
    const db = await openBuzDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('portales', 'readwrite');
        tx.objectStore('portales').put(record);
        tx.oncomplete = () => resolve();
        tx.onerror    = e => reject(e.target.error);
    });
}

async function idbGetAll() {
    const db = await openBuzDB();
    return new Promise((resolve, reject) => {
        const tx  = db.transaction('portales', 'readonly');
        const req = tx.objectStore('portales').getAll();
        req.onsuccess = e => resolve(e.target.result);
        req.onerror   = e => reject(e.target.error);
    });
}

async function idbGet(id) {
    const db = await openBuzDB();
    return new Promise((resolve, reject) => {
        const tx  = db.transaction('portales', 'readonly');
        const req = tx.objectStore('portales').get(id);
        req.onsuccess = e => resolve(e.target.result);
        req.onerror   = e => reject(e.target.error);
    });
}

async function idbDelete(id) {
    const db = await openBuzDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('portales', 'readwrite');
        tx.objectStore('portales').delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror    = e => reject(e.target.error);
    });
}

// ── Estado del módulo ───────────────────────
let pendingFiles    = [];
let currentBuzId    = null;
let currentMediaIdx = 0;
let objectUrls      = [];

function revokeObjectUrls() {
    objectUrls.forEach(url => URL.revokeObjectURL(url));
    objectUrls = [];
}

// ── Captura ─────────────────────────────────
function triggerCameraFoto() {
    const el = document.getElementById('inputCameraFoto');
    el.value = ''; el.click();
}
function triggerCameraVideo() {
    const el = document.getElementById('inputCameraVideo');
    el.value = ''; el.click();
}
function triggerGaleria() {
    const el = document.getElementById('inputGaleria');
    el.value = ''; el.click();
}
function addMoreFoto() {
    const el = document.getElementById('inputCameraFoto');
    el.value = ''; el.click();
}
function addMoreVideo() {
    const el = document.getElementById('inputCameraVideo');
    el.value = ''; el.click();
}
function addMoreMedia() {
    const el = document.getElementById('inputAddMedia');
    el.value = ''; el.click();
}

function handleFiles(fileList, addToExisting) {
    if (!fileList || fileList.length === 0) return;
    pendingFiles = [...fileList];
    if (addToExisting && currentBuzId) {
        addFilesToCurrent();
    } else {
        openBuzModal();
    }
}

async function addFilesToCurrent() {
    if (!currentBuzId) return;
    const record = await idbGet(currentBuzId);
    if (!record) return;
    for (const f of pendingFiles) {
        record.files.push({ name: f.name, type: f.type, blob: f });
    }
    await idbPut(record);
    renderMediaViewer(record);
    document.getElementById('buzReviewMeta').textContent =
        `${record.files.length} archivo${record.files.length !== 1 ? 's' : ''} · ${formatTimeAgo(record.timestamp)}`;
    pendingFiles = [];
    showToast(`✓ ${pendingFiles.length || record.files.length} archivo${record.files.length !== 1 ? 's' : ''} añadidos`);
}

// ── Modal tagging ────────────────────────────
function openBuzModal() {
    // Pre-rellenar con la calle/portal actual del formulario de taratura si existen
    const calle  = document.getElementById('fCalle')?.value.trim()  || '';
    const portal = document.getElementById('fPortal')?.value.trim() || '';
    document.getElementById('modalCalle').value  = calle;
    document.getElementById('modalPortal').value = portal;
    document.getElementById('buzModal').style.display = 'flex';
    setTimeout(() => document.getElementById('modalCalle').focus(), 60);
}

function closeBuzModal() {
    document.getElementById('buzModal').style.display = 'none';
    pendingFiles = [];
}

function buzModalBackdrop(e) {
    if (e.target === document.getElementById('buzModal')) closeBuzModal();
}

async function confirmPortalTag() {
    const calle  = document.getElementById('modalCalle').value.trim();
    const portal = document.getElementById('modalPortal').value.trim();
    if (!calle || !portal) { showToast('Completa Calle y Número'); return; }

    const id     = 'buz_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    const record = {
        id,
        calle,
        portal,
        timestamp: Date.now(),
        files:   pendingFiles.map(f => ({ name: f.name, type: f.type, blob: f })),
        puertas: []
    };

    await idbPut(record);
    closeBuzModal();
    pendingFiles = [];
    showToast(`✓ Guardado · ${calle} ${portal}`);
    openReview(id);
}

// ── Lista de portales ────────────────────────
let buzFilter = 'pending';

function setBuzFilter(f) {
    buzFilter = f;
    document.getElementById('btnFilterPending').classList.toggle('active', f === 'pending');
    document.getElementById('btnFilterDone').classList.toggle('active',   f === 'done');
    const capGrid = document.querySelector('.capture-grid');
    if (capGrid) capGrid.style.display = f === 'done' ? 'none' : '';
    document.getElementById('buzDateBar').style.display   = f === 'done' ? '' : 'none';
    document.getElementById('buzClearAll').style.display  = f === 'done' ? '' : 'none';
    loadBuzList();
}

function clearBuzDate() {
    document.getElementById('buzDateInput').value = '';
    loadBuzList();
}

async function deleteBuzRecord(id, e) {
    e.stopPropagation(); // no abrir la revisión
    const rec = await idbGet(id);
    const msg = rec && rec.registrado
        ? '¿Eliminar este portal del historial?\nLos datos ya están en Excel.'
        : '¿Eliminar este portal pendiente?\nSe borrarán las fotos guardadas.';
    if (!confirm(msg)) return;
    await idbDelete(id);
    loadBuzList();
}

async function clearAllHistory() {
    const dateVal = document.getElementById('buzDateInput').value;
    const msg = dateVal
        ? `¿Eliminar todos los registros del historial del ${formatDate(dateVal)}?`
        : '¿Vaciar todo el historial de portales completados?\n\nLos datos ya están en Excel. Solo se borran los registros locales.';
    if (!confirm(msg)) return;
    const records = await idbGetAll();
    for (const r of records) {
        if (!r.registrado) continue;
        if (dateVal) {
            const d = new Date(r.fechaRegistrado || r.timestamp);
            const dStr = d.toISOString().slice(0, 10);
            if (dStr !== dateVal) continue;
        }
        await idbDelete(r.id);
    }
    loadBuzList();
}

function formatDate(iso) {
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
}

async function loadBuzList() {
    const records   = await idbGetAll();
    const list      = document.getElementById('buzPendingList');
    const pending   = records.filter(r => !r.registrado).sort((a, b) => b.timestamp - a.timestamp);
    const completed = records.filter(r =>  r.registrado).sort((a, b) =>
        (b.fechaRegistrado || b.timestamp) - (a.fechaRegistrado || a.timestamp));

    // Actualizar contadores en los tabs
    document.getElementById('cntPending').textContent = pending.length   || '';
    document.getElementById('cntDone').textContent    = completed.length || '';

    // Filtro de fecha en historial
    const dateVal = buzFilter === 'done' ? document.getElementById('buzDateInput').value : '';
    let active = buzFilter === 'done' ? completed : pending;
    if (dateVal) {
        active = active.filter(r => {
            const d = new Date(r.fechaRegistrado || r.timestamp);
            return d.toISOString().slice(0, 10) === dateVal;
        });
    }

    list.innerHTML = '';
    revokeObjectUrls();

    if (!active.length) {
        list.innerHTML = buzFilter === 'pending'
            ? '<div class="buz-empty">Sin portales pendientes.<br>Toca "Sacar foto" o "Cargar de galería".</div>'
            : dateVal
                ? `<div class="buz-empty">Sin registros para el ${formatDate(dateVal)}.</div>`
                : '<div class="buz-empty">Sin portales completados todavía.</div>';
        return;
    }

    active.forEach(rec => {
        const item  = document.createElement('div');
        item.className = 'buz-portal-item' + (rec.registrado ? ' is-done' : '');
        item.onclick   = () => openReview(rec.id);

        const count = rec.files.length;
        const ref   = rec.registrado ? (rec.fechaRegistrado || rec.timestamp) : rec.timestamp;
        const meta  = `${count} archivo${count !== 1 ? 's' : ''} · ${formatTimeAgo(ref)}`;

        const thumb = document.createElement('div');
        thumb.className = 'buz-thumb';
        if (rec.registrado) {
            thumb.innerHTML = '<span style="font-size:22px">✅</span>';
        } else if (rec.files.length > 0 && rec.files[0].type.startsWith('image/')) {
            const url = URL.createObjectURL(rec.files[0].blob);
            objectUrls.push(url);
            thumb.innerHTML = `<img src="${url}" alt="">`;
        } else if (rec.files.length > 0) {
            thumb.textContent = '🎥';
        } else {
            thumb.textContent = '📷';
        }

        const check = rec.registrado ? '<span class="buz-done-check">✓</span>' : '';
        // Botón borrar en todos los items
        const delBtn = `<button class="buz-item-del" onclick="deleteBuzRecord('${rec.id}',event)" title="Eliminar">🗑</button>`;
        item.innerHTML = `
            <div class="buz-portal-info">
                <div class="buz-portal-name">${check}${rec.calle} ${rec.portal}</div>
                <div class="buz-portal-meta">${meta}</div>
            </div>
            ${delBtn}<span class="buz-arrow">›</span>
        `;
        item.insertBefore(thumb, item.firstChild);
        list.appendChild(item);
    });
}

function formatTimeAgo(ts) {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'Ahora mismo';
    if (mins < 60) return `Hace ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `Hace ${hrs}h`;
    return `Hace ${Math.floor(hrs / 24)}d`;
}

// ── Vista de revisión ────────────────────────
async function openReview(id) {
    const record = await idbGet(id);
    if (!record) return;

    currentBuzId    = id;
    currentMediaIdx = 0;

    document.getElementById('buzListView').style.display   = 'none';
    document.getElementById('buzReviewView').style.display = '';
    document.getElementById('buzReviewTitle').textContent  = `${record.calle} ${record.portal}`;
    document.getElementById('buzReviewMeta').textContent   =
        `${record.files.length} archivo${record.files.length !== 1 ? 's' : ''} · ${formatTimeAgo(record.timestamp)}`;

    // Banner + botón según estado
    const banner = document.getElementById('buzRegisteredBanner');
    const btn    = document.getElementById('btnRegistrar');
    if (record.registrado) {
        banner.style.display = '';
        btn.textContent      = '🔄 Actualizar en Excel';
        btn.style.background = '#0f172a';
    } else {
        banner.style.display = 'none';
        btn.textContent      = '⬇ Guardar en Excel';
        btn.style.background = '#10b981';
    }
    btn.disabled = false;

    renderMediaViewer(record);
    renderBuzFloors(record);
}

function showBuzList() {
    revokeObjectUrls();
    currentBuzId    = null;
    currentMediaIdx = 0;
    document.getElementById('buzListView').style.display   = '';
    document.getElementById('buzReviewView').style.display = 'none';
    loadBuzList();
}

function renderMediaViewer(record) {
    const viewer  = document.getElementById('mediaViewer');
    const counter = document.getElementById('mediaCounter');
    const prev    = document.getElementById('mediaPrev');
    const next    = document.getElementById('mediaNext');

    revokeObjectUrls();

    if (!record.files.length) {
        viewer.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:32px 16px;text-align:center">
                <div style="font-size:36px">📷</div>
                <div style="font-size:13px;font-weight:600;color:#64748b">Sin fotos todavía.<br>Añade fotos o vídeo del buzón.</div>
                <button onclick="triggerCamera()" style="padding:10px 20px;background:#0f172a;color:white;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer">Abrir cámara</button>
                <button onclick="triggerGaleria()" style="padding:10px 18px;background:#f1f5f9;color:#64748b;border:2px solid #e2e8f0;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer">Cargar de galería</button>
            </div>`;
        counter.textContent = '0 / 0';
        prev.disabled = next.disabled = true;
        return;
    }

    const total = record.files.length;
    currentMediaIdx = Math.max(0, Math.min(currentMediaIdx, total - 1));

    const file = record.files[currentMediaIdx];
    const url  = URL.createObjectURL(file.blob);
    objectUrls.push(url);

    const delBtn = `<button onclick="deleteCurrentMedia()" title="Eliminar" style="position:absolute;top:8px;right:8px;background:rgba(220,38,38,0.85);color:white;border:none;border-radius:8px;padding:5px 10px;font-size:12px;font-weight:700;cursor:pointer;z-index:10">🗑️ Eliminar</button>`;
    if (file.type.startsWith('image/')) {
        viewer.innerHTML = `<img src="${url}" alt="Foto ${currentMediaIdx + 1}">${delBtn}`;
    } else {
        viewer.innerHTML = `<video src="${url}" controls playsinline style="max-width:100%;max-height:340px"></video>${delBtn}`;
    }

    counter.textContent = `${currentMediaIdx + 1} / ${total}`;
    prev.disabled = currentMediaIdx === 0;
    next.disabled = currentMediaIdx === total - 1;
}

function mediaNav(dir) {
    currentMediaIdx += dir;
    idbGet(currentBuzId).then(record => { if (record) renderMediaViewer(record); });
}

async function deleteCurrentMedia() {
    const record = await idbGet(currentBuzId);
    if (!record || !record.files.length) return;
    if (!confirm('¿Eliminar esta foto/vídeo?')) return;
    record.files.splice(currentMediaIdx, 1);
    if (currentMediaIdx >= record.files.length) currentMediaIdx = Math.max(0, record.files.length - 1);
    await idbPut(record);
    document.getElementById('buzReviewMeta').textContent =
        `${record.files.length} archivo${record.files.length !== 1 ? 's' : ''} · ${formatTimeAgo(record.timestamp)}`;
    renderMediaViewer(record);
}

async function restablecerBuzones() {
    const rec = await idbGet(currentBuzId);
    const msg = rec && rec.registrado
        ? '¿Eliminar este portal del historial?\n\nLos datos ya fueron guardados en Excel. Solo se borrará el registro local (fotos y nombres).\n\nEsta acción no se puede deshacer.'
        : '¿Restablecer este portal? Se eliminarán las fotos y los nombres sin guardar en Excel.\n\nEsta acción no se puede deshacer.';
    if (!confirm(msg)) return;
    await idbDelete(currentBuzId);
    revokeObjectUrls();
    currentBuzId    = null;
    currentMediaIdx = 0;
    document.getElementById('buzListView').style.display   = '';
    document.getElementById('buzReviewView').style.display = 'none';
    loadBuzList();
    showToast('Portal restablecido');
}

// ── Buzones: estructura Piso / Escalera / Puerta ─────────────────
let buzFloorSeq = 0;
let buzDoorSeq  = 0;

function renderBuzFloors(record) {
    document.getElementById('buzFloors').innerHTML = '';
    buzFloorSeq = 0;
    buzDoorSeq  = 0;
    if (record.floors && record.floors.length) {
        record.floors.forEach(f => addBuzFloor(f.piso, f.escalera, f.doors));
    } else {
        addBuzFloor();
    }
}

function addBuzFloor(savedPiso, savedEsc, savedDoors) {
    buzFloorSeq++;
    const fid = 'bf' + buzFloorSeq;

    // Sugerir piso no usado
    const used = [...document.querySelectorAll('.floor-card')].map(el => {
        const s = document.getElementById(el.id + 'P');
        return s ? s.value : '';
    });
    let suggPiso = savedPiso || '';
    if (!suggPiso) {
        for (const p of PISOS) { if (!used.includes(p)) { suggPiso = p; break; } }
    }

    const pisoOpts = PISOS.map(p =>
        `<option value="${p}"${p === suggPiso ? ' selected' : ''}>${p}</option>`
    ).join('') + `<option value="_custom"${suggPiso === '_custom' ? ' selected' : ''}>✏️ Otro...</option>`;

    // Escalera/Bloque: mismo dropdown que taratura
    const escOpts = Object.entries(ESC_LABELS).map(([v, l]) =>
        `<option value="${v}"${v === savedEsc ? ' selected' : ''}>${l}</option>`
    ).join('');
    // Detectar si savedEsc es un valor custom (no está en ESC_OPTIONS)
    const isEscCustom = savedEsc && savedEsc !== '' &&
        !Object.keys(ESC_LABELS).includes(savedEsc) && savedEsc !== '_custom';

    const div = document.createElement('div');
    div.className = 'floor-card';
    div.id = fid;
    div.innerHTML = `
        <div class="floor-header">
            <span class="floor-num">Planta</span>
            <select class="piso-select" id="${fid}P" onchange="onBuzPisoChange('${fid}')">${pisoOpts}</select>
            <input type="text" class="piso-custom" id="${fid}PCustom"
                   placeholder="Ej: Entresuelo, 16º..." oninput="">
            <button class="btn-icon btn-del" onclick="removeBuzFloor('${fid}')">×</button>
        </div>
        <div class="esc-panel open" id="${fid}EscPanel" style="display:flex">
            <select class="esc-select" id="${fid}Esc" onchange="onBuzEscChange('${fid}')">
                <option value="">Escalera / Bloque (opcional)...</option>
                ${escOpts}
            </select>
            <input type="text" class="esc-custom${isEscCustom ? ' show' : ''}" id="${fid}EscCustom"
                   placeholder="Nombre escalera o bloque..."
                   value="${isEscCustom ? savedEsc : ''}">
        </div>
        <div class="doors-list" id="${fid}BD"></div>
        <div style="padding:0 12px 8px">
            <button class="btn-add-door" onclick="addBuzDoor('${fid}')">+ Añadir puerta</button>
        </div>
    `;
    document.getElementById('buzFloors').appendChild(div);

    if (suggPiso === '_custom' && savedPiso) {
        const c = document.getElementById(fid + 'PCustom');
        c.classList.add('show');
        c.value = savedPiso;
    }
    if (isEscCustom) {
        document.getElementById(fid + 'Esc').value = '_custom';
    }

    if (savedDoors && savedDoors.length) {
        savedDoors.forEach(d => addBuzDoor(fid, d.puerta, d.nombres));
    } else {
        addBuzDoor(fid);
    }
}

function onBuzPisoChange(fid) {
    const sel    = document.getElementById(fid + 'P');
    const custom = document.getElementById(fid + 'PCustom');
    if (sel.value === '_custom') { custom.classList.add('show'); custom.focus(); }
    else { custom.classList.remove('show'); custom.value = ''; }
}

function onBuzEscChange(fid) {
    const sel    = document.getElementById(fid + 'Esc');
    const custom = document.getElementById(fid + 'EscCustom');
    if (sel.value === '_custom') { custom.classList.add('show'); custom.focus(); }
    else { custom.classList.remove('show'); custom.value = ''; }
}

function removeBuzFloor(fid) {
    if (document.querySelectorAll('#buzFloors .floor-card').length <= 1) {
        showToast('Debe quedar al menos una planta');
        return;
    }
    document.getElementById(fid).remove();
}

function addBuzDoor(fid, savedPuerta, savedNombres) {
    buzDoorSeq++;
    const did = 'bd' + buzDoorSeq;

    const used = [...document.querySelectorAll(`#${fid}BD .puerta-input`)].map(i => i.value);
    let suggPuerta = savedPuerta || '';
    if (!suggPuerta) {
        for (const p of PUERTAS) { if (!used.includes(p)) { suggPuerta = p; break; } }
    }

    const wrap = document.createElement('div');
    wrap.className = 'door-wrap';
    wrap.id = did + 'W';
    wrap.innerHTML = `
        <div class="door-row">
            <input class="puerta-input" id="${did}Pta" value="${suggPuerta}" placeholder="Pta">
            <div class="buz-door-names" id="${did}Names" onclick="document.getElementById('${did}NomInput').focus()">
                <div class="nombres-chips" id="${did}Chips"></div>
                <input class="buz-door-input" id="${did}NomInput"
                       placeholder="Nombre + Enter"
                       onkeydown="buzNombreKeydown(event,'${did}')">
            </div>
            <button class="btn-icon btn-del" onclick="removeBuzDoor('${fid}','${did}')">×</button>
        </div>
    `;
    document.getElementById(fid + 'BD').appendChild(wrap);
    (savedNombres || []).forEach(n => addBuzNombreChip(did, n));
}

function removeBuzDoor(fid, did) {
    if (document.querySelectorAll(`#${fid}BD .door-wrap`).length <= 1) {
        showToast('Debe quedar al menos una puerta');
        return;
    }
    document.getElementById(did + 'W').remove();
}

function buzNombreKeydown(e, did) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const input = document.getElementById(did + 'NomInput');
    const val   = input.value.trim();
    if (!val) return;
    addBuzNombreChip(did, val);
    input.value = '';
}

function addBuzNombreChip(did, text) {
    const chips = document.getElementById(did + 'Chips');
    const chip  = document.createElement('div');
    chip.className = 'nombre-chip';
    chip.style.cssText = 'margin:0;flex-shrink:0';
    chip.innerHTML = `${text}<button class="nombre-chip-del" onclick="this.closest('.nombre-chip').remove()" title="Eliminar">×</button>`;
    chips.appendChild(chip);
}

function getBuzFloorsData() {
    const floors = [];
    document.querySelectorAll('#buzFloors .floor-card').forEach(floorEl => {
        const fid = floorEl.id;
        const sel = document.getElementById(fid + 'P');
        let piso  = sel?.value || '';
        if (piso === '_custom') piso = document.getElementById(fid + 'PCustom')?.value.trim() || '';
        const escSel = document.getElementById(fid + 'Esc');
        let escalera = escSel?.value || '';
        if (escalera === '_custom') escalera = document.getElementById(fid + 'EscCustom')?.value.trim() || '';

        const doors = [];
        floorEl.querySelectorAll('.door-wrap').forEach(dWrap => {
            const did      = dWrap.id.replace('W', '');
            const puerta   = document.getElementById(did + 'Pta')?.value.trim() || '';
            // Auto-confirmar texto pendiente en el input (si el usuario no pulsó Enter)
            const nomInput = document.getElementById(did + 'NomInput');
            if (nomInput?.value.trim()) {
                addBuzNombreChip(did, nomInput.value.trim());
                nomInput.value = '';
            }
            const nombres = [...document.querySelectorAll(`#${did}Chips .nombre-chip`)]
                             .map(c => c.childNodes[0].textContent.trim())
                             .filter(Boolean);
            if (puerta || nombres.length) doors.push({ puerta, nombres });
        });

        if (piso || doors.length) floors.push({ piso, escalera, doors });
    });
    return floors;
}

async function saveCurrentSlots() {
    if (!currentBuzId) return;
    const record = await idbGet(currentBuzId);
    if (!record) return;
    record.floors = getBuzFloorsData();
    await idbPut(record);
}

// ── Subida de fotos a Drive (solo imágenes; el vídeo se queda en el móvil) ──
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function uploadFotoBuzon(file, calle, portal) {
    const base64 = await fileToBase64(file);
    const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
            action:   'media',
            Zona:     localStorage.getItem('tz_zona') || '',
            Calle:    calle,
            Portal:   portal,
            fileName: file.name || ('foto_' + Date.now() + '.jpg'),
            mimeType: file.type || 'image/jpeg',
            base64
        })
    });
    const result = await res.json();
    if (!result.ok) throw new Error(result.error || 'Error subiendo foto');
    return result.url;
}

// ── Registrar en Excel ───────────────────────
async function registrarBuzones() {
    await saveCurrentSlots();
    const record = await idbGet(currentBuzId);
    if (!record) return;

    const floorsData = getBuzFloorsData();
    if (!floorsData.length) { showToast('Añade al menos una planta con puertas'); return; }

    const btn = document.getElementById('btnRegistrar');
    btn.disabled    = true;
    btn.textContent = 'Enviando…';

    // Subir solo fotos (no vídeo) a Drive; si falla, igual se guardan los
    // nombres — la foto no es bloqueante para registrar.
    let fotoUrlsStr = '';
    const imgFiles = (record.files || []).filter(f => f.type.startsWith('image/'));
    if (imgFiles.length) {
        btn.textContent = 'Subiendo fotos…';
        try {
            const urls = await Promise.all(imgFiles.map(f => uploadFotoBuzon(f.blob, record.calle, record.portal)));
            fotoUrlsStr = urls.join(' | ');
        } catch (err) {
            showToast('No se pudieron subir las fotos (se guardan solo los nombres): ' + err.message);
        }
    }

    const ts   = new Date().toLocaleString('es-ES');
    const rows = [];
    floorsData.forEach(f => {
        f.doors.forEach(d => {
            rows.push({
                Timestamp:       ts,
                Zona:            localStorage.getItem('tz_zona')   || '',
                Asesor:          localStorage.getItem('tz_asesor') || '',
                Calle:           record.calle,
                Portal:          record.portal,
                Piso:            f.piso,
                Escalera_Bloque: f.escalera,
                Puerta:          d.puerta,
                Nombre_Buzon:    d.nombres.join(' / '),
                Foto_Buzon_URL:  fotoUrlsStr
            });
        });
    });

    btn.textContent = 'Enviando…';

    try {
        const res    = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body:   JSON.stringify({ action: 'buzones', rows })
        });
        const result = await res.json();
        if (!result.ok) throw new Error(result.error || 'Error en el servidor');

        // Marcar como registrado (no borrar — queda en historial)
        const updated = await idbGet(currentBuzId);
        updated.registrado      = true;
        updated.fechaRegistrado = Date.now();
        updated.floors          = floorsData; // guardar los nombres registrados
        await idbPut(updated);

        showToast(`✓ ${rows.length} puerta${rows.length !== 1 ? 's' : ''} registradas`);
        revokeObjectUrls();
        showBuzList();
    } catch (err) {
        showToast('Error: ' + err.message);
        btn.textContent = '✓ Registrar en Excel';
        btn.disabled    = false;
    }
}


// ═════════════════════════════════════════════
//  MÓDULO PORTALES
// ═════════════════════════════════════════════

let portalesData      = null;  // cache en memoria — 1 sola carga por sesión
let portalActual      = null;  // id del portal abierto en el detalle
let fichaPortalActual = {};    // ficha completa del portal abierto
let puertasOrdenadas  = [];    // puertas del portal actual en el orden visual (alto → bajo)
let obsPuertasActual  = {};    // historial de observaciones por puerta { clave: [{fecha,autor,obs}] }

async function initPortales() {
    if (portalesData) {
        renderPortalesList();
        document.getElementById('portalesListView').style.display  = '';
        document.getElementById('portalesDetailView').style.display = 'none';
    } else {
        await loadPortalesList(false);
    }
}

async function loadPortalesList(forceRefresh) {
    if (portalesData && !forceRefresh) { renderPortalesList(); return; }
    const asesor = document.getElementById('fAsesor').value;
    const zona   = document.getElementById('fZona').value;
    document.getElementById('portalesResults').innerHTML =
        '<div class="portales-empty">Cargando portales…</div>';
    const ctrl    = new AbortController();
    const timer   = setTimeout(() => ctrl.abort(), 30000);
    try {
        const res    = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body:   JSON.stringify({ action: 'listar_portales', asesor, zona }),
            signal: ctrl.signal
        });
        clearTimeout(timer);
        const result = await res.json();
        if (!result.ok) throw new Error(result.error || 'Error del servidor');
        portalesData = result.portales || [];
        renderPortalesList();
    } catch (err) {
        clearTimeout(timer);
        const msg = err.name === 'AbortError' ? 'Tiempo de espera agotado (30s). Revisá la conexión.' : (err.message || 'Error desconocido');
        document.getElementById('portalesResults').innerHTML =
            `<div class="portales-empty" style="color:#b91c1c">${msg}<br><button onclick="loadPortalesList(true)" style="margin-top:8px;padding:8px 16px;background:#0d9488;color:white;border:none;border-radius:8px;font-weight:700;cursor:pointer">Reintentar</button></div>`;
    }
}

function filtrarPortales() {
    renderPortalesList();
}

function renderPortalesList() {
    const q    = document.getElementById('portalesSearch').value.trim().toLowerCase();
    const data = portalesData || [];
    const filtered = q
        ? data.filter(p =>
            String(p.calle  || '').toLowerCase().includes(q) ||
            String(p.numero || '').toLowerCase().includes(q))
        : data;

    const container = document.getElementById('portalesResults');
    if (filtered.length === 0) {
        container.innerHTML = `<div class="portales-empty">${
            q ? 'No hay portales que coincidan.' : 'Sin portales aún. Toca <strong>+</strong> para añadir uno.'
        }</div>`;
        return;
    }

    // Agrupar por calle
    const byCalle = {};
    for (const p of filtered) {
        const c = String(p.calle || '').trim() || 'Sin calle';
        if (!byCalle[c]) byCalle[c] = [];
        byCalle[c].push(p);
    }

    let html = '';
    for (const calle of Object.keys(byCalle).sort((a, b) => a.localeCompare(b, 'es'))) {
        const portales = byCalle[calle].sort((a, b) =>
            String(a.numero || '').localeCompare(String(b.numero || ''), 'es', { numeric: true })
        );
        html += `<div class="portales-calle-group"><div class="portales-calle-nombre">${calle}</div>`;
        for (const p of portales) {
            const vueltas  = p.total_vueltas > 0 ? ` V${p.total_vueltas}` : '';
            const fechaStr = p.ultima_visita ? ' · ' + portalesFmtFecha(p.ultima_visita) : '';
            const obs      = String(p.observaciones || '').trim();
            html += `
              <div class="portales-item" onclick="abrirDetallePortal('${p.id_portal}')">
                <span class="portales-numero">Nº ${p.numero}</span>
                <span class="portales-estado-badge ${portalEstadoClass(p.estado_actual)}">${portalEstadoIcon(p.estado_actual)} ${p.estado_actual || 'Pendiente'}</span>
                <span class="portales-meta">${vueltas}${fechaStr}</span>
                ${obs ? `<span class="portales-item-obs">${obs}</span>` : ''}
              </div>`;
        }
        html += `</div>`;
    }
    container.innerHTML = html;
}

function portalEstadoClass(e) {
    if (e === 'Visitado') return 'estado-visitado';
    if (e === 'Parcial')  return 'estado-parcial';
    return 'estado-pendiente';
}
function portalEstadoIcon(e) {
    if (e === 'Visitado') return '✓';
    if (e === 'Parcial')  return '◑';
    return '●';
}
function ptalEstadoBadge(estado) {
    const map = {
        'Vacío':            { emoji: '🟢', color: '#065f46', bg: '#d1fae5' },
        'En Venta':         { emoji: '🟡', color: '#854d0e', bg: '#fef9c3' },
        'Alquilado':        { emoji: '🔵', color: '#0369a1', bg: '#cffafe' },
        'Vive-Propietario': { emoji: '🔵', color: '#1d4ed8', bg: '#bfdbfe' },
        'Sospechoso':       { emoji: '🟠', color: '#9a3412', bg: '#ffedd5' },
        'No Contesta':      { emoji: '⚪', color: '#64748b', bg: '#f1f5f9' },
    };
    return map[estado] || { emoji: '⚪', color: '#64748b', bg: '#f1f5f9' };
}

function ptalCaractLine(tipo, caract) {
    const items = [];
    if (tipo) {
        const t = tipo.toLowerCase();
        const em = t.includes('local') ? '🏪' : t.includes('garaje') || t.includes('plaza') ? '🅿️'
                 : t.includes('trastero') ? '📦' : t.includes('terreno') || t.includes('solar') ? '🌳'
                 : t.includes('edificio') ? '🏢' : t.includes('nave') ? '🏭' : '🏠';
        items.push(em + ' ' + tipo);
    }
    if (caract) {
        const c = caract.toLowerCase();
        const tags = [];
        if (c.includes('garaje') || c.includes('plaza de')) tags.push('🅿️');
        if (c.includes('trastero'))  tags.push('📦');
        if (c.includes('ascensor'))  tags.push('🛗');
        if (c.includes('terraza'))   tags.push('🌿');
        if (c.includes('jardín') || c.includes('jardin')) tags.push('🌳');
        if (c.includes('piscina'))   tags.push('🏊');
        items.push((tags.length ? tags.join('') + ' ' : '') + caract.substring(0, 55));
    }
    return items.filter(Boolean).join(' · ');
}

function portalesFmtFecha(f) {
    const s = String(f || '').trim();
    if (!s) return '';
    if (s.includes('-')) {
        const p = s.split('-');
        if (p.length >= 3) { const day = p[2].substring(0, 2); return `${day}/${p[1]}`; }
    }
    if (s.includes('/')) { const p = s.split('/'); return p.length >= 2 ? `${p[0]}/${p[1]}` : s; }
    return '';
}

async function abrirDetallePortal(idPortal) {
    portalActual = idPortal;
    document.getElementById('portalesListView').style.display   = 'none';
    document.getElementById('portalesDetailView').style.display = '';
    document.getElementById('portalesDetailHeader').innerHTML   = '<div class="portales-empty">Cargando…</div>';
    document.getElementById('portalesHistorial').innerHTML      = '';
    document.getElementById('portalesBuzones').innerHTML        = '';
    try {
        const res    = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body:   JSON.stringify({ action: 'obtener_portal', id_portal: idPortal })
        });
        const result = await res.json();
        if (!result.ok) throw new Error(result.error || 'Error');
        obsPuertasActual = result.obs_puertas || {};
        renderDetallePortal(result.ficha, result.visitas || [], result.notas || []);
    } catch (err) {
        document.getElementById('portalesDetailHeader').innerHTML =
            `<div class="portales-empty">Error al cargar.<br><button onclick="abrirDetallePortal('${idPortal}')" style="margin-top:8px;padding:8px 16px;background:#0d9488;color:white;border:none;border-radius:8px;font-weight:700;cursor:pointer">Reintentar</button></div>`;
    }
}

function renderDetallePortal(ficha, visitas, notas = []) {
    const puertasData = (ficha.puertas_registradas || []).filter(d => d.piso && d.puerta);

    // Características del edificio: una sola vez desde la primera puerta con datos
    const edifSrc    = puertasData.find(d => d.tipo || d.caract) || {};
    const caractLine = ptalCaractLine(edifSrc.tipo || '', edifSrc.caract || '');

    const detalleEdif = [
        ficha.plantas        ? ficha.plantas        + ' plantas'       : '',
        ficha.puertas_planta ? ficha.puertas_planta + ' puertas/planta' : '',
        ficha.escaleras      ? ficha.escaleras + (ficha.escaleras == 1 ? ' escalera' : ' escaleras') : ''
    ].filter(Boolean).join(' · ');

    document.getElementById('portalesDetailHeader').innerHTML = `
        <div class="portales-detalle-titulo">${ficha.calle}, ${ficha.numero}</div>
        ${caractLine  ? `<div class="portales-detalle-caract">${caractLine}</div>` : ''}
        ${detalleEdif ? `<div class="portales-detalle-edif">${detalleEdif}</div>` : ''}
        <div class="portales-detalle-estado ${portalEstadoClass(ficha.estado_actual)}">${portalEstadoIcon(ficha.estado_actual)} ${ficha.estado_actual || 'Pendiente'} · ${ficha.total_vueltas || 0} ${Number(ficha.total_vueltas) === 1 ? 'vuelta' : 'vueltas'}</div>
        ${ficha.observaciones ? `<div class="portales-obs">${ficha.observaciones}</div>` : ''}
    `;

    // Poblamos el card editable de edificio
    const edificioCard = document.getElementById('portalesEdificioCard');
    if (edificioCard) {
        document.getElementById('portalEditNotas').value    = ficha.notas_edificio  || '';
        document.getElementById('portalEditAdmin').value    = ficha.administrador   || '';
        document.getElementById('portalEditAdminTel').value = ficha.telefono_admin  || '';
        edificioCard.style.display = '';
    }

    const histEl = document.getElementById('portalesHistorial');
    const visitasOrdenadas = [...visitas].sort((a, b) => Number(b.vuelta || 0) - Number(a.vuelta || 0));

    function buildVisitaDiff(curr, prev) {
        const partes = [];
        if (curr.resultado_general && prev.resultado_general && curr.resultado_general !== prev.resultado_general) {
            partes.push(`${prev.resultado_general} → ${curr.resultado_general}`);
        }
        const cp = Number(curr.puertas_visitadas) || 0;
        const pp = Number(prev.puertas_visitadas) || 0;
        if (cp !== pp && pp > 0) {
            const d = cp - pp;
            partes.push((d > 0 ? '+' : '') + d + ' puertas');
        }
        return partes.join(' · ');
    }

    histEl.innerHTML = visitasOrdenadas.length === 0
        ? '<div class="portales-empty-sm">Sin visitas registradas aún.</div>'
        : visitasOrdenadas.map((v, i) => {
            const diffStr = (i === 0 && visitasOrdenadas.length > 1)
                ? buildVisitaDiff(v, visitasOrdenadas[1])
                : '';
            return `
            <div class="portales-visita-item">
              <div class="portales-visita-head">
                <span class="portales-visita-vuelta">Vuelta ${v.vuelta}</span>
                <span class="portales-visita-fecha">${portalesFmtFecha(v.fecha)}</span>
                <span class="portales-visita-asesor">${v.asesor || ''}</span>
              </div>
              <div class="portales-visita-result ${portalEstadoClass(v.resultado_general === 'Completada' ? 'Visitado' : v.resultado_general === 'Parcial' ? 'Parcial' : 'Pendiente')}">
                ${v.resultado_general || ''}${v.carta_enviada === 'Sí' ? ' · Carta enviada' : ''}${v.puertas_visitadas ? ` · ${v.puertas_visitadas} puertas` : ''}
              </div>
              ${diffStr ? `<div class="portales-visita-diff">vs anterior: ${diffStr}</div>` : ''}
              ${v.observaciones ? `<div class="portales-visita-obs">${v.observaciones}</div>` : ''}
            </div>`;
        }).join('');

    // Buzones: nombres se muestran por puerta arriba; aquí solo queda el botón editar
    document.getElementById('portalesBuzones').innerHTML = (ficha.buzones && ficha.buzones.trim())
        ? ''
        : '<div class="portales-aviso-buzones">⚠ Buzones pendientes de completar</div>';

    // ── Observaciones (historial de notas) ─────────────────────
    const notasEl = document.getElementById('portalesNotas');
    if (notasEl) {
        if (!notas.length) {
            notasEl.innerHTML = '<div class="portales-empty-sm">Sin observaciones aún.</div>';
        } else {
            const sorted = [...notas].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
            notasEl.innerHTML = sorted.map(n => `
                <div class="portal-nota-item">
                    <div class="portal-nota-meta">${n.autor || ''}${n.autor && n.fecha ? ' · ' : ''}${n.fecha || ''}</div>
                    <div class="portal-nota-texto">${n.nota || ''}</div>
                </div>`).join('');
        }
    }

    // ── Puertas con datos de Taratura ──────────────────────────
    const puertasCard = document.getElementById('portalesPuertasCard');
    const puertasEl   = document.getElementById('portalesPuertas');
    if (puertasCard && puertasEl) {
        if (!puertasData.length) {
            puertasCard.style.display = 'none';
        } else {
            puertasCard.style.display = '';

            // Mapa de nombres de buzones (piso+puerta → nombres)
            const buzonesMap = {};
            (ficha.buzones || '').split('\n').forEach(line => {
                const m = line.match(/^(.+?):\s*(.+)$/);
                if (m) buzonesMap[m[1].trim()] = m[2].trim();
            });

            puertasData.sort((a, b) => {
                const PISOS_L = ['Bajo','Entrepiso','Principal','1º','2º','3º','4º','5º','6º','7º','8º','9º','10º','11º','12º','13º','14º','15º','Ático','Sobreático'];
                const ia = PISOS_L.indexOf(a.piso), ib = PISOS_L.indexOf(b.piso);
                const na = ia >= 0 ? ia : 999, nb = ib >= 0 ? ib : 999;
                if (na !== nb) return nb - na;
                return (a.puerta || '').localeCompare(b.puerta || '');
            });
            puertasOrdenadas = puertasData;

            puertasEl.innerHTML = puertasData.map((d, idx) => {
                const label       = d.piso.replace(/º$/, '') + ' ' + d.puerta;
                const estadoLabel = d.estado || 'No Contesta';
                const sospechoso  = (d.vinculo || '').startsWith('Sospechoso');
                const badge       = ptalEstadoBadge(sospechoso ? 'Sospechoso' : estadoLabel);
                const vincNotable = d.vinculo && d.vinculo !== 'Sin vínculo' && !sospechoso;
                const buzKey      = d.piso.replace(/º$/, '') + ' ' + d.puerta;
                const nomBuz      = (d.nombre_buzon || buzonesMap[buzKey] || '').trim();

                return `
                <div class="${sospechoso ? 'ptal-puerta-row ptal-puerta-sosp' : 'ptal-puerta-row'}" onclick="abrirFichaPuerta(${idx})">
                  <div class="ptal-puerta-top">
                    <span class="ptal-puerta-lbl">${label}</span>
                    <span class="ptal-puerta-badge" style="background:${badge.bg};color:${badge.color}">${badge.emoji} ${estadoLabel}</span>
                    ${vincNotable ? `<span class="ptal-puerta-vinc">${d.vinculo}</span>` : ''}
                    <span class="ptal-puerta-chevron">›</span>
                  </div>
                  ${nomBuz ? `<div class="ptal-puerta-buz">${nomBuz}</div>` : ''}
                  ${d.info  ? `<div class="ptal-puerta-info">⚠️ ${d.info.substring(0, 80)}</div>` : ''}
                </div>`;
            }).join('');
        }
    }

    fichaPortalActual = ficha;
}

function cerrarDetallePortal() {
    document.getElementById('portalesDetailView').style.display = 'none';
    document.getElementById('portalesListView').style.display   = '';
    const edificioCard = document.getElementById('portalesEdificioCard');
    if (edificioCard) edificioCard.style.display = 'none';
    portalActual = null;
}

async function guardarDatosEdificio() {
    if (!fichaPortalActual) return;
    const notas_ed      = document.getElementById('portalEditNotas').value.trim();
    const admin_empresa = document.getElementById('portalEditAdmin').value.trim();
    const admin_tel     = document.getElementById('portalEditAdminTel').value.trim();
    const btn = document.getElementById('btnGuardarEdificio');
    btn.disabled = true; btn.textContent = 'Guardando…';
    try {
        const res    = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body:   JSON.stringify({
                action:        'actualizar_datos_edificio',
                calle:         fichaPortalActual.calle,
                numero:        fichaPortalActual.numero,
                notas_ed,
                admin_empresa,
                admin_tel,
                autor:         localStorage.getItem('tz_asesor') || ''
            })
        });
        const result = await res.json();
        if (!result.ok) throw new Error(result.error || 'Error guardando');
        fichaPortalActual.notas_edificio = notas_ed;
        fichaPortalActual.administrador  = admin_empresa;
        fichaPortalActual.telefono_admin = admin_tel;
        showToast('✓ Datos del edificio guardados');
    } catch (err) {
        showToast('Error: ' + err.message);
    } finally {
        btn.disabled = false; btn.textContent = 'Guardar cambios →';
    }
}

async function guardarDatosPuerta() {
    const data = window._puertaActualData;
    if (!data) return;
    const nombre    = document.getElementById('puertaEditNombre').value.trim();
    const telefono  = document.getElementById('puertaEditTelefono').value.trim();
    const vinculo   = [...document.querySelectorAll('#puertaModalCuerpo .puerta-vinc-btn.on')]
                        .map(el => el.dataset.value).join(' | ');
    const info_adic = [...document.querySelectorAll('#puertaModalCuerpo .indicio-item.on')]
                        .map(el => el.dataset.label).join(' | ');

    if (nombre === data.nombre && telefono === data.telefono &&
        vinculo === data.vinculo && info_adic === data.info_adic) {
        showToast('Sin cambios');
        cerrarModal('portalesPuertaModal');
        return;
    }
    const btn = document.getElementById('btnGuardarPuerta');
    btn.disabled = true; btn.textContent = 'Guardando…';
    try {
        const res    = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body:   JSON.stringify({
                action:   'actualizar_puerta',
                calle:    data.calle,
                numero:   data.numero,
                escalera: data.escalera,
                piso:     data.piso,
                puerta:   data.puerta,
                nombre,
                telefono,
                vinculo,
                info_adic,
                autor:    localStorage.getItem('tz_asesor') || ''
            })
        });
        const result = await res.json();
        if (!result.ok) throw new Error(result.error || 'Error guardando');
        // Actualizar caché local para reflejar el cambio sin recargar
        const entry = (fichaPortalActual.puertas_registradas || []).find(p =>
            p.piso === data.piso && p.puerta === data.puerta &&
            (p.escalera || '') === data.escalera
        );
        if (entry) {
            entry.nombre   = nombre;
            entry.telefono = telefono;
            entry.vinculo  = vinculo;
            entry.info     = info_adic;
        }
        window._puertaActualData.nombre    = nombre;
        window._puertaActualData.telefono  = telefono;
        window._puertaActualData.vinculo   = vinculo;
        window._puertaActualData.info_adic = info_adic;
        showToast('✓ Datos guardados');
        cerrarModal('portalesPuertaModal');
    } catch (err) {
        showToast('Error: ' + err.message);
    } finally {
        btn.disabled = false; btn.textContent = 'Guardar →';
    }
}

function abrirFichaPuerta(idx) {
    const d = puertasOrdenadas[idx];
    if (!d) return;
    window._puertaActualIdx = idx;

    const ficha      = fichaPortalActual;
    const dir        = [ficha.calle, ficha.numero].filter(Boolean).join(', ');
    const sospechoso = (d.vinculo || '').startsWith('Sospechoso');
    const estado     = d.estado || '—';
    const badge      = ptalEstadoBadge(sospechoso ? 'Sospechoso' : estado);
    const esc        = v => String(v || '').replace(/</g, '&lt;');

    document.getElementById('puertaModalTitulo').textContent =
        dir + ' · ' + d.piso + ' — Puerta ' + d.puerta;

    let html = `<div style="margin-bottom:14px">
        <span style="background:${badge.bg};color:${badge.color};padding:5px 14px;border-radius:20px;font-size:13px;font-weight:700">${badge.emoji} ${estado}</span>
    </div>`;

    const filas = [
        d.vinculo && d.vinculo !== 'Sin vínculo' ? ['Vínculo',      d.vinculo]      : null,
        d.nombre_buzon                            ? ['Buzón',        d.nombre_buzon]  : null,
        d.carta                                   ? ['Carta',        d.carta]          : null,
        d.fecha_visita                            ? ['Fecha visita', d.fecha_visita]  : null,
        d.asesor                                  ? ['Asesor',       d.asesor]         : null,
    ].filter(Boolean);

    html += filas.map(([k, v]) =>
        `<div class="noticia-detail-row"><span>${k}</span><span>${esc(v)}</span></div>`
    ).join('');

    const textoObs = d.observaciones || d.obs || '';
    const textoInd = d.info || d.indicios || d.info_adic || '';

    if (textoObs) {
        html += `<div style="margin-top:14px">
            <div class="card-label" style="font-size:10px;margin-bottom:5px">Última observación (Taratura)</div>
            <div style="font-size:13px;color:#334155;line-height:1.5;background:#f8fafc;padding:10px 12px;border-radius:8px;border:1px solid #e2e8f0;white-space:pre-wrap">${esc(textoObs)}</div>
        </div>`;
    }
    if (textoInd) {
        html += `<div style="margin-top:10px">
            <div class="card-label" style="font-size:10px;margin-bottom:5px">Notas adicionales</div>
            <div style="font-size:13px;color:#ea580c;line-height:1.5;background:#fff7ed;padding:10px 12px;border-radius:8px;border:1px solid #fed7aa;white-space:pre-wrap">${esc(textoInd)}</div>
        </div>`;
    }

    // ── Historial de observaciones ──────────────────────────────
    const doorKey  = [ficha.calle, ficha.numero, d.escalera || '', d.piso, d.puerta]
        .map(v => String(v || '').trim().toLowerCase()).join('||');
    const histObs  = (obsPuertasActual[doorKey] || []);

    html += `<div style="margin-top:18px;border-top:1px solid #e2e8f0;padding-top:14px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <div class="card-label" style="font-size:10px;margin-bottom:0">Historial de observaciones</div>
            <button class="puerta-obs-add-btn" onclick="abrirModalObsPuerta()">+ Añadir</button>
        </div>`;

    if (!histObs.length) {
        html += `<div class="portales-empty-sm">Sin observaciones registradas aún.</div>`;
    } else {
        html += histObs.map(o => `
            <div class="puerta-obs-item">
                <div class="puerta-obs-meta">${esc(o.autor)}${o.autor && o.fecha ? ' · ' : ''}${esc(o.fecha)}</div>
                <div class="puerta-obs-texto">${esc(o.obs)}</div>
            </div>`).join('');
    }
    html += `</div>`;

    // ── Editar datos del vecino ─────────────────────────────────
    const currentVinculos = (d.vinculo || '').split('|').map(v => v.trim()).filter(Boolean);
    const vincPills = VINCULOS_BTN.map(v =>
        `<div class="vinculo-btn puerta-vinc-btn${currentVinculos.includes(v.v) ? ' on' : ''}"
              data-value="${v.v}" onclick="this.classList.toggle('on')">
            <span class="vb-icon">${v.icon}</span> ${v.v}
         </div>`
    ).join('');

    const currentIndicios = (d.info || '').split('|').map(v => v.trim()).filter(Boolean);
    const indPills = INDICIOS.map(ind =>
        `<div class="indicio-item${currentIndicios.includes(ind.label) ? ' on' : ''}"
              data-label="${ind.label}"
              onclick="this.classList.toggle('on')">
            <span class="ind-icon">${ind.icon}</span>${ind.label}
         </div>`
    ).join('');

    html += `<div style="margin-top:18px;border-top:1px solid #e2e8f0;padding-top:14px">
        <div class="card-label" style="font-size:10px;margin-bottom:10px">Editar datos del vecino</div>
        <div style="margin-bottom:12px">
            <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px">Vínculo con el inmueble</div>
            <div class="vinculo-grid">${vincPills}</div>
        </div>
        <div style="margin-bottom:12px">
            <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px">Información adicional</div>
            <div class="indicios-grid">${indPills}</div>
        </div>
        <div style="margin-bottom:10px">
            <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px">Nombre vecino</div>
            <input type="text" id="puertaEditNombre" value="${esc(d.nombre || '')}" placeholder="Nombre del propietario / inquilino"
                   style="width:100%;padding:9px 11px;border:2px solid #e2e8f0;border-radius:8px;font-size:14px;color:#1e293b;background:#f8fafc;box-sizing:border-box">
        </div>
        <div>
            <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.8px;margin-bottom:4px">Teléfono</div>
            <input type="tel" id="puertaEditTelefono" value="${esc(d.telefono || '')}" placeholder="Ej. 612 345 678"
                   style="width:100%;padding:9px 11px;border:2px solid #e2e8f0;border-radius:8px;font-size:14px;color:#1e293b;background:#f8fafc;box-sizing:border-box">
        </div>
    </div>`;

    // Guardamos referencia para las funciones de guardar
    window._puertaActualData = {
        calle:     ficha.calle,
        numero:    ficha.numero,
        escalera:  d.escalera  || '',
        piso:      d.piso,
        puerta:    d.puerta,
        nombre:    d.nombre    || '',
        telefono:  d.telefono  || '',
        vinculo:   d.vinculo   || '',
        info_adic: d.info      || '',
        doorKey
    };

    document.getElementById('puertaModalCuerpo').innerHTML = html;
    document.getElementById('btnGuardarPuerta').style.display = '';
    document.getElementById('portalesPuertaModal').style.display = 'flex';
}

function abrirModalObsPuerta() {
    const p = window._puertaActualData || {};
    const titulo = [p.piso, 'Puerta ' + p.puerta].filter(Boolean).join(' — ');
    document.getElementById('obsPuertaModalTitulo').textContent = titulo || 'Nueva observación';
    document.getElementById('obsPuertaTexto').value = '';
    // Ocultar modal de puerta para que éste quede por encima (está antes en el DOM)
    document.getElementById('portalesPuertaModal').style.display = 'none';
    document.getElementById('portalesObsPuertaModal').style.display = 'flex';
    setTimeout(() => document.getElementById('obsPuertaTexto')?.focus(), 80);
}

function cancelarObsPuerta() {
    cerrarModal('portalesObsPuertaModal');
    if (window._puertaActualIdx !== undefined) abrirFichaPuerta(window._puertaActualIdx);
}

async function guardarObsPuerta() {
    const p    = window._puertaActualData || {};
    const obs  = (document.getElementById('obsPuertaTexto').value || '').trim();
    if (!obs) { showToast('Escribe una observación'); return; }

    const btn  = document.getElementById('btnGuardarObsPuerta');
    btn.disabled = true; btn.textContent = 'Guardando…';

    const asesor = localStorage.getItem('taratura_asesor') || '';
    try {
        const res    = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body:   JSON.stringify({
                action:   'añadir_observacion_puerta',
                calle:    p.calle,
                numero:   p.numero,
                escalera: p.escalera || '',
                piso:     p.piso,
                puerta:   p.puerta,
                autor:    asesor,
                obs
            })
        });
        const result = await res.json();
        if (!result.ok) throw new Error(result.error || 'Error');

        // Actualizar cache local para que el modal se refresque sin recargar el portal
        const clave = p.doorKey;
        if (!obsPuertasActual[clave]) obsPuertasActual[clave] = [];
        obsPuertasActual[clave].unshift({ fecha: result.fecha || '', autor: asesor, obs });

        cerrarModal('portalesObsPuertaModal');
        showToast('Observación guardada');

        // Refrescar el contenido del modal de puerta con el nuevo historial
        const idx = puertasOrdenadas.findIndex(d =>
            String(d.piso || '').trim() === String(p.piso || '').trim() &&
            String(d.puerta || '').trim() === String(p.puerta || '').trim()
        );
        if (idx >= 0) abrirFichaPuerta(idx);

    } catch (err) {
        showToast('Error al guardar: ' + err.message);
    } finally {
        btn.disabled = false; btn.textContent = 'Guardar →';
    }
}

async function eliminarPortal() {
    if (!portalActual) return;
    const ficha  = fichaPortalActual || {};
    const nombre = [ficha.calle, ficha.numero].filter(Boolean).join(' ') || portalActual;
    if (!confirm(`¿Eliminar "${nombre}" de tu lista de portales?\n\nLos datos de taratura ya guardados en Registros no se borran.`)) return;
    try {
        const res    = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body:   JSON.stringify({ action: 'eliminar_portal', id_portal: portalActual })
        });
        const result = await res.json();
        if (!result.ok) throw new Error(result.error || 'Error');
        showToast(`"${nombre}" eliminado ✓`);
        portalesData = null;
        cerrarDetallePortal();
        await loadPortalesList(true);
    } catch (err) {
        showToast('Error: ' + err.message);
        portalesData = null;
        cerrarDetallePortal();
        await loadPortalesList(true);
    }
}

// ── Modal: nuevo portal ──────────────────────

function abrirModalNuevoPortal() {
    ['portalNuevoCalle','portalNuevoNumero','portalNuevoPlantas',
     'portalNuevoPuertas','portalNuevoEscaleras','portalNuevoObs','portalNuevoEtiquetas']
        .forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('portalesNuevoModal').style.display = 'flex';
}

async function guardarNuevoPortal() {
    const calle  = document.getElementById('portalNuevoCalle').value.trim();
    const numero = document.getElementById('portalNuevoNumero').value.trim();
    if (!calle || !numero) { showToast('Completa la calle y el número'); return; }
    const asesor = document.getElementById('fAsesor').value;
    const zona   = document.getElementById('fZona').value;
    const btn    = document.querySelector('#portalesNuevoModal .btn-modal-confirm');
    btn.disabled = true; btn.textContent = 'Guardando…';
    try {
        const res    = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body:   JSON.stringify({
                action:            'crear_portal',
                asesor, zona, calle, numero,
                plantas:           document.getElementById('portalNuevoPlantas').value    || '',
                puertas_planta:    document.getElementById('portalNuevoPuertas').value    || '',
                escaleras:         document.getElementById('portalNuevoEscaleras').value  || '',
                etiquetas_puertas: document.getElementById('portalNuevoEtiquetas').value.trim(),
                observaciones:     document.getElementById('portalNuevoObs').value.trim()
            })
        });
        const result = await res.json();
        if (!result.ok) throw new Error(result.error || 'Error');
        const etiquetasPendientes = document.getElementById('portalNuevoEtiquetas').value.trim();
        if (etiquetasPendientes) sessionStorage.setItem('pendingPortalEtiquetas', etiquetasPendientes);
        cerrarModal('portalesNuevoModal');
        showToast('Portal añadido ✓');
        portalesData = null;
        await loadPortalesList(true);
    } catch (err) {
        showToast('Error: ' + err.message);
    } finally {
        btn.disabled = false; btn.textContent = 'Guardar →';
    }
}

// ── Modal: registrar visita ──────────────────

function abrirModalVisita() {
    document.getElementById('visitaFecha').value = todayLocalISO();
    document.querySelectorAll('#visitaResultado .portales-result-btn')
        .forEach(b => b.classList.remove('portales-result-btn-active'));
    document.getElementById('visitaCartaSi').classList.remove('portales-result-btn-active');
    document.getElementById('visitaCartaNo').classList.add('portales-result-btn-active');
    document.getElementById('visitaPuertas').value = '';
    document.getElementById('visitaObs').value     = '';
    document.getElementById('portalesVisitaModal').style.display = 'flex';
}

function selectResultado(btn) {
    document.querySelectorAll('#visitaResultado .portales-result-btn')
        .forEach(b => b.classList.remove('portales-result-btn-active'));
    btn.classList.add('portales-result-btn-active');
}

function selectCarta(val) {
    document.getElementById('visitaCartaSi').classList.toggle('portales-result-btn-active', val === 'Si');
    document.getElementById('visitaCartaNo').classList.toggle('portales-result-btn-active', val === 'No');
}

async function guardarVisita() {
    const rBtn = document.querySelector('#visitaResultado .portales-result-btn-active');
    if (!rBtn) { showToast('Selecciona un resultado'); return; }
    const cartaSi = document.getElementById('visitaCartaSi').classList.contains('portales-result-btn-active');
    const btn = document.getElementById('btnGuardarVisita');
    btn.disabled = true; btn.textContent = 'Guardando…';
    try {
        const res    = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body:   JSON.stringify({
                action:            'registrar_visita',
                id_portal:         portalActual,
                fecha:             document.getElementById('visitaFecha').value,
                asesor:            document.getElementById('fAsesor').value,
                resultado_general: rBtn.dataset.v,
                carta_enviada:     cartaSi ? 'Sí' : 'No',
                puertas_visitadas: document.getElementById('visitaPuertas').value || 0,
                observaciones:     document.getElementById('visitaObs').value.trim()
            })
        });
        const result = await res.json();
        if (!result.ok) throw new Error(result.error || 'Error');
        cerrarModal('portalesVisitaModal');
        showToast('Visita registrada ✓');
        portalesData = null;
        await abrirDetallePortal(portalActual);
    } catch (err) {
        showToast('Error: ' + err.message);
    } finally {
        btn.disabled = false; btn.textContent = 'Guardar →';
    }
}

// ── Modal: añadir observación ────────────────

function abrirModalNota() {
    document.getElementById('notaTexto').value = '';
    document.getElementById('portalesNotaModal').style.display = 'flex';
    setTimeout(() => document.getElementById('notaTexto')?.focus(), 80);
}

async function guardarNota() {
    const texto = (document.getElementById('notaTexto').value || '').trim();
    if (!texto) { showToast('Escribe una observación'); return; }

    const btn = document.getElementById('btnGuardarNota');
    btn.disabled = true; btn.textContent = 'Guardando…';

    const asesor = localStorage.getItem('taratura_asesor') || '';
    try {
        const res    = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body:   JSON.stringify({ action: 'añadir_nota_portal', id_portal: portalActual, autor: asesor, nota: texto })
        });
        const result = await res.json();
        if (!result.ok) throw new Error(result.error || 'Error');
        cerrarModal('portalesNotaModal');
        showToast('Observación guardada');
        abrirDetallePortal(portalActual);
    } catch (err) {
        showToast('Error al guardar: ' + err.message);
    } finally {
        btn.disabled = false; btn.textContent = 'Guardar →';
    }
}

// ── Modal: editar buzones ────────────────────

function inferEtiquetasFromBuzones(buzonesText, numPuertas) {
    const map  = parseBuzonesText(buzonesText);
    const keys = Object.keys(map);
    if (!keys.length) return '';
    const seen = [], seen_ = new Set();
    keys.forEach(k => { const p = k.split(' ').pop(); if (!seen_.has(p)) { seen.push(p); seen_.add(p); } });
    const defaults = PUERTAS.slice(0, numPuertas);
    if (seen.length === defaults.length && seen.every((p, i) => p === defaults[i])) return '';
    return seen.join(', ');
}

function abrirEditarBuzones() {
    const ficha = fichaPortalActual || {};
    const listEl = document.getElementById('buzonesEditList');
    if (!listEl) { showToast('Error: elemento buzones no encontrado'); return; }
    listEl.innerHTML = '';

    // Prioridad 1: puertas reales registradas en Registros (vienen del backend)
    if (ficha.puertas_registradas && ficha.puertas_registradas.length) {
        buzEditBuildListFromDoors(ficha.puertas_registradas, ficha.buzones || '');
        document.getElementById('portalesBuzonesModal').style.display = 'flex';
        return;
    }

    // Prioridad 2: estructura guardada en el portal (Plantas + Puertas_Planta)
    const plantas = parseInt(ficha.plantas) || 0;
    const puertas = parseInt(ficha.puertas_planta) || 0;
    if (plantas && puertas) {
        let etiquetasStr = ficha.etiquetas_puertas || '';
        if (!etiquetasStr) {
            if (ficha.buzones && ficha.buzones.trim()) {
                etiquetasStr = inferEtiquetasFromBuzones(ficha.buzones, puertas);
            } else {
                etiquetasStr = sessionStorage.getItem('pendingPortalEtiquetas') || '';
                if (etiquetasStr) sessionStorage.removeItem('pendingPortalEtiquetas');
            }
        }
        buzEditBuildList(plantas, puertas, ficha.buzones || '', etiquetasStr);
        document.getElementById('portalesBuzonesModal').style.display = 'flex';
        return;
    }

    // Fallback: formulario manual para indicar la estructura
    listEl.innerHTML = `
        <div style="padding:4px 0 16px">
            <div style="font-size:13px;color:#64748b;margin-bottom:14px">Indica la estructura del portal para ver el listado:</div>
            <div style="display:flex;gap:12px;margin-bottom:14px">
                <div style="flex:1">
                    <label style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:6px">Plantas</label>
                    <input type="number" id="buzEditPlantas" min="1" max="20" placeholder="4"
                           style="width:100%;padding:10px 12px;border:2px solid #e2e8f0;border-radius:10px;font-size:16px;font-weight:700;text-align:center">
                </div>
                <div style="flex:1">
                    <label style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:6px">Puertas/planta</label>
                    <input type="number" id="buzEditPuertas" min="1" max="10" placeholder="2"
                           style="width:100%;padding:10px 12px;border:2px solid #e2e8f0;border-radius:10px;font-size:16px;font-weight:700;text-align:center">
                </div>
            </div>
            <div style="margin-bottom:14px">
                <label style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:6px">Nombres de puertas <span style="font-weight:400;text-transform:none;letter-spacing:0">(separados por coma — vacío: A, B, C…)</span></label>
                <input type="text" id="buzEditEtiquetas" placeholder="Ej: Izda, Dcha  —  o: 1, 2, 3, 4…"
                       style="width:100%;padding:10px 12px;border:2px solid #e2e8f0;border-radius:10px;font-size:14px;box-sizing:border-box">
            </div>
            <button onclick="buzEditGenerar()" style="width:100%;padding:13px;background:#0f172a;color:white;border:none;border-radius:12px;font-size:15px;font-weight:800;cursor:pointer">Generar listado →</button>
        </div>`;
    document.getElementById('portalesBuzonesModal').style.display = 'flex';
    setTimeout(() => document.getElementById('buzEditPlantas')?.focus(), 80);
}

function buzEditGenerar() {
    const plantas = parseInt(document.getElementById('buzEditPlantas')?.value) || 0;
    const puertas = parseInt(document.getElementById('buzEditPuertas')?.value) || 0;
    if (!plantas || !puertas) { showToast('Indica plantas y puertas/planta'); return; }
    const etiquetasStr = (document.getElementById('buzEditEtiquetas')?.value || '').trim();
    buzEditBuildList(plantas, puertas, '', etiquetasStr);
}

function buzEditBuildListFromDoors(doors, buzonesText) {
    const listEl  = document.getElementById('buzonesEditList');
    listEl.innerHTML = '';
    const existing = parseBuzonesText(buzonesText);

    // Normalizar: el backend puede devolver Piso/piso y Puerta/puerta
    const normalized = doors.map(d => ({
        piso:   (d.piso   || d.Piso   || '').toString().trim(),
        puerta: (d.puerta || d.Puerta || '').toString().trim()
    })).filter(d => d.piso && d.puerta);

    // Orden descendente por piso (más alto primero), luego puerta A-Z
    normalized.sort((a, b) => {
        const ia = PISOS.indexOf(a.piso), ib = PISOS.indexOf(b.piso);
        const na = ia >= 0 ? ia : 999, nb = ib >= 0 ? ib : 999;
        if (na !== nb) return nb - na;
        return (a.puerta).localeCompare(b.puerta);
    });

    let seqId = 0;
    normalized.forEach(({ piso, puerta }) => {
        seqId++;
        const did   = 'be' + seqId;
        const label = piso.replace(/º$/, '') + ' ' + puerta;
        const row   = document.createElement('div');
        row.className      = 'buz-edit-door-row';
        row.dataset.piso   = piso;
        row.dataset.puerta = puerta;
        row.innerHTML = `
            <div class="buz-edit-door-label">${label}</div>
            <div class="buz-door-names" id="${did}Names" onclick="document.getElementById('${did}In').focus()">
                <div class="nombres-chips" id="${did}Chips"></div>
                <input class="buz-door-input" id="${did}In"
                       placeholder="Nombre + Enter"
                       onkeydown="buzEditKeydown(event,'${did}')">
            </div>`;
        listEl.appendChild(row);

        const names = existing[piso + ' ' + puerta] || existing[piso + puerta] || [];
        names.forEach(n => addBuzEditChip(did, n));
    });

    const firstEmpty = [...listEl.querySelectorAll('.buz-door-input')]
        .find(el => el.closest('.buz-edit-door-row').querySelector('.nombre-chip') === null);
    setTimeout(() => (firstEmpty || listEl.querySelector('.buz-door-input'))?.focus(), 80);
}

function buzEditBuildList(plantas, puertas, buzonesText, etiquetasStr) {
    const listEl = document.getElementById('buzonesEditList');
    listEl.innerHTML = '';

    const pisoBase  = PISOS.indexOf('1º');
    const floors    = Array.from({ length: plantas }, (_, i) => {
        const idx = pisoBase + i;
        return idx < PISOS.length ? PISOS[idx] : (i + 1) + 'º';
    }).reverse(); // piso más alto primero
    const customLabels = etiquetasStr
        ? etiquetasStr.split(/[,;]/).map(s => s.trim()).filter(Boolean)
        : null;
    let doorLabels;
    if (customLabels && customLabels.length) {
        if (customLabels.length >= puertas) {
            doorLabels = customLabels.slice(0, puertas);
        } else {
            const extra = Array.from({ length: puertas - customLabels.length }, (_, i) => String(customLabels.length + i + 1));
            doorLabels = [...customLabels, ...extra];
        }
    } else {
        doorLabels = PUERTAS.slice(0, puertas);
    }
    const existing   = parseBuzonesText(buzonesText);

    let seqId = 0;
    floors.forEach(piso => {
        doorLabels.forEach(puerta => {
            seqId++;
            const did   = 'be' + seqId;
            const label = piso.replace(/º$/, '') + ' ' + puerta;
            const row   = document.createElement('div');
            row.className      = 'buz-edit-door-row';
            row.dataset.piso   = piso;
            row.dataset.puerta = puerta;
            row.innerHTML = `
                <div class="buz-edit-door-label">${label}</div>
                <div class="buz-door-names" id="${did}Names" onclick="document.getElementById('${did}In').focus()">
                    <div class="nombres-chips" id="${did}Chips"></div>
                    <input class="buz-door-input" id="${did}In"
                           placeholder="Nombre + Enter"
                           onkeydown="buzEditKeydown(event,'${did}')">
                </div>`;
            listEl.appendChild(row);

            const names = existing[piso + ' ' + puerta] || existing[piso + puerta] || [];
            names.forEach(n => addBuzEditChip(did, n));
        });
    });

    const firstEmpty = [...listEl.querySelectorAll('.buz-door-input')]
        .find(el => el.closest('.buz-edit-door-row').querySelector('.nombre-chip') === null);
    setTimeout(() => (firstEmpty || listEl.querySelector('.buz-door-input'))?.focus(), 80);
}

function parseBuzonesText(text) {
    const map = {};
    if (!text) return map;
    text.split('\n').forEach(line => {
        const m = line.match(/^(.+?):\s*(.+)$/);
        if (!m) return;
        const key   = m[1].trim();
        const names = m[2].split(/[\/,]/).map(n => n.trim()).filter(Boolean);
        if (names.length) map[key] = names;
    });
    return map;
}

function buzEditKeydown(e, did) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const input = document.getElementById(did + 'In');
    const val   = input.value.trim();
    if (val) {
        addBuzEditChip(did, val);
        input.value = '';
    } else {
        // Enter vacío: avanzar a la siguiente puerta
        const all = [...document.querySelectorAll('#buzonesEditList .buz-door-input')];
        const idx = all.indexOf(input);
        if (idx >= 0 && idx < all.length - 1) all[idx + 1].focus();
    }
}

function addBuzEditChip(did, text) {
    const chips = document.getElementById(did + 'Chips');
    if (!chips) return;
    const chip = document.createElement('div');
    chip.className = 'nombre-chip';
    chip.innerHTML = `${text}<button class="nombre-chip-del" onclick="this.closest('.nombre-chip').remove()" title="Eliminar">×</button>`;
    chips.appendChild(chip);
}

async function guardarBuzones() {
    const btn = document.getElementById('btnGuardarBuzones');
    btn.disabled = true; btn.textContent = 'Guardando…';
    try {
        // Confirmar texto pendiente en cualquier input abierto
        document.querySelectorAll('#buzonesEditList .buz-door-input').forEach(input => {
            if (input.value.trim()) {
                addBuzEditChip(input.id.replace('In', ''), input.value.trim());
                input.value = '';
            }
        });

        // Serializar chips a texto
        const lines = [];
        document.querySelectorAll('#buzonesEditList .buz-edit-door-row').forEach(row => {
            const names = [...row.querySelectorAll('.nombre-chip')]
                           .map(c => c.childNodes[0].textContent.trim())
                           .filter(Boolean);
            if (names.length) {
                lines.push(`${row.dataset.piso} ${row.dataset.puerta}: ${names.join(' / ')}`);
            }
        });

        const res    = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body:   JSON.stringify({
                action:    'actualizar_buzones',
                id_portal: portalActual,
                buzones:   lines.join('\n')
            })
        });
        const result = await res.json();
        if (!result.ok) throw new Error(result.error || 'Error');
        cerrarModal('portalesBuzonesModal');
        showToast('Buzones actualizados ✓');
        await abrirDetallePortal(portalActual);
    } catch (err) {
        showToast('Error: ' + err.message);
    } finally {
        btn.disabled = false; btn.textContent = 'Guardar →';
    }
}

// ── Helpers de modales ───────────────────────

function cerrarModal(id) {
    document.getElementById(id).style.display = 'none';
}

function portalesModalBackdrop(e, id) {
    if (e.target.id === id) cerrarModal(id);
}

// ═════════════════════════════════════════════
//  MÓDULO TAREAS
// ═════════════════════════════════════════════

let tzAsesor                    = '';
let tzTareasNoticias            = [];
let tzTareasGenerales           = [];
let tzTareasNoticiasCompletadas = [];
let tzSortBy                    = 'fecha';
let tzVistaActual               = 'pendientes';
let tzFiltroPend                = 'todas';
let tzFiltroComp                = 'semana';
let tzPrioNueva                 = 'Media';
let tzPrioEdicion               = 'Media';
let tzIndiceRegistros           = null;
let tzPuertaSelNt               = null;
let tzPuertaSelEt               = null;
let tzPortalSelNt               = null;
let tzPortalSelEt               = null;

const TZ_PRIO_ORDER = { 'Alta': 0, 'Media': 1, 'Baja': 2 };

// ── Entrada al módulo ─────────────────────────
function initTareas() {
    tzAsesor = localStorage.getItem('tz_asesor') || '';
    tzCargarTareasLocales();
    tzCargarTareas();
}

// ── Utils ─────────────────────────────────────
function tzToday() { return new Date().toISOString().split('T')[0]; }
function tzTomorrow() { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; }
function tzEndOfWeek() { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0]; }
function tzDaysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0]; }

function tzFechaLabel(f) {
    if (!f) return null;
    const hoy = tzToday();
    if (f < hoy) return 'Vencida';
    if (f === hoy) return 'Hoy';
    const d = new Date(f + 'T00:00:00');
    const days = Math.round((d - new Date(hoy + 'T00:00:00')) / 86400000);
    return days <= 7 ? 'Esta semana' : 'Más adelante';
}

function tzFormatFecha(f) {
    if (!f) return '';
    const p = String(f).split(/[T\s]/)[0].split('-');
    if (p.length !== 3) return f;
    return `${p[2]}/${p[1]}/${p[0]}`;
}

function tzBuildAddr(n) {
    const parts = [n.calle, n.numero].filter(Boolean).join(' ');
    const ubi   = [n.escalera, n.piso, n.puerta ? `Pta ${n.puerta}` : ''].filter(Boolean).join(' · ');
    return [parts, ubi].filter(Boolean).join(' · ');
}

function escHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── API ───────────────────────────────────────
async function tzApi(payload) {
    const res = await fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
    let data;
    try { data = await res.json(); } catch(e) { throw new Error('Respuesta no válida del servidor'); }
    if (!data.ok) throw new Error(data.error || 'Error del servidor');
    return data;
}

// ── Persistencia local ────────────────────────
function tzCargarTareasLocales() {
    try { tzTareasGenerales = JSON.parse(localStorage.getItem('tz_tareas_generales') || '[]'); } catch(e) { tzTareasGenerales = []; }
    try { tzTareasNoticiasCompletadas = JSON.parse(localStorage.getItem('tz_tareas_not_comp') || '[]'); } catch(e) { tzTareasNoticiasCompletadas = []; }
}

function tzGuardarTareasLocales() {
    localStorage.setItem('tz_tareas_generales', JSON.stringify(tzTareasGenerales));
    localStorage.setItem('tz_tareas_not_comp',  JSON.stringify(tzTareasNoticiasCompletadas));
}

// ── Carga desde servidor ──────────────────────
async function tzCargarTareas() {
    document.getElementById('tzTaskList').innerHTML =
        '<div class="tz-empty-state"><div class="tz-spinner"></div>Cargando tareas…</div>';
    try {
        const data = await tzApi({ action: 'listar_noticias', asesor: tzAsesor });
        const noticias = data.noticias || [];
        tzTareasNoticias = noticias
            .filter(n => n.proxima_accion && n.proxima_accion.trim())
            .map(n => ({
                id:         'NOT-' + n.ficha_id,
                tipo:       'Noticia',
                desc:       n.proxima_accion.trim(),
                notas:      '',
                fecha:      n.fecha_proxima_accion ? String(n.fecha_proxima_accion).split(/[T\s]/)[0] : '',
                prioridad:  'Media',
                asesor:     n.asesor,
                addr:       tzBuildAddr(n),
                ficha_id:   n.ficha_id,
                completada: false
            }));
    } catch(err) {
        document.getElementById('tzTaskList').innerHTML =
            `<div class="tz-empty-state">
               <div style="font-weight:700;color:#b91c1c;margin-bottom:6px">Error al conectar</div>
               <div style="font-size:12px;background:#fee2e2;padding:10px;border-radius:8px;max-width:300px;margin:0 auto">${err.message}</div>
               <button style="margin-top:14px;padding:10px 20px;border:1px solid #e0e0e0;border-radius:8px;background:white;font-size:14px;cursor:pointer" onclick="tzCargarTareas()">Reintentar</button>
             </div>`;
        return;
    }
    tzRender();
}

// ── Render ────────────────────────────────────
function tzPendientes() {
    return [...tzTareasNoticias, ...tzTareasGenerales.filter(t => !t.completada)];
}

function tzPendientesFiltradas() {
    const hoy = tzToday(), man = tzTomorrow(), proxSemana = tzEndOfWeek();
    const lista = tzPendientes();
    switch (tzFiltroPend) {
        case 'vencidas': return lista.filter(t => t.fecha && t.fecha < hoy);
        case 'hoy':      return lista.filter(t => t.fecha === hoy);
        case 'manana':   return lista.filter(t => t.fecha === man);
        case 'semana':   return lista.filter(t => t.fecha && t.fecha >= hoy && t.fecha <= proxSemana);
        case 'sinfecha': return lista.filter(t => !t.fecha);
        default:         return lista;
    }
}

function tzCompletadasFiltradas() {
    const lista = [...tzTareasGenerales.filter(t => t.completada), ...tzTareasNoticiasCompletadas];
    switch (tzFiltroComp) {
        case 'semana': { const d = tzDaysAgo(7);  return lista.filter(t => (t.fechaCompletada || '') >= d); }
        case 'dias14': { const d = tzDaysAgo(14); return lista.filter(t => (t.fechaCompletada || '') >= d); }
        case 'mes':    { const d = tzDaysAgo(30); return lista.filter(t => (t.fechaCompletada || '') >= d); }
        default:       return lista;
    }
}

function tzSortTareas(lista) {
    return [...lista].sort((a, b) => {
        if (tzSortBy === 'prioridad') {
            const pa = TZ_PRIO_ORDER[a.prioridad] ?? 1, pb = TZ_PRIO_ORDER[b.prioridad] ?? 1;
            if (pa !== pb) return pa - pb;
        }
        if (!a.fecha && !b.fecha) return 0;
        if (!a.fecha) return 1;
        if (!b.fecha) return -1;
        const cmp = a.fecha.localeCompare(b.fecha);
        if (cmp !== 0) return cmp;
        const ha = a.hora || '99:99', hb = b.hora || '99:99';
        if (ha !== hb) return ha.localeCompare(hb);
        return (TZ_PRIO_ORDER[a.prioridad] ?? 1) - (TZ_PRIO_ORDER[b.prioridad] ?? 1);
    });
}

function tzSortCompletadas(lista) {
    return [...lista].sort((a, b) => (b.fechaCompletada || '').localeCompare(a.fechaCompletada || ''));
}

function tzRender() {
    const pend  = tzPendientes();
    const hoy   = tzToday();
    const venc  = pend.filter(t => t.fecha && t.fecha < hoy).length;
    const paraHoy = pend.filter(t => t.fecha === hoy).length;
    const totComp = tzTareasGenerales.filter(t => t.completada).length + tzTareasNoticiasCompletadas.length;

    document.getElementById('tzResVenc').textContent     = venc;
    document.getElementById('tzResHoy').textContent      = paraHoy;
    document.getElementById('tzResTotal').textContent    = pend.length;
    document.getElementById('tzResCompletas').textContent = totComp;

    tzVistaActual === 'pendientes' ? tzRenderPendientes() : tzRenderCompletadas();
}

function tzRenderPendientes() {
    const lista = tzSortTareas(tzPendientesFiltradas());
    const box   = document.getElementById('tzTaskList');
    if (!lista.length) {
        const msgs = { todas:'No hay tareas pendientes.', vencidas:'No hay tareas vencidas. ¡Todo al día!',
                       hoy:'No hay tareas para hoy.', manana:'No hay tareas para mañana.',
                       semana:'No hay tareas en la próxima semana.', sinfecha:'No hay tareas sin fecha.' };
        box.innerHTML = `<div class="tz-empty-state"><div style="font-size:36px;margin-bottom:10px">✅</div><div>${msgs[tzFiltroPend]||'Sin tareas.'}</div></div>`;
        return;
    }
    if (tzFiltroPend === 'todas') {
        const grupos = { 'Vencida':[], 'Hoy':[], 'Esta semana':[], 'Más adelante':[], 'Sin fecha':[] };
        lista.forEach(t => { const g = t.fecha ? (tzFechaLabel(t.fecha) || 'Más adelante') : 'Sin fecha'; grupos[g].push(t); });
        const sec = { 'Vencida':{label:'Vencidas',cls:'tz-vencida'}, 'Hoy':{label:'Hoy',cls:'tz-hoy'},
                      'Esta semana':{label:'Esta semana',cls:''}, 'Más adelante':{label:'Más adelante',cls:''}, 'Sin fecha':{label:'Sin fecha',cls:''} };
        let html = '';
        for (const [k, items] of Object.entries(grupos)) {
            if (!items.length) continue;
            html += `<div class="tz-section-hdr ${sec[k].cls}"><div class="tz-section-dot"></div>${sec[k].label} <span style="font-weight:400;opacity:.6">(${items.length})</span></div>`;
            items.forEach(t => { html += tzRenderCard(t); });
        }
        box.innerHTML = html;
    } else {
        box.innerHTML = lista.map(t => tzRenderCard(t)).join('');
    }
}

function tzRenderCompletadas() {
    const lista = tzSortCompletadas(tzCompletadasFiltradas());
    const box   = document.getElementById('tzTaskList');
    if (!lista.length) {
        const msgs = { semana:'No completaste tareas en la última semana.', dias14:'No completaste tareas en los últimos 14 días.',
                       mes:'No completaste tareas en el último mes.', todas:'No hay tareas completadas todavía.' };
        box.innerHTML = `<div class="tz-empty-state"><div style="font-size:36px;margin-bottom:10px">📋</div><div>${msgs[tzFiltroComp]||'Sin tareas completadas.'}</div></div>`;
        return;
    }
    box.innerHTML = lista.map(t => tzRenderCard(t, true)).join('');
}

function tzRenderCard(t, esCompletada = false) {
    const hoy       = tzToday();
    const esVencida = !esCompletada && t.fecha && t.fecha < hoy;
    const esHoy     = !esCompletada && t.fecha === hoy;
    const prioClass = t.prioridad === 'Alta' ? 'tz-p-alta' : t.prioridad === 'Baja' ? 'tz-p-baja' : 'tz-p-media';
    const tipoClass = t.tipo === 'Noticia' ? 'tz-t-noticia' : 'tz-t-general';
    const fechaStr  = t.fecha ? tzFormatFecha(t.fecha) + (t.hora ? ' · ' + t.hora : '') : '';
    const fechaCls  = esVencida ? 'tz-vencida' : esHoy ? 'tz-hoy-date' : '';
    const cardCls   = `tz-card${esVencida ? ' tz-vencida' : esHoy ? ' tz-hoy' : ''}${esCompletada ? ' tz-completada' : ''}`;
    const safeId    = t.id.replace(/[^a-zA-Z0-9-]/g, '-');

    let btnsHtml;
    if (esCompletada) {
        const cuandoStr = t.fechaCompletada ? ' · ' + tzFormatFecha(t.fechaCompletada) : '';
        btnsHtml = `<div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:11px;color:#888">✓ Completada${cuandoStr}</span>
          <button class="tz-btn-reabrir" onclick="tzReabrirTarea('${t.id}')">↩ Reabrir</button>
        </div>`;
    } else {
        btnsHtml = `<div style="display:flex;align-items:center;gap:2px">
          <button class="tz-btn-completar" onclick="tzCompletarTarea('${t.id}')">✓ Listo</button>
          ${t.tipo === 'General' ? `
            <button class="tz-btn-eliminar" onclick="tzEditarTarea('${t.id}')" title="Editar">✏️</button>
            <button class="tz-btn-eliminar" onclick="tzEliminarTarea('${t.id}')" title="Eliminar">🗑</button>` : ''}
        </div>`;
    }

    return `
    <div class="${cardCls}" id="tz-card-${safeId}">
      <div class="tz-card-top">
        <div class="tz-card-left">
          <div class="tz-card-desc">${escHtml(t.desc)}</div>
          ${(t.addr || t.puerta_addr) ? `<div class="tz-card-addr">📍 ${escHtml(t.addr || t.puerta_addr)}${t.puerta_est ? ' <span style="font-size:10px;color:#888">· ' + escHtml(t.puerta_est) + '</span>' : ''}</div>` : ''}
          ${t.notas ? `<div class="tz-card-addr" style="margin-top:4px;font-style:italic">${escHtml(t.notas)}</div>` : ''}
        </div>
        <div class="tz-card-right">
          <span class="tz-prio-pill ${prioClass}">${t.prioridad}</span>
          ${fechaStr ? `<span class="tz-card-fecha ${fechaCls}">${fechaStr}</span>` : ''}
        </div>
      </div>
      <div class="tz-card-bottom">
        <span class="tz-tipo-badge ${tipoClass}">${t.tipo}</span>
        ${btnsHtml}
      </div>
    </div>`;
}

// ── Acciones ──────────────────────────────────
async function tzCompletarTarea(id) {
    const safeId = id.replace(/[^a-zA-Z0-9-]/g, '-');
    const btn = document.querySelector(`#tz-card-${safeId} .tz-btn-completar`);
    if (btn) { btn.disabled = true; btn.textContent = '…'; }
    const hoy = tzToday();

    if (id.startsWith('NOT-')) {
        const ficha_id = id.replace('NOT-', '');
        const original = tzTareasNoticias.find(t => t.id === id);
        try {
            await tzApi({ action: 'actualizar_ficha_noticia', ficha_id, proxima_accion: '', fecha_proxima_accion: '' });
            if (original) tzTareasNoticiasCompletadas.push({ ...original, completada: true, fechaCompletada: hoy, _orig_proxima: original.desc, _orig_fecha: original.fecha });
            tzTareasNoticias = tzTareasNoticias.filter(t => t.id !== id);
            tzGuardarTareasLocales();
            showToast('Tarea completada ✓');
        } catch(err) {
            showToast('Error: ' + err.message);
            if (btn) { btn.disabled = false; btn.textContent = '✓ Listo'; }
            return;
        }
    } else {
        const t = tzTareasGenerales.find(t => t.id === id);
        if (t) { t.completada = true; t.fechaCompletada = hoy; tzGuardarTareasLocales(); }
        showToast('Tarea completada ✓');
    }
    tzRender();
}

async function tzReabrirTarea(id) {
    const safeId = id.replace(/[^a-zA-Z0-9-]/g, '-');
    const btn = document.querySelector(`#tz-card-${safeId} .tz-btn-reabrir`);
    if (btn) { btn.disabled = true; btn.textContent = '…'; }

    if (id.startsWith('NOT-')) {
        const comp = tzTareasNoticiasCompletadas.find(t => t.id === id);
        if (!comp) return;
        const ficha_id = id.replace('NOT-', '');
        try {
            await tzApi({ action: 'actualizar_ficha_noticia', ficha_id, proxima_accion: comp._orig_proxima || comp.desc, fecha_proxima_accion: comp._orig_fecha || '' });
            tzTareasNoticias.push({ ...comp, completada: false, fechaCompletada: '' });
            tzTareasNoticiasCompletadas = tzTareasNoticiasCompletadas.filter(t => t.id !== id);
            tzGuardarTareasLocales();
            showToast('Tarea reabierta ✓');
        } catch(err) {
            showToast('Error al reabrir: ' + err.message);
            if (btn) { btn.disabled = false; btn.textContent = '↩ Reabrir'; }
            return;
        }
    } else {
        const t = tzTareasGenerales.find(t => t.id === id);
        if (t) { t.completada = false; t.fechaCompletada = ''; tzGuardarTareasLocales(); }
        showToast('Tarea reabierta ✓');
    }
    tzRender();
}

function tzEliminarTarea(id) {
    if (!confirm('¿Eliminar esta tarea?')) return;
    tzTareasGenerales = tzTareasGenerales.filter(t => t.id !== id);
    tzGuardarTareasLocales();
    tzRender();
    showToast('Tarea eliminada');
}

function tzEditarTarea(id) {
    const t = tzTareasGenerales.find(t => t.id === id);
    if (!t) return;
    document.getElementById('tzEtId').value    = id;
    document.getElementById('tzEtDesc').value  = t.desc;
    document.getElementById('tzEtNotas').value = t.notas || '';
    document.getElementById('tzEtFecha').value = t.fecha || '';
    document.getElementById('tzEtHora').value  = t.hora  || '';
    tzPrioEdicion = t.prioridad || 'Media';
    tzActualizarPrioPicker('tzEtPo', tzPrioEdicion);
    if (t.puerta_addr) {
        tzPuertaSelEt = { clave: t.puerta_clave, addr: t.puerta_addr, estado: t.puerta_est };
        document.getElementById('tzEtPuertaBtn').style.display        = 'none';
        document.getElementById('tzEtPortalSearchWrap').style.display = 'none';
        document.getElementById('tzEtPuertaStepWrap').style.display   = 'none';
        document.getElementById('tzEtPuertaSelected').style.display   = '';
        document.getElementById('tzEtPuertaSelText').textContent      = t.puerta_addr;
    } else {
        tzLimpiarPuerta('et');
        tzPuertaSelEt = null;
    }
    tzOpenModal('editarTarea');
}

function tzGuardarEdicion() {
    const id   = document.getElementById('tzEtId').value;
    const desc = document.getElementById('tzEtDesc').value.trim();
    if (!desc) return;
    const t = tzTareasGenerales.find(t => t.id === id);
    if (!t) return;
    t.desc         = desc;
    t.notas        = document.getElementById('tzEtNotas').value.trim();
    t.prioridad    = tzPrioEdicion;
    t.fecha        = document.getElementById('tzEtFecha').value;
    t.hora         = document.getElementById('tzEtHora').value;
    t.puerta_clave = tzPuertaSelEt ? tzPuertaSelEt.clave  : '';
    t.puerta_addr  = tzPuertaSelEt ? tzPuertaSelEt.addr   : '';
    t.puerta_est   = tzPuertaSelEt ? tzPuertaSelEt.estado : '';
    tzGuardarTareasLocales();
    tzCloseModal('editarTarea');
    tzRender();
    showToast('Tarea actualizada');
}

// ── Nueva tarea ───────────────────────────────
function tzCrearTarea() {
    const desc = document.getElementById('tzNtDesc').value.trim();
    if (!desc) return;
    const nueva = {
        id:           'GEN-' + Date.now(),
        tipo:         'General',
        desc,
        notas:        document.getElementById('tzNtNotas').value.trim(),
        fecha:        document.getElementById('tzNtFecha').value,
        hora:         document.getElementById('tzNtHora').value,
        prioridad:    tzPrioNueva,
        asesor:       tzAsesor,
        addr:         '',
        puerta_clave: tzPuertaSelNt ? tzPuertaSelNt.clave  : '',
        puerta_addr:  tzPuertaSelNt ? tzPuertaSelNt.addr   : '',
        puerta_est:   tzPuertaSelNt ? tzPuertaSelNt.estado : '',
        completada:   false
    };
    tzTareasGenerales.push(nueva);
    tzGuardarTareasLocales();
    tzCloseModal('nuevaTarea');
    tzRender();
    showToast('Tarea creada ✓');
    document.getElementById('tzNtDesc').value  = '';
    document.getElementById('tzNtNotas').value = '';
    document.getElementById('tzNtFecha').value = tzToday();
    document.getElementById('tzNtHora').value  = '';
    tzPrioNueva = 'Media';
    tzPuertaSelNt = null;
    tzActualizarPrioPicker('tzPo', 'Media');
    document.getElementById('tzBtnCrearTarea').disabled = true;
}

function tzCheckNuevaTarea() {
    document.getElementById('tzBtnCrearTarea').disabled = !document.getElementById('tzNtDesc').value.trim();
}

// ── Prioridad ─────────────────────────────────
function tzSetPrio(p) { tzPrioNueva = p; tzActualizarPrioPicker('tzPo', p); }
function tzSetEditPrio(p) { tzPrioEdicion = p; tzActualizarPrioPicker('tzEtPo', p); }

function tzActualizarPrioPicker(prefix, sel) {
    ['Alta','Media','Baja'].forEach(p => {
        const btn = document.getElementById(prefix + p);
        if (!btn) return;
        btn.className = 'tz-prio-opt';
        if (p === sel) btn.classList.add('tz-sel-' + p.toLowerCase());
        else btn.classList.add('tz-unsel');
    });
}

// ── Vistas y filtros ──────────────────────────
function tzSetVista(v) {
    tzVistaActual = v;
    document.getElementById('tzTabPend').classList.toggle('active', v === 'pendientes');
    document.getElementById('tzTabComp').classList.toggle('active', v === 'completadas');
    document.getElementById('tzSubBarPend').style.display = v === 'pendientes' ? '' : 'none';
    document.getElementById('tzSubBarComp').style.display = v === 'completadas' ? '' : 'none';
    tzRender();
}

function tzSetFiltroPend(f) {
    tzFiltroPend = f;
    const map = { todas:'tzFpTodas', vencidas:'tzFpVencidas', hoy:'tzFpHoy', manana:'tzFpManana', semana:'tzFpSemana', sinfecha:'tzFpSinfecha' };
    Object.entries(map).forEach(([k, id]) => { const el = document.getElementById(id); if (el) el.classList.toggle('active', k === f); });
    tzRender();
}

function tzSetFiltroComp(f) {
    tzFiltroComp = f;
    const map = { semana:'tzFcSemana', dias14:'tzFcDias14', mes:'tzFcMes', todas:'tzFcTodas' };
    Object.entries(map).forEach(([k, id]) => { const el = document.getElementById(id); if (el) el.classList.toggle('active', k === f); });
    tzRender();
}

function tzToggleSort() {
    tzSortBy = tzSortBy === 'fecha' ? 'prioridad' : 'fecha';
    const btn = document.getElementById('tzSortBtn');
    btn.textContent = tzSortBy === 'fecha' ? '📅 Fecha' : '⚡ Prioridad';
    btn.classList.toggle('active', tzSortBy === 'prioridad');
    tzRender();
}

// ── Buscador de portal/puerta ─────────────────
async function tzCargarIndice() {
    if (tzIndiceRegistros !== null) return;
    try {
        const data = await tzApi({ action: 'obtener_indice' });
        tzIndiceRegistros = data.indice || [];
    } catch(e) { tzIndiceRegistros = []; }
}

async function tzActivarBuscadorPortal(prefix) {
    document.getElementById('tz' + prefix.charAt(0).toUpperCase() + prefix.slice(1) + 'PuertaBtn').style.display        = 'none';
    document.getElementById('tz' + prefix.charAt(0).toUpperCase() + prefix.slice(1) + 'PuertaStepWrap').style.display  = 'none';
    const pUp  = prefix.charAt(0).toUpperCase() + prefix.slice(1);
    const wrap  = document.getElementById('tz' + pUp + 'PortalSearchWrap');
    const input = document.getElementById('tz' + pUp + 'PortalInput');
    const box   = document.getElementById('tz' + pUp + 'PortalResults');
    wrap.style.display = '';
    input.value = '';
    box.innerHTML = '<div class="tz-puerta-no-results">Cargando portales…</div>';
    input.focus();
    await tzCargarIndice();
    box.innerHTML = '<div class="tz-puerta-no-results">Escribí una calle para buscar.</div>';
}

function tzBuscarPortal(prefix) {
    const pUp  = prefix.charAt(0).toUpperCase() + prefix.slice(1);
    const q    = document.getElementById('tz' + pUp + 'PortalInput').value.trim().toLowerCase();
    const box  = document.getElementById('tz' + pUp + 'PortalResults');
    if (!q || !tzIndiceRegistros) { box.innerHTML = '<div class="tz-puerta-no-results">Escribí una calle para buscar.</div>'; return; }
    const palabras = q.split(/\s+/);
    const portalesMap = {};
    tzIndiceRegistros.forEach(p => {
        const texto = [p.calle, p.numero].join(' ').toLowerCase();
        if (!palabras.every(w => texto.includes(w))) return;
        const key = (p.calle + '||' + p.numero).toLowerCase();
        if (!portalesMap[key]) portalesMap[key] = { calle: p.calle, numero: p.numero, zona: p.zona, puertas: [] };
        portalesMap[key].puertas.push(p);
    });
    const portales = Object.values(portalesMap).slice(0, 15);
    if (!portales.length) { box.innerHTML = `<div class="tz-puerta-no-results">Sin resultados para <strong>${escHtml(q)}</strong></div>`; return; }
    box.innerHTML = portales.map(portal => {
        const dir  = [portal.calle, portal.numero].filter(Boolean).join(' ');
        const n    = portal.puertas.length;
        const safe = JSON.stringify;
        return `<div class="tz-puerta-result" onclick="tzSeleccionarPortal('${prefix}',${safe(portal)})">
          <div class="tz-puerta-result-main">${escHtml(dir)}</div>
          <div class="tz-puerta-result-meta">${escHtml(portal.zona || '')}${portal.zona ? ' · ' : ''}${n} puerta${n !== 1 ? 's' : ''} registrada${n !== 1 ? 's' : ''}</div>
        </div>`;
    }).join('');
}

function tzSeleccionarPortal(prefix, portal) {
    if (prefix === 'nt') tzPortalSelNt = portal; else tzPortalSelEt = portal;
    const pUp = prefix.charAt(0).toUpperCase() + prefix.slice(1);
    document.getElementById('tz' + pUp + 'PortalSearchWrap').style.display = 'none';
    document.getElementById('tz' + pUp + 'PuertaStepWrap').style.display   = '';
    const dir    = [portal.calle, portal.numero].filter(Boolean).join(' ');
    const safe   = JSON.stringify;
    const puertas = portal.puertas.slice().sort((a, b) =>
        [a.escalera, a.piso, a.puerta].join('|').localeCompare([b.escalera, b.piso, b.puerta].join('|'))
    );
    document.getElementById('tz' + pUp + 'PuertaStepResults').innerHTML =
        `<div class="tz-puerta-result tz-portal-back" onclick="tzVolverBusqueda('${prefix}')">← ${escHtml(dir)}</div>` +
        `<div class="tz-puerta-result" style="background:#f0fdf4" onclick="tzElegirPortalCompleto('${prefix}',${safe(dir)})">
          <div class="tz-puerta-result-main" style="color:#16a34a">Todo el portal</div>
          <div class="tz-puerta-result-meta">${puertas.length} puertas registradas</div>
        </div>` +
        puertas.map(p => {
            const ubi  = [p.escalera, p.piso, p.puerta ? 'Pta ' + p.puerta : ''].filter(Boolean).join(' · ');
            const addr = dir + (ubi ? ' · ' + ubi : '');
            const est  = p.estado || '—';
            return `<div class="tz-puerta-result" onclick="tzSeleccionarPuerta('${prefix}',${safe(p.clave)},${safe(addr)},${safe(est)})">
              <div class="tz-puerta-result-main">${escHtml(ubi || 'Sin especificar')}</div>
              <div class="tz-puerta-result-meta">${escHtml(est)}</div>
            </div>`;
        }).join('');
}

function tzVolverBusqueda(prefix) {
    if (prefix === 'nt') tzPortalSelNt = null; else tzPortalSelEt = null;
    const pUp = prefix.charAt(0).toUpperCase() + prefix.slice(1);
    document.getElementById('tz' + pUp + 'PuertaStepWrap').style.display   = 'none';
    document.getElementById('tz' + pUp + 'PortalSearchWrap').style.display  = '';
    document.getElementById('tz' + pUp + 'PortalInput').focus();
}

function tzElegirPortalCompleto(prefix, dir) {
    tzSeleccionarPuerta(prefix, 'PORTAL||' + dir, dir + ' · portal completo', '');
}

function tzSeleccionarPuerta(prefix, clave, addr, estado) {
    const sel = { clave, addr, estado };
    if (prefix === 'nt') tzPuertaSelNt = sel; else tzPuertaSelEt = sel;
    const pUp = prefix.charAt(0).toUpperCase() + prefix.slice(1);
    document.getElementById('tz' + pUp + 'PortalSearchWrap').style.display = 'none';
    document.getElementById('tz' + pUp + 'PuertaStepWrap').style.display   = 'none';
    document.getElementById('tz' + pUp + 'PuertaSelected').style.display   = '';
    document.getElementById('tz' + pUp + 'PuertaSelText').textContent      = addr;
}

function tzLimpiarPuerta(prefix) {
    if (prefix === 'nt') { tzPuertaSelNt = null; tzPortalSelNt = null; }
    else                 { tzPuertaSelEt = null; tzPortalSelEt = null; }
    const pUp = prefix.charAt(0).toUpperCase() + prefix.slice(1);
    document.getElementById('tz' + pUp + 'PuertaSelected').style.display    = 'none';
    document.getElementById('tz' + pUp + 'PuertaBtn').style.display         = '';
    document.getElementById('tz' + pUp + 'PortalSearchWrap').style.display  = 'none';
    document.getElementById('tz' + pUp + 'PuertaStepWrap').style.display    = 'none';
    const input = document.getElementById('tz' + pUp + 'PortalInput');
    if (input) { input.value = ''; }
    const box = document.getElementById('tz' + pUp + 'PortalResults');
    if (box) box.innerHTML = '';
    const stepBox = document.getElementById('tz' + pUp + 'PuertaStepResults');
    if (stepBox) stepBox.innerHTML = '';
}

// ── Modal ─────────────────────────────────────
function tzOpenModal(name) {
    document.getElementById('tz-modal-' + name).classList.add('open');
    if (name === 'nuevaTarea') {
        tzActualizarPrioPicker('tzPo', tzPrioNueva);
        document.getElementById('tzNtFecha').value = tzToday();
        tzLimpiarPuerta('nt');
        tzPuertaSelNt = null;
    }
}

function tzCloseModal(name) {
    document.getElementById('tz-modal-' + name).classList.remove('open');
}

document.addEventListener('click', e => {
    if (e.target.classList.contains('tz-modal-overlay')) {
        e.target.classList.remove('open');
    }
});


