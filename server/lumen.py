#!/usr/bin/env python3
"""Lumen TV backend: serves the launcher, the phone remote, and system APIs."""
import asyncio, json, os, pwd, re, socket, subprocess
from pathlib import Path
from aiohttp import web

ROOT = Path(__file__).resolve().parent.parent
WEB, DATA = ROOT / "web", ROOT / "data"
WALL = DATA / "wallpapers"
WALL.mkdir(parents=True, exist_ok=True)
SETTINGS = DATA / "settings.json"
USER = os.environ.get("LUMEN_USER", "pi")
PORT = int(os.environ.get("LUMEN_PORT", "80"))
IMG = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
DEFAULTS = {"v": 2, "wallpaper": "none", "saverOn": True, "screensaver": "clock", "saverMinutes": 5, "clock12": True,
            "city": "Delhi", "country": "India", "school": 1, "method": 1, "ytKey": "", "region": "IN"}


def load_settings():
    try:
        s = json.loads(SETTINGS.read_text())
    except Exception:
        s = {}
    if s and s.get("v", 1) < 2:          # one-time move to the new defaults (no wallpaper)
        s.update(v=2, wallpaper="none"); SETTINGS.write_text(json.dumps(s, indent=2))
    return {**DEFAULTS, **s}


# ---------- virtual keyboard + mouse (works system-wide via /dev/uinput) ----------
try:
    from evdev import UInput, ecodes as E

    CH = {}
    for c in "abcdefghijklmnopqrstuvwxyz":
        k = getattr(E, "KEY_" + c.upper()); CH[c] = (k, 0); CH[c.upper()] = (k, 1)
    for c, s in zip("1234567890", "!@#$%^&*()"):
        k = getattr(E, "KEY_" + c); CH[c] = (k, 0); CH[s] = (k, 1)
    for plain, shift, name in [("-", "_", "MINUS"), ("=", "+", "EQUAL"), ("[", "{", "LEFTBRACE"),
                               ("]", "}", "RIGHTBRACE"), ("\\", "|", "BACKSLASH"), (";", ":", "SEMICOLON"),
                               ("'", '"', "APOSTROPHE"), (",", "<", "COMMA"), (".", ">", "DOT"),
                               ("/", "?", "SLASH"), ("`", "~", "GRAVE")]:
        k = getattr(E, "KEY_" + name); CH[plain] = (k, 0); CH[shift] = (k, 1)
    CH.update({" ": (E.KEY_SPACE, 0), "\n": (E.KEY_ENTER, 0), "\t": (E.KEY_TAB, 0)})
    NAMED = {"UP": E.KEY_UP, "DOWN": E.KEY_DOWN, "LEFT": E.KEY_LEFT, "RIGHT": E.KEY_RIGHT,
             "ENTER": E.KEY_ENTER, "ESC": E.KEY_ESC, "BACKSPACE": E.KEY_BACKSPACE, "TAB": E.KEY_TAB,
             "SPACE": E.KEY_SPACE, "PLAYPAUSE": E.KEY_PLAYPAUSE, "F11": E.KEY_F11, "F": E.KEY_F}
    MODS = {E.KEY_LEFTSHIFT, E.KEY_LEFTALT, E.KEY_LEFTCTRL, E.KEY_HOME}
    KBD = UInput({E.EV_KEY: sorted({k for k, _ in CH.values()} | set(NAMED.values()) | MODS)}, name="Lumen Keyboard")
    MOUSE = UInput({E.EV_KEY: [E.BTN_LEFT, E.BTN_RIGHT],
                    E.EV_REL: [E.REL_X, E.REL_Y, E.REL_WHEEL, E.REL_HWHEEL]}, name="Lumen Mouse")
except Exception as ex:  # lets you run the UI on a PC for testing
    print("Input injection disabled:", ex)
    KBD = MOUSE = None


def tap(key, mods=()):
    if not KBD:
        return
    for m in mods: KBD.write(E.EV_KEY, m, 1)
    KBD.write(E.EV_KEY, key, 1); KBD.syn()
    KBD.write(E.EV_KEY, key, 0)
    for m in mods: KBD.write(E.EV_KEY, m, 0)
    KBD.syn()


def as_user(*cmd):
    uid = pwd.getpwnam(USER).pw_uid
    return subprocess.run(["runuser", "-u", USER, "--", "env", f"XDG_RUNTIME_DIR=/run/user/{uid}", *cmd],
                          capture_output=True, text=True, timeout=5).stdout


