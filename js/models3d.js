/* ============================================================
   MODÈLES 3D  —  chargement, cache, pièces de kits, tailles
   ============================================================ */

window.Modeles = {
  _cache: {},   // fichier -> { scene, animations, attente[] }

  // Charge un .glb (une seule fois par fichier, puis clone)
  charger(fichier, cb) {
    const c = this._cache[fichier];
    if (c && c.scene) { cb(this._cloner(c.scene), c.animations); return; }
    if (c) { c.attente.push(cb); return; }
    const entree = this._cache[fichier] = { attente: [cb] };
    if (typeof THREE.GLTFLoader !== "function") return;
    new THREE.GLTFLoader().load(
      fichier,
      (gltf) => {
        entree.scene = gltf.scene;
        entree.animations = gltf.animations || [];
        const attente = entree.attente; entree.attente = [];
        attente.forEach(f => f(this._cloner(gltf.scene), entree.animations));
      },
      undefined,
      () => console.warn("Modèle introuvable : " + fichier)
    );
  },


  // Boîte englobante FIABLE : les modèles animés (squelette) ont
  // parfois une géométrie minuscule agrandie par l'armature, ce qui
  // trompe Box3. On mesure alors par la position réelle des os.
  boiteReelle(objet) {
    objet.updateMatrixWorld(true);
    const boite = new THREE.Box3();
    const v = new THREE.Vector3();
    let nbOs = 0;
    objet.traverse(o => {
      if (o.isBone) { boite.expandByPoint(o.getWorldPosition(v)); nbOs++; }
    });
    if (nbOs < 3) return new THREE.Box3().setFromObject(objet);
    // petite marge : la "peau" dépasse un peu des os
    const dims = new THREE.Vector3(); boite.getSize(dims);
    boite.expandByScalar(Math.max(dims.y * 0.09, 0.02));
    return boite;
  },

  _cloner(scene) {
    const c = scene.clone(true);
    c.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    return c;
  },

  // Extrait UNE pièce nommée d'un kit (remise à l'origine)
  extrairePiece(scene, nom) {
    let trouve = null;
    scene.traverse(o => { if (!trouve && o.name === nom) trouve = o; });
    if (!trouve) {
      console.warn("Pièce introuvable dans le kit : " + nom);
      return scene;
    }
    const p = trouve.clone(true);
    p.position.set(0, 0, 0);
    const enveloppe = new THREE.Group();
    enveloppe.add(p);
    return enveloppe;
  },

  // Met un objet à la taille voulue et pose ses pieds au sol.
  // options : { taille (hauteur cible), echelle (multiplicateur),
  //             axe: "y" (hauteur) ou "long" (plus grande dimension),
  //             poserAuSol: true par défaut }
  // Renvoie la boîte englobante finale.
  normaliser(objet, options) {
    const o = options || {};
    let boite = this.boiteReelle(objet);
    const dims = new THREE.Vector3(); boite.getSize(dims);
    let facteur = o.echelle || 1;
    if (o.taille) {
      const ref = (o.axe === "long")
        ? Math.max(dims.x, dims.y, dims.z)
        : dims.y;
      if (ref > 0.0001) facteur = (o.taille * (o.echelle || 1)) / ref;
    }
    objet.scale.multiplyScalar(facteur);
    boite = this.boiteReelle(objet);
    if (o.poserAuSol !== false) {
      objet.position.y -= boite.min.y;
      boite = this.boiteReelle(objet);
    }
    return boite;
  },

  // Prépare une ARME : oriente son grand axe vers +Y (le manche
  // en bas), la met à la bonne longueur, place la poignée à l'origine.
  normaliserArme(objet, donnees) {
    let boite = new THREE.Box3().setFromObject(objet);
    const d = new THREE.Vector3(); boite.getSize(d);
    // oriente le plus grand axe vers +Y
    if (d.x >= d.y && d.x >= d.z) objet.rotation.z = -Math.PI / 2;
    else if (d.z >= d.y && d.z >= d.x) objet.rotation.x = Math.PI / 2;
    if (donnees.retourner) objet.rotation.x += Math.PI;
    // ajustements fins depuis data/weapons.js (en degrés)
    objet.rotation.x += (donnees.rotX || 0) * Math.PI / 180;
    objet.rotation.y += (donnees.rotY || 0) * Math.PI / 180;
    objet.rotation.z += (donnees.rotZ || 0) * Math.PI / 180;

    const env = new THREE.Group();
    env.add(objet);
    boite = new THREE.Box3().setFromObject(env);
    const long = Math.max(boite.max.y - boite.min.y, 0.0001);
    env.scale.multiplyScalar((donnees.taille || 1) / long);
    boite = new THREE.Box3().setFromObject(env);
    // la poignée (25 % depuis le bas) à l'origine, centrée en X/Z
    const centre = new THREE.Vector3(); boite.getCenter(centre);
    env.position.x -= centre.x;
    env.position.z -= centre.z;
    env.position.y -= boite.min.y + (boite.max.y - boite.min.y) * 0.25;
    const final = new THREE.Group();
    final.add(env);
    return final;
  }
};
