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
- **Android app (Lumen Remote):** on your Android phone, open the phone remote → **More → Download the app**, then open the downloaded file and allow installing from your browser. The app finds the TV by itself, your phone's volume buttons control the TV, and voice search uses Android's speech recognition. It shows the same remote as the web page, so Lumen updates reach it automatically. To rebuild it after changing the code in `android/`: `cd android && gradlew assembleDebug`, then copy `app/build/outputs/apk/debug/app-debug.apk` to `web/lumen-remote.apk`.
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
- **Add apps:** edit `web/apps.json`. Each app has a name, a URL, a colour and an icon (a one-colour SVG in `web/icons/`).
- **Arrange apps:** on the TV, open **Settings → Arrange apps**: press OK to pick up an app, ←/→ to move it, OK to drop it, and Back when done. Or use the phone: **More → Arrange apps**.
- **Updates:** push changes to https://github.com/iamaffanyasir/lumen. On the TV open **Settings → Updates → Check for updates**, or on the phone **More → Check for updates**. If there's something new you'll see its release date and release notes, then select **Install update**. Lumen restarts by itself and keeps your settings and wallpapers. The release notes are your commit messages: the first line is the title, and anything below it shows as details. Lumen also installs updates by itself on every boot.
- **New packages in an update:** add a `post-update.sh` file to the repo. It runs automatically after each update.
- **Wi-Fi:** use the Wi-Fi tile or Settings → Wi-Fi. Select a network, then type the password with the phone keyboard.

## Notes
- Netflix and Prime Video may not play in Brave on the Pi, because their DRM isn't supported on Linux ARM.
- Anyone on your Wi-Fi can open the remote. Only use it on a network you trust.
