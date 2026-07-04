/* ============================================================
   ARMES  —  mêlée, armes à feu et grenade
   ------------------------------------------------------------
   type "melee"   : coup au clic (degats, portee)
   type "tir"     : projectiles au clic (cadence en secondes
                    entre 2 tirs, vitesse du projectile,
                    auto: true = tir continu en maintenant)
   type "grenade" : lancer en cloche, explosion de zone
   taille  : longueur de l'arme en main (unités du jeu)
   retourner : true si l'arme pointe du mauvais côté
   rotX/rotY/rotZ : degrés d'ajustement fin en main
   ============================================================ */

window.GAME_DATA = window.GAME_DATA || {};

window.GAME_DATA.armes = [
  { id: "epee",     nom: "Épée",     emoji: "🗡️", fichier: "assets/models/Epee.glb",
    type: "melee", degats: 1, portee: 3.2, cadence: 0.45, taille: 1.15,
    retourner: false, rotX: 0, rotY: 0, rotZ: 0 },

  { id: "hache",    nom: "Hache",    emoji: "🪓", fichier: "assets/models/Hache.glb",
    type: "melee", degats: 2, portee: 3.0, cadence: 0.8, taille: 1.1,
    retourner: false, rotX: 0, rotY: 0, rotZ: 0 },

  { id: "marteau",  nom: "Marteau",  emoji: "🔨", fichier: "assets/models/Marteau.glb",
    type: "melee", degats: 2, portee: 3.4, cadence: 1.0, taille: 1.2,
    retourner: false, rotX: 0, rotY: 0, rotZ: 0 },

  { id: "pistolet", nom: "Pistolet", emoji: "🔫", fichier: "assets/models/Pistol.glb",
    type: "tir", degats: 1, cadence: 0.35, vitesse: 34, auto: false, taille: 0.55,
    retourner: false, rotX: 0, rotY: 0, rotZ: 0 },

  { id: "smg",      nom: "SMG",      emoji: "🔫", fichier: "assets/models/SMG.glb",
    type: "tir", degats: 1, cadence: 0.1, vitesse: 32, auto: true, taille: 0.75,
    retourner: false, rotX: 0, rotY: 0, rotZ: 0 },

  { id: "assaut",   nom: "Fusil d'assaut", emoji: "🔫", fichier: "assets/models/Assault.glb",
    type: "tir", degats: 1, cadence: 0.13, vitesse: 38, auto: true, taille: 1.0,
    retourner: false, rotX: 0, rotY: 0, rotZ: 0 },

  { id: "sniper",   nom: "Sniper",   emoji: "🎯", fichier: "assets/models/Sniper.glb",
    type: "tir", degats: 3, cadence: 1.1, vitesse: 60, auto: false, taille: 1.25,
    retourner: false, rotX: 0, rotY: 0, rotZ: 0 },

  { id: "grenade",  nom: "Grenade",  emoji: "💣", fichier: "assets/models/Grenade.glb",
    type: "grenade", degats: 3, rayon: 4.5, cadence: 1.0, taille: 0.35,
    retourner: false, rotX: 0, rotY: 0, rotZ: 0 }
];
