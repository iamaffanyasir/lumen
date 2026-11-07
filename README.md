# Lumen

A TV launcher for the Raspberry Pi 4. It has a full-screen home screen, a custom YouTube skin, and Brave for ad blocking. You control it from your phone with a remote, a touchpad and a keyboard.

## Install
1. Use **Raspberry Pi Imager** to flash **Raspberry Pi OS (64-bit)** with the desktop. In the Imager settings, set a username and password, add your Wi-Fi, and turn on SSH.
2. Boot the Pi and connect from your PC: `ssh <user>@raspberrypi.local`
3. Download Lumen and install it:
   ```
   sudo apt install -y git
   git clone https://github.com/iamaffanyasir/lumen.git ~/Lumen
   cd ~/Lumen && sudo bash install.sh
   ```
4. The Pi reboots into Lumen.

## Use
- **Phone remote:** open `http://lumen.local` on your phone, which must be on the same Wi-Fi. If that address doesn't load, use the IP address shown under Settings → Phone remote.
- **YouTube:** needs a free YouTube Data API key. Paste it on the phone remote under More → YouTube API key.
  1. Go to https://console.cloud.google.com and sign in. Create a project, for example "Lumen".
  2. Open **APIs & Services → Library**, search for **YouTube Data API v3**, and select **Enable**.
  3. Open **APIs & Services → Credentials**, then **Create credentials → API key**, and copy the key.
  4. Optional but recommended: edit the key, then under **API restrictions** choose YouTube Data API v3.
  The free daily limit is about 100 searches. Browsing the home rows uses very little of it.
- **Sign in to YouTube (with your phone):** on the phone remote, open **Sign in → YouTube**. The first time, it walks you through a one-time setup: in the same Google Cloud project, set up the **OAuth consent screen** (External, then **Publish app** so the sign-in doesn't expire after 7 days), and create an **OAuth client ID** of type **TVs and Limited Input devices**. Paste the client ID and secret into the remote. After that, tap **Get sign-in code**, open google.com/device on your phone and enter the code. YouTube on the TV then shows your subscriptions, liked videos and playlists, and the API key becomes optional. Google may warn that the app isn't verified. That's expected for your own project: choose **Advanced → Continue**.
- **YouTube history and suggestions:** Google doesn't share your real watch history with apps. Lumen keeps its own history of what you watch on the TV. It powers **Continue watching** (resumes where you stopped), **Recently watched** and **Suggested for you**.
- **Sign in to other apps:** on the phone remote, open **Sign in** and pick an app. The TV opens that app's sign-in page. Use the small touchpad to tap the email box, then send your email and password from the phone.
- **Music and Videos:** put files in `~/Music` and `~/Videos` on the Pi, plug in a USB drive, or upload from the phone (**More → Add music / Add videos**). Folders become albums or rows. Videos resume where you left off. MP4 (H.264) and WebM play best. Some MKV files and HEVC/H.265 videos may not play in the browser.
- **Now playing on the phone:** while YouTube, Music or Videos plays, the Remote tab shows the title, a seek bar and controls. For YouTube you also get captions (on/off, language, text size), speed and quality.
- **Voice search:** on the phone remote, tap the microphone next to the search bar, then tap the 🎤 on your phone's keyboard and speak.
- **Add apps:** edit `web/apps.json`. Each app has a name, a URL, two colours and an icon.
- **Updates:** push changes to https://github.com/iamaffanyasir/lumen. To install them, select the **Update** tile on the TV, or **More → Update Lumen** on the phone. A progress bar shows while it updates, then Lumen restarts by itself. It also checks for updates on every boot. Your settings and wallpapers are kept.
- **New packages in an update:** add a `post-update.sh` file to the repo. It runs automatically after each update.
- **Wi-Fi:** use the Wi-Fi tile or Settings → Wi-Fi. Select a network, then type the password with the phone keyboard.

## Notes
- Netflix and Prime Video may not play in Brave on the Pi, because their DRM isn't supported on Linux ARM.
- Anyone on your Wi-Fi can open the remote. Only use it on a network you trust.
