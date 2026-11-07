// Lumen launcher: home screen, widgets, settings, screensaver, power.
const $ = s => document.querySelector(s);
const api = (p, b) => fetch('/api/' + p, b === undefined ? {} :
  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json());
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const cap = s => s[0].toUpperCase() + s.slice(1);
const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
                set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } } };

const P = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const I = {
  gear: P('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  wifi: P('<path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1" fill="currentColor"/>'),
  wifiOff: P('<path d="M2 2l20 20M8.5 16a5 5 0 0 1 7 0M5 12.5a10 10 0 0 1 5-2.7M19 12.5a10 10 0 0 0-2.4-1.8M2 9a15 15 0 0 1 4.2-2.8M10.7 5.1A15 15 0 0 1 22 9"/><circle cx="12" cy="19.5" r="1" fill="currentColor"/>'),
  bt: P('<path d="M7 7l10 10-5 5V2l5 5L7 17"/>'),
  image: P('<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>'),
  saver: P('<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>'),
  clock: P('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  grid: P('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
  pin: P('<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  play: P('<rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9v6l5-3z" fill="currentColor"/>'),
  phone: P('<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>'),
  update: P('<path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/>'),
  power: P('<path d="M12 3v9M6.3 6.3a8 8 0 1 0 11.4 0"/>'),
  back: P('<path d="m15 6-6 6 6 6"/>'),
  chev: P('<path d="m9 6 6 6-6 6"/>'),
  sun: P('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  moon: P('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'),
  cloud: P('<path d="M17.5 19H7a5 5 0 1 1 1-9.9A6 6 0 0 1 19.4 11 4 4 0 0 1 17.5 19z"/>'),
  rain: P('<path d="M17.5 15H7a5 5 0 1 1 1-9.9A6 6 0 0 1 19.4 7 4 4 0 0 1 17.5 15zM8 18l-1 3M12 18l-1 3M16 18l-1 3"/>'),
  storm: P('<path d="M17.5 14H7a5 5 0 1 1 1-9.9A6 6 0 0 1 19.4 6 4 4 0 0 1 17.5 14zM13 14l-3 5h4l-3 4"/>'),
  fog: P('<path d="M4 10h16M3 14h18M6 18h12M7 6h10"/>'),
};

const PRESETS = ['aurora', 'nebula', 'sunset', 'ocean', 'graphite'];
const WIDGETS = [['weather', 'Weather'], ['prayer', 'Prayer times'], ['moon', 'Moon phase'], ['hadith', 'Daily hadith'], ['news', 'Tech news']];
const MENU = [
  ['wifi', 'Wi-Fi', 'wifi'], ['bt', 'Bluetooth', 'bt'], ['wall', 'Wallpaper', 'image'], ['saver', 'Screensaver', 'saver'],
  ['clock', 'Clock', 'clock'], ['widgets', 'Home widgets', 'grid'], ['prayer', 'Location & prayer', 'pin'], ['yt', 'YouTube', 'play'],
  ['remote', 'Phone remote', 'phone'], ['update', 'Update', 'update'], ['power', 'Power', 'power']];

let S = {}, apps = [], walls = [], bt = [], wifi = [], info = {}, layer = 'home', lastHome = null, idle = Date.now();
let sheetSec = null, sheetFrom = 'panel', busy = {};

/* ================= home ================= */
function tile(o, i) {
  const b = document.createElement('button');
  b.className = 'tile'; b.style.cssText = `--a:${o.a};--i:${i}`;
  b.innerHTML = `<span class="lg" style="--m:url(/s/icons/${o.logo}.svg)"></span><span class="nm">${esc(o.name)}</span>`;
  b.onfocus = () => slideRow(b);
  b.onmouseenter = () => layer === 'home' && b.focus({ preventScroll: true });
  b.onclick = () => launch(o, b);
  return b;
}
function slideRow(b) {   // GPU transform keeps the focused tile on screen
  const track = b.parentElement, view = track.parentElement.clientWidth, pad = view * 0.045;
  const x = Math.min(Math.max(0, track.scrollWidth - view), Math.max(0, b.offsetLeft + b.offsetWidth - view + pad * 2));
  track.style.transform = `translateX(${-x}px)`;
}
function launch(o, b) {
  const r = b.getBoundingClientRect(), L = $('#launch');
  L.className = 'launch';
  L.style.cssText = `opacity:1;background:${o.a};transform:translate(${r.left}px,${r.top}px) scale(${r.width / innerWidth},${r.height / innerHeight})`;
  void L.offsetWidth; L.classList.add('go');
  setTimeout(() => location.href = o.url, 380);
}
addEventListener('pageshow', () => { $('#launch').className = 'launch'; $('#launch').style.opacity = 0; });

function homeMove(d) {
  const rows = [...document.querySelectorAll('#home [data-nav]')], cur = document.activeElement;
  let r = rows.findIndex(x => x.contains(cur));
  if (r < 0) return $('#apps .tile')?.focus();
  let items = [...rows[r].children], c = items.indexOf(cur);
  if (d === 'l') c--; else if (d === 'r') c++;
  else { r += d === 'u' ? -1 : 1; if (r < 0 || r >= rows.length) return; items = [...rows[r].children]; c = d === 'u' ? items.length - 1 : 0; }
  items[c]?.focus({ preventScroll: true });
}

/* ================= navigation ================= */
const typing = () => document.activeElement?.tagName === 'INPUT';
addEventListener('keydown', e => {
  idle = Date.now();
  if (!$('#saver').classList.contains('hidden')) { e.preventDefault(); return hideSaver(); }
  const back = e.key === 'Escape' || e.key === 'BrowserBack' || (e.altKey && e.key === 'ArrowLeft') || (e.key === 'Backspace' && !typing());
  if (back) { e.preventDefault(); return goBack(); }
  const d = { ArrowUp: 'u', ArrowDown: 'd', ArrowLeft: 'l', ArrowRight: 'r' }[e.key];
  if (!d || (typing() && (d === 'l' || d === 'r'))) return;
  e.preventDefault();
  if (layer === 'home') homeMove(d);
  else spatial(layer === 'panel' ? $('#settings') : layer === 'sheet' ? $('.sheet') : $('#modal .box'), d);
});
for (const ev of ['mousemove', 'pointerdown', 'wheel']) addEventListener(ev, () => { idle = Date.now(); if (!$('#saver').classList.contains('hidden')) hideSaver(); });

// Move focus to the nearest control in the pressed direction (works for grids and lists).
function spatial(box, d) {
  const els = [...box.querySelectorAll('button,input')].filter(e => e.offsetParent), a = document.activeElement;
  if (!els.includes(a)) return els[0]?.focus();
  const r = a.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, h = d === 'l' || d === 'r';
  let best = null, bs = 1e9;
  for (const e of els) {
    if (e === a) continue;
    const q = e.getBoundingClientRect(), dx = q.left + q.width / 2 - cx, dy = q.top + q.height / 2 - cy;
    if (!(d === 'r' ? dx > 4 : d === 'l' ? dx < -4 : d === 'd' ? dy > 4 : dy < -4)) continue;
    const sc = (h ? Math.abs(dx) : Math.abs(dy)) + (h ? Math.abs(dy) : Math.abs(dx)) * 3;
    if (sc < bs) { bs = sc; best = e; }
  }
  if (best) { best.focus({ preventScroll: true }); best.scrollIntoView({ block: 'nearest' }); }
}
function goBack() {
  if (layer === 'modal') closeModal(); else if (layer === 'sheet') closeSheet(); else if (layer === 'panel') closePanel();
}

/* ================= settings menu ================= */
function summary(k) {
  const act = wifi.find(n => n.active);
  return { wifi: act ? act.ssid : 'Not connected', wall: S.wallpaper === 'none' ? 'None' : S.wallpaper.startsWith('img:') ? 'Photo' : cap(S.wallpaper),
    saver: S.saverOn ? cap(S.screensaver) : 'Off', clock: S.clock12 ? '12-hour' : '24-hour', prayer: S.city,
    widgets: WIDGETS.filter(([w]) => S.widgets?.[w] !== false).length + ' on', update: (info.version || '').split(' · ')[0] }[k] || '';
}
function openPanel() {
  if (layer === 'home') lastHome = document.activeElement;
  layer = 'panel';
  $('#settings').innerHTML = `<div class="phead"><button class="opt back" data-menu="close">${I.back} Back</button><h2>Settings</h2></div>` +
    MENU.map(([k, label, ic]) => `<button class="mi" data-menu="${k}"><span class="mic">${I[ic]}</span><span class="l">${label}</span><small>${esc(summary(k))}</small><span class="chev">${I.chev}</span></button>`).join('');
  $('#settings').classList.add('open'); document.body.classList.add('dim');
  setTimeout(() => $(`#settings [data-menu="${sheetSec || 'wifi'}"]`)?.focus({ preventScroll: true }), 60);
}
function closePanel() {
  layer = 'home'; sheetSec = null;
  $('#settings').classList.remove('open'); document.body.classList.remove('dim');
  (lastHome || $('#apps .tile'))?.focus({ preventScroll: true });
}
$('#settings').addEventListener('click', e => {
  const b = e.target.closest('[data-menu]'); if (!b) return;
  b.dataset.menu === 'close' ? closePanel() : openSheet(b.dataset.menu);
});

/* ================= settings popups ================= */
const o = (act, label, on, cls = '') => `<button class="opt${on ? ' on' : ''} ${cls}" data-do="${esc(act)}">${label}</button>`;
const tg = (act, label, on) => `<button class="tg${on ? ' on' : ''}" data-do="${esc(act)}"><span>${label}</span><span class="pill"></span></button>`;
const pvb = (act, label, on, style, inner = '') => `<button class="pvb${on ? ' on' : ''}" data-do="${esc(act)}"><div class="pv" ${style}>${inner}</div><span>${label}</span></button>`;
const nowTxt = h12 => { const t = timeParts(new Date(), h12); return t.t + (t.ap ? `<small style="font-size:.6em;margin-left:.2em">${t.ap}</small>` : ''); };

const SHEETS = {
  wifi: () => `<div class="opts">${o('wifi:scan', busy.wifi ? 'Scanning…' : 'Scan for networks')}</div>
    <div class="list">${wifi.map(n => `<button class="opt${n.active ? ' on' : ''}" data-do="wifi:join:${esc(n.ssid)}"><span>${esc(n.ssid)}</span>
      <small>${n.active ? 'Connected · ' : n.secure ? 'Secured · ' : 'Open · '}<span class="bars">${'▮'.repeat(Math.ceil(n.signal / 25)).padEnd(4, '▯')}</span></small></button>`).join('')
      || '<p class="hint">No networks found yet. Select Scan.</p>'}</div>`,
  bt: () => `<div class="opts">${o('bt:scan', busy.bt ? 'Scanning…' : 'Scan for devices')}</div>
    <div class="list">${bt.map(d => `<button class="opt${d.connected ? ' on' : ''}" data-do="bt:${d.connected ? 'disconnect' : 'connect'}:${d.mac}"><span>${esc(d.name)}</span>
      <small>${d.connected ? 'Connected · select to disconnect' : d.paired ? 'Paired · select to connect' : 'Select to pair'}</small></button>`).join('')
      || '<p class="hint">No devices yet. Put your speaker in pairing mode and scan.</p>'}</div>`,
  wall: () => `<div class="pvgrid">${pvb('wall:none', 'None', S.wallpaper === 'none', 'data-w="none"')}
    ${PRESETS.map(w => pvb('wall:' + w, cap(w), S.wallpaper === w, `data-w="${w}"`)).join('')}
    ${walls.map(w => pvb('wall:img:' + w, esc(w.slice(0, 14)), S.wallpaper === 'img:' + w, `style="background-image:url('/wallpapers/${encodeURIComponent(w)}')"`)).join('')}</div>
    <p class="hint">Add your own photos from the phone remote → More → Upload photo.</p>`,
  saver: () => `<div class="list">${tg('saveron:', 'Screensaver', S.saverOn)}</div>
    <h3>Style</h3><div class="pvgrid" style="grid-template-columns:repeat(3,1fr)">
    ${pvb('saver:clock', 'Clock', S.screensaver === 'clock', 'style="background:#000"', nowTxt(S.clock12))}
    ${pvb('saver:aurora', 'Aurora', S.screensaver === 'aurora', 'data-w="aurora"', nowTxt(S.clock12))}
    ${pvb('saver:photos', 'Photos', S.screensaver === 'photos', walls[0] ? `style="background-image:url('/wallpapers/${encodeURIComponent(walls[0])}')"` : 'data-w="graphite"', walls[0] ? '' : '<small style="font-size:.8rem">No photos yet</small>')}</div>
    <h3>Start after</h3><div class="opts">${[1, 5, 10, 30].map(m => o('mins:' + m, m + ' min', S.saverMinutes == m)).join('')}</div>`,
  clock: () => `<div class="pvgrid" style="grid-template-columns:1fr 1fr">${pvb('clock12:1', '12-hour', S.clock12, 'data-w="none"', nowTxt(true))}${pvb('clock12:0', '24-hour', !S.clock12, 'data-w="none"', nowTxt(false))}</div>`,
  widgets: () => `<div class="list">${WIDGETS.map(([w, label]) => tg('widget:' + w, label, S.widgets?.[w] !== false)).join('')}</div>`,
  prayer: () => `<h3>City</h3><input class="txt" id="city" value="${esc(S.city)}" placeholder="City"><input class="txt" id="country" value="${esc(S.country)}" placeholder="Country">
    <h3>Asr time</h3><div class="opts">${o('school:1', 'Hanafi', S.school == 1)}${o('school:0', 'Standard (Shafi)', S.school == 0)}</div>
    <div class="opts">${o('prayer:save', 'Save location', false, 'on')}</div><p class="hint">Used for weather and prayer times.</p>`,
  yt: () => `<input class="txt" id="ytKey" placeholder="YouTube Data API key" value="${esc(S.ytKey)}"><div class="opts">${o('yt:save', 'Save key', false, 'on')}</div>
    <p class="hint">Tip: it's easier to paste the key on the phone remote → More.</p>`,
  remote: () => `<p class="big">${esc(info.url)}</p><p class="hint">Or ${esc(info.ipUrl)} · open it on a phone on the same Wi-Fi.</p>`,
  update: () => `<p class="big">Lumen ${esc(info.version || '')}</p><p class="hint">Gets the latest version from GitHub. Your settings are kept.</p><div class="opts">${o('sys:update', 'Update now', false, 'on')}</div>`,
  power: () => `<div class="opts">${o('sys:off', 'Power off', false, 'danger')}${o('sys:reboot', 'Reboot')}${o('sys:restart-ui', 'Restart Lumen')}</div>`,
};
async function openSheet(sec, from = 'panel') {
  if (layer === 'home') lastHome = document.activeElement;
  sheetSec = sec; sheetFrom = from; layer = 'sheet';
  $('#sheetTitle').textContent = MENU.find(m => m[0] === sec)[1];
  $('.shead .back').innerHTML = I.back + ' Back';
  renderSheet(); $('#sheet').classList.remove('hidden'); document.body.classList.add('dim');
  setTimeout(() => ($('#sheetBody button,#sheetBody input') || $('.shead .back')).focus({ preventScroll: true }), 50);
  if (sec === 'wifi') { wifi = await api('wifi').catch(() => wifi); rerender(); }
  if (sec === 'bt') { bt = await api('bt').catch(() => bt); rerender(); }
}
function closeSheet() {
  $('#sheet').classList.add('hidden');
  if (sheetFrom === 'home') { layer = 'home'; sheetSec = null; document.body.classList.remove('dim'); (lastHome || $('#apps .tile'))?.focus({ preventScroll: true }); }
  else openPanel();
}
function renderSheet() { $('#sheetBody').innerHTML = SHEETS[sheetSec](); }
function rerender() {
  if ((layer !== 'sheet' && layer !== 'modal') || !sheetSec) return;
  const k = document.activeElement?.dataset?.do; renderSheet();
  if (layer !== 'sheet') return;
  const el = k && [...document.querySelectorAll('#sheetBody [data-do]')].find(x => x.dataset.do === k);
  (el || $('#sheetBody button') || $('.shead .back')).focus({ preventScroll: true });
}
const split1 = s => { const i = s.indexOf(':'); return i < 0 ? [s, ''] : [s.slice(0, i), s.slice(i + 1)]; };

$('#sheet').addEventListener('click', async e => {
  if (e.target.id === 'sheet') return closeSheet();   // click outside the popup
  const b = e.target.closest('[data-do]'); if (!b) return;
  const [k, v] = split1(b.dataset.do);
  if (k === 'sheetback') return closeSheet();
  if (k === 'wifi') {
    if (v === 'scan') { busy.wifi = 1; rerender(); wifi = await api('wifi/scan', {}).catch(() => wifi); busy.wifi = 0; rerender(); return; }
    return joinWifi(wifi.find(n => n.ssid === split1(v)[1]));
  }
  if (k === 'bt') {
    if (v === 'scan') { busy.bt = 1; rerender(); bt = await api('bt/scan', {}).catch(() => bt); busy.bt = 0; rerender(); return; }
    const [action, mac] = split1(v);
    toast(action === 'connect' ? 'Connecting…' : 'Disconnecting…');
    const r = await api('bt/action', { action, mac }).catch(() => ({ ok: false }));
    toast(r.ok ? (action === 'connect' ? 'Connected' : 'Disconnected') : 'Could not connect. Is the device in pairing mode?');
    bt = await api('bt'); return rerender();
  }
  if (k === 'wall') return set({ wallpaper: v });
  if (k === 'saveron') return set({ saverOn: !S.saverOn });
  if (k === 'saver') return set({ screensaver: v });
  if (k === 'mins') return set({ saverMinutes: +v });
  if (k === 'clock12') return set({ clock12: v === '1' });
  if (k === 'widget') return set({ widgets: { ...S.widgets, [v]: S.widgets?.[v] === false } });
  if (k === 'school') return set({ school: +v });
  if (k === 'prayer') { set({ city: $('#city').value.trim() || 'Delhi', country: $('#country').value.trim() || 'India' }); return toast('Location saved'); }
  if (k === 'yt') { set({ ytKey: $('#ytKey').value.trim() }); return toast('YouTube key saved'); }
  if (k === 'sys') {
    if (v === 'off') return powerMenu();
    if (v === 'update') return startUpdate();
    if (v === 'reboot') goodbye('Restarting…');
    api('power', { action: v });
  }
});

function set(p) {
  const old = { ...S }; Object.assign(S, p); api('settings', p);
  applyWall(); rerender(); tick();
  if (old.city !== S.city || old.country !== S.country || old.school !== S.school || JSON.stringify(old.widgets) !== JSON.stringify(S.widgets)) renderWidgets(true);
}
function applyWall() {
  const w = $('#wall'), v = S.wallpaper || 'none';
  if (v.startsWith('img:')) { w.className = 'wall img'; w.removeAttribute('data-w'); w.style.setProperty('--img', `url("/wallpapers/${encodeURIComponent(v.slice(4))}")`); }
  else { w.className = 'wall'; w.dataset.w = v; w.style.removeProperty('--img'); }
}

/* ================= modal, power, Wi-Fi, update ================= */
let prevLayer = 'home', prevFocus = null;
function modal(title, text, btns, extra = '') {
  if (layer !== 'modal') { prevLayer = layer; prevFocus = document.activeElement; }
  layer = 'modal';
  $('#mTitle').textContent = title; $('#mText').textContent = text; $('#mExtra').innerHTML = extra;
  $('#mBtns').innerHTML = btns.map(([label, , cls], i) => `<button class="opt ${cls || ''}" data-i="${i}">${label}</button>`).join('');
  $('#mBtns').querySelectorAll('button').forEach(b => b.onclick = () => btns[b.dataset.i][1]?.());
  $('#modal').classList.remove('hidden');
  $('#mBtns').lastElementChild?.focus();
}
function closeModal() { $('#modal').classList.add('hidden'); layer = prevLayer; prevFocus?.focus({ preventScroll: true }); }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal' && $('#mBtns').children.length) closeModal(); });
function powerMenu() {
  modal('Power', 'What would you like to do?', [
    ['Power off', () => { api('power', { action: 'off' }); goodbye('Shutting down…', 'Unplug the Pi once the green light stops blinking.'); }, 'danger'],
    ['Reboot', () => { api('power', { action: 'reboot' }); goodbye('Restarting…'); }],
    ['Cancel', closeModal]]);
}
function goodbye(t, s = 'See you soon.') { modal(t, s, []); }

function joinWifi(n) {
  if (!n) return;
  const connect = async () => {
    const password = $('#wifiPw')?.value || '';
    modal('Connecting…', `Joining ${n.ssid}`, [], '<div class="prog"><i style="--s:.6"></i></div>');
    const r = await api('wifi/connect', { ssid: n.ssid, password }).catch(() => ({ ok: false, msg: 'No response' }));
    closeModal(); toast(r.ok ? `Connected to ${n.ssid}` : `Couldn't connect: ${r.msg}`);
    wifi = await api('wifi').catch(() => wifi); info = await api('info').catch(() => info); rerender(); wifiIcon();
  };
  const forget = async () => { await api('wifi/forget', { ssid: n.ssid }); closeModal(); toast('Network forgotten'); wifi = await api('wifi'); rerender(); wifiIcon(); };
  if (n.active) return modal(n.ssid, 'You are connected to this network.', [['Forget network', forget, 'danger'], ['Close', closeModal]]);
  if (!n.secure) return connect();
  modal(n.ssid, 'Enter the Wi-Fi password. Use the phone keyboard to type.', [['Connect', connect, 'on'], ['Cancel', closeModal]],
    '<input class="txt" id="wifiPw" type="password" placeholder="Password">');
  setTimeout(() => $('#wifiPw').focus(), 50);
  $('#wifiPw').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); connect(); } };
}

let updWatch = null;
function updModal(u) {
  const bar = $('#mExtra .prog i'), pct = $('#mExtra .pct');
  if (bar && pct && layer === 'modal' && u.state !== 'done' && u.state !== 'error') {
    bar.style.setProperty('--s', u.pct / 100); pct.textContent = u.pct + '%'; $('#mText').textContent = u.msg; return;
  }
  const btns = u.state === 'done' || u.state === 'error' ? [['OK', () => { clearInterval(updWatch); updWatch = null; closeModal(); }]] : [];
  modal(u.state === 'error' ? 'Update failed' : u.state === 'done' ? 'All set' : 'Updating Lumen', u.msg || '', btns,
    u.state === 'error' ? '' : `<div class="pct">${u.pct}%</div><div class="prog"><i style="--s:${u.pct / 100}"></i></div>`);
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
      if (restarting && u.state === 'idle') {
        clearInterval(updWatch); updModal({ state: 'running', pct: 100, msg: 'Updated! Reloading…' });
        return setTimeout(() => location.reload(), 1200);
      }
      if (u.state === 'restarting') restarting = true;
      if (u.state !== 'idle') updModal(u);
      if (u.state === 'done' || u.state === 'error') { clearInterval(updWatch); updWatch = null; }
    } catch { restarting = true; }
  }, 700);
}

