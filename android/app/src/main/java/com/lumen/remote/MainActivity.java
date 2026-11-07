package com.lumen.remote;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognizerIntent;
import android.view.HapticFeedbackConstants;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.URL;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Lumen Remote: shows the phone remote served by the Lumen TV, and adds phone-only extras:
 * finds the TV on the Wi-Fi, volume buttons control the TV, real voice search, file uploads.
 */
public class MainActivity extends Activity {
    private static final String SETUP = "file:///android_asset/setup.html";
    private static final int REQ_VOICE = 1, REQ_FILE = 2;

    private WebView web;
    private SharedPreferences prefs;
    private ValueCallback<Uri[]> fileCallback;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private volatile boolean scanning = false;
    private boolean onRemote = false, autoRescanned = false;

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        prefs = getSharedPreferences("lumen", MODE_PRIVATE);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.parseColor("#05060F"));
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#05060F"));
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);

        // Keep the page clear of the status bar, navigation bar and keyboard.
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            if (android.os.Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                android.graphics.Insets ime = insets.getInsets(WindowInsets.Type.ime());
                v.setPadding(bars.left, bars.top, bars.right, Math.max(bars.bottom, ime.bottom));
                return WindowInsets.CONSUMED;
            }
            v.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                         insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets.consumeSystemWindowInsets();
        });
        if (android.os.Build.VERSION.SDK_INT < 30) {   // older Android: draw behind the bars ourselves so insets apply
            root.setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        } else {
            getWindow().setDecorFitsSystemWindows(false);
        }

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setSupportZoom(false);
        s.setTextZoom(100);
        s.setUserAgentString(s.getUserAgentString() + " LumenRemote/1.0");
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.addJavascriptInterface(new Bridge(), "LumenNative");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                String host = prefs.getString("host", "");
                boolean ours = "file".equals(u.getScheme()) || (u.getHost() != null && u.getHost().equals(host));
                if (ours) return false;
                openExternal(u);   // e.g. google.com/device for YouTube sign-in
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                onRemote = url != null && url.startsWith("http");
                if (onRemote) autoRescanned = false;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest req, WebResourceError err) {
                if (!req.isForMainFrame()) return;
                onRemote = false;
                // The TV may have a new address: search once, otherwise show the setup screen.
                if (!autoRescanned) { autoRescanned = true; showSetup(); ui.postDelayed(() -> scan(), 300); }
                else showSetup();
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> cb, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = cb;
                try {
                    Intent i = params.createIntent();
                    if (params.getMode() == FileChooserParams.MODE_OPEN_MULTIPLE) i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                    startActivityForResult(i, REQ_FILE);
                } catch (ActivityNotFoundException e) {
                    fileCallback = null; return false;
                }
                return true;
            }
        });

        String host = prefs.getString("host", "");
        if (host.isEmpty()) { showSetup(); ui.postDelayed(this::scan, 300); }
        else loadRemote(host);
    }

    private void loadRemote(String host) { web.loadUrl("http://" + host + "/remote"); }

    private void showSetup() { onRemote = false; web.loadUrl(SETUP); }

    private void js(String code) { ui.post(() -> web.evaluateJavascript(code, null)); }

    private void setupStatus(String state, String msg) {
        js("window.setupStatus && setupStatus(" + JSONObject.quote(state) + "," + JSONObject.quote(msg) + ")");
    }

    private void openExternal(Uri u) {
        try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (ActivityNotFoundException ignored) { }
    }

    /* ---------- finding the TV ---------- */

    /** Asks a host for Lumen's /api/info. Returns the TV's IP address, or null if it isn't Lumen. */
    private static String probe(String host, int timeoutMs) {
        HttpURLConnection c = null;
        try {
            c = (HttpURLConnection) new URL("http://" + host + "/api/info").openConnection();
            c.setConnectTimeout(timeoutMs); c.setReadTimeout(timeoutMs * 2);
            if (c.getResponseCode() != 200) return null;
            StringBuilder b = new StringBuilder();
            try (BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream()))) {
                String line; while ((line = r.readLine()) != null && b.length() < 4000) b.append(line);
            }
            JSONObject j = new JSONObject(b.toString());
            if (!j.has("ipUrl")) return null;
            String ip = j.optString("ip", "");
            return ip.isEmpty() || ip.startsWith("127.") ? host : ip;
        } catch (Exception e) {
            return null;
        } finally {
            if (c != null) c.disconnect();
        }
    }

    private static List<String> subnetHosts() {
        List<String> out = new ArrayList<>();
        try {
            for (NetworkInterface ni : Collections.list(NetworkInterface.getNetworkInterfaces())) {
                if (!ni.isUp() || ni.isLoopback()) continue;
                for (InetAddress a : Collections.list(ni.getInetAddresses())) {
                    if (!(a instanceof Inet4Address) || !a.isSiteLocalAddress()) continue;
                    String ip = a.getHostAddress(), base = ip.substring(0, ip.lastIndexOf('.') + 1);
                    for (int i = 1; i < 255; i++) { String h = base + i; if (!h.equals(ip) && !out.contains(h)) out.add(h); }
                }
            }
        } catch (Exception ignored) { }
        return out;
    }

    private void scan() {
        if (scanning) return;
        scanning = true;
        setupStatus("scan", "Looking for your Lumen TV…");
        new Thread(() -> {
            AtomicReference<String> found = new AtomicReference<>();
            String saved = prefs.getString("host", "");
            for (String h : new String[]{saved, "lumen.local"}) {
                if (h.isEmpty() || found.get() != null) continue;
                String ip = probe(h, 1500); if (ip != null) found.set(ip);
            }
            if (found.get() == null) {
                List<String> hosts = subnetHosts();
                ExecutorService pool = Executors.newFixedThreadPool(48);
                for (String h : hosts) pool.execute(() -> {
                    if (found.get() != null) return;
                    String ip = probe(h, 700); if (ip != null) found.compareAndSet(null, ip);
                });
                pool.shutdown();
                try { pool.awaitTermination(25, TimeUnit.SECONDS); } catch (InterruptedException ignored) { }
                pool.shutdownNow();
            }
            scanning = false;
            String ip = found.get();
            if (ip != null) {
                prefs.edit().putString("host", ip).apply();
                setupStatus("found", "Found Lumen at " + ip);
                ui.postDelayed(() -> loadRemote(ip), 500);
            } else {
                setupStatus("fail", "Couldn't find Lumen. Make sure this phone is on the same Wi-Fi as the TV and the TV is on.");
            }
        }).start();
    }

    /* ---------- JavaScript bridge (used by the remote page and the setup screen) ---------- */

    private class Bridge {
        @JavascriptInterface public void scan() { MainActivity.this.scan(); }

        @JavascriptInterface public void connect(String host) {
            String h = host.trim().replaceFirst("^https?://", "").replaceAll("/.*$", "");
            if (h.isEmpty()) return;
            setupStatus("scan", "Connecting to " + h + "…");
            new Thread(() -> {
                String ip = probe(h, 3000);
                if (ip == null) { setupStatus("fail", "No Lumen TV answered at " + h + "."); return; }
                prefs.edit().putString("host", ip).apply();
                ui.post(() -> loadRemote(ip));
            }).start();
        }

        @JavascriptInterface public void changeTv() { ui.post(() -> { prefs.edit().remove("host").apply(); showSetup(); ui.postDelayed(MainActivity.this::scan, 300); }); }

        @JavascriptInterface public String host() { return prefs.getString("host", ""); }

        @JavascriptInterface public void voice() {
            ui.post(() -> {
                Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                i.putExtra(RecognizerIntent.EXTRA_PROMPT, "Search YouTube on the TV");
                try { startActivityForResult(i, REQ_VOICE); }
                catch (ActivityNotFoundException e) { js("window.lumenApp && lumenApp.toast('Voice search is not available on this phone')"); }
            });
        }

        @JavascriptInterface public void copy(String text) {
            ClipboardManager cm = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
            if (cm != null) cm.setPrimaryClip(ClipData.newPlainText("Lumen", text));
        }

        @JavascriptInterface public void buzz() {
            ui.post(() -> web.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP));
        }
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req == REQ_VOICE && res == RESULT_OK && data != null) {
            ArrayList<String> r = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
            if (r != null && !r.isEmpty()) js("window.lumenApp && lumenApp.voiceResult(" + JSONObject.quote(r.get(0)) + ")");
        } else if (req == REQ_FILE && fileCallback != null) {
            fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(res, data));
            fileCallback = null;
        }
    }

    /* ---------- phone buttons ---------- */

    @Override
    public boolean onKeyDown(int code, KeyEvent e) {
        if (onRemote && (code == KeyEvent.KEYCODE_VOLUME_UP || code == KeyEvent.KEYCODE_VOLUME_DOWN)) {
            js("window.lumenApp && lumenApp.vol('" + (code == KeyEvent.KEYCODE_VOLUME_UP ? "up" : "down") + "')");
            return true;   // change the TV volume, not the phone's
        }
        return super.onKeyDown(code, e);
    }

    @Override
    public boolean onKeyUp(int code, KeyEvent e) {
        if (onRemote && (code == KeyEvent.KEYCODE_VOLUME_UP || code == KeyEvent.KEYCODE_VOLUME_DOWN)) return true;
        return super.onKeyUp(code, e);
    }

    @Override
    public void onBackPressed() {
        if (!onRemote) { super.onBackPressed(); return; }
        // Let the page close a sheet or sub-screen first; leave the app only when there is nothing to close.
        web.evaluateJavascript("window.lumenApp ? lumenApp.back() : false", v -> {
            if (!"true".equals(v)) moveTaskToBack(true);
        });
    }

    @Override protected void onResume() { super.onResume(); web.onResume(); }
    @Override protected void onPause() { web.onPause(); super.onPause(); }
}
