#!/bin/bash
# Lumen installer for Raspberry Pi OS (64-bit, Desktop). Run: sudo bash install.sh
set -e
[ "$EUID" -eq 0 ] || exec sudo bash "$0" "$@"
DIR="$(cd "$(dirname "$0")" && pwd)"
U="${SUDO_USER:-$(logname 2>/dev/null || echo pi)}"
H=$(getent passwd "$U" | cut -d: -f6)
say() { echo -e "\n\033[1;35m==> $*\033[0m"; }

say "Fixing Windows line endings"
find "$DIR" -type f \( -name '*.sh' -o -name '*.py' -o -name '*.script' -o -name '*.plymouth' \) -exec sed -i 's/\r$//' {} +
chmod +x "$DIR"/*.sh "$DIR/server/lumen.py"

say "Installing packages"
apt-get update
apt-get install -y python3-aiohttp python3-evdev bluez curl git plymouth plymouth-themes plymouth-label fonts-inter || \
apt-get install -y python3-aiohttp python3-evdev bluez curl git plymouth plymouth-themes plymouth-label

say "Installing Brave"
if ! command -v brave-browser >/dev/null; then
  if [ "$(dpkg --print-architecture)" = "arm64" ]; then
    curl -fsSLo /usr/share/keyrings/brave-browser-archive-keyring.gpg https://brave-browser-apt-release.s3.brave.com/brave-browser-archive-keyring.gpg
    echo "deb [signed-by=/usr/share/keyrings/brave-browser-archive-keyring.gpg] https://brave-browser-apt-release.s3.brave.com/ stable main" > /etc/apt/sources.list.d/brave-browser-release.list
    apt-get update && apt-get install -y brave-browser
  else
    echo "Brave needs 64-bit Pi OS. Using Chromium instead."
  fi
fi

say "Configuring Brave (home page, no popups)"
for d in /etc/brave/policies/managed /etc/chromium/policies/managed; do
  mkdir -p "$d"
  cat > "$d/lumen.json" <<'EOF'
{"HomepageLocation":"http://localhost/","HomepageIsNewTabPage":false,"ShowHomeButton":true,
 "RestoreOnStartup":4,"RestoreOnStartupURLs":["http://localhost/"],"DefaultBrowserSettingEnabled":false,
 "PasswordManagerEnabled":false,"TranslateEnabled":false,"AutoplayAllowed":true,"BrowserSignin":0,
 "BraveRewardsDisabled":true,"BraveWalletDisabled":true,"BraveVPNDisabled":true,"BraveAIChatEnabled":false,"TorDisabled":true}
EOF
done

say "Enabling virtual keyboard/mouse for the phone remote"
echo uinput > /etc/modules-load.d/lumen.conf
modprobe uinput || true

say "Installing Lumen service"
cat > /etc/systemd/system/lumen.service <<EOF
[Unit]
Description=Lumen TV server
After=network-online.target bluetooth.target
Wants=network-online.target

[Service]
Environment=LUMEN_USER=$U
ExecStartPre=-/bin/bash $DIR/update.sh
ExecStart=/usr/bin/python3 $DIR/server/lumen.py
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable lumen
systemctl restart lumen

say "Starting Lumen in kiosk mode on login"
install -d -o "$U" -g "$U" "$H/.config/autostart"
cat > "$H/.config/autostart/lumen.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Lumen
Exec=/bin/bash $DIR/kiosk.sh
X-GNOME-Autostart-enabled=true
EOF
chown "$U:$U" "$H/.config/autostart/lumen.desktop"
raspi-config nonint do_boot_behaviour B4 || true   # auto-login to desktop
raspi-config nonint do_blanking 1 || true          # never blank the screen

say "Setting hostname to lumen (phone remote: http://lumen.local)"
hostnamectl set-hostname lumen
sed -i 's/^127\.0\.1\.1.*/127.0.1.1\tlumen/' /etc/hosts

say "Installing Lumen boot animation"
rm -rf /usr/share/plymouth/themes/lumen
cp -r "$DIR/boot/lumen" /usr/share/plymouth/themes/lumen
BOOT=/boot/firmware; [ -d $BOOT ] || BOOT=/boot
grep -q '^disable_splash=1' $BOOT/config.txt || echo 'disable_splash=1' >> $BOOT/config.txt
for w in quiet splash plymouth.ignore-serial-consoles logo.nologo vt.global_cursor_default=0; do
  grep -qw -- "$w" $BOOT/cmdline.txt || sed -i "1 s/\$/ $w/" $BOOT/cmdline.txt
done
plymouth-set-default-theme -R lumen || echo "Could not rebuild the boot image; boot animation may not show."

say "Done! Rebooting in 5 seconds (Ctrl+C to cancel)"
sleep 5 && reboot