/* ================= clock & screensaver ================= */
function timeParts(d, h12 = S.clock12) {
  let h = d.getHours(); const m = String(d.getMinutes()).padStart(2, '0');
  if (!h12) return { t: `${String(h).padStart(2, '0')}:${m}`, ap: '' };
  const ap = h < 12 ? 'AM' : 'PM'; h = h % 12 || 12; return { t: `${h}:${m}`, ap };
}
const fmtHM = hm => { const [h, m] = hm.split(':').map(Number); const d = new Date(); d.setHours(h, m); const t = timeParts(d); return t.t + (t.ap ? ' ' + t.ap : ''); };
function tick() {
  const d = new Date(), t = timeParts(d), day = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const html = `${t.t}${t.ap ? `<span class="ap">${t.ap}</span>` : ''}<small>${day}</small>`;
  $('#clock').innerHTML = html;
  const sc = $('.sclock'); if (sc) sc.innerHTML = html;
}
let photoTimer;
function showSaver() {
  const s = $('#saver'), type = S.screensaver, clock = '<div class="sclock"></div>';
  if (type === 'photos' && walls.length) {
    let i = 0; s.innerHTML = '<div class="wall img"></div>' + clock;
    const next = () => s.firstChild.style.setProperty('--img', `url("/wallpapers/${encodeURIComponent(walls[i++ % walls.length])}")`);
    next(); photoTimer = setInterval(next, 15000);
  } else if (type === 'aurora') s.innerHTML = '<div class="wall" data-w="aurora"></div>' + clock;
  else s.innerHTML = clock;
  tick(); s.classList.remove('hidden');
}
function hideSaver() { $('#saver').classList.add('hidden'); clearInterval(photoTimer); }
setInterval(() => {
  if (S.saverOn && layer === 'home' && $('#saver').classList.contains('hidden') && Date.now() - idle > (S.saverMinutes || 5) * 60000) showSaver();
}, 5000);

