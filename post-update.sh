#!/bin/bash
# Runs as root after every update (and at the end of install.sh). Must be safe to run many times.
DIR="$(cd "$(dirname "$0")" && pwd)"
U=$(stat -c %U "$DIR")
H=$(getent passwd "$U" | cut -d: -f6)

# Boot straight into Lumen: no desktop icons, no taskbar. While Brave starts,
# show the Lumen logo on a dark screen instead of the Pi desktop.
command -v swaybg >/dev/null || timeout 300 apt-get install -y swaybg
install -d -o "$U" -g "$U" "$H/.config/labwc"
cat > "$H/.config/labwc/autostart" <<EOF
swaybg -c '#07080f' -i $DIR/web/splash.png -m center >/dev/null 2>&1 &
/usr/bin/kanshi >/dev/null 2>&1 &
/bin/bash $DIR/kiosk.sh >/dev/null 2>&1 &
EOF
chown "$U:$U" "$H/.config/labwc/autostart"
rm -f "$H/.config/autostart/lumen.desktop"   # kiosk now starts from the labwc autostart above
echo "post-update done"
