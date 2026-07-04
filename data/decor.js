/* ============================================================
   DÉCOR  —  construisez votre monde ici !
   ------------------------------------------------------------
   Chaque ligne place un élément dans le Bac à sable :
   { fichier, piece?, x, z, y?, ry?, taille?, echelle?, collision? }
   - fichier   : le modèle dans assets/models/
   - piece     : (kits seulement) nom d'UNE pièce du kit
   - x, z      : position au sol (le joueur démarre en 0,0)
   - y         : hauteur (0 par défaut)
   - ry        : rotation en degrés
   - taille    : hauteur cible en unités (auto-échelle).
                 Sans taille ni echelle : taille réelle du modèle.
   - echelle   : multiplicateur simple (autre façon de régler)
   - collision : true (bloque, par défaut), false (traversable),
                 "tronc" (bloque seulement au centre : idéal arbres)

   PIÈCES DISPONIBLES DANS LES KITS (les plus utiles) :
   - Kit_Route.glb : road_square, road_crossing, road_bend,
     road_curve, road_intersection, road_crossroad, road_end,
     road_roundabout, road_bridge, road_side, light_curved…
   - Kit_BaseSpatiale.glb : basemodule_A, basemodule_B,
     basemodule_C, basemodule_D, basemodule_E, basemodule_garage
   - Kit_Chateau.glb : Tower.002, TallWallBricks.002,
     TallWallEntrance.002, WallEntranceBricks.002
   - Kit_Cloture.glb : Fence, GateLeft, GateRight, Pillar
   - Batiment_SF.glb : Wall_1…Wall_5, FloorTile_Basic,
     Door_Single, Staircase, Column_1, Props_Computer,
     Props_Crate, Props_Teleporter_1… (93 pièces !)
   ============================================================ */

window.GAME_DATA = window.GAME_DATA || {};

window.GAME_DATA.decor = [

  /* ---------- Une petite rue (tuiles de route + trottoirs) ---------- */
  { fichier: "assets/models/Kit_Route.glb", piece: "road_square",   x: -12, z: 26, taille: 0.35, echelle: 12, collision: false },
  { fichier: "assets/models/Kit_Route.glb", piece: "road_square",   x: -8,  z: 26, taille: 0.35, echelle: 12, collision: false },
  { fichier: "assets/models/Kit_Route.glb", piece: "road_square",   x: -4,  z: 26, taille: 0.35, echelle: 12, collision: false },
  { fichier: "assets/models/Kit_Route.glb", piece: "road_crossing", x: 0,   z: 26, taille: 0.35, echelle: 12, collision: false },
  { fichier: "assets/models/Kit_Route.glb", piece: "road_square",   x: 4,   z: 26, taille: 0.35, echelle: 12, collision: false },
  { fichier: "assets/models/Kit_Route.glb", piece: "road_square",   x: 8,   z: 26, taille: 0.35, echelle: 12, collision: false },
  { fichier: "assets/models/Kit_Route.glb", piece: "road_square",   x: 12,  z: 26, taille: 0.35, echelle: 12, collision: false },

  /* ---------- Mobilier urbain ---------- */
  { fichier: "assets/models/Lampadaire.glb",   x: -10, z: 22.5, taille: 4.5 },
  { fichier: "assets/models/Lampadaire.glb",   x: 6,   z: 22.5, taille: 4.5 },
  { fichier: "assets/models/FeuTricolore.glb", x: 13,  z: 22.5, taille: 4.2 },
  { fichier: "assets/models/BorneIncendie.glb",x: 10,  z: 23,   taille: 1.0 },
  { fichier: "assets/models/Cone.glb",         x: -3,  z: 28.5, taille: 0.8 },
  { fichier: "assets/models/Cone.glb",         x: -1.8,z: 29,   taille: 0.8 },
  { fichier: "assets/models/Barriere.glb",     x: 2,   z: 29,   taille: 1.1 },

  /* ---------- Deux bâtiments de la base spatiale ---------- */
  { fichier: "assets/models/Kit_BaseSpatiale.glb", piece: "basemodule_A",      x: -18, z: 36, taille: 6, ry: 180 },
  { fichier: "assets/models/Kit_BaseSpatiale.glb", piece: "basemodule_garage", x: -4,  z: 38, taille: 6, ry: 180 },

  /* ---------- Ruines de château ---------- */
  { fichier: "assets/models/Kit_Chateau.glb", piece: "Tower.002",          x: 28, z: 32, taille: 10 },
  { fichier: "assets/models/Kit_Chateau.glb", piece: "TallWallBricks.002", x: 33, z: 27, taille: 7, ry: 90 },

  /* ---------- Végétation ---------- */
  { fichier: "assets/models/Sapin1.glb",     x: -30, z: -4,  collision: "tronc" },
  { fichier: "assets/models/Sapin2.glb",     x: -26, z: 4,   collision: "tronc" },
  { fichier: "assets/models/Arbre1.glb",     x: 24,  z: 8,   collision: "tronc" },
  { fichier: "assets/models/Arbre2.glb",     x: 18,  z: 2,   collision: "tronc" },
  { fichier: "assets/models/ArbreRouge1.glb",x: -32, z: 20, taille: 10, collision: "tronc" },
  { fichier: "assets/models/ArbreRouge2.glb",x: 36,  z: 14, taille: 9,  collision: "tronc" },
  { fichier: "assets/models/Fougere1.glb",   x: 22,  z: 16, taille: 1.6, collision: false },
  { fichier: "assets/models/Herbe1.glb",     x: -8,  z: 8,  collision: false },
  { fichier: "assets/models/Herbe2.glb",     x: 14,  z: -2, collision: false },
  { fichier: "assets/models/Herbe1.glb",     x: 6,   z: 14, collision: false },
  { fichier: "assets/models/Herbe2.glb",     x: -14, z: -6, collision: false }
];
