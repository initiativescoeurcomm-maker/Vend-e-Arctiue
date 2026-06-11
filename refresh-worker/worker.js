// Cloudflare Worker — déclenche le rafraîchissement des positions toutes les 15 min.
//
// Pourquoi : les crons GitHub Actions sont fortement décalés (ils ne tournent pas
// vraiment toutes les 15 min). Ce Worker, lui, a un cron Cloudflare FIABLE : à chaque
// déclenchement il appelle l'API GitHub pour lancer le workflow `refresh-fleet.yml`
// (qui régénère va-fleet.json depuis Geovoile en Chrome headless puis redéploie).
//
// Le jeton GitHub vit comme SECRET du Worker (env.GH_TOKEN) — jamais dans le code.

const OWNER = 'initiativescoeurcomm-maker';
const REPO = 'Vend-e-Arctiue';
const WORKFLOW = 'refresh-fleet.yml';

async function dispatch(env) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW}/dispatches`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.GH_TOKEN}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'va-refresh-cron',
    },
    body: JSON.stringify({ ref: 'main' }),
  });
  // GitHub renvoie 204 No Content en cas de succès.
  return { status: res.status, body: res.status === 204 ? 'ok' : await res.text() };
}

export default {
  // Déclenché par le cron Cloudflare (voir wrangler.toml).
  async scheduled(event, env, ctx) {
    ctx.waitUntil(dispatch(env));
  },
  // Permet aussi un test manuel : ouvrir l'URL du Worker dans le navigateur
  // déclenche un refresh immédiat et affiche le résultat.
  async fetch(request, env) {
    const r = await dispatch(env);
    return new Response(`refresh-fleet dispatch → ${r.status} (${r.body})\n`, {
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  },
};
