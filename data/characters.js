/* ============================================================
   PERSONNAGES  —  les héros jouables (modèles pro animés)
   ------------------------------------------------------------
   { id, nom, fichier, echelle, retourner, corps, accent }
   - echelle : multiplicateur de taille (1 = normal)
   - retourner : true si le personnage marche à reculons
   - corps/accent : couleurs de secours de la carte du menu
     (le portrait 3D est généré automatiquement)
   Note : BunnyPerso est une statue sans animations, il glisse
   sans bouger les jambes — c'est le modèle qui est comme ça.
   ============================================================ */

window.GAME_DATA = window.GAME_DATA || {};

window.GAME_DATA.personnages = [
  { id: "aventurier", nom: "Aventurier",        fichier: "assets/models/Adventurer.glb",       echelle: 1, retourner: false, corps: "#C68B59", accent: "#2E7D53" },
  { id: "capuche",    nom: "Aventurier masqué", fichier: "assets/models/HoodedAdventurer.glb", echelle: 1, retourner: false, corps: "#5A6472", accent: "#8B5A2B" },
  { id: "roi",        nom: "Roi",               fichier: "assets/models/King.glb",             echelle: 1, retourner: false, corps: "#C0392B", accent: "#FFD166" },
  { id: "punk",       nom: "Punk",              fichier: "assets/models/Punk.glb",             echelle: 1, retourner: false, corps: "#845EC2", accent: "#43BCCD" },
  { id: "soldat",     nom: "Soldat",            fichier: "assets/models/Soldier.glb",          echelle: 1, retourner: false, corps: "#2E7D53", accent: "#5A6472" },
  { id: "sorciere",   nom: "Sorcière",          fichier: "assets/models/Witch.glb",            echelle: 1, retourner: false, corps: "#4B2E6B", accent: "#7CB342" },
  { id: "lapinstatue",nom: "Lapin (statue)",    fichier: "assets/models/BunnyPerso.glb",       echelle: 1, retourner: false, corps: "#CFCFD8", accent: "#FF9EB6" }
];
