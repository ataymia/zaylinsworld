export const ADMIN_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ZTA Asset Forge</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #0c0f14; color: #f5f7fb; }
    main { width: min(1180px, calc(100% - 32px)); margin: 32px auto 72px; }
    h1 { margin: 0; font-size: clamp(2rem, 5vw, 4.4rem); letter-spacing: -0.06em; }
    .sub { color: #9da8b8; max-width: 720px; margin: 10px 0 28px; }
    .grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px; }
    .card { grid-column: span 6; background: #151a22; border: 1px solid #252c38; border-radius: 18px; padding: 18px; }
    .wide { grid-column: 1 / -1; }
    label { display: block; font-size: .82rem; color: #aab4c3; margin: 12px 0 6px; }
    input, textarea, button { width: 100%; border-radius: 10px; border: 1px solid #30394a; background: #0f131a; color: inherit; padding: 11px 12px; font: inherit; }
    textarea { min-height: 120px; resize: vertical; }
    button { cursor: pointer; border: 0; background: #f2d65c; color: #161308; font-weight: 800; margin-top: 14px; }
    button.secondary { background: #273040; color: #eef2f8; }
    .row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .status { display: inline-flex; gap: 8px; align-items: center; padding: 7px 10px; background: #202735; border-radius: 999px; color: #c7d0dd; font-size: .8rem; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: #7c8798; }
    .ok .dot { background: #69e39a; }
    .bad .dot { background: #ff6b76; }
    table { width: 100%; border-collapse: collapse; font-size: .86rem; }
    th, td { text-align: left; border-bottom: 1px solid #252c38; padding: 10px 8px; vertical-align: top; }
    th { color: #9da8b8; font-weight: 600; }
    code { color: #f2d65c; }
    a { color: #8fc6ff; }
    .message { min-height: 22px; color: #aab4c3; margin-top: 10px; white-space: pre-wrap; }
    @media (max-width: 760px) { .card { grid-column: 1 / -1; } .row { grid-template-columns: 1fr; } table { display: block; overflow-x: auto; } }
  </style>
</head>
<body>
<main>
  <div class="status" id="health"><span class="dot"></span><span>Checking factory…</span></div>
  <h1>ZTA Asset Forge</h1>
  <p class="sub">Feed the factory a detailed asset brief. Cloudflare runs the generation workflow, stores the finished GLB in R2, and publishes it to the Zaylins asset catalog.</p>

  <section class="grid">
    <div class="card">
      <h2>Factory key</h2>
      <label for="key">Admin key</label>
      <input id="key" type="password" autocomplete="off" placeholder="Stored only in this browser tab" />
      <button class="secondary" id="saveKey">Use this key</button>
      <div class="message" id="keyMessage"></div>
    </div>

    <div class="card">
      <h2>Generate one asset</h2>
      <div class="row">
        <div><label for="name">Name</label><input id="name" placeholder="Dreamdrop fire hydrant" /></div>
        <div><label for="category">Category</label><input id="category" value="street-props" /></div>
      </div>
      <label for="prompt">Detailed description</label>
      <textarea id="prompt" placeholder="A polished red city fire hydrant with rounded proportions…"></textarea>
      <label for="polycount">Target polygon count</label>
      <input id="polycount" type="number" min="100" max="20000" value="6000" />
      <button id="generateOne">Generate asset</button>
      <div class="message" id="singleMessage"></div>
    </div>

    <div class="card wide">
      <h2>Generate a batch</h2>
      <p class="sub">Paste up to 20 asset specifications at once.</p>
      <textarea id="batch">[
  {
    "name": "City trash can",
    "category": "street-props",
    "prompt": "A stylized outdoor city trash can with vertical metal slats and a rounded opening",
    "targetPolycount": 5000
  }
]</textarea>
      <button id="generateBatch">Start batch</button>
      <div class="message" id="batchMessage"></div>
    </div>

    <div class="card wide">
      <div class="row"><h2>Generation jobs</h2><button class="secondary" id="refreshJobs">Refresh</button></div>
      <div class="message" id="jobsMessage"></div>
      <table><thead><tr><th>Name</th><th>Category</th><th>Status</th><th>Progress</th><th>Output</th></tr></thead><tbody id="jobs"></tbody></table>
    </div>

    <div class="card wide">
      <div class="row"><h2>Published assets</h2><button class="secondary" id="refreshCatalog">Refresh</button></div>
      <table><thead><tr><th>Name</th><th>Category</th><th>Provider</th><th>GLB</th><th>Preview</th></tr></thead><tbody id="catalog"></tbody></table>
    </div>
  </section>
</main>
<script>
  const el = (id) => document.getElementById(id);
  let adminKey = sessionStorage.getItem('ztaAssetForgeKey') || '';
  el('key').value = adminKey;

  function authHeaders() {
    return { 'content-type': 'application/json', 'authorization': 'Bearer ' + adminKey };
  }
  function safeText(value) { return value == null ? '' : String(value); }
  function link(url, label) {
    if (!url) return document.createTextNode('—');
    const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noreferrer'; a.textContent = label; return a;
  }
  async function api(path, options = {}) {
    const response = await fetch(path, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || response.statusText);
    return data;
  }
  async function checkHealth() {
    try {
      const data = await api('/health');
      el('health').className = 'status ' + (data.meshyConfigured && data.adminConfigured ? 'ok' : 'bad');
      el('health').lastElementChild.textContent = data.meshyConfigured && data.adminConfigured
        ? 'Factory online'
        : 'Deployed, waiting for ' + [!data.meshyConfigured && 'Meshy key', !data.adminConfigured && 'admin key'].filter(Boolean).join(' + ');
    } catch (error) {
      el('health').className = 'status bad'; el('health').lastElementChild.textContent = error.message;
    }
  }
  async function loadJobs() {
    const body = el('jobs'); body.textContent = '';
    try {
      const data = await api('/api/jobs?limit=50', { headers: authHeaders() });
      for (const job of data.jobs) {
        const tr = document.createElement('tr');
        [job.name, job.category, job.status, safeText(job.progress) + '%'].forEach((value) => { const td = document.createElement('td'); td.textContent = safeText(value); tr.appendChild(td); });
        const output = document.createElement('td'); output.appendChild(link(job.model_url, 'Open GLB')); if (job.error) output.append(' · ' + job.error); tr.appendChild(output); body.appendChild(tr);
      }
      el('jobsMessage').textContent = data.jobs.length ? '' : 'No jobs yet.';
    } catch (error) { el('jobsMessage').textContent = error.message; }
  }
  async function loadCatalog() {
    const body = el('catalog'); body.textContent = '';
    try {
      const data = await api('/api/catalog?limit=100');
      for (const asset of data.assets) {
        const tr = document.createElement('tr');
        [asset.name, asset.category, asset.provider].forEach((value) => { const td = document.createElement('td'); td.textContent = safeText(value); tr.appendChild(td); });
        const glb = document.createElement('td'); glb.appendChild(link(asset.model_url, 'GLB')); tr.appendChild(glb);
        const preview = document.createElement('td'); preview.appendChild(link(asset.thumbnail_url, 'Preview')); tr.appendChild(preview);
        body.appendChild(tr);
      }
    } catch (error) { console.error(error); }
  }
  el('saveKey').onclick = () => { adminKey = el('key').value.trim(); sessionStorage.setItem('ztaAssetForgeKey', adminKey); el('keyMessage').textContent = 'Key saved for this browser tab.'; loadJobs(); };
  el('generateOne').onclick = async () => {
    el('singleMessage').textContent = 'Starting…';
    try {
      const payload = { name: el('name').value, category: el('category').value, prompt: el('prompt').value, targetPolycount: Number(el('polycount').value) };
      const data = await api('/api/jobs', { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) });
      el('singleMessage').textContent = 'Queued job ' + data.job.id; await loadJobs();
    } catch (error) { el('singleMessage').textContent = error.message; }
  };
  el('generateBatch').onclick = async () => {
    el('batchMessage').textContent = 'Starting batch…';
    try {
      const payload = JSON.parse(el('batch').value);
      const data = await api('/api/jobs/batch', { method: 'POST', headers: authHeaders(), body: JSON.stringify(payload) });
      el('batchMessage').textContent = 'Queued ' + data.count + ' assets.'; await loadJobs();
    } catch (error) { el('batchMessage').textContent = error.message; }
  };
  el('refreshJobs').onclick = loadJobs; el('refreshCatalog').onclick = loadCatalog;
  checkHealth(); if (adminKey) loadJobs(); loadCatalog();
  setInterval(() => { if (adminKey) loadJobs(); loadCatalog(); }, 15000);
</script>
</body>
</html>`;
