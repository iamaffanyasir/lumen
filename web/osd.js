// Volume panel shown on Lumen pages when the volume changes from the phone remote.
(function () {
  const css = `.vol{position:fixed;top:5vh;left:50%;z-index:90;display:flex;align-items:center;gap:1.1rem;width:min(440px,30vw);padding:1rem 1.4rem;
    border-radius:22px;background:rgba(16,18,31,.94);border:1px solid rgba(255,255,255,.1);box-shadow:0 20px 50px rgba(0,0,0,.45);
    transform:translate(-50%,-140%);opacity:0;transition:transform .35s cubic-bezier(.25,.9,.3,1),opacity .25s;will-change:transform;font-family:Inter,system-ui,sans-serif;color:#f4f6ff}
  .vol.on{transform:translate(-50%,0);opacity:1}
  .vol svg{width:1.7rem;height:1.7rem;flex:0 0 auto}
  .vol .vb{flex:1;height:8px;border-radius:99px;background:rgba(255,255,255,.14);overflow:hidden}
  .vol .vb i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#8b5cf6,#b794ff);transform-origin:left;transition:transform .2s ease-out}
  .vol .vn{min-width:2.6rem;text-align:right;font-weight:700;font-variant-numeric:tabular-nums;font-size:1.05rem}
  .vol.mute .vb i{background:#555a70}.vol.mute{color:#9aa0b8}`;
  const st = document.createElement('style'); st.textContent = css; document.head.append(st);
  const el = document.createElement('div'); el.className = 'vol';
  el.innerHTML = '<span class="vi"></span><div class="vb"><i></i></div><span class="vn"></span>';
  addEventListener('DOMContentLoaded', () => document.body.append(el)); if (document.body) document.body.append(el);
  const icon = (v, m) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/>${
    m || v === 0 ? '<path d="M17 9l4 6M21 9l-4 6"/>' : (v > 0 ? '<path d="M16.5 9.5a4 4 0 0 1 0 5"/>' : '') + (v > 50 ? '<path d="M19 7a7.5 7.5 0 0 1 0 10"/>' : '')}</svg>`;
  let t;
  window.lumenVolume = (v, muted) => {
    el.querySelector('.vi').innerHTML = icon(v, muted);
    el.querySelector('.vb i').style.transform = `scaleX(${muted ? 0 : v / 100})`;
    el.querySelector('.vn').textContent = muted ? 'Mute' : v;
    el.classList.toggle('mute', muted); el.classList.add('on');
    clearTimeout(t); t = setTimeout(() => el.classList.remove('on'), 1800);
  };
})();
