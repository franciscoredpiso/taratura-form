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

    showScreen('home');
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
        for (const p of PISOS) { if (!used.includes(p)) { suggestion = p; break; } }
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

    addDoor(fid);
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
    }, 1200);
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
                items.push({ label, did });
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
        div.innerHTML = `<div class="carta-box">${done ? '✓' : ''}</div> ${item.label}`;
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
            setTimeout(() => { showScreen('buzones'); openReview(_buzId); }, 1800);
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
//  TOAST
// ─────────────────────────────────────────────
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

// ═════════════════════════════════════════════
//  MÓDULO NOTICIAS
// ═════════════════════════════════════════════
let noticiasIndice   = null;   // cache en memoria — 1 sola carga por sesión
let noticiasCargando = false;
let fichaActual       = null;  // item del índice correspondiente a la ficha abierta en el detalle

async function initNoticias() {
    if (noticiasIndice || noticiasCargando) {
        filtrarNoticias();
        return;
    }
    noticiasCargando = true;
    document.getElementById('noticiasResults').innerHTML =
        '<div class="noticias-empty">Cargando índice…</div>';
    try {
        const res    = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body:   JSON.stringify({ action: 'obtener_indice' })
        });
        const result = await res.json();
        if (!result.ok) throw new Error(result.error || 'Error cargando índice');
        noticiasIndice = result.indice || [];
        filtrarNoticias();
    } catch (err) {
        document.getElementById('noticiasResults').innerHTML = `
            <div class="noticias-empty">Error al cargar: ${err.message}<br>
            <button onclick="recargarNoticias()" style="margin-top:10px;padding:8px 16px;background:#0f172a;color:white;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer">Reintentar</button></div>`;
    } finally {
        noticiasCargando = false;
    }
}

function recargarNoticias() {
    noticiasIndice = null;
    initNoticias();
}

function filtrarNoticias() {
    if (!noticiasIndice) return;
    const q            = document.getElementById('noticiasSearch').value.trim().toLowerCase();
    const soloAbiertas = document.getElementById('noticiasSoloAbiertas').checked;

    let items = noticiasIndice;
    if (soloAbiertas) items = items.filter(it => it.fichaId);
    if (q) {
        items = items.filter(it => {
            const hay = [it.calle, it.numero, it.escalera, it.piso, it.puerta, it.nombre, it.telefono]
                        .map(v => String(v || '').toLowerCase()).join(' | ');
            return hay.includes(q);
        });
    }
    renderNoticiasResults(items);
}

function renderNoticiasResults(items) {
    const box = document.getElementById('noticiasResults');
    if (!items.length) {
        box.innerHTML = '<div class="noticias-empty">Sin resultados.</div>';
        window._noticiasRenderItems = [];
        return;
    }
    // Fichas abiertas primero
    const ordenados = [...items].sort((a, b) => (b.fichaId ? 1 : 0) - (a.fichaId ? 1 : 0));
    window._noticiasRenderItems = ordenados;

    box.innerHTML = ordenados.slice(0, 150).map((it, i) => {
        const dir     = [it.calle, it.numero].filter(Boolean).join(' ');
        const detalle = [it.escalera, it.piso, it.puerta ? `Puerta ${it.puerta}` : ''].filter(Boolean).join(' — ');
        const badge   = it.fichaId
            ? '<span class="noticia-badge abierta">Ficha abierta</span>'
            : (it.estado === 'Noticia' ? '<span class="noticia-badge cerrada">Caso cerrado</span>' : '');
        return `
        <div class="noticia-result-item" onclick="abrirFicha(${i})">
            <div class="noticia-result-info">
                <div class="noticia-result-title">${dir || 'Sin calle'}</div>
                <div class="noticia-result-meta">${detalle || it.estado || ''}</div>
            </div>
            ${badge}
        </div>`;
    }).join('');
}

async function abrirFicha(idx) {
    const item = window._noticiasRenderItems?.[idx];
    if (!item) return;
    fichaActual = item;

    document.getElementById('noticiasListView').style.display   = 'none';
    document.getElementById('noticiasDetailView').style.display = '';
    document.getElementById('noticiasNotaInput').value = '';

    const dir     = [item.calle, item.numero].filter(Boolean).join(' ');
    const detalle = [item.escalera, item.piso, item.puerta ? `Puerta ${item.puerta}` : ''].filter(Boolean).join(' — ');

    document.getElementById('noticiasDetailHeader').innerHTML = `
        <div style="font-size:17px;font-weight:800;color:#0f172a;margin-bottom:2px">${dir || 'Sin calle'}</div>
        <div style="font-size:13px;color:#94a3b8;margin-bottom:10px">${detalle}</div>
        <div class="noticia-detail-row"><span>Propietario</span><span>${item.nombre || '—'}</span></div>
        <div class="noticia-detail-row"><span>Teléfono</span><span>${item.telefono || '—'}</span></div>
        <div class="noticia-detail-row"><span>Zona / Asesor</span><span>${[item.zona, item.asesor].filter(Boolean).join(' · ') || '—'}</span></div>
        <div class="noticia-detail-row"><span>Estado</span><span>${item.fichaId ? 'En investigación' : 'Caso cerrado'}</span></div>
    `;

    const btnNota   = document.getElementById('btnAgregarNota');
    const btnCerrar = document.getElementById('btnCerrarCaso');
    const sinFicha  = !item.fichaId;
    btnNota.disabled         = sinFicha;
    btnCerrar.style.display  = sinFicha ? 'none' : '';

    const timeline = document.getElementById('noticiasTimeline');
    if (sinFicha) {
        timeline.innerHTML = '<div class="noticias-empty">Esta puerta no tiene una ficha abierta actualmente.</div>';
        return;
    }

    timeline.innerHTML = '<div class="noticias-empty">Cargando…</div>';
    try {
        const res    = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body:   JSON.stringify({ action: 'obtener_seguimiento', fichaId: item.fichaId })
        });
        const result = await res.json();
        if (!result.ok) throw new Error(result.error || 'Error cargando seguimiento');
        renderTimeline(result.seguimiento || []);
    } catch (err) {
        timeline.innerHTML = `<div class="noticias-empty">Error: ${err.message}</div>`;
    }
}

