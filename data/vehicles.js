/* ============================================================
   VÉHICULES  —  conduisibles !
   Approchez et pressez la touche véhicule (F par défaut,
   modifiable dans Paramètres) pour monter / descendre.
   { id, nom, fichier, taille (longueur), x, z, ry (rotation
     en degrés), retourner (true si roule à l'envers),
     vitesseMax, acceleration }
   ============================================================ */

window.GAME_DATA = window.GAME_DATA || {};

window.GAME_DATA.vehicules = [
  { id: "pickup", nom: "Pickup",
    fichier: "assets/models/Pickup.glb",
    taille: 5.2, x: -6, z: 26, ry: 90, retourner: false,
    vitesseMax: 16, acceleration: 12 },

  { id: "sport", nom: "Voiture de sport",
    fichier: "assets/models/SportsCar.glb",
    taille: 5.0, x: 10, z: 26, ry: -90, retourner: false,
    vitesseMax: 24, acceleration: 18 }
];
