# pwa — installable shell (Phase 6)

Empty until Phase 6. Manifest, service worker, icons, `apple-touch-icon`,
`apple-mobile-web-app-capable`.

Depends on TLS working, which Caddy already handles: iOS will not register a
service worker without HTTPS. Two things that will otherwise cost a day each —
iOS ignores `orientation` in the manifest (CSS rotate fallback), and audio
needs a user gesture before it will play.