def volume(d):
    if d == "mute":
        as_user("wpctl", "set-mute", "@DEFAULT_AUDIO_SINK@", "toggle")
    else:
        as_user("wpctl", "set-volume", "-l", "1.0", "@DEFAULT_AUDIO_SINK@", "5%+" if d == "up" else "5%-")


def handle(m):
    t = m.get("t")
    if t == "move" and MOUSE:
        MOUSE.write(E.EV_REL, E.REL_X, int(m["x"])); MOUSE.write(E.EV_REL, E.REL_Y, int(m["y"])); MOUSE.syn()
    elif t == "scroll" and MOUSE:
        MOUSE.write(E.EV_REL, E.REL_WHEEL, int(m.get("y", 0)))
        MOUSE.write(E.EV_REL, E.REL_HWHEEL, int(m.get("x", 0))); MOUSE.syn()
    elif t == "click" and MOUSE:
        b = E.BTN_RIGHT if m.get("b") == "right" else E.BTN_LEFT
        MOUSE.write(E.EV_KEY, b, 1); MOUSE.syn(); MOUSE.write(E.EV_KEY, b, 0); MOUSE.syn()
    elif t == "key" and KBD:
        k = m.get("k")
        if k == "HOME": tap(E.KEY_HOME, [E.KEY_LEFTALT])      # browser home page = Lumen
        elif k == "BACK": tap(E.KEY_LEFT, [E.KEY_LEFTALT])    # browser back
        elif k in NAMED: tap(NAMED[k])
    elif t == "text" and KBD:
        for ch in str(m.get("s", ""))[:500]:
            if ch in CH:
                k, s = CH[ch]; tap(k, [E.KEY_LEFTSHIFT] if s else [])
    elif t == "vol":
        volume(m.get("d"))


# ---------- helpers ----------
async def run(*cmd, timeout=30, code=False):
    p = await asyncio.create_subprocess_exec(*cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT)
    try:
        out, _ = await asyncio.wait_for(p.communicate(), timeout)
    except asyncio.TimeoutError:
        p.kill(); out = b"timed out"
    out = out.decode(errors="ignore")
    return (p.returncode, out) if code else out


def local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]; s.close(); return ip
    except Exception:
        return "127.0.0.1"


# ---------- routes ----------
async def index(req):
    # The TV (localhost) gets the launcher; phones on Wi-Fi get the remote.
    page = "index.html" if req.remote in ("127.0.0.1", "::1") else "remote.html"
    return web.FileResponse(WEB / page, headers={"Cache-Control": "no-cache"})


async def page(name):
    async def h(req): return web.FileResponse(WEB / name, headers={"Cache-Control": "no-cache"})
    return h


async def get_settings(req): return web.json_response(load_settings())


async def post_settings(req):
    s = load_settings(); s.update(await req.json())
    SETTINGS.write_text(json.dumps(s, indent=2)); return web.json_response(s)


async def info(req):
    host = socket.gethostname()
    _, ver = await run("git", "-c", f"safe.directory={ROOT}", "-C", str(ROOT), "log", "-1", "--format=%h · %cd", "--date=format:%d %b %Y", code=True)
    return web.json_response({"version": ver.strip() or "unknown", "host": host, "ip": local_ip(), "url": f"http://{host}.local", "ipUrl": f"http://{local_ip()}"})


async def wallpapers(req):
    return web.json_response(sorted(f.name for f in WALL.iterdir() if f.suffix.lower() in IMG))


async def upload(req):
    field = await (await req.multipart()).next()
    name = re.sub(r"[^\w.-]", "_", Path(field.filename or "photo.jpg").name)
    if Path(name).suffix.lower() not in IMG: name += ".jpg"
    with open(WALL / name, "wb") as f:
        while chunk := await field.read_chunk(): f.write(chunk)
    return web.json_response({"name": name})


async def bt_list(req=None):
    devs = {}
    for kind in ("", "Paired", "Connected"):
        for line in (await run("bluetoothctl", "devices", *([kind] if kind else []), timeout=8)).splitlines():
            p = line.strip().split(" ", 2)
            if len(p) == 3 and p[0] == "Device":
                d = devs.setdefault(p[1], {"mac": p[1], "name": p[2], "paired": False, "connected": False})
                if kind: d[kind.lower()] = True
    return web.json_response(sorted(devs.values(), key=lambda d: (not d["connected"], not d["paired"], d["name"])))


async def bt_scan(req):
    await run("rfkill", "unblock", "bluetooth"); await run("bluetoothctl", "power", "on")
    await run("bluetoothctl", "--timeout", "10", "scan", "on", timeout=15)
    return await bt_list()


