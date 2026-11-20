# PPICOLA

Static, client-side image and PDF tools. Files are processed in the browser; no server-side file processing or APIs are needed.

Run `npm install` and `npm run build`, then deploy the generated `out/` directory to a static host. Set `NEXT_PUBLIC_APP_URL` at build time to the deployed origin for correct metadata and sitemap URLs. The build generates a service worker that caches the app and PDF worker for offline use after installation. Offline availability requires a successful initial online load and a secure origin (HTTPS or localhost).

Contact: [bob4rell@gmail.com](mailto:bob4rell@gmail.com). Bug reports: [email us](mailto:bob4rell@gmail.com?subject=PPICOLA%20bug%20report).
