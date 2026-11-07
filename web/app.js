// Lumen launcher: TV home screen, settings, screensaver, power.
const $ = s => document.querySelector(s);
const api = (p, b) => fetch('/api/' + p, b === undefined ? {} :
  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json());
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cap = s => s[0].toUpperCase() + s.slice(1);
const PRESETS = ['aurora', 'nebula', 'sunset', 'ocean', 'graphite'];
const ICONS = {
  play: '<path d="M8 5v14l11-7z" fill="currentColor"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  bt: '<path d="M7 7l10 10-5 5V2l5 5L7 17"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  power: '<path d="M12 3v9M6.3 6.3a8 8 0 1 0 11.4 0"/>',
  wifi: '<path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1" fill="currentColor"/>',
  update: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/>',
};
const svg = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${ICONS[n]}</svg>`;

let S = {}, apps = [], walls = [], bt = [], wifi = [], info = {}, layer = 'home', lastHome = null, idle = Date.now(), btBusy = false, wifiBusy = false;

const SYS = [
  { name: 'Settings', icon: 'gear', a: '#6c5cff', b: '#1f1b4d', sub: 'Wallpaper, screensaver, Wi-Fi, Bluetooth & system', act: () => openPanel() },
  { name: 'Wi-Fi', icon: 'wifi', a: '#f5a623', b: '#4d2f06', sub: 'Choose a network and connect', act: () => openPanel('wifi') },
  { name: 'Update', icon: 'update', a: '#22c55e', b: '#073d1d', sub: 'Get the latest Lumen from GitHub', act: () => startUpdate() },
  { name: 'Bluetooth', icon: 'bt', a: '#2196f3', b: '#0a2a4d', sub: 'Connect speakers, headphones & controllers', act: () => openPanel('bt') },
  { name: 'Phone remote', icon: 'phone', a: '#00c2a8', b: '#06362f', sub: 'Control Lumen from your phone', act: () => openPanel('remote') },
  { name: 'Power off', icon: 'power', a: '#ff3b5c', b: '#4d0a18', sub: 'Turn off the Raspberry Pi', act: powerMenu },
];

/* ---------- home ---------- */
function tile(o, i, small) {
  const b = document.createElement('button');
  b.className = 'tile' + (small ? ' sm' : '');
  b.style.cssText = `--a:${o.a};--b:${o.b};--i:${i}`;
  b.innerHTML = `<span class="ic">${ICONS[o.icon] ? svg(o.icon) : esc(o.icon)}</span><span class="nm">${esc(o.name)}</span>`;
  b.onfocus = () => hero(o, b);
  b.onmouseenter = () => layer === 'home' && b.focus({ preventScroll: true });
  b.onclick = () => o.act ? o.act() : launch(o, b);
  return b;
}

function hero(o, b) {
  for (const [id, txt] of [['#heroTitle', o.name], ['#heroSub', o.sub || '']]) {
    const el = $(id); el.textContent = txt; el.classList.remove('swap'); void el.offsetWidth; el.classList.add('swap');
  }
  const root = document.documentElement.style;
  root.setProperty('--c1', o.a); root.setProperty('--c2', o.a);
  b.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  setTimeout(() => { const r = b.getBoundingClientRect(); root.setProperty('--gx', (r.left + r.width / 2) + 'px'); }, 300);
}

function launch(o, b) {
  const r = b.getBoundingClientRect(), L = $('#launch');
  L.className = 'launch';
  L.style.cssText = `left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;opacity:1;background:linear-gradient(135deg,${o.a},${o.b})`;
  L.textContent = o.name;
  void L.offsetWidth; L.classList.add('go');
  setTimeout(() => location.href = o.url, 600);
}
addEventListener('pageshow', () => { $('#launch').className = 'launch'; $('#launch').style.opacity = 0; });

function homeMove(d) {
  const rows = [...document.querySelectorAll('#home .row')], cur = document.activeElement;
  let r = rows.findIndex(x => x.contains(cur));
  if (r < 0) return rows[0].children[0]?.focus();
  let items = [...rows[r].children], c = items.indexOf(cur);
  if (d === 'l') c--; else if (d === 'r') c++;
  else { r += d === 'u' ? -1 : 1; if (r < 0 || r >= rows.length) return; items = [...rows[r].children]; c = Math.min(c, items.length - 1); }
  items[c]?.focus({ preventScroll: true });
}

/* ---------- keyboard / remote navigation ---------- */
const typing = () => document.activeElement?.tagName === 'INPUT';
addEventListener('keydown', e => {
  const saverOn = !$('#saver').classList.contains('hidden');
  idle = Date.now();
  if (saverOn) { e.preventDefault(); return hideSaver(); }
  const back = e.key === 'Escape' || e.key === 'BrowserBack' || (e.altKey && e.key === 'ArrowLeft') || (e.key === 'Backspace' && !typing());
  if (back) { e.preventDefault(); return goBack(); }
  const d = { ArrowUp: 'u', ArrowDown: 'd', ArrowLeft: 'l', ArrowRight: 'r' }[e.key];
  if (!d || (typing() && (d === 'l' || d === 'r'))) return;
  e.preventDefault();
  if (layer === 'home') homeMove(d); else linearMove(d === 'u' || d === 'l' ? -1 : 1);
});
for (const ev of ['mousemove', 'pointerdown', 'wheel']) addEventListener(ev, () => { idle = Date.now(); if (!$('#saver').classList.contains('hidden')) hideSaver(); });

function linearMove(step) {
  const box = layer === 'panel' ? $('#settings') : $('#modal');
  const els = [...box.querySelectorAll('button,input')];
  const i = els.indexOf(document.activeElement);
  const n = els[Math.max(0, Math.min(els.length - 1, i + step))];
  n?.focus({ preventScroll: true }); n?.scrollIntoView({ block: 'center', behavior: 'smooth' });
}

function goBack() {
  if (layer === 'modal') closeModal();
  else if (layer === 'panel') closePanel();
}

/* ---------- settings panel ---------- */
async function openPanel(sec) {
  lastHome = document.activeElement; layer = 'panel';
  renderPanel();
  $('#settings').classList.add('open'); document.body.classList.add('dim');
  const h = sec && $(`[data-sec="${sec}"]`);
  const first = h ? h.nextElementSibling.querySelector('button,input') || h : $('#settings button');
  setTimeout(() => { first.focus({ preventScroll: true }); (h || first).scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 80);
  [bt, wifi] = await Promise.all([api('bt').catch(() => []), api('wifi').catch(() => [])]); rerender();
}
function closePanel() {
  layer = 'home'; $('#settings').classList.remove('open'); document.body.classList.remove('dim');
  (lastHome || $('#apps .tile')).focus({ preventScroll: true });
}

function renderPanel() {
  const o = (act, label, on, cls = '') => `<button class="opt${on ? ' on' : ''} ${cls}" data-do="${esc(act)}">${label}</button>`;
  $('#settings').innerHTML = `
  <h2>Settings</h2>
  <h3 data-sec="wifi">Wi-Fi</h3>
  <div>${o('wifi:scan', wifiBusy ? 'Scanning…' : 'Scan for networks')}</div>
  <div class="list">${wifi.map(n => `<button class="opt${n.active ? ' on' : ''}" data-do="wifi:join:${esc(n.ssid)}">
    <span>${esc(n.ssid)}</span><small>${n.active ? 'Connected · ' : n.secure ? 'Secured · ' : 'Open · '}<span class="bars">${'▮'.repeat(Math.ceil(n.signal / 25)).padEnd(4, '▯')}</span></small></button>`).join('')
    || '<p class="hint">No networks found yet. Select Scan.</p>'}</div>
  <h3 data-sec="wall">Wallpaper</h3>
  <div>${PRESETS.map(w => o('wall:' + w, cap(w), S.wallpaper === w)).join('')}
  ${walls.map(w => o('wall:img:' + w, 'Photo · ' + esc(w.slice(0, 16)), S.wallpaper === 'img:' + w)).join('')}</div>
  <p class="hint">Add your own photos from the phone remote → More.</p>
  <h3 data-sec="saver">Screensaver</h3>
  <div>${['aurora', 'clock', 'photos', 'off'].map(v => o('saver:' + v, cap(v), S.screensaver === v)).join('')}</div>
  <div>${[1, 5, 10, 30].map(m => o('mins:' + m, `After ${m} min`, S.saverMinutes == m)).join('')}</div>
  <h3 data-sec="bt">Bluetooth</h3>
  <div>${o('bt:scan', btBusy ? 'Scanning…' : 'Scan for devices')}</div>
  <div class="list">${bt.map(d => `<button class="opt" data-do="bt:${d.connected ? 'disconnect' : 'connect'}:${d.mac}">
    <span>${esc(d.name)}</span><small>${d.connected ? 'Connected · select to disconnect' : d.paired ? 'Paired · select to connect' : 'Select to pair'}</small></button>`).join('')
    || '<p class="hint">No devices yet. Put your speaker in pairing mode and scan.</p>'}</div>
  <h3 data-sec="yt">YouTube</h3>
  <input class="txt" id="ytKey" placeholder="YouTube Data API key (for the Lumen YouTube skin)" value="${esc(S.ytKey)}">
  ${o('yt:save', 'Save key')}
  <h3 data-sec="remote">Phone remote</h3>
  <p class="big">${esc(info.url)}</p><p class="hint">Or ${esc(info.ipUrl)} · phone must be on the same Wi-Fi.</p>
  <h3 data-sec="sys">System</h3>
  <div>${o('sys:update', 'Update Lumen')}${o('sys:restart-ui', 'Restart Lumen')}${o('sys:reboot', 'Reboot')}${o('sys:off', 'Power off', false, 'danger')}</div>`;
}
function rerender() {
  if (layer !== 'panel') return;
  const k = document.activeElement?.dataset?.do; renderPanel();
  const el = k && [...document.querySelectorAll('[data-do]')].find(x => x.dataset.do === k);
  (el || $('#settings button')).focus({ preventScroll: true });
}
const split1 = s => { const i = s.indexOf(':'); return i < 0 ? [s, ''] : [s.slice(0, i), s.slice(i + 1)]; };

$('#settings').addEventListener('click', async e => {
  const b = e.target.closest('[data-do]'); if (!b) return;
  const [k, v] = split1(b.dataset.do);
  if (k === 'wifi') {
    if (v === 'scan') { wifiBusy = true; rerender(); wifi = await api('wifi/scan', {}).catch(() => wifi); wifiBusy = false; rerender(); return; }
    return joinWifi(wifi.find(n => n.ssid === split1(v)[1]));
  }
  if (k === 'wall') set({ wallpaper: v });
  else if (k === 'saver') set({ screensaver: v });
  else if (k === 'mins') set({ saverMinutes: +v });
  else if (k === 'yt') { set({ ytKey: $('#ytKey').value.trim() }); toast('YouTube key saved'); }
  else if (k === 'bt') {
    if (v === 'scan') { btBusy = true; rerender(); bt = await api('bt/scan', {}).catch(() => bt); btBusy = false; rerender(); return; }
    const [action, mac] = split1(v);
    toast(action === 'connect' ? 'Connecting…' : 'Disconnecting…');
    const r = await api('bt/action', { action, mac }).catch(() => ({ ok: false }));
    toast(r.ok ? (action === 'connect' ? 'Connected' : 'Disconnected') : 'Could not connect. Is the device in pairing mode?');
    bt = await api('bt'); rerender();
  } else if (k === 'sys') {
    if (v === 'off') return powerMenu();
    if (v === 'update') return startUpdate();
    if (v === 'reboot') goodbye('Restarting…');
    api('power', { action: v });
  }
});

function set(p) { Object.assign(S, p); api('settings', p); applyWall(); rerender(); }
function applyWall() {
  const w = $('#wall'), v = S.wallpaper || 'aurora';
  if (v.startsWith('img:')) { w.className = 'wall img'; w.style.setProperty('--img', `url("/wallpapers/${encodeURIComponent(v.slice(4))}")`); }
  else { w.className = 'wall'; w.dataset.w = v; }
}

/* ---------- modal & power ---------- */
let prevLayer = 'home', prevFocus = null;
function modal(title, text, btns, extra = '') {
  if (layer !== 'modal') { prevLayer = layer; prevFocus = document.activeElement; }
  layer = 'modal';
  $('#mTitle').textContent = title; $('#mText').textContent = text; $('#mExtra').innerHTML = extra;
  $('#mBtns').innerHTML = btns.map(([label, , cls], i) => `<button class="opt ${cls || ''}" data-i="${i}">${label}</button>`).join('');
  $('#mBtns').querySelectorAll('button').forEach(b => b.onclick = () => btns[b.dataset.i][1]?.());
  $('#modal').classList.remove('hidden');
  $('#mBtns').lastElementChild?.focus();   // focus "Cancel" so nothing happens by accident
}
function closeModal() { $('#modal').classList.add('hidden'); layer = prevLayer; prevFocus?.focus({ preventScroll: true }); }
function powerMenu() {
  modal('Power', 'What would you like to do?', [
    ['Power off', () => { api('power', { action: 'off' }); goodbye('Shutting down…', 'Unplug the Pi once the green light stops blinking.'); }, 'danger'],
    ['Reboot', () => { api('power', { action: 'reboot' }); goodbye('Restarting…'); }],
    ['Cancel', closeModal],
  ]);
}
function goodbye(t, s = 'See you soon.') { modal(t, s, []); }

/* ---------- Wi-Fi ---------- */
function joinWifi(n) {
  if (!n) return;
  const connect = async () => {
    const password = $('#wifiPw')?.value || '';
    modal('Connecting…', `Joining ${n.ssid}`, [], '<div class="prog"><i style="--p:60%"></i></div>');
    const r = await api('wifi/connect', { ssid: n.ssid, password }).catch(() => ({ ok: false, msg: 'No response' }));
    closeModal(); toast(r.ok ? `Connected to ${n.ssid}` : `Couldn't connect: ${r.msg}`);
    wifi = await api('wifi').catch(() => wifi); info = await api('info').catch(() => info); rerender();
  };
  const forget = async () => { await api('wifi/forget', { ssid: n.ssid }); closeModal(); toast('Network forgotten'); wifi = await api('wifi'); rerender(); };
  if (n.active) return modal(n.ssid, 'You are connected to this network.', [['Forget network', forget, 'danger'], ['Close', closeModal]]);
  if (!n.secure) return connect();
  modal(n.ssid, 'Enter the Wi-Fi password. Use the phone keyboard to type.', [['Connect', connect, 'on'], ['Cancel', closeModal]],
    '<input class="txt" id="wifiPw" type="password" placeholder="Password">');
  setTimeout(() => $('#wifiPw').focus(), 50);
  $('#wifiPw').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); connect(); } };
}

