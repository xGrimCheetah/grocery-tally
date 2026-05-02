# Grocery Tally (PWA)

Personal grocery list app. Installs on iPhone via Safari → Add to Home Screen, works offline via Service Worker.

- Current build: v1.27.0
- Changelog: see `CHANGELOG.md`

### Deploying on GitHub Pages (project site)

1. Create repo (e.g., `grocery-tally`). Upload all files at the repo root.
2. Add an empty file named `.nojekyll` (included here).
3. Settings → Pages → Source: Deploy from a branch; Branch: main, Folder: /.
4. Open `https://<username>.github.io/<repo>/` in Safari, then Add to Home Screen.

### Updating

- Edit files → commit → Pages redeploys.
- To force updates on devices, bump `APP_VERSION` in `index.html` and the version in `version.json`.

> Note: This is a single-file PWA app with inline UI and logic in `index.html`, supported by a versioned service worker.
