/* ============================================================
   COMPAGNONS  —  petites créatures qui vous suivent
   ------------------------------------------------------------
   DEUX TYPES de compagnons :

   1) MODÈLE 3D PRO (.glb dans assets/models/) :
      { id, nom, fichier, echelle, vole, corps, accent, forme:"fichier" }
      - echelle : multiplicateur de taille. 1 = taille normale
        (le jeu mesure et ajuste tout seul !), 1.5 = plus grand.
      - vole : true = flotte en l'air (pour les créatures ailées)
      - corps/accent : juste les couleurs de la carte du menu
      Modèles gratuits (CC0) : poly.pizza, quaternius.com, kenney.nl
      Rappel : les .glb se chargent EN LIGNE (GitHub Pages) ou
      avec Live Server, pas en double-cliquant index.html.

   2) MASCOTTE FAITE MAISON :
      { id, nom, corps, accent, forme }
      formes : "renard" "dragon" "chouette" "lapin" "axo" "drone"
   ============================================================ */

window.GAME_DATA = window.GAME_DATA || {};

window.GAME_DATA.companions = [
  { id: "aucun", nom: "Aucun", corps: "#000000", accent: "#000000", forme: "aucun" },

  /* ---------- Les monstres du pack (modèles pro animés) ---------- */
  { id: "alien",    nom: "Alien",           fichier: "assets/models/Alien.glb",            echelle: 1, vole: false, corps: "#845EC2", accent: "#B9A5DE", forme: "fichier" },
  { id: "alien2",   nom: "Alien 2",         fichier: "assets/models/Alien2.glb",           echelle: 1, vole: false, corps: "#6B4BA3", accent: "#B9A5DE", forme: "fichier" },
  { id: "alpaking", nom: "Alpaking",        fichier: "assets/models/Alpaking.glb",         echelle: 1, vole: true,  corps: "#FDF6E3", accent: "#FFD166", forme: "fichier" },
  { id: "alpaking2",nom: "Alpaking Évolué", fichier: "assets/models/Alpaking_Evolved.glb", echelle: 1.2, vole: true, corps: "#C68B59", accent: "#FFD166", forme: "fichier" },
  { id: "armabee",  nom: "Armabee",         fichier: "assets/models/Armabee.glb",          echelle: 1, vole: true,  corps: "#FFD166", accent: "#1E1B18", forme: "fichier" },
  { id: "armabee2", nom: "Armabee Évoluée", fichier: "assets/models/Armabee_Evolved.glb",  echelle: 1.2, vole: true, corps: "#E8B00B", accent: "#1E1B18", forme: "fichier" },
  { id: "birb",     nom: "Birb",            fichier: "assets/models/Birb.glb",             echelle: 1, vole: false, corps: "#4EA8DE", accent: "#FDF6E3", forme: "fichier" },
  { id: "demonbleu",nom: "Démon Bleu",      fichier: "assets/models/Blue_Demon.glb",       echelle: 1, vole: false, corps: "#3C6E8F", accent: "#43BCCD", forme: "fichier" },
  { id: "lapinpro", nom: "Lapin",           fichier: "assets/models/Bunny.glb",            echelle: 1, vole: false, corps: "#FDF6E3", accent: "#FF9EB6", forme: "fichier" },
  { id: "cactoro",  nom: "Cactoro",         fichier: "assets/models/Cactoro.glb",          echelle: 1, vole: false, corps: "#4CAF6E", accent: "#2E7D53", forme: "fichier" },
  { id: "cactoro2", nom: "Cactoro 2",       fichier: "assets/models/Cactoro2.glb",         echelle: 1, vole: false, corps: "#3D9C5C", accent: "#EF6461", forme: "fichier" },
  { id: "chat",     nom: "Chat",            fichier: "assets/models/Cat.glb",              echelle: 1, vole: false, corps: "#E8853D", accent: "#FDF6E3", forme: "fichier" },
  { id: "poule",    nom: "Poule",           fichier: "assets/models/Chicken.glb",          echelle: 1, vole: false, corps: "#FDF6E3", accent: "#EF6461", forme: "fichier" },
  { id: "demon",    nom: "Démon",           fichier: "assets/models/Demon.glb",            echelle: 1, vole: true,  corps: "#C0392B", accent: "#1E1B18", forme: "fichier" },
  { id: "demon2",   nom: "Démon 2",         fichier: "assets/models/Demon2.glb",           echelle: 1, vole: false, corps: "#A93226", accent: "#1E1B18", forme: "fichier" },
  { id: "dino",     nom: "Dino",            fichier: "assets/models/Dino.glb",             echelle: 1, vole: false, corps: "#7CB342", accent: "#FDF6E3", forme: "fichier" },
  { id: "dragonpro",nom: "Dragon",          fichier: "assets/models/Dragon.glb",           echelle: 1, vole: true,  corps: "#4CAF6E", accent: "#FFD166", forme: "fichier" },
  { id: "dragon2",  nom: "Dragon Évolué",   fichier: "assets/models/Dragon_Evolved.glb",   echelle: 1.2, vole: true, corps: "#C0392B", accent: "#FFD166", forme: "fichier" },
  { id: "poisson",  nom: "Poisson",         fichier: "assets/models/Fish.glb",             echelle: 1, vole: false, corps: "#43BCCD", accent: "#FDF6E3", forme: "fichier" },
  { id: "poisson2", nom: "Poisson 2",       fichier: "assets/models/Fish2.glb",            echelle: 1, vole: false, corps: "#FF7EB6", accent: "#FDF6E3", forme: "fichier" },

  /* ---------- Les mascottes faites maison ---------- */
  { id: "rouky",  nom: "Rouky",    corps: "#E8853D", accent: "#FDF6E3", forme: "renard" },
  { id: "flamy",  nom: "Flamy",    corps: "#4CAF6E", accent: "#FFD166", forme: "dragon" },
  { id: "plume",  nom: "Plume",    corps: "#8D6E63", accent: "#FDF6E3", forme: "chouette" },
  { id: "pompon", nom: "Pompon",   corps: "#CFCFD8", accent: "#FF9EB6", forme: "lapin" },
  { id: "bulle",  nom: "Bulle",    corps: "#FF9EB6", accent: "#FF6E9A", forme: "axo" },
  { id: "dx1",    nom: "Drone X1", corps: "#B8C4D0", accent: "#43BCCD", forme: "drone" }
];
