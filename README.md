# TyCha 🎮

Un jeu bac à sable en 3D, style Roblox, à construire en famille.
Tout est en fichiers séparés pour être facile à modifier.

---

## 1. Tester sur votre ordinateur

Double-cliquez sur **`index.html`** : le jeu s'ouvre dans votre navigateur
(connexion Internet nécessaire pour les polices et la librairie 3D).

## 2. Mettre en ligne gratuitement (GitHub Pages)

1. Sur github.com, créez un dépôt (ex : `tycha`).
2. Envoyez-y tout le contenu de ce dossier.
3. **Settings → Pages** → "Deploy from a branch" → branche **main**,
   dossier **/ (root)** → **Save**.
4. Après 1–2 min, l'adresse du jeu apparaît
   (`https://votre-pseudo.github.io/tycha/`).

Autres options gratuites : Netlify, Cloudflare Pages, Vercel.

---

## 3. Comment on joue

- **Cliquer** sur l'écran pour prendre la main (souris = caméra).
- **Se déplacer** : ZQSD par défaut — chaque touche est modifiable dans
  Paramètres (cliquez une case, pressez la nouvelle touche).
- **Espace** : sauter · **E** : ramasser · **Clic gauche** : attaquer.
- **1 à 6** (ou clic) : choisir la case d'inventaire → l'objet passe en main.
- Inventaire plein ? L'objet ramassé remplace celui de la case active,
  qui tombe au sol.

**À découvrir dans le Bac à sable :** un parcours de plateformes avec un
drapeau au sommet, trois armes sur des socles (épée, hache, marteau), et
le Grognon, un monstre à combattre (3 coups, il revient après 8 s).

---

## 4. Modifier le jeu

| Vous voulez changer…                | Ouvrez ce fichier        |
|-------------------------------------|--------------------------|
| Les tenues (haut/bas)               | `data/skins.js`          |
| Peaux, cheveux, chapeaux, sacs…     | `data/accessories.js`    |
| Les armes                           | `data/weapons.js`        |
| Les compagnons                      | `data/companions.js`     |
| Les mondes / serveurs               | `data/servers.js`        |
| Les couleurs et le style            | `css/style.css`          |
| L'aspect des menus                  | `css/menus.css`          |
| Les réglages par défaut / touches   | `js/settings.js`         |
| Le monde 3D (parcours, monstre…)    | `js/game.js`             |
| L'inventaire                        | `js/inventory.js`        |
| Les modèles 3D (perso, accessoires) | `js/customization.js`    |

Dans `data/`, chaque élément est un bloc `{ ... }` : copiez, collez,
changez l'`id` (unique), le nom, les couleurs (`#RRGGBB`). Rechargez la page.

### Sons et images
- Sons → `assets/sounds/` · Images → `assets/images/`
Le réglage de volume existe déjà ; le code de lecture des sons viendra ensuite.

---

## Structure

```
tycha/
├── index.html
├── css/            style.css, menus.css
├── js/             storage, settings, inventory, customization, game, main
├── data/           skins (tenues), accessories, weapons, companions, servers
└── assets/         sounds/, images/
```

Amusez-vous bien ! 💛
