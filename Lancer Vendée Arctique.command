#!/bin/bash
# Double-cliquez ce fichier pour lancer l'application Vendée Arctique en local.
#  1) récupère les dernières positions de toute la flotte depuis Geovoile,
#  2) démarre le serveur local et ouvre le navigateur (http://localhost:8765).
# Laissez cette fenêtre ouverte pendant l'utilisation ; fermez-la pour arrêter.

cd "$(dirname "$0")" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

# --- 1) Mise à jour des données Geovoile (best-effort) ---
NODE_BIN="$(command -v node)"
[ -x "$NODE_BIN" ] || NODE_BIN="/opt/homebrew/bin/node"
[ -x "$NODE_BIN" ] || NODE_BIN="/usr/local/bin/node"
if [ -x "$NODE_BIN" ]; then
  echo "→ Récupération des données de course chez Geovoile…"
  "$NODE_BIN" tools/refresh-fleet.mjs || echo "  (échec de la mise à jour — on garde les dernières données enregistrées)"
else
  echo "  (Node introuvable — mise à jour Geovoile ignorée, on garde les dernières données)"
fi

# --- 2) Serveur local + navigateur ---
cd dist || { echo "Dossier dist introuvable"; exit 1; }
PORT=8765
echo "→ Carte disponible sur http://localhost:$PORT/"
echo "  (laissez cette fenêtre ouverte — fermez-la ou Ctrl+C pour arrêter)"
( sleep 1 && open "http://localhost:$PORT/" ) &
exec python3 -m http.server "$PORT" --bind 127.0.0.1