/* ================= widgets ================= */
const WX = c => c === 0 || c === 1 ? ['Clear', 'sun'] : c === 2 ? ['Partly cloudy', 'cloud'] : c === 3 ? ['Cloudy', 'cloud'] : c === 45 || c === 48 ? ['Fog', 'fog']
  : c >= 51 && c <= 67 ? ['Rain', 'rain'] : c >= 71 && c <= 77 ? ['Snow', 'cloud'] : c >= 80 && c <= 82 ? ['Showers', 'rain'] : c >= 95 ? ['Thunderstorm', 'storm'] : ['—', 'cloud'];
const today = () => new Date().toISOString().slice(0, 10);
const getJSON = u => fetch(u).then(r => { if (!r.ok) throw r.status; return r.json(); });
const wOn = w => S.widgets?.[w] !== false;
let prayerData = null, newsItems = [], newsPage = 0;

function renderWidgets(force) {
  const small = ['weather', 'prayer', 'moon', 'hadith'].filter(wOn), box = $('#widgets');
  box.style.gridTemplateColumns = `repeat(${Math.max(small.length, 1)},1fr)`;
  box.innerHTML = small.map(w => `<div class="wg" id="w-${w}"><h4>${WIDGETS.find(x => x[0] === w)[1]}</h4><div class="wload">Loading…</div></div>`).join('');
  $('#news').innerHTML = wOn('news') ? '<div class="wg" id="w-news"><h4><span>Tech news & trends</span><span id="npage"></span></h4><div class="wload">Loading…</div></div>' : '';
  if (wOn('weather')) loadWeather(force);
  if (wOn('prayer') || wOn('moon')) loadPrayer(force);
  if (wOn('moon')) drawMoon();
  if (wOn('hadith')) loadHadith();
  if (wOn('news')) loadNews();
}
const fill = (id, html) => { const el = $('#w-' + id); if (el) el.innerHTML = el.querySelector('h4').outerHTML + html; };