async def bt_action(req):
    b = await req.json(); mac, act = b.get("mac", ""), b.get("action")
    steps = {"connect": ["pair", "trust", "connect"], "disconnect": ["disconnect"], "remove": ["remove"]}
    if not re.fullmatch(r"([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}", mac) or act not in steps:
        raise web.HTTPBadRequest()
    log = "".join([await run("bluetoothctl", s, mac, timeout=25) for s in steps[act]])
    return web.json_response({"ok": "Connection successful" in log or act != "connect", "log": log[-400:]})


async def power(req):
    cmds = {"off": ["systemctl", "poweroff"], "reboot": ["systemctl", "reboot"], "restart-ui": ["pkill", "-f", "brave|chromium"]}
    a = (await req.json()).get("action")
    if a not in cmds: raise web.HTTPBadRequest()
    asyncio.get_running_loop().call_later(1.5, subprocess.Popen, cmds[a])
    return web.json_response({"ok": True})


# ---------- one-click update from GitHub ----------
UPD = {"state": "idle", "pct": 0, "msg": ""}


def git(*a, timeout=90):
    # Run git as the folder's owner so updated files keep the right owner.
    return run("runuser", "-u", USER, "--", "git", "-C", str(ROOT), *a, timeout=timeout, code=True)


async def do_update():
    def st(state, pct, msg): UPD.update(state=state, pct=pct, msg=msg)
    try:
        if not (ROOT / ".git").exists():
            return st("error", 0, "Lumen wasn't installed with git clone, so it can't update itself.")
        st("running", 10, "Checking for updates…")
        rc, out = await git("fetch", "--quiet")
        if rc: return st("error", 0, "Couldn't reach GitHub. Check your Wi-Fi connection.")
        st("running", 40, "Downloading update…")
        _, local = await git("rev-parse", "HEAD")
        rc, remote = await git("rev-parse", "@{u}")
        if rc: return st("error", 0, "No GitHub branch is set for this folder.")
        if local.strip() == remote.strip(): return st("done", 100, "Lumen is already up to date.")
        st("running", 65, "Installing update…")
        rc, out = await git("reset", "--hard", "@{u}")   # your settings in data/ are untouched
        if rc: return st("error", 0, "Update failed: " + out[-200:])
        if (ROOT / "post-update.sh").exists():          # optional hook for new packages etc.
            st("running", 80, "Finishing setup…")
            await run("bash", str(ROOT / "post-update.sh"), timeout=900)
        st("restarting", 92, "Restarting Lumen…")
        asyncio.get_running_loop().call_later(1.5, subprocess.Popen, ["systemctl", "restart", "lumen"])
    except Exception as ex:
        st("error", 0, str(ex))


async def update(req):
    if UPD["state"] not in ("running", "restarting"):
        UPD.update(state="running", pct=3, msg="Starting…")
        asyncio.create_task(do_update())
    return web.json_response(UPD)


async def update_status(req): return web.json_response(UPD)


# ---------- Wi-Fi (NetworkManager) ----------
def nm_fields(line):
    return [f.replace("\\:", ":") for f in re.split(r"(?<!\\):", line)]


async def wifi_list(req=None, rescan="no"):
    out = await run("nmcli", "-t", "-f", "IN-USE,SSID,SIGNAL,SECURITY", "dev", "wifi", "list", "--rescan", rescan, timeout=25)
    nets = {}
    for line in out.splitlines():
        f = nm_fields(line)
        if len(f) < 4 or not f[1]: continue
        n = {"ssid": f[1], "signal": int(f[2] or 0), "secure": f[3] not in ("", "--"), "active": f[0] == "*"}
        if n["ssid"] not in nets or n["active"] or n["signal"] > nets[n["ssid"]]["signal"]:
            nets[n["ssid"]] = n
    return web.json_response(sorted(nets.values(), key=lambda n: (not n["active"], -n["signal"])))


async def wifi_scan(req): return await wifi_list(rescan="yes")


async def wifi_connect(req):
    b = await req.json(); ssid, pw = b.get("ssid", ""), b.get("password", "")
    if not ssid: raise web.HTTPBadRequest()
    rc, out = await run("nmcli", "dev", "wifi", "connect", ssid, *(["password", pw] if pw else []), timeout=45, code=True)
    if rc and not pw:  # saved network: try its stored password
        rc, out = await run("nmcli", "con", "up", "id", ssid, timeout=45, code=True)
    return web.json_response({"ok": rc == 0, "msg": "Connected" if rc == 0 else out.strip()[-200:]})


async def wifi_forget(req):
    ssid = (await req.json()).get("ssid", "")
    await run("nmcli", "con", "delete", "id", ssid, timeout=15)
    return web.json_response({"ok": True})


