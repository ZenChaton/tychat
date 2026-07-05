/* ============================================================
   SERVEURS  —  les mondes de base (biomes)
   Chaque monde garde tes constructions en mémoire !
   ============================================================ */

window.GAME_DATA = window.GAME_DATA || {};

window.GAME_DATA.serveurs = [
  {
    id: "plaine", nom: "Plaine verte", emoji: "🌿",
    description: "Un grand pré tranquille pour construire.",
    couleurCiel: "#87CEEB", couleurSol: "#7CB342"
  },
  {
    id: "desert", nom: "Désert doré", emoji: "🏜️",
    description: "Du sable à perte de vue, et du soleil !",
    couleurCiel: "#FFD9A0", couleurSol: "#E8D48B"
  },
  {
    id: "neige", nom: "Terres enneigées", emoji: "❄️",
    description: "Un monde tout blanc, sortez les manteaux.",
    couleurCiel: "#DDEAF7", couleurSol: "#EEF3F6"
  },
  {
    id: "nuit", nom: "Monde de nuit", emoji: "🌙",
    description: "Construire sous les étoiles, c'est magique.",
    couleurCiel: "#1B2340", couleurSol: "#3E5C47"
  }
];
