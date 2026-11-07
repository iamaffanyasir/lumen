# Lumen privacy policy

Lumen is a personal TV launcher that runs on your own Raspberry Pi. It is not an online service.

## What Lumen accesses
- If you sign in to YouTube, Lumen asks Google for **read-only** access to your YouTube account (`youtube.readonly`). It uses this only to show your subscriptions, liked videos and playlists on your TV.
- Lumen keeps a list of videos you watched on the TV so it can offer "Continue watching" and suggestions.

## Where your data is kept
- Everything stays on your Raspberry Pi, in the `data/` folder. Nothing is sent to the Lumen developer or any other server, except the requests your TV makes directly to Google/YouTube to show videos.
- Lumen never sees or stores your Google password. You sign in on Google's own page.

## Removing your data
- Sign out in Lumen (phone remote → Sign in → YouTube → Sign out). This deletes the sign-in token from the Pi and asks Google to revoke it.
- You can also remove Lumen's access at https://myaccount.google.com/permissions.
- Deleting the `data/` folder on the Pi removes your watch history and settings.

## Contact
Open an issue at https://github.com/iamaffanyasir/lumen/issues.
