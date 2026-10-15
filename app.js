/* CleanMap POC v2 – vanilla JS, no build step */
(function () {
  'use strict';
  const CFG = window.CLEANMAP_CONFIG || {};
  const LIVE = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase);
  const DEFAULT_TAGS = [
    '🦟 Mosquito breeding site', '💧 Stagnant water', '🧪 Hazardous material',
    '🛢️ Chemical spill', '🪟 Broken glass on path', '💉 Needles / sharps',
    '🗑️ Illegal waste dump', '🧹 Cleanup needed'
  ];
  const ADD_NEW = '__add_new__';
  const STATUS_LABEL = { open: 'Open', in_progress: 'In progress', closed: 'Closed' };
  const STATUS_COLOR = { open: '#d64545', in_progress: '#e8a317', closed: '#2e9e5b' };
  const normStatus = (s) => (s === 'resolved' ? 'closed' : (STATUS_LABEL[s] ? s : 'open')); // old data used "resolved"

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2));
  function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2800); }

  /* ============ STORAGE LAYER ============ */
  // Both stores expose: listTags, addTag, listReports, addReport, updateReport
  function supabaseStore() {
    const sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
    const bucket = CFG.PHOTO_BUCKET || 'photos';
    return {
      async listTags() {
        const { data, error } = await sb.from('tags').select('name').order('name');
        if (error) throw error; return data.map((r) => r.name);
      },
      async addTag(name) {
        const { error } = await sb.from('tags').insert({ name });
        if (error && error.code !== '23505') throw error;
      },
      async listReports() {
        const { data, error } = await sb.from('reports').select('*').order('created_at', { ascending: false }).limit(500);
        if (error) throw error;
        return data.map((r) => ({ ...r, status: normStatus(r.status) }));
      },
      async addReport(r) {
        const path = uuid() + '.jpg';
        const up = await sb.storage.from(bucket).upload(path, r.photo, { contentType: 'image/jpeg' });
        if (up.error) throw up.error;
        const url = sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
        const { error } = await sb.from('reports').insert({
          tag: r.tag, description: r.description, lat: r.lat, lng: r.lng,
          accuracy: r.accuracy, reporter: r.reporter, photo_url: url
        });
        if (error) throw error;
      },
      async updateReport(id, patch) {
        const { error } = await sb.from('reports').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
        if (error) throw error;
      }
    };
  }

  function localStore() {
    let dbp;
    function db() {
      if (!dbp) dbp = new Promise((res, rej) => {
        const r = indexedDB.open('cleanmap-demo', 1);
        r.onupgradeneeded = () => { r.result.createObjectStore('reports', { keyPath: 'id' }); r.result.createObjectStore('tags', { keyPath: 'name' }); };
        r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
      });
      return dbp;
    }
    async function run(store, mode, fn) {
      const d = await db();
      return new Promise((res, rej) => {
        const t = d.transaction(store, mode); const req = fn(t.objectStore(store));
        t.oncomplete = () => res(req ? req.result : undefined); t.onerror = () => rej(t.error);
      });
    }
    return {
      async listTags() {
        let rows = await run('tags', 'readonly', (s) => s.getAll());
        if (!rows.length) { for (const n of DEFAULT_TAGS) await run('tags', 'readwrite', (s) => s.put({ name: n })); rows = DEFAULT_TAGS.map((name) => ({ name })); }
        return rows.map((r) => r.name).sort();
      },
      async addTag(name) { await run('tags', 'readwrite', (s) => s.put({ name })); },
      async listReports() {
        const rows = await run('reports', 'readonly', (s) => s.getAll());
        return rows.sort((a, b) => b.created_at.localeCompare(a.created_at))
          .map((r) => ({ ...r, status: normStatus(r.status), photo_url: r.photo ? URL.createObjectURL(r.photo) : '' }));
      },
      async addReport(r) {
        await run('reports', 'readwrite', (s) => s.put({
          id: uuid(), created_at: new Date().toISOString(), updated_at: new Date().toISOString(), status: r.status || 'open',
          assigned_to: r.assigned_to || null,
          tag: r.tag, description: r.description, lat: r.lat, lng: r.lng,
          accuracy: r.accuracy, reporter: r.reporter, photo: r.photo
        }));
      },
      async updateReport(id, patch) {
        const d = await db();
        await new Promise((res, rej) => {
          const t = d.transaction('reports', 'readwrite'); const s = t.objectStore('reports'); const g = s.get(id);
          g.onsuccess = () => { const row = g.result; if (row) { Object.assign(row, patch, { updated_at: new Date().toISOString() }); s.put(row); } };
          t.oncomplete = res; t.onerror = () => rej(t.error);
        });
      },
      async clearReports() { await run('reports', 'readwrite', (s) => s.clear()); }
    };
  }

  const store = LIVE ? supabaseStore() : localStore();
  $('modeBadge').textContent = LIVE ? '🟢 Live mode (Supabase)' : '🟡 Demo mode (this browser only)';
  if (!LIVE) { $('btnSample').style.display = ''; $('btnClear').style.display = ''; }

  /* ============ TABS ============ */
  function show(tab) {
    $('viewReport').classList.toggle('active', tab === 'report');
    $('viewDash').classList.toggle('active', tab === 'dash');
    $('tabReport').classList.toggle('active', tab === 'report');
    $('tabDash').classList.toggle('active', tab === 'dash');
    if (tab === 'dash') { initMap(); loadDashboard(true); } else { stopCamera(); }
  }
  $('tabReport').onclick = () => show('report');
  $('tabDash').onclick = () => show('dash');

  /* ============ TAGS ============ */
  async function loadTags(selectAfter) {
    let tags = [];
    try { tags = await store.listTags(); } catch (e) { toast('Could not load tags: ' + e.message); }
    const sel = $('tagSelect');
    sel.innerHTML = '<option value="">— Select a tag —</option>' +
      tags.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join('') +
      `<option value="${ADD_NEW}">➕ Add new tag…</option>`;
    if (selectAfter) sel.value = selectAfter;
    const cur = $('fTag').value;
    $('fTag').innerHTML = '<option value="">All tags</option>' + tags.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
    $('fTag').value = tags.includes(cur) ? cur : '';
  }
  $('tagSelect').onchange = async function () {
    if (this.value !== ADD_NEW) return;
    const name = (prompt('New tag name (e.g. "🔥 Burning waste"):') || '').trim().slice(0, 60);
    if (!name) { this.value = ''; return; }
    try { await store.addTag(name); await loadTags(name); } catch (e) { toast('Could not add tag: ' + e.message); this.value = ''; }
  };

  /* ============ CAMERA ============ */
  let stream = null, photoBlob = null;
  const video = $('video'), preview = $('preview'), canvas = $('canvas');

  function stopCamera() { if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; } video.style.display = 'none'; $('btnSnap').style.display = 'none'; }
  function showPlaceholder() { preview.style.display = 'none'; video.style.display = 'none'; $('camPlaceholder').style.display = ''; }

  $('btnStart').onclick = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { toast('Live camera not available here — use “Use phone camera app”.'); return; }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false });
      video.srcObject = stream; video.style.display = ''; preview.style.display = 'none'; $('camPlaceholder').style.display = 'none';
      $('btnSnap').style.display = ''; $('btnRetake').style.display = 'none';
    } catch (e) { toast('Camera blocked: ' + e.message + '. Try “Use phone camera app”.'); }
  };

  function drawToBlob(src, w, h) {
    const max = 1280, scale = Math.min(1, max / Math.max(w, h));
    canvas.width = Math.round(w * scale); canvas.height = Math.round(h * scale);
    canvas.getContext('2d').drawImage(src, 0, 0, canvas.width, canvas.height);
    return new Promise((res) => canvas.toBlob((b) => res(b), 'image/jpeg', 0.8));
  }
  async function setPhoto(blob) {
    photoBlob = blob; preview.src = URL.createObjectURL(blob);
    preview.style.display = ''; video.style.display = 'none'; $('camPlaceholder').style.display = 'none';
    $('btnRetake').style.display = ''; stopCamera();
  }
  $('btnSnap').onclick = async () => { if (!video.videoWidth) return; await setPhoto(await drawToBlob(video, video.videoWidth, video.videoHeight)); };
  $('btnRetake').onclick = () => { photoBlob = null; showPlaceholder(); $('btnRetake').style.display = 'none'; $('btnStart').click(); };
  $('fileInput').onchange = async function () {
    const f = this.files[0]; if (!f) return;
    const img = new Image(); img.onload = async () => { await setPhoto(await drawToBlob(img, img.naturalWidth, img.naturalHeight)); URL.revokeObjectURL(img.src); };
    img.src = URL.createObjectURL(f); this.value = '';
  };

  /* ============ GEOLOCATION ============ */
  let geo = null;
  function getGeo() {
    const box = $('geoBox'); box.className = 'geo'; box.textContent = 'Locating…';
    if (!navigator.geolocation) { box.className = 'geo bad'; box.textContent = 'Geolocation not supported on this device.'; return; }
    navigator.geolocation.getCurrentPosition(
      (p) => { geo = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }; box.textContent = `📍 ${geo.lat.toFixed(5)}, ${geo.lng.toFixed(5)}  (±${Math.round(geo.accuracy)} m)`; },
      (e) => { geo = null; box.className = 'geo bad'; box.textContent = 'Location unavailable: ' + e.message + '. Allow location access and tap Refresh.'; },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  }
  $('btnGeo').onclick = getGeo;

  /* ============ SUBMIT ============ */
  $('btnSubmit').onclick = async () => {
    const tag = $('tagSelect').value;
    if (!photoBlob) return toast('Please take a photo first.');
    if (!geo) return toast('Location is required — tap Refresh location.');
    if (!tag || tag === ADD_NEW) return toast('Please choose a tag.');
    const btn = $('btnSubmit'); btn.disabled = true; $('submitHint').textContent = 'Uploading…';
    try {
      await store.addReport({
        tag, description: $('desc').value.trim().slice(0, 1000), reporter: $('reporter').value.trim().slice(0, 60) || null,
        lat: geo.lat, lng: geo.lng, accuracy: geo.accuracy, photo: photoBlob
      });
      toast('✅ Report submitted'); photoBlob = null; showPlaceholder(); $('btnRetake').style.display = 'none';
      $('desc').value = ''; $('tagSelect').value = ''; $('submitHint').textContent = '';
    } catch (e) { toast('Failed: ' + (e.message || e)); $('submitHint').textContent = ''; }
    btn.disabled = false;
  };

  /* ============ DASHBOARD ============ */
  let map, layer, reports = [];
  function initMap() {
    if (map) { setTimeout(() => map.invalidateSize(), 50); return; }
    map = L.map('map').setView(CFG.DEFAULT_CENTER || [20, 78], CFG.DEFAULT_ZOOM || 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors', maxZoom: 19 }).addTo(map);
    layer = L.layerGroup().addTo(map);
  }
  function filtered() {
    const t = $('fTag').value, s = $('fStatus').value, a = $('fAssignee').value;
    return reports.filter((r) =>
      (!t || r.tag === t) && (!s || r.status === s) &&
      (!a || (a === '__none__' ? !r.assigned_to : r.assigned_to === a)));
  }
  function refreshAssigneeUI() {
    const names = [...new Set(reports.map((r) => r.assigned_to).filter(Boolean))].sort();
    const cur = $('fAssignee').value;
    $('fAssignee').innerHTML = '<option value="">All people</option><option value="__none__">Unassigned</option>' +
      names.map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join('');
    $('fAssignee').value = (names.includes(cur) || cur === '__none__') ? cur : '';
    $('assignees').innerHTML = names.map((n) => `<option value="${esc(n)}">`).join('');
  }
  async function loadDashboard(fit) {
    try { reports = await store.listReports(); } catch (e) { toast('Could not load reports: ' + e.message); reports = []; }
    refreshAssigneeUI();
    renderDashboard(fit !== false);
  }
  function statusOptions(sel) {
    return Object.keys(STATUS_LABEL).map((k) => `<option value="${k}"${k === sel ? ' selected' : ''}>${STATUS_LABEL[k]}</option>`).join('');
  }
  function renderDashboard(fit) {
    const rows = filtered();
    const count = (s) => rows.filter((r) => r.status === s).length;
    const needsOwner = rows.filter((r) => r.status !== 'closed' && !r.assigned_to).length;
    const byTag = {}; rows.forEach((r) => { byTag[r.tag] = (byTag[r.tag] || 0) + 1; });
    const top = Object.entries(byTag).sort((a, b) => b[1] - a[1])[0];
    $('stats').innerHTML =
      `<div class="stat"><b>${rows.length}</b><span>Total reports</span></div>` +
      `<div class="stat"><b style="color:${STATUS_COLOR.open}">${count('open')}</b><span>Open</span></div>` +
      `<div class="stat"><b style="color:${STATUS_COLOR.in_progress}">${count('in_progress')}</b><span>In progress</span></div>` +
      `<div class="stat"><b style="color:${STATUS_COLOR.closed}">${count('closed')}</b><span>Closed</span></div>` +
      `<div class="stat"><b>${needsOwner}</b><span>Need an owner</span></div>` +
      `<div class="stat"><b style="font-size:15px">${top ? esc(top[0]) : '—'}</b><span>Most common${top ? ' (' + top[1] + ')' : ''}</span></div>`;

    layer.clearLayers(); const pts = [];
    rows.forEach((r) => {
      const m = L.circleMarker([r.lat, r.lng], { radius: 9, color: '#fff', weight: 2, fillColor: STATUS_COLOR[r.status], fillOpacity: 0.95 });
      m.bindPopup(`<b>${esc(r.tag)}</b> · ${STATUS_LABEL[r.status]}<br>${esc(r.description || '')}` +
        `<br><i>${r.assigned_to ? 'Assigned to ' + esc(r.assigned_to) : 'Unassigned'}</i>` +
        `<br><img src="${esc(r.photo_url)}" style="width:200px;margin-top:6px;border-radius:6px">`);
      m.addTo(layer); pts.push([r.lat, r.lng]);
    });
    if (fit && pts.length) map.fitBounds(pts, { padding: [30, 30], maxZoom: 16 });

    $('list').innerHTML = rows.length ? rows.map((r) => `
      <div class="item">
        <img src="${esc(r.photo_url)}" alt="photo" data-open="${esc(r.photo_url)}">
        <div class="body">
          <span class="pill ${r.status}">${STATUS_LABEL[r.status]}</span> <b>${esc(r.tag)}</b>
          <div>${esc(r.description || '(no description)')}</div>
          <div class="meta">${new Date(r.created_at).toLocaleString()} · ${Number(r.lat).toFixed(4)}, ${Number(r.lng).toFixed(4)}${r.reporter ? ' · reported by ' + esc(r.reporter) : ''}</div>
          <div class="assign">
            <label>Assigned to</label>
            <input type="text" class="a-name" list="assignees" maxlength="60" value="${esc(r.assigned_to || '')}" placeholder="Volunteer or team name">
            <label>Status</label>
            <select class="a-status">${statusOptions(r.status)}</select>
            <div class="row" style="margin-top:8px">
              <button class="btn small" data-save="${esc(r.id)}">Save</button>
              <a href="https://www.google.com/maps?q=${r.lat},${r.lng}" target="_blank" rel="noopener" style="font-size:13px">Open in Maps</a>
            </div>
          </div>
        </div>
      </div>`).join('') : '<div class="hint">No reports match. Submit one from the Report tab' + (LIVE ? '.' : ' or click “Load sample data”.') + '</div>';
  }
  $('list').addEventListener('click', async (e) => {
    const sv = e.target.closest('[data-save]');
    if (sv) {
      const card = sv.closest('.item');
      const name = card.querySelector('.a-name').value.trim().slice(0, 60);
      let status = card.querySelector('.a-status').value;
      let note = 'Saved';
      if (name && status === 'open') { status = 'in_progress'; note = 'Saved — status set to In progress'; }
      sv.disabled = true;
      try { await store.updateReport(sv.dataset.save, { assigned_to: name || null, status }); toast(note); await loadDashboard(false); }
      catch (err) { toast('Failed: ' + (err.message || err)); sv.disabled = false; }
      return;
    }
    const im = e.target.closest('[data-open]'); if (im && im.dataset.open) window.open(im.dataset.open, '_blank');
  });
  $('fTag').onchange = () => renderDashboard(true);
  $('fStatus').onchange = () => renderDashboard(true);
  $('fAssignee').onchange = () => renderDashboard(true);
  $('btnRefresh').onclick = () => loadDashboard(true);

  $('btnCsv').onclick = () => {
    const rows = filtered();
    const head = ['created_at', 'updated_at', 'status', 'assigned_to', 'tag', 'description', 'lat', 'lng', 'accuracy_m', 'reporter', 'photo_url'];
    const cell = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const csv = [head.join(',')].concat(rows.map((r) => [r.created_at, r.updated_at, STATUS_LABEL[r.status], r.assigned_to, r.tag, r.description, r.lat, r.lng, r.accuracy, r.reporter, LIVE ? r.photo_url : '(local)'].map(cell).join(','))).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'cleanmap-reports.csv'; a.click();
  };

  /* ---- demo helpers ---- */
  function fakePhoto(label, color) {
    const c = document.createElement('canvas'); c.width = 640; c.height = 480; const x = c.getContext('2d');
    x.fillStyle = color; x.fillRect(0, 0, 640, 480); x.fillStyle = 'rgba(255,255,255,.9)'; x.font = '64px sans-serif'; x.textAlign = 'center';
    x.fillText(label.split(' ')[0], 320, 240); x.font = '24px sans-serif'; x.fillText('sample photo', 320, 290);
    return new Promise((res) => c.toBlob(res, 'image/jpeg', 0.7));
  }
  $('btnSample').onclick = async () => {
    initMap(); const tags = await store.listTags();
    const c = geo ? [geo.lat, geo.lng] : [map.getCenter().lat, map.getCenter().lng];
    const colors = ['#5b7c99', '#7a5b99', '#99725b', '#5b9988', '#99915b', '#995b6e', '#5b6b99', '#6a995b'];
    const notes = ['Near the north gate', 'Along the jogging track', 'Behind the market', 'Under the bridge', 'Corner of the playground', 'By the lake edge', 'Bus stop side', 'Back lane'];
    const plan = [['open', null], ['open', null], ['in_progress', 'Green Club'], ['in_progress', 'Asha'], ['closed', 'Ravi'], ['closed', 'Green Club'], ['open', null], ['in_progress', 'Ravi']];
    for (let i = 0; i < 8; i++) {
      await store.addReport({
        tag: tags[i % tags.length], description: notes[i], reporter: 'Sample', accuracy: 12,
        status: plan[i][0], assigned_to: plan[i][1],
        lat: c[0] + (Math.random() - 0.5) * 0.02, lng: c[1] + (Math.random() - 0.5) * 0.02, photo: await fakePhoto(tags[i % tags.length], colors[i])
      });
    }
    toast('Sample data loaded'); loadDashboard(true);
  };
  $('btnClear').onclick = async () => { if (confirm('Delete all demo reports in this browser?')) { await store.clearReports(); loadDashboard(true); } };

  /* ============ INIT ============ */
  loadTags(); getGeo();
})();
