/* ============================================================
   PERSONNALISATION DU PERSONNAGE
   ------------------------------------------------------------
   Chaque liste commence par "aucun". Pour ajouter un élément,
   copiez un bloc { ... } et changez id/nom/couleur(s).
   Les formes 3D correspondantes sont dans js/customization.js.
   ============================================================ */

window.GAME_DATA = window.GAME_DATA || {};

/* ---- Palette de couleurs de peau proposées ---- */
window.GAME_DATA.peaux = [
  "#F9D9BD", "#F2C79B", "#E0AC7E", "#C68B59",
  "#9C6B43", "#6B4A2F", "#B8C4D0", "#9FE2BF"
];

/* ---- Palette de couleurs de cheveux proposées ---- */
window.GAME_DATA.couleursCheveux = [
  "#1E1B18", "#5B3A1E", "#B8860B", "#E8C979",
  "#B22222", "#845EC2", "#43BCCD", "#FDF6E3"
];

/* ---- Coiffures ---- */
window.GAME_DATA.cheveux = [
  { id: "aucun",    nom: "Chauve" },
  { id: "court",    nom: "Court" },
  { id: "long",     nom: "Long" },
  { id: "iroquois", nom: "Iroquois" },
  { id: "couettes", nom: "Couettes" },
  { id: "banane",   nom: "Banane" },
  { id: "boucles",  nom: "Bouclés" }
];

/* ---- Chapeaux ---- */
window.GAME_DATA.chapeaux = [
  { id: "aucun",     nom: "Aucun" },
  { id: "casquette", nom: "Casquette", couleur: "#EF6461" },
  { id: "hautforme", nom: "Haut-de-forme", couleur: "#1E1B18" },
  { id: "couronne",  nom: "Couronne", couleur: "#FFD166" },
  { id: "bandana",   nom: "Bandana", couleur: "#43BCCD" },
  { id: "paille",    nom: "Chapeau de paille", couleur: "#E8C979" },
  { id: "bonnet",    nom: "Bonnet à pompon", couleur: "#845EC2" },
  { id: "viking",    nom: "Casque viking", couleur: "#9AA4B2" }
];

/* ---- Lunettes & masques ---- */
window.GAME_DATA.lunettes = [
  { id: "aucun",  nom: "Aucun" },
  { id: "soleil", nom: "Lunettes de soleil", couleur: "#1E1B18" },
  { id: "rondes", nom: "Lunettes rondes", couleur: "#B8860B" },
  { id: "masque", nom: "Masque de héros", couleur: "#EF6461" }
];

/* ---- Capes ---- */
window.GAME_DATA.capes = [
  { id: "aucun",  nom: "Aucune" },
  { id: "rouge",  nom: "Cape rouge", couleur: "#C0392B" },
  { id: "nuit",   nom: "Cape de nuit", couleur: "#2D3561" },
  { id: "royale", nom: "Cape royale", couleur: "#845EC2" }
];

/* ---- Chaussures ---- */
window.GAME_DATA.chaussures = [
  { id: "aucun",   nom: "Pieds nus" },
  { id: "baskets", nom: "Baskets", couleur: "#EF6461" },
  { id: "bottes",  nom: "Bottes", couleur: "#5A3A1E" },
  { id: "neon",    nom: "Néon", couleur: "#43BCCD" },
  { id: "cowboy",  nom: "Bottes de cowboy", couleur: "#8B5A2B" }
];

/* ---- Sacs ---- */
window.GAME_DATA.sacs = [
  { id: "aucun",  nom: "Aucun" },
  { id: "sacdos", nom: "Sac à dos", couleur: "#2E7D53" },
  { id: "sacor",  nom: "Sac doré", couleur: "#FFD166" },
  { id: "banane", nom: "Sac banane", couleur: "#EF6461" }
];

/* ---- Bijoux ---- */
window.GAME_DATA.bijoux = [
  { id: "aucun",   nom: "Aucun" },
  { id: "collier", nom: "Collier or", couleur: "#FFD166" },
  { id: "perles",  nom: "Perles", couleur: "#43BCCD" },
  { id: "boucles", nom: "Boucles d'oreilles", couleur: "#FFD166" },
  { id: "montre",  nom: "Montre", couleur: "#FDF6E3" }
];

/* ---- Tatouages (petit motif sur le bras) ---- */
window.GAME_DATA.tatouages = [
  { id: "aucun",  nom: "Aucun" },
  { id: "etoile", nom: "Étoile", couleur: "#FFD166" },
  { id: "eclair", nom: "Éclair", couleur: "#43BCCD" },
  { id: "coeur",  nom: "Cœur", couleur: "#EF6461" }
];
