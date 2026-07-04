/* ============================================================
   TENUES  —  les vêtements du personnage (haut + bas)
   La couleur de peau se choisit à part, dans le menu
   Personnage (palette + couleur libre).
   Pour AJOUTER une tenue : copiez un bloc { ... }, changez
   l'id (unique), le nom et les couleurs (#RRGGBB).
     haut = torse + bras (le tee-shirt)
     bas  = jambes (le pantalon)
   ============================================================ */

window.GAME_DATA = window.GAME_DATA || {};

window.GAME_DATA.tenues = [
  { id: "classique", nom: "Classique",   haut: "#EF6461", bas: "#2D3561" },
  { id: "foret",     nom: "Explorateur", haut: "#43BCCD", bas: "#2E7D53" },
  { id: "robot",     nom: "Robot",       haut: "#8A94A6", bas: "#5A6472" },
  { id: "bonbon",    nom: "Bonbon",      haut: "#FF7EB6", bas: "#845EC2" },
  { id: "soleil",    nom: "Soleil",      haut: "#FFD166", bas: "#EF8354" },
  { id: "ninja",     nom: "Ninja",       haut: "#1F2233", bas: "#12141F" }
];
