/* ============================================================
   SERVEURS  —  Les mondes jouables
   ------------------------------------------------------------
   Pour l'instant il y a un seul serveur "bac à sable" pour
   faire vos tests. Quand vous créerez d'autres mondes, ajoutez
   un bloc { ... } ici.
     id          = identifiant unique
     nom         = nom affiché
     description = petite phrase sous le nom
     couleurCiel = couleur du ciel du monde (#RRGGBB)
     couleurSol  = couleur du sol du monde (#RRGGBB)
     disponible  = true (jouable) / false (grisé "Bientôt")
   ============================================================ */

window.GAME_DATA = window.GAME_DATA || {};

window.GAME_DATA.servers = [
  {
    id: "bac-a-sable",
    nom: "Bac à sable",
    description: "Monde de test : cours, saute, explore librement.",
    couleurCiel: "#8ECAE6",
    couleurSol:  "#8BC48A",
    disponible: true
  },
  {
    id: "monde-2",
    nom: "Prochain monde",
    description: "À construire ensemble plus tard.",
    couleurCiel: "#B8A0D9",
    couleurSol:  "#C8A0A0",
    disponible: false
  }
];
