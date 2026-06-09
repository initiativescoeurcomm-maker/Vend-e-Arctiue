# Initiatives-Cœur · Vendée Globe — Manuel utilisateur

Visualisation 3D interactive du tour du monde à la voile en
solitaire, à bord du bateau Initiatives-Cœur. L'application affiche
un globe terrestre haute-résolution sur lequel le bateau parcourt
le tracé de la course choisie, avec sa trace, sa météo locale et
les points de passage clés.

---

## 1. À propos

**Initiatives-Cœur** est un projet voile-solidaire associé à
l'association Mécénat Chirurgie Cardiaque — chaque mille parcouru
contribue à financer des opérations cardiaques pour des enfants.

Cette appli n'est pas une simulation officielle ni un suivi GPS
temps-réel : c'est une **mise en scène interactive** d'un tour du
monde stylisé, avec un parcours plausible, une météo synthétique,
et des éléments réels (textures Blue Marble 8K, modèle 3D du vrai
bateau Initiatives-Cœur).

---

## 2. Vue d'ensemble de l'écran

### En haut

- **Logo + titre « Initiatives Cœur · Vendée Globe »** : à gauche.
- **Sélecteur de courses** (centré) : 4 boutons —
  - **Vendée Globe** (tour du monde, 94 jours, 28 800 nm)
  - **Route du Rhum** (Saint-Malo → Pointe-à-Pitre)
  - **Vendée Arctique** (boucle nord-Atlantique-Arctique)
  - **1000 Race** (Bermudes 1000, qualif IMOCA)
- **Métadonnées de course** (à droite, écrans larges) : date de
  départ, distance théorique, classe de bateau.

### À gauche

- **POSITION · LIVE** : jour de course (J+xx.x), date du jour,
  latitude / longitude actuelles, vitesse en nœuds, distance
  parcourue en milles nautiques.
- **LÉGENDES** (palette dépliable) : 7 toggles pour afficher /
  masquer les capes & escales, courants océaniques, anticyclones,
  continents, capitales côtières, pays côtiers, et l'étape suivante.

### À droite

- **VENT · STYLISÉ** : rose des vents avec la direction et la
  force du vent à la position du bateau, plus l'état de la mer
  (« Belle » / « Peu agitée » / « Très agitée » / « Tempête »).
- **OPTIONS** : ambiance jour/nuit, nuages, atmosphère, zone
  antarctique, courants & hautes pressions, méridiens & parallèles,
  station spatiale (ISS), rotation auto.

### En bas

- Un **timeline / scrubber** allant de J+0 à la fin de la course.
  Tu peux le **glisser** pour positionner le bateau à un jour
  précis. Les points marquent les caps majeurs (Bonne-Espérance,
  Leeuwin, Cap Horn, etc.).
- Boutons de **lecture** : Lancer / Pause, Reset, ×1, ×2, ×5, ×10
  (vitesse de l'animation).
- Bouton **Masquer palettes** à droite : escamote POSITION, VENT,
  LÉGENDES et OPTIONS pour avoir le globe en plein écran.

### Au centre — le bateau

- Modèle 3D du **vrai Initiatives-Cœur** (coque rouge, voiles
  blanches avec le cœur rouge, sponsors K-LINE, VINCI, Chocolats du
  Cœur, etc.) avec son **gréement complet** (mât, GV, J3) et sa
  **quille à bulbe**.
- Le bateau **gîte** naturellement, en alternance bâbord / tribord,
  pour qu'on voie la décoration des voiles. Le mode Gyro (sur
  mobile) prend le relais quand tu inclines le téléphone.
- **Trace rouge** semi-transparente derrière le bateau, marquant
  son parcours depuis le départ.
- **Anneau de pulsation** rouge autour du bateau, qui pulse
  régulièrement — symbole de battement cardiaque.

### Légendes flottantes

- **Caps & escales** : labels avec « J+xx » au passage de chaque
  cap majeur (Cap de Bonne-Espérance, Leeuwin, Horn…)
- **Courants océaniques** : flèches animées + nom complet
  (Gulf Stream, Courant des Aiguilles, Courant Circumpolaire
  Antarctique…)
- **Anticyclones** : spirales animées + nom (Anticyclone des
  Açores, Anticyclone de Sainte-Hélène…)
