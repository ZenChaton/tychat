/* ============================================================
   CATALOGUE DE L'ÉDITEUR DE MONDES
   ------------------------------------------------------------
   Tout ce qu'on peut poser dans un monde créé, classé par
   catégorie. Chaque objet a un portrait 3D généré en direct.
   Pour ajouter un objet : copiez une ligne et changez
   fichier / piece / taille. Types spéciaux :
   - "ennemi"   : un Grognon apparaîtra là
   - "arme"     : socle + arme à ramasser (champ arme = id)
   - "vehicule" : véhicule conduisible (champ vehicule = id)
   - "soin"     : mallette de soin qui réapparaît
   Le reste est du décor : taille = hauteur, axe:"long" mesure
   la plus grande dimension (pour les objets plats), collision
   false = traversable, "tronc" = seul le centre bloque.
   ============================================================ */

window.EditeurCatalogue = {

  categories: [
    {
      id: "sols", nom: "Routes & sols", emoji: "🛣️",
      items: [
        { id: "route_droite",   nom: "Route droite",    fichier: "assets/models/Kit_Route.glb", piece: "road_square",       taille: 4, axe: "long", collision: false },
        { id: "route_passage",  nom: "Passage piéton",  fichier: "assets/models/Kit_Route.glb", piece: "road_crossing",     taille: 4, axe: "long", collision: false },
        { id: "route_virage",   nom: "Virage",          fichier: "assets/models/Kit_Route.glb", piece: "road_bend",         taille: 4, axe: "long", collision: false },
        { id: "route_courbe",   nom: "Grande courbe",   fichier: "assets/models/Kit_Route.glb", piece: "road_curve",        taille: 4, axe: "long", collision: false },
        { id: "route_carrefour",nom: "Carrefour T",     fichier: "assets/models/Kit_Route.glb", piece: "road_intersection", taille: 4, axe: "long", collision: false },
        { id: "route_croix",    nom: "Croisement",      fichier: "assets/models/Kit_Route.glb", piece: "road_crossroad",    taille: 4, axe: "long", collision: false },
        { id: "route_bout",     nom: "Bout de route",   fichier: "assets/models/Kit_Route.glb", piece: "road_end",          taille: 4, axe: "long", collision: false },
        { id: "route_rond",     nom: "Rond-point",      fichier: "assets/models/Kit_Route.glb", piece: "road_roundabout",   taille: 8, axe: "long", collision: false },
        { id: "route_pont",     nom: "Pont",            fichier: "assets/models/Kit_Route.glb", piece: "road_bridge",       taille: 6, axe: "long" },
        { id: "dalle_sf",       nom: "Dalle high-tech", fichier: "assets/models/Batiment_SF.glb", piece: "FloorTile_Basic", taille: 4, axe: "long", collision: false },
        { id: "trottoir_pieton",nom: "Trottoir",        fichier: "assets/models/PassagePieton.glb", taille: 4, axe: "long", collision: false }
      ]
    },
    {
      id: "murs", nom: "Murs & bâtiments", emoji: "🏰",
      items: [
        { id: "chateau_tour",   nom: "Tour de château", fichier: "assets/models/Kit_Chateau.glb", piece: "Tower.002",          taille: 10 },
        { id: "chateau_mur",    nom: "Grand mur",       fichier: "assets/models/Kit_Chateau.glb", piece: "TallWallBricks.002", taille: 7 },
        { id: "chateau_porte",  nom: "Porte fortifiée", fichier: "assets/models/Kit_Chateau.glb", piece: "TallWallEntrance.002", taille: 7 },
        { id: "chateau_entree", nom: "Entrée en pierre",fichier: "assets/models/Kit_Chateau.glb", piece: "WallEntranceBricks.002", taille: 5 },
        { id: "base_a",         nom: "Module spatial A",fichier: "assets/models/Kit_BaseSpatiale.glb", piece: "basemodule_A", taille: 6 },
        { id: "base_b",         nom: "Module spatial B",fichier: "assets/models/Kit_BaseSpatiale.glb", piece: "basemodule_B", taille: 6 },
        { id: "base_c",         nom: "Module spatial C",fichier: "assets/models/Kit_BaseSpatiale.glb", piece: "basemodule_C", taille: 6 },
        { id: "base_garage",    nom: "Garage spatial",  fichier: "assets/models/Kit_BaseSpatiale.glb", piece: "basemodule_garage", taille: 6 },
        { id: "sf_mur",         nom: "Mur high-tech",   fichier: "assets/models/Batiment_SF.glb", piece: "Wall_1",       taille: 4 },
        { id: "sf_fenetre",     nom: "Mur à fenêtre",   fichier: "assets/models/Batiment_SF.glb", piece: "Window_Wall_SideA", taille: 4 },
        { id: "sf_porte",       nom: "Porte high-tech", fichier: "assets/models/Batiment_SF.glb", piece: "DoorSingle_Wall_SideA", taille: 4 },
        { id: "sf_escalier",    nom: "Escalier",        fichier: "assets/models/Batiment_SF.glb", piece: "Staircase",    taille: 4 },
        { id: "sf_colonne",     nom: "Colonne",         fichier: "assets/models/Batiment_SF.glb", piece: "Column_1",     taille: 4 },
        { id: "mur_pierre",     nom: "Mur de pierre",   fichier: "assets/models/Kit_Mur.glb",     taille: 3 },
        { id: "cloture",        nom: "Clôture",         fichier: "assets/models/Kit_Cloture.glb", piece: "Fence",        taille: 2.2 },
        { id: "cloture_porte",  nom: "Portail",         fichier: "assets/models/Kit_Cloture.glb", piece: "GateLeft",     taille: 2.2 },
        { id: "cloture_pilier", nom: "Pilier",          fichier: "assets/models/Kit_Cloture.glb", piece: "Pillar",       taille: 2.4 }
      ]
    },
    {
      id: "objets", nom: "Objets & meubles", emoji: "📦",
      items: [
        { id: "caisse",      nom: "Caisse",          fichier: "assets/models/Batiment_SF.glb", piece: "Props_Crate",        taille: 1.5 },
        { id: "ordinateur",  nom: "Ordinateur",      fichier: "assets/models/Batiment_SF.glb", piece: "Props_Computer",     taille: 1.8 },
        { id: "teleporteur", nom: "Téléporteur",     fichier: "assets/models/Batiment_SF.glb", piece: "Props_Teleporter_1", taille: 1.6 },
        { id: "capsule",     nom: "Capsule",         fichier: "assets/models/Batiment_SF.glb", piece: "Props_Capsule",      taille: 2.2 },
        { id: "statue",      nom: "Statue",          fichier: "assets/models/Batiment_SF.glb", piece: "Props_Statue",       taille: 2.4 }
      ]
    },
    {
      id: "vegetation", nom: "Végétation", emoji: "🌳",
      items: [
        { id: "sapin1",      nom: "Sapin",           fichier: "assets/models/Sapin1.glb",      taille: 7,   collision: "tronc" },
        { id: "sapin2",      nom: "Sapin touffu",    fichier: "assets/models/Sapin2.glb",      taille: 7,   collision: "tronc" },
        { id: "arbre1",      nom: "Arbre",           fichier: "assets/models/Arbre1.glb",      taille: 7,   collision: "tronc" },
        { id: "arbre2",      nom: "Arbre feuillu",   fichier: "assets/models/Arbre2.glb",      taille: 7,   collision: "tronc" },
        { id: "arbrerouge1", nom: "Grand arbre rouge", fichier: "assets/models/ArbreRouge1.glb", taille: 10, collision: "tronc" },
        { id: "arbrerouge2", nom: "Arbre rouge",     fichier: "assets/models/ArbreRouge2.glb", taille: 9,   collision: "tronc" },
        { id: "fougere",     nom: "Fougère",         fichier: "assets/models/Fougere1.glb",    taille: 1.6, collision: false },
        { id: "herbe1",      nom: "Herbes",          fichier: "assets/models/Herbe1.glb",      taille: 1.3, collision: false },
        { id: "herbe2",      nom: "Hautes herbes",   fichier: "assets/models/Herbe2.glb",      taille: 1.8, collision: false }
      ]
    },
    {
      id: "urbain", nom: "Ville", emoji: "🚦",
      items: [
        { id: "lampadaire",  nom: "Lampadaire",      fichier: "assets/models/Lampadaire.glb",   taille: 4.5 },
        { id: "feu",         nom: "Feu tricolore",   fichier: "assets/models/FeuTricolore.glb", taille: 4.2 },
        { id: "borne",       nom: "Borne à incendie",fichier: "assets/models/BorneIncendie.glb",taille: 1.0 },
        { id: "cone",        nom: "Cône",            fichier: "assets/models/Cone.glb",         taille: 0.8 },
        { id: "barriere",    nom: "Barrière",        fichier: "assets/models/Barriere.glb",     taille: 1.1 }
      ]
    },
    {
      id: "vehicules", nom: "Véhicules", emoji: "🚗",
      items: [
        { id: "v_pickup", nom: "Pickup",           type: "vehicule", vehicule: "pickup", fichier: "assets/models/Pickup.glb" },
        { id: "v_sport",  nom: "Voiture de sport", type: "vehicule", vehicule: "sport",  fichier: "assets/models/SportsCar.glb" }
      ]
    },
    {
      id: "armes", nom: "Armes à ramasser", emoji: "⚔️",
      items: [
        { id: "a_epee",     nom: "Épée",     type: "arme", arme: "epee",     fichier: "assets/models/Epee.glb" },
        { id: "a_hache",    nom: "Hache",    type: "arme", arme: "hache",    fichier: "assets/models/Hache.glb" },
        { id: "a_marteau",  nom: "Marteau",  type: "arme", arme: "marteau",  fichier: "assets/models/Marteau.glb" },
        { id: "a_pistolet", nom: "Pistolet", type: "arme", arme: "pistolet", fichier: "assets/models/Pistol.glb" },
        { id: "a_smg",      nom: "SMG",      type: "arme", arme: "smg",      fichier: "assets/models/SMG.glb" },
        { id: "a_assaut",   nom: "Fusil d'assaut", type: "arme", arme: "assaut", fichier: "assets/models/Assault.glb" },
        { id: "a_sniper",   nom: "Sniper",   type: "arme", arme: "sniper",   fichier: "assets/models/Sniper.glb" },
        { id: "a_grenade",  nom: "Grenade",  type: "arme", arme: "grenade",  fichier: "assets/models/Grenade.glb" }
      ]
    },
    {
      id: "ennemis", nom: "Ennemis", emoji: "👾",
      items: [
        { id: "grognon", nom: "Grognon", type: "ennemi" }
      ]
    },
    {
      id: "soins", nom: "Soins", emoji: "❤️",
      items: [
        { id: "mallette", nom: "Mallette de soin", type: "soin", fichier: "assets/models/MalletteSoin.glb" }
      ]
    }
  ],

  trouver(id) {
    for (const cat of this.categories) {
      const item = cat.items.find(i => i.id === id);
      if (item) return item;
    }
    return null;
  }
};
