// Shared by Lumen's own apps (YouTube, Music, Videos):
//  - a logo splash that fades out when the app opens (continues the launcher's open animation)
//  - lumenExit(): covers the screen with the logo, then goes home (the launcher shrinks it back into the tile)
//  - lumenNP(): tells the phone remote what is playing
// Load it as the first thing inside <body>. Set data-name, data-color and data-logo on <html>.
(function () {
  const root = document.documentElement, color = root.dataset.color || '#111', logo = root.dataset.logo || '', name = root.dataset.name || '';
  const st = document.createElement('style');
  st.textContent = `.lsplash{position:fixed;inset:0;z-index:999;background:${color};display:grid;place-items:center;will-change:opacity;transition:opacity .38s ease}
  .lsplash i{width:18vh;height:18vh;background:#fff;-webkit-mask:url(/s/icons/${logo}.svg) center/contain no-repeat;mask:url(/s/icons/${logo}.svg) center/contain no-repeat;will-change:transform;transition:transform .38s cubic-bezier(.3,.9,.25,1)}
  .lsplash.off{opacity:0;pointer-events:none}.lsplash.off i{transform:scale(1.12)}
  .lsplash.pre{opacity:0;transition:none}.lsplash.pre i{transform:scale(.88);transition:none}`;
  document.head.append(st);
  const sp = document.createElement('div'); sp.className = 'lsplash'; sp.innerHTML = '<i></i>';
  document.body.prepend(sp);
  try { sessionStorage.setItem('lumen.app', JSON.stringify({ name, a: color, logo })); } catch { }

  let hidden = false;
  const hide = () => { if (hidden) return; hidden = true; requestAnimationFrame(() => sp.classList.add('off')); };
  addEventListener('load', () => setTimeout(hide, 80));
  setTimeout(hide, 1200);   // never wait longer than this

  let leaving = false;
  window.lumenExit = (url = '/') => {
    if (leaving) return; leaving = true;
    window.lumenNP?.(null);
    sp.className = 'lsplash pre'; void sp.offsetWidth;   // start invisible, then fade in
    sp.className = 'lsplash';
    setTimeout(() => location.href = url, 300);
  };

  // "Now playing" for the phone remote. The page sets window.lumenWS to its socket.
  let last = '';
  window.lumenNP = np => {
    last = JSON.stringify({ t: 'np', np: np || null });
    const w = window.lumenWS; if (w && w.readyState === 1) w.send(last);
  };
  window.lumenNPResend = () => { const w = window.lumenWS; if (last && w && w.readyState === 1) w.send(last); };
})();
