# Auto-refresh fiable des positions (Cloudflare Worker)

Ce petit Worker Cloudflare a un **cron fiable** (toutes les 15 min) qui déclenche le
workflow GitHub `refresh-fleet.yml` — lequel régénère `va-fleet.json` depuis Geovoile
puis redéploie le site. Il remplace le cron GitHub (trop irrégulier) pour garantir des
positions toujours fraîches sur le site déployé.

Le jeton GitHub reste **dans ton compte Cloudflare** (secret du Worker), jamais dans le
dépôt ni le code.

## Installation (3 étapes, ~5 min)

### 1) Créer un jeton GitHub à portée minimale
- GitHub → Settings → Developer settings → **Fine-grained tokens** → *Generate new token*.
- **Resource owner** : `initiativescoeurcomm-maker`
- **Repository access** : *Only select repositories* → **`Vend-e-Arctiue`**
- **Permissions** → Repository permissions → **Actions : Read and write**
  (c'est tout ce qu'il faut pour lancer le workflow ; « Metadata: Read » est inclus d'office).
- Expiration : au choix (penser à le renouveler).
- Copier le jeton (`github_pat_…`).

### 2) Déployer le Worker + y mettre le jeton
Depuis ce dossier `refresh-worker/` :
```bash
npx wrangler@4 deploy                 # crée/déploie le Worker "va-refresh-cron"
npx wrangler@4 secret put GH_TOKEN    # coller le jeton GitHub quand demandé
```
(wrangler est déjà connecté en OAuth localement — même compte que le site Pages.)

### 3) Vérifier
- Ouvrir l'URL du Worker affichée par `wrangler deploy`
  (ex. `https://va-refresh-cron.<sous-domaine>.workers.dev`) :
  elle doit afficher `refresh-fleet dispatch → 204 (ok)` et lancer un refresh.
- Vérifier dans GitHub → Actions qu'un run `refresh-fleet` démarre.
- Ensuite le cron (15 min) s'en charge tout seul, de façon fiable.

## Notes
- Pour changer la fréquence : éditer `crons` dans `wrangler.toml` puis redéployer.
- Logs en direct : `npx wrangler@4 tail va-refresh-cron`.