# ---------- tech news (RSS + Hacker News), cached for 30 minutes ----------
NEWS = {"t": 0, "items": []}
FEEDS = [("The Verge", "https://www.theverge.com/rss/tech/index.xml"),
         ("TechCrunch", "https://techcrunch.com/feed/"),
         ("Ars Technica", "https://feeds.arstechnica.com/arstechnica/technology-lab")]


def _ts(text):
    from email.utils import parsedate_to_datetime
    from datetime import datetime
    try: return parsedate_to_datetime(text).timestamp()
    except Exception: pass
    try: return datetime.fromisoformat(text.replace("Z", "+00:00")).timestamp()
    except Exception: return 0


async def news(req):
    import time, xml.etree.ElementTree as ET
    from aiohttp import ClientSession, ClientTimeout
    if NEWS["items"] and time.time() - NEWS["t"] < 1800:
        return web.json_response(NEWS["items"])
    items = []
    async with ClientSession(timeout=ClientTimeout(total=15), headers={"User-Agent": "Lumen/1.0"}) as http:
        for src, url in FEEDS:
            try:
                root = ET.fromstring(await (await http.get(url)).read())
                for it in root.iter():
                    if it.tag.split("}")[-1] not in ("item", "entry"): continue
                    f = {c.tag.split("}")[-1]: (c.text or "").strip() for c in it}
                    if f.get("title"):
                        items.append({"title": f["title"], "source": src, "ts": _ts(f.get("pubDate") or f.get("published") or f.get("updated", ""))})
            except Exception as ex:
                print("news:", src, ex)
        try:
            j = await (await http.get("https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=12")).json()
            items += [{"title": h["title"], "source": "Hacker News", "ts": h.get("created_at_i", 0), "trend": True} for h in j.get("hits", [])]
        except Exception as ex:
            print("news: hn", ex)
    seen, out = set(), []
    for i in sorted(items, key=lambda i: -i["ts"]):
        if i["title"].lower() not in seen: seen.add(i["title"].lower()); out.append(i)
    if out: NEWS.update(t=time.time(), items=out[:30])
    return web.json_response(NEWS["items"])


@web.middleware
async def no_cache(req, handler):
    resp = await handler(req)
    resp.headers["Cache-Control"] = "no-cache"   # TV always loads the newest files after an update
    return resp


TV_SOCKETS = set()   # Lumen pages open on the TV; they receive voice/text searches from the phone


async def ws_handler(req):
    ws = web.WebSocketResponse(heartbeat=20); await ws.prepare(req)
    is_tv = req.query.get("tv") == "1"
    if is_tv: TV_SOCKETS.add(ws)
    try:
        async for msg in ws:
            try:
                m = json.loads(msg.data)
                if m.get("t") == "search":
                    q = str(m.get("q", "")).strip()[:200]
                    for tv in list(TV_SOCKETS):
                        await tv.send_json({"t": "search", "q": q})
                    await ws.send_json({"t": "note", "msg": "Searching on TV…" if TV_SOCKETS else "Go to the Lumen home screen on the TV first."})
                elif m.get("t") == "vol": await asyncio.to_thread(handle, m)
                else: handle(m)
            except Exception as ex:
                print("remote:", ex)
    finally:
        TV_SOCKETS.discard(ws)
    return ws


async def main_app():
    app = web.Application(client_max_size=50 * 1024 ** 2, middlewares=[no_cache])
    r = app.router
    r.add_get("/", index)
    r.add_get("/tv", await page("index.html"))
    r.add_get("/remote", await page("remote.html"))
    r.add_get("/ws", ws_handler)
    r.add_get("/api/settings", get_settings); r.add_post("/api/settings", post_settings)
    r.add_get("/api/info", info); r.add_get("/api/news", news)
    r.add_get("/api/wallpapers", wallpapers); r.add_post("/api/wallpaper", upload)
    r.add_get("/api/bt", bt_list); r.add_post("/api/bt/scan", bt_scan); r.add_post("/api/bt/action", bt_action)
    r.add_post("/api/power", power)
    r.add_post("/api/update", update); r.add_get("/api/update", update_status)
    r.add_get("/api/wifi", wifi_list); r.add_post("/api/wifi/scan", wifi_scan)
    r.add_post("/api/wifi/connect", wifi_connect); r.add_post("/api/wifi/forget", wifi_forget)
    r.add_static("/s/", WEB); r.add_static("/wallpapers/", WALL)
    return app


if __name__ == "__main__":
    web.run_app(main_app(), port=PORT)