async function loadWeather(force) {
  try {
    let geo = store.get('geo');
    if (!geo || geo.q !== S.city || force) {
      const g = (await getJSON(`https://geocoding-api.open-meteo.com/v1/search?count=1&name=${encodeURIComponent(S.city)}`)).results?.[0];
      if (!g) throw 'City not found';
      geo = { q: S.city, lat: g.latitude, lon: g.longitude, name: g.name }; store.set('geo', geo);
    }
    const w = await getJSON(`https://api.open-meteo.com/v1/forecast?latitude=${geo.lat}&longitude=${geo.lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`);
    const c = w.current, [label, ic] = WX(c.weather_code), icon = ic === 'sun' && !c.is_day ? 'moon' : ic;
    fill('weather', `<div class="wx">${I[icon]}<div class="temp">${Math.round(c.temperature_2m)}°</div></div>
      <div class="wbig">${label}</div><div class="wsub">${esc(geo.name)}<br>Feels ${Math.round(c.apparent_temperature)}° · Humidity ${c.relative_humidity_2m}%<br>
      H ${Math.round(w.daily.temperature_2m_max[0])}° · L ${Math.round(w.daily.temperature_2m_min[0])}°</div>`);
  } catch (e) { fill('weather', `<div class="wload">Weather unavailable (${esc(e)})</div>`); }
}

