// Plesk / Phusion Passenger startup file for alemancenter.com.
//
// This is a thin entry that boots the bundled server (dist/index.mjs), which:
//   • serves the static SPA from ./public  (Plesk "Document Root")
//   • handles /api/*  (frontend-key injection, auth cookies, image optimization,
//     reverse-proxy to https://api.alemancenter.com)
//   • serves index.html as the SPA fallback for client-side routes
//
// It listens on process.env.PORT (Plesk/Passenger provides it).
import "./dist/index.mjs";
