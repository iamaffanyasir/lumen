#!/bin/bash
# Starts the Lumen launcher full-screen in Brave and restarts it if it closes.
BROWSER=$(command -v brave-browser || command -v chromium-browser || command -v chromium)
for i in $(seq 1 40); do curl -s -o /dev/null http://localhost/ && break; sleep 1; done
while true; do
  "$BROWSER" --kiosk --start-fullscreen --noerrdialogs --disable-infobars --no-first-run \
    --password-store=basic --disable-session-crashed-bubble --hide-crash-restore-bubble \
    --autoplay-policy=no-user-gesture-required --ozone-platform-hint=auto \
    --ignore-gpu-blocklist --enable-gpu-rasterization --enable-zero-copy \
    --check-for-update-interval=31536000 http://localhost/
  sleep 2
done