async function loadPrayer(force) {
  const key = `${today()}|${S.city}|${S.country}|${S.school}|${S.method}`;
  try {
    let p = store.get('prayer');
    if (!p || p.key !== key || force) {
      const d = (await getJSON(`https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(S.city)}&country=${encodeURIComponent(S.country)}&method=${S.method ?? 1}&school=${S.school ?? 1}`)).data;
      p = { key, t: d.timings, hijri: `${d.date.hijri.day} ${d.date.hijri.month.en} ${d.date.hijri.year} AH` }; store.set('prayer', p);
    }
    prayerData = p; drawPrayer(); drawMoon();
  } catch (e) { fill('prayer', `<div class="wload">Prayer times unavailable</div>`); }
}
function drawPrayer() {
  if (!prayerData || !wOn('prayer')) return;
  const names = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'], now = new Date();
  const at = n => { const [h, m] = prayerData.t[n].split(':').map(Number); const d = new Date(); d.setHours(h, m, 0, 0); return d; };
  let next = names.filter(n => n !== 'Sunrise').find(n => at(n) > now) || 'Fajr';
  let target = at(next); if (target < now) target.setDate(target.getDate() + 1);
  const mins = Math.round((target - now) / 60000), left = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
  fill('prayer', names.map(n => `<div class="pr${n === next ? ' next' : at(n) < now ? ' past' : ''}"><span>${n}</span><span>${fmtHM(prayerData.t[n])}</span></div>`).join('') +
    `<div class="cd">${next} in ${left} · ${esc(S.city)} · ${S.school == 1 ? 'Hanafi' : 'Standard'}</div>`);
}
function drawMoon() {
  if (!wOn('moon')) return;
  const syn = 29.530588853, f = (((Date.now() - Date.UTC(2000, 0, 6, 18, 14)) / 864e5) % syn + syn) % syn / syn;
  const k = Math.cos(2 * Math.PI * f), rx = Math.abs(k) * 40, waxing = f < 0.5;
  const outer = waxing ? 1 : 0, inner = waxing ? (k > 0 ? 0 : 1) : (k > 0 ? 1 : 0);
  const illum = Math.round((1 - k) / 2 * 100), age = Math.round(f * syn);
  const name = f < .03 || f > .97 ? 'New moon' : f < .22 ? 'Waxing crescent' : f < .28 ? 'First quarter' : f < .47 ? 'Waxing gibbous'
    : f < .53 ? 'Full moon' : f < .72 ? 'Waning gibbous' : f < .78 ? 'Last quarter' : 'Waning crescent';
  fill('moon', `<div class="moon"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#23263a"/>
    <path d="M50 10A40 40 0 0 ${outer} 50 90A${rx} 40 0 0 ${inner} 50 10Z" fill="#f1ead2"/></svg>
    <div><div class="wbig" style="margin:0">${name}</div><div class="wsub" style="margin-top:.4rem">${illum}% lit · day ${age}</div></div></div>
    <div class="wsub">${prayerData ? esc(prayerData.hijri) : ''}</div>`);
}
async function loadHadith() {
  try {
    let h = store.get('hadith');
    if (!h || h.day !== today()) {
      const d = new Date(), seed = Math.floor(d / 864e5);
      for (let i = 0; i < 12; i++) {   // pick a short hadith for today
        const n = 5970 + (seed * 37 + i) % 256;   // Book of Good Manners (Al-Adab)
        const j = await getJSON(`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-bukhari/${n}.json`).catch(() => null);
        const t = j?.hadiths?.[0]?.text?.trim();
        if (t && t.length > 40 && t.length < 420) { h = { day: today(), text: t, n }; break; }
      }
      if (!h || h.day !== today()) throw 'none';
      store.set('hadith', h);
    }
    fill('hadith', `<div class="hd">${esc(h.text)}</div><div class="ref">Sahih al-Bukhari ${h.n}</div>`);
  } catch { fill('hadith', '<div class="wload">Hadith unavailable</div>'); }
}
async function loadNews() {
  try { newsItems = await api('news'); newsPage = 0; drawNews(); }
  catch { fill('news', '<div class="wload">News unavailable</div>'); }
}
function drawNews() {
  if (!wOn('news') || !newsItems.length) return;
  const pages = Math.ceil(newsItems.length / 3), p = newsPage % pages, ago = ts => { const m = Math.max(1, Math.round((Date.now() / 1000 - ts) / 60));
    return m < 60 ? m + 'm ago' : m < 1440 ? Math.round(m / 60) + 'h ago' : Math.round(m / 1440) + 'd ago'; };
  fill('news', `<div class="news">${newsItems.slice(p * 3, p * 3 + 3).map((n, i) => `<div class="ni" style="animation-delay:${i * 80}ms"><b>${esc(n.title)}</b>
    <small>${n.trend ? '<span class="tr">Trending · </span>' : ''}${esc(n.source)}${n.ts ? ' · ' + ago(n.ts) : ''}</small></div>`).join('')}</div>`);
  $('#w-news h4').innerHTML = `<span>Tech news & trends</span><span>${p + 1} / ${pages}</span>`;
}
setInterval(() => { newsPage++; drawNews(); }, 12000);          // rotate headlines
setInterval(() => { drawPrayer(); drawMoon(); }, 30000);        // countdown
setInterval(() => { if (wOn('weather')) loadWeather(); if (wOn('news')) loadNews(); if (wOn('hadith')) loadHadith(); if (wOn('prayer')) loadPrayer(); }, 30 * 60000);