function renderTimeline(rows) {
    const timeline = document.getElementById('noticiasTimeline');
    if (!rows.length) {
        timeline.innerHTML = '<div class="noticias-empty">Sin notas todavía.</div>';
        return;
    }
    // Más reciente arriba
    timeline.innerHTML = [...rows].reverse().map(r => `
        <div class="timeline-item">
            <div class="timeline-fecha">${r.fecha || ''}</div>
            <div class="timeline-autor">${r.autor || 'Sin autor'}</div>
            <div class="timeline-nota">${String(r.nota || '').replace(/</g, '&lt;')}</div>
        </div>
    `).join('');
}

function cerrarDetalleNoticia() {
    document.getElementById('noticiasDetailView').style.display = 'none';
    document.getElementById('noticiasListView').style.display   = '';
    document.getElementById('noticiasNotaInput').value = '';
    fichaActual = null;
}

async function agregarNotaNoticia() {
    if (!fichaActual || !fichaActual.fichaId) return;
    const input = document.getElementById('noticiasNotaInput');
    const nota  = input.value.trim();
    if (!nota) { showToast('Escribe algo antes de añadir la nota'); return; }

    const btn = document.getElementById('btnAgregarNota');
    btn.disabled    = true;
    btn.textContent = 'Guardando…';

    try {
        const res    = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body:   JSON.stringify({
                action:  'agregar_seguimiento',
                fichaId: fichaActual.fichaId,
                autor:   localStorage.getItem('tz_asesor') || '',
                nota
            })
        });
        const result = await res.json();
        if (!result.ok) throw new Error(result.error || 'Error guardando nota');

        input.value = '';
        showToast('✓ Nota añadida');
        await abrirFicha(window._noticiasRenderItems.indexOf(fichaActual));
    } catch (err) {
        showToast('Error: ' + err.message);
    } finally {
        btn.disabled    = false;
        btn.textContent = '+ Añadir nota';
    }
}

async function cerrarCasoNoticia() {
    if (!fichaActual || !fichaActual.fichaId) return;
    if (!confirm('¿Cerrar este caso? Dejará de aparecer como "Ficha abierta" en el buscador.')) return;

    const btn = document.getElementById('btnCerrarCaso');
    btn.disabled    = true;
    btn.textContent = 'Cerrando…';

    try {
        const res    = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body:   JSON.stringify({ action: 'cerrar_ficha', fichaId: fichaActual.fichaId })
        });
        const result = await res.json();
        if (!result.ok) throw new Error(result.error || 'Error cerrando caso');

        showToast('✓ Caso cerrado');
        // Reflejar el cierre en el índice ya cargado, sin recargarlo entero
        const idx = noticiasIndice.findIndex(it => it.fichaId === fichaActual.fichaId);
        if (idx !== -1) noticiasIndice[idx].fichaId = null;
        cerrarDetalleNoticia();
        filtrarNoticias();
    } catch (err) {
        showToast('Error: ' + err.message);
        btn.disabled    = false;
        btn.textContent = '✓ Cerrar caso';
    }
}

// ─────────────────────────────────────────────
//  START
// ─────────────────────────────────────────────
init();

// ═════════════════════════════════════════════
//  MÓDULO BUZONES
// ═════════════════════════════════════════════

// ── Navegación entre pantallas ──────────────
function showScreen(screen) {
    const home        = document.getElementById('homeSection');
    const main        = document.getElementById('mainContainer');
    const not         = document.getElementById('noticiasSection');
    const buz         = document.getElementById('buzSection');
    const tabTaratura = document.getElementById('tabTaratura');
    const tabBuzones  = document.getElementById('tabBuzones');
    const title       = document.querySelector('.header-title');
    const homeBtn     = document.getElementById('headerHomeBtn');

    // Ocultar todas las pantallas principales antes de mostrar la elegida
    home.style.display = 'none';
    main.style.display = 'none';
    not.style.display  = 'none';
    buz.style.display  = 'none';
    tabTaratura.classList.remove('active');
    tabBuzones.classList.remove('active');

    if (screen === 'home') {
        home.style.display = 'flex';
        title.textContent  = 'Captación de Inmuebles';
        homeBtn.classList.add('hidden');

    } else if (screen === 'taratura') {
        main.style.display = '';
        tabTaratura.classList.add('active');
        title.textContent = 'Taratura';
        homeBtn.classList.remove('hidden');

    } else if (screen === 'noticias') {
        not.style.display = 'block';
        title.textContent = 'Noticias';
        homeBtn.classList.remove('hidden');
        initNoticias();

    } else if (screen === 'buzones') {
        buz.style.display = 'block';
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