/* ---------- one-click update with progress ---------- */
let updWatch = null;
function updModal(u) {
  const bar = $('#mExtra .prog i'), pct = $('#mExtra .pct');
  if (bar && pct && layer === 'modal' && u.state !== 'done' && u.state !== 'error') {   // animate the existing bar
    bar.style.setProperty('--p', u.pct + '%'); pct.textContent = u.pct + '%'; $('#mText').textContent = u.msg; return;
  }
  const btns = u.state === 'done' || u.state === 'error' ? [['OK', () => { clearInterval(updWatch); updWatch = null; closeModal(); }]] : [];
  modal(u.state === 'error' ? 'Update failed' : u.state === 'done' ? 'All set' : 'Updating Lumen',
    u.msg || '', btns, u.state === 'error' ? '' : `<div class="pct">${u.pct}%</div><div class="prog"><i style="--p:${u.pct}%"></i></div>`);
}
async function startUpdate() {
  updModal(await api('update', {}).catch(() => ({ state: 'error', pct: 0, msg: 'Lumen server is not responding.' })));
  watchUpdate();
}
function watchUpdate() {
  if (updWatch) return;
  let restarting = false;
  updWatch = setInterval(async () => {
    try {
      const u = await api('update');
      if (restarting && u.state === 'idle') {          // new version is running
        clearInterval(updWatch);
        updModal({ state: 'running', pct: 100, msg: 'Updated! Reloading…' });
        return setTimeout(() => location.reload(), 1200);
      }
      if (u.state === 'restarting') restarting = true;
      if (u.state !== 'idle') updModal(u);
      if (u.state === 'done' || u.state === 'error') { clearInterval(updWatch); updWatch = null; }
    } catch { restarting = true; }                     // server is restarting
  }, 700);
}