/* ================= top buttons, toast, sync ================= */
async function wifiIcon() {
  const on = wifi.some(n => n.active), b = $('#wifiBtn');
  b.innerHTML = on ? I.wifi : I.wifiOff; b.classList.toggle('off', !on);
}
$('#wifiBtn').onclick = () => openSheet('wifi', 'home');
$('#setBtn').onclick = () => openPanel();
$('#setBtn').innerHTML = I.gear; $('#wifiBtn').innerHTML = I.wifi;
$('#home').addEventListener('click', e => { if (layer === 'panel') { e.stopPropagation(); closePanel(); } }, true);

let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 3500); }

setInterval(async () => {   // pick up changes made from the phone (wallpaper, key, update)
  try {
    const [n, w, u] = await Promise.all([api('settings'), api('wallpapers'), api('update')]);
    if ((u.state === 'running' || u.state === 'restarting') && !updWatch) { updModal(u); watchUpdate(); }
    const changed = JSON.stringify(n) !== JSON.stringify(S) || w.length !== walls.length;
    S = n; walls = w; if (changed) { applyWall(); rerender(); }
  } catch { }
}, 4000);
setInterval(async () => { wifi = await api('wifi').catch(() => wifi); wifiIcon(); }, 30000);

(function tvSocket() {   // searches from the phone open YouTube
  const ws = new WebSocket(`ws://${location.host}/ws?tv=1`);
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.t === 'search' && m.q) location.href = '/s/apps/youtube.html?q=' + encodeURIComponent(m.q); };
  ws.onclose = () => setTimeout(tvSocket, 2000);
})();

(async () => {
  [S, apps, walls, info] = await Promise.all([api('settings'), fetch('/s/apps.json').then(r => r.json()), api('wallpapers'), api('info')]);
  applyWall();
  apps.forEach((a, i) => $('#apps').append(tile(a, i)));
  tick(); setInterval(tick, 1000);
  renderWidgets();
  setTimeout(() => $('#apps .tile').focus({ preventScroll: true }), 100);
  wifi = await api('wifi').catch(() => []); wifiIcon();
})();
