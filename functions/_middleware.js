const COOKIE_NAME = "vg_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 jours

export const onRequest = async ({ request, env, next }) => {
  const expected = env.AUTH_PASSWORD;
  if (!expected) {
    return new Response("AUTH_PASSWORD non configure", { status: 500 });
  }

  const url = new URL(request.url);

  if (url.pathname === "/__login" && request.method === "POST") {
    const form = await request.formData();
    const submitted = form.get("password") || "";
    if (timingSafeEqual(String(submitted), expected)) {
      return new Response(null, {
        status: 302,
        headers: {
          "Location": "/",
          "Set-Cookie": `${COOKIE_NAME}=${encodeURIComponent(expected)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}`,
          "Cache-Control": "no-store",
        },
      });
    }
    return loginPage("Mot de passe incorrect.");
  }

  const cookies = parseCookies(request.headers.get("Cookie") || "");
  if (cookies[COOKIE_NAME] && timingSafeEqual(cookies[COOKIE_NAME], expected)) {
    const res = await next();
    return withCaching(url.pathname, res);
  }

  return loginPage();
};

// The auth middleware runs on every request, which strips the aggressive
// edge-caching Cloudflare normally applies to static assets (everything falls
// back to "max-age=0, must-revalidate"). That made the browser re-download the
// 20 MB Earth texture on every reload. Re-apply sensible caching by file type:
//   - heavy, never-changing binaries (textures, 3D models) → long browser cache
//   - HTML + live fleet data → never cache, always fetch the latest
//   - everything else (js/css) → revalidate (unchanged default)
// "private" keeps it in the user's browser only (these responses are behind the
// password) and out of any shared/edge cache.
function withCaching(pathname, res) {
  const p = pathname.toLowerCase();
  let cacheControl = null;
  if (/\.(jpg|jpeg|png|webp|gif|glb|gltf|bin|hwx|woff2?|ttf|mp4)$/.test(p)) {
    cacheControl = "private, max-age=2592000, immutable"; // 30 jours
  } else if (p === "/" || p.endsWith(".html") || p.endsWith(".json")) {
    cacheControl = "no-store"; // HTML + données flotte : toujours frais
  }
  if (!cacheControl) return res; // js/css/etc. : on ne touche pas
  const headers = new Headers(res.headers);
  headers.set("Cache-Control", cacheControl);
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

function parseCookies(header) {
  const out = {};
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k) {
      try { out[k] = decodeURIComponent(v); } catch { out[k] = v; }
    }
  }
  return out;
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function loginPage(error) {
  const errBlock = error
    ? `<p class="err">${escapeHtml(error)}</p>`
    : "";
  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Vendee Globe - Acces</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<style>
  :root { --rouge:#E30613; --rouge-soft:#ff2c3a; --marine:#0A1F44; --marine-3:#040d24; --ivory:#f6f1e7; --muted:rgba(246,241,231,.55); --line:rgba(246,241,231,.14); --glass:rgba(6,20,51,.55); }
  * { box-sizing: border-box; }
  html, body { margin:0; height:100%; background:var(--marine-3); color:var(--ivory); font-family: 'Inter', system-ui, -apple-system, sans-serif; }
  body { display:flex; align-items:center; justify-content:center; padding:24px; background: radial-gradient(ellipse at 30% 30%, #0a1f44 0%, #040d24 60%, #02071a 100%); }
  .card { width:100%; max-width:380px; background:var(--glass); border:1px solid var(--line); border-radius:14px; padding:32px 28px; backdrop-filter: blur(14px) saturate(140%); box-shadow: 0 20px 60px rgba(0,0,0,.45); }
  .eyebrow { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size:10px; letter-spacing:2px; color:var(--muted); text-transform:uppercase; margin:0 0 6px; }
  h1 { font-family: 'Fraunces', Georgia, serif; font-weight:500; font-size:22px; margin:0 0 18px; letter-spacing:-0.01em; }
  h1 b { color:var(--rouge-soft); font-weight:600; }
  label { display:block; font-size:11px; letter-spacing:1.5px; text-transform:uppercase; color:var(--muted); margin:0 0 8px; font-family: 'JetBrains Mono', ui-monospace, monospace; }
  input[type=password] { width:100%; padding:12px 14px; background:rgba(0,0,0,.25); border:1px solid var(--line); border-radius:8px; color:var(--ivory); font-size:15px; outline:none; transition: border-color .15s; }
  input[type=password]:focus { border-color:var(--rouge-soft); }
  button { width:100%; margin-top:16px; padding:12px 14px; background:var(--rouge); color:#fff; border:none; border-radius:8px; font-size:14px; font-weight:600; letter-spacing:.5px; cursor:pointer; transition: background .15s; }
  button:hover { background:var(--rouge-soft); }
  .err { color:var(--rouge-soft); font-size:13px; margin:12px 0 0; }
  .foot { margin-top:18px; font-size:11px; color:var(--muted); text-align:center; line-height:1.5; }
</style>
</head>
<body>
  <form class="card" method="POST" action="/__login" autocomplete="off">
    <p class="eyebrow">Vendee Globe - Initiatives Coeur</p>
    <h1>Acces <b>restreint</b></h1>
    <label for="pw">Mot de passe</label>
    <input id="pw" name="password" type="password" autofocus required>
    <button type="submit">Entrer</button>
    ${errBlock}
    <p class="foot">Demo privee. Ne pas diffuser le lien ni le mot de passe.</p>
  </form>
</body>
</html>`;
  return new Response(html, {
    status: error ? 401 : 401,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex,nofollow",
    },
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