/* ---------- screensaver ---------- */
let photoTimer;
function showSaver() {
  const s = $('#saver'), type = S.screensaver;
  const clock = '<div class="sclock"></div>';
  if (type === 'photos' && walls.length) {
    let i = 0; s.innerHTML = '<div class="wall img"></div>' + clock;
    const next = () => { s.firstChild.style.setProperty('--img', `url("/wallpapers/${encodeURIComponent(walls[i++ % walls.length])}")`); s.firstChild.style.animation = 'none'; void s.offsetWidth; s.firstChild.style.animation = ''; };
    next(); photoTimer = setInterval(next, 15000);
  } else if (type === 'clock') s.innerHTML = clock;
  else s.innerHTML = `<div class="wall" data-w="${PRESETS.includes(S.wallpaper) ? S.wallpaper : 'aurora'}"><i></i><i></i><i></i></div>` + clock;
  tick(); s.classList.remove('hidden');
}
function hideSaver() { $('#saver').classList.add('hidden'); clearInterval(photoTimer); }
setInterval(() => {
  if (S.screensaver && S.screensaver !== 'off' && layer !== 'modal' && $('#saver').classList.contains('hidden')
      && Date.now() - idle > (S.saverMinutes || 5) * 60000) showSaver();
}, 5000);

/* ---------- clock, toast, sync ---------- */
function tick() {
  const d = new Date(), t = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const day = d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  $('#clock').innerHTML = `${t}<small>${day}</small>`;
  const sc = $('.sclock'); if (sc) sc.innerHTML = `${t}<small>${day}</small>`;
}
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3500); }

// Pick up changes made from the phone (e.g. new wallpaper).
setInterval(async () => {
  try {
    const [n, w, u] = await Promise.all([api('settings'), api('wallpapers'), api('update')]);
    if ((u.state === 'running' || u.state === 'restarting') && !updWatch) { updModal(u); watchUpdate(); }  // started from phone
    const changed = JSON.stringify(n) !== JSON.stringify(S) || w.length !== walls.length;
    S = n; walls = w; if (changed) { applyWall(); rerender(); }
  } catch { }
}, 4000);

(async () => {
  [S, apps, walls, info] = await Promise.all([api('settings'), fetch('/s/apps.json').then(r => r.json()), api('wallpapers'), api('info')]);
  applyWall();
  apps.forEach((a, i) => $('#apps').append(tile(a, i)));
  SYS.forEach((a, i) => $('#sys').append(tile(a, i + apps.length, true)));
  tick(); setInterval(tick, 1000);
  setTimeout(() => $('#apps .tile').focus({ preventScroll: true }), 100);
})();
