/* ============================================================
   ARMES  —  ce que le personnage tient en main
   Pour AJOUTER une arme : copiez un bloc { ... }, changez
   l'id (unique), le nom, l'emoji (icône de l'inventaire)
   et les couleurs. "modele" choisit la forme 3D :
     "baton" / "epee" / "hache" / "marteau"
   ============================================================ */

window.GAME_DATA = window.GAME_DATA || {};

window.GAME_DATA.armes = [
  {
    id: "baton",
    nom: "Bâton",
    emoji: "🪵",
    modele: "baton",
    couleur1: "#8B5A2B",   // manche
    couleur2: "#8B5A2B"
  },
  {
    id: "epee",
    nom: "Épée",
    emoji: "🗡️",
    modele: "epee",
    couleur1: "#C8D0DC",   // lame
    couleur2: "#B8860B"    // garde
  },
  {
    id: "hache",
    nom: "Hache",
    emoji: "🪓",
    modele: "hache",
    couleur1: "#8B5A2B",   // manche
    couleur2: "#9AA4B2"    // tête
  },
  {
    id: "marteau",
    nom: "Marteau",
    emoji: "🔨",
    modele: "marteau",
    couleur1: "#6B4A2B",   // manche
    couleur2: "#FFD166"    // tête
  }
];