- **Capitales côtières** : nom de chaque capitale visible dans le
  cadre courant.
- **Pays côtiers** : nom du pays côtier dont la côte est visible.
- **Caption de cap** : à chaque passage d'un cap majeur, une
  pastille rouge apparaît au-dessus du bateau avec le nom du
  prochain cap et une note météo (ex. « Cap Sud-Est ·
  Contournement de l'anticyclone de Sainte-Hélène, mer formée »).

---

## 3. Utilisation de base

### Lancer la course

1. Choisis une course dans le sélecteur du haut.
2. Clique **Lancer** (ou appuie sur la barre d'espace).
3. Choisis la vitesse : **×1** (lent, pour profiter), **×2**
   (par défaut), **×5** (rapide), **×10** (zapping).
4. Pour mettre en pause : **Lancer** redevient **Pause** —
   re-clique, ou re-appuie sur espace.
5. Pour redémarrer du début : bouton **Reset** ou touche **R**.

### Naviguer dans le globe

- **Glisser** le globe (clic gauche maintenu sur desktop, ou doigt
  sur mobile) → tourne le globe.
- **Molette** (desktop) ou **pincer/écarter** (mobile) → zoom.
- Si tu lâches sans toucher pendant 3 secondes, le **suivi
  automatique** se réactive et la caméra recale sur le bateau.

### Sauter à un moment précis

- Glisser la **barre de progression** (en bas) pour positionner le
  bateau à un jour donné. La trace, la position, la vitesse, le
  vent et l'étape suivante s'actualisent en direct.

### Changer de course

- Tape sur un autre bouton du sélecteur (Vendée Globe, Route du
  Rhum, etc.). Le globe recadrage automatiquement sur la zone de
  la nouvelle course, le bateau revient à J+0, et tous les
  marqueurs de cap se reconfigurent.

### Mobile (iPhone, iPad)

- Les palettes POSITION, VENT, LÉGENDES, OPTIONS sont
  **auto-collapsées** au chargement (seuls les titres dépassent).
  Tape sur le **+** d'un titre pour la déplier.
- Le sélecteur de courses est en **bande horizontale scrollable**
  juste sous le titre.
- Le bouton **Masquer palettes** cache les 4 palettes pour avoir
  le globe en plein écran.
- Le **gyroscope** est actif automatiquement (voir §5).

---

## 4. Raccourcis clavier

| Touche | Action |
|---|---|
| **Espace** | Lancer / Pause |
| **R** | Reset à J+0 |
| **T** | Active / coupe le **mode tempête** |
| **B** | Lâche une **bouteille à la mer** |

---

## 5. Fonctionnalités cachées (easter eggs)

### Tap sur le bateau — séquence showcase

Un tap rapide sur le bateau (clic souris desktop, tap doigt
mobile) déclenche une **mise en valeur du modèle 3D** sur 5
secondes :
1. Le bateau **sort de l'eau** d'environ une hauteur de coque
2. Il **bascule à 90°** sur le flanc, quille pointée vers la
   caméra (on voit le bulbe de quille, les rudders, le détail
   de la coque)
3. Il **reste en pose** pendant 2 secondes
4. Il **se redresse** et **redescend** flotter normalement

Pendant cette séquence, la lecture de la course est **ralentie
×4** automatiquement pour que le bateau ne se déplace presque pas
le temps de la mise en scène, puis le tempo normal reprend.

Si tu glisses (drag) au lieu de taper, le drag oriente le globe
sans déclencher l'animation.

### Touche T — mode tempête

Active une **tempête de 15 secondes** avec :
- Vignette sombre + bandeau « ⚡ Avis de tempête · Force 11 »
- **Pluie battante** en surimpression (200-360 gouttes inclinées
  qui tombent en continu)
- **Éclairs blancs** en plein écran à intervalles aléatoires
- **Vent HUD piraté** : 55-80 nœuds gusty, état mer « Tempête »,
  aiguille de la rose des vents qui tremble
- **Mer agitée** : le bateau tangue (±10° de roulis rapide) et
  prend la houle (mouvement vertical)
- **Nuages 15× plus rapides** : front qui défile devant
- **Tremor de l'écran** : tout le globe et l'UI vibrent
  légèrement

Re-tape **T** (ou triple-tap sur la palette VENT) pour couper
avant les 15 secondes.

### Touche B — bouteille à la mer

Lâche une **bouteille en verre vert** qui apparaît à l'arrière
du bateau et **dérive lentement dans le sillage** sur 30 secondes,
puis s'estompe progressivement. Le bouchon brun et le col
allongé sont visibles. Tu peux en spawner plusieurs en appuyant
plusieurs fois — chaque bouteille a sa propre direction de dérive
et son propre rythme de tangage.

### Mobile — gyroscope automatique

Sur smartphone (≤ 720 px de viewport), le gyroscope est activé
automatiquement après le **premier tap** sur l'écran (iOS Safari
demande la permission native une fois — accepter).

- **Incline le téléphone à gauche** → le bateau gîte à droite
  (tribord), tu vois le dessus de la grand-voile et la
  décoration de la coque
- **Incline à droite** → gîte à gauche (port)
- **Incline vers l'avant** → l'étrave plonge
- **Incline vers l'arrière** → l'étrave se relève

Limites : ±60° de gîte, ±20° de pitch.

### Triple-tap sur la palette VENT

Alternative à la touche **T** : tape trois fois rapidement sur la
palette VENT (rose des vents) pour activer / couper la tempête.

### Auto-démarrage Vendée Globe

Quand tu charges la page sur la Vendée Globe (par défaut), un
zoom intro de 3 secondes cadre la France. Au bout de ces 3
secondes, la course se lance toute seule — pas besoin de
cliquer Lancer.

### Activation automatique des légendes

Au tout premier appui sur **Lancer**, deux légendes s'allument
toutes seules après quelques secondes :
- À +3 s : **Capitales côtières**
- À +8 s : **Pays côtiers**

C'est pour habituer l'œil progressivement aux différentes
couches d'information sans saturer l'écran tout de suite.

---

## 6. Configuration / personnalisation rapide

Toutes les options sont dans la palette **OPTIONS** (en bas à
droite, OU le « + » sur mobile) :

- **Ambiance Jour / Nuit** : bascule l'éclairage solaire et fait
  apparaître les capitales nocturnes (lumières de villes
  satellite-style) en mode nuit.
- **Nuages** : couche de nuages 8K autour de la planète, qui
  cache le bateau quand un nuage passe au-dessus.
- **Atmosphère** : halo bleuté autour du globe.
- **Zone antarctique** : trait pointillé rose marquant la zone
  d'exclusion antarctique sur la Vendée Globe.
- **Courants & hautes pressions** : affiche les flèches animées
  des courants océaniques + les spirales d'anticyclones.
- **Méridiens & parallèles** : grille géographique tous les 15°.
- **Station spatiale (ISS)** : station spatiale en orbite basse
  (51,6° d'inclinaison, période visuelle ~22 s). Trace orbitale
  ivoire en pointillé.
- **Rotation auto** : si tu n'es pas en suivi du bateau, le
  globe tourne tout seul lentement.

---

## 7. Compatibilité

- **Desktop** : Chrome, Firefox, Safari (macOS), Edge — toutes
  versions récentes (WebGL 2 requis)
- **Mobile** :
  - iOS 13+ Safari (iPhone, iPad) — ✅
  - Android Chrome — ✅
- **Pas testé** : Internet Explorer (incompatible WebGL 2),
  Opera Mini

Les textures 8K (≈ 4 Mo) sont chargées progressivement : tu
verras d'abord une carte 2K en moins d'une seconde, puis la
version 8K se substitue silencieusement quelques secondes plus
tard.

---

## 8. En cas de problème

- **Globe noir / pas de continents** : vérifie que WebGL est
  activé dans ton navigateur, et que tu es bien en HTTPS
  (les textures sont chargées d'un proxy CORS qui exige HTTPS).
- **Bateau qui ne s'affiche pas** : un fallback 2D s'affiche
  pendant que le modèle 3D (3,5 Mo) charge — c'est normal sur
  les premières secondes.
- **Tempête sans vent** : si la lecture est en pause au moment
  du déclenchement, le HUD vent se rafraîchit quand même grâce
  à un timer indépendant.
- **iOS gyro qui ne fonctionne pas** : iOS exige un tap réel sur
  la page pour autoriser l'accès au capteur. Si tu as refusé la
  permission, va dans Réglages Safari → effacer les données de
  site, puis recharge la page.
