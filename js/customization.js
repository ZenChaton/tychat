/* ============================================================
   PERSONNAGE, ACCESSOIRES, ARMES & COMPAGNONS  —  modèles 3D
   ------------------------------------------------------------
   RENDU "DESSIN ANIMÉ" :
   - Cel-shading : la lumière est rendue par paliers nets
     (comme dans les jeux cartoon), plus de dégradé "plastique".
   - Contours : chaque forme reçoit une fine silhouette sombre,
     ce qui unifie le modèle et gomme le côté "formes empilées".

   MODÈLES PRO (.glb) :
   - Vous pouvez utiliser de vrais modèles 3D gratuits comme
     compagnons ! Voir le mode d'emploi dans data/companions.js.
   ============================================================ */

window.Perso = {

  // ============================================================
  //  MATÉRIAUX ET STYLE
  // ============================================================

  // Texture de dégradé à 4 paliers pour le cel-shading (créée 1 fois)
  _gradientToon() {
    if (this._gradTex) return this._gradTex;
    const donnees = new Uint8Array([90, 150, 210, 255]);
    const tex = new THREE.DataTexture(donnees, 4, 1, THREE.LuminanceFormat);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    tex.needsUpdate = true;
    this._gradTex = tex;
    return tex;
  },

  // Matériau standard du style : toon, sauf pour le métal
  _mat(couleur, options) {
    const o = options || {};
    if (o.metalness && o.metalness > 0.3) {
      return new THREE.MeshStandardMaterial({
        color: couleur, roughness: o.roughness !== undefined ? o.roughness : 0.4,
        metalness: o.metalness
      });
    }
    const m = new THREE.MeshToonMaterial({
      color: couleur,
      gradientMap: this._gradientToon()
    });
    if (o.emissive) {
      m.emissive = new THREE.Color(o.emissive);
      m.emissiveIntensity = o.emissiveIntensity || 0.8;
    }
    return m;
  },

  // Contours : ajoute à chaque forme une silhouette sombre
  // (le même volume, légèrement gonflé, vu de l'intérieur).
  _matContour() {
    if (!this._contourMat) {
      this._contourMat = new THREE.MeshBasicMaterial({
        color: 0x241016, side: THREE.BackSide
      });
    }
    return this._contourMat;
  },

  _appliquerContours(groupe, epaisseur) {
    const ep = epaisseur || 1.05;
    const cibles = [];
    groupe.traverse(m => {
      if (m.isMesh && !m.userData.sansContour && !m.userData.estContour) cibles.push(m);
    });
    cibles.forEach(m => {
      // déjà un contour ? (ex : arme traitée avant d'être mise en main)
      if (m.children.some(c => c.userData && c.userData.estContour)) return;
      if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere();
      const echelle = Math.max(m.scale.x, m.scale.y, m.scale.z);
      const rayon = m.geometry.boundingSphere.radius * echelle;
      if (rayon < 0.045) return;   // trop petit : pas de contour (reflets, narines…)
      const contour = new THREE.Mesh(m.geometry, this._matContour());
      contour.scale.setScalar(ep);
      contour.userData.estContour = true;
      m.add(contour);
    });
  },

  // ---- Briques de base ----
  _bloc(l, h, p, couleur) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(l, h, p), this._mat(couleur));
    m.castShadow = true; m.receiveShadow = true;
    return m;
  },

  _ovale(rx, ry, rz, couleur, options) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), this._mat(couleur, options));
    m.scale.set(rx, ry, rz);
    m.castShadow = true;
    return m;
  },


  _oeil(x, y, z, taille, couleurIris) {
    const g = new THREE.Group();
    const blanc = this._ovale(taille, taille * 1.25, taille * 0.55, 0xFDF6E3);
    const iris = this._ovale(taille * 0.55, taille * 0.7, taille * 0.3, couleurIris || 0x2E7D53);
    iris.position.z = taille * 0.4;
    iris.userData.sansContour = true;
    const pupille = this._ovale(taille * 0.28, taille * 0.38, taille * 0.2, 0x1a1c2e);
    pupille.position.z = taille * 0.55;
    pupille.userData.sansContour = true;
    const reflet = this._ovale(taille * 0.12, taille * 0.12, taille * 0.08, 0xFFFFFF);
    reflet.position.set(taille * 0.18, taille * 0.3, taille * 0.62);
    reflet.userData.sansContour = true;
    g.add(blanc, iris, pupille, reflet);
    g.position.set(x, y, z);
    return g;
  },


  // ============================================================
  //  COMPAGNONS
  //  1) Si le compagnon a un "fichier" (.glb), on charge le
  //     vrai modèle 3D (graphisme pro, voir data/companions.js).
  //  2) Sinon, mascotte "dessin animé" faite maison.
  // ============================================================
  construireCompagnon(comp) {
    if (!comp || comp.forme === "aucun") return null;

    // ---- Modèle .glb personnalisé ----
    if (comp.fichier) {
      const g = new THREE.Group();
      g.userData.animes = [];
      if (typeof THREE.GLTFLoader === "function") {
        new THREE.GLTFLoader().load(
          comp.fichier,
          (gltf) => {
            const scene = gltf.scene;
            scene.traverse(m => { if (m.isMesh) { m.castShadow = true; } });

            // MISE À L'ÉCHELLE AUTOMATIQUE : on mesure le modèle et on
            // le ramène à ~1.2 unité de haut. "echelle" est un simple
            // multiplicateur (1 = taille normale, 2 = deux fois plus grand).
            const boite = new THREE.Box3().setFromObject(scene);
            const hauteur = boite.max.y - boite.min.y;
            if (hauteur > 0.0001) {
              const facteur = (1.2 * (comp.echelle || 1)) / hauteur;
              scene.scale.setScalar(facteur);
              // et on pose les pieds au niveau du sol
              const boite2 = new THREE.Box3().setFromObject(scene);
              scene.position.y -= boite2.min.y;
            }
            g.add(scene);

            // Animations : marche, sinon vol, sinon course, sinon idle…
            if (gltf.animations && gltf.animations.length) {
              g.userData.mixer = new THREE.AnimationMixer(scene);
              g.userData.clips = gltf.animations;
              const prefere = (motif) => gltf.animations.find(c => motif.test(c.name));
              const clip = prefere(/walk|marche/i) || prefere(/fast_flying/i) ||
                           prefere(/run|course/i) || prefere(/flying_idle|fly/i) ||
                           prefere(/idle|attente/i) || gltf.animations[0];
              g.userData.mixer.clipAction(clip).play();
            }
          },
          undefined,
          () => console.warn("Impossible de charger le modèle : " + comp.fichier +
            " (vérifiez le chemin, et que le jeu est bien servi par un site ou Live Server)")
        );
      }
      if (comp.vole) g.userData.vole = true;
      return g;
    }

    // ---- Mascottes faites maison ----
    const g = new THREE.Group();
    g.userData.animes = [];
    const F = comp.forme;

    if (F === "renard")        this._faireRenard(g, comp);
    else if (F === "dragon")   this._faireDragon(g, comp);
    else if (F === "chouette") this._faireChouette(g, comp);
    else if (F === "lapin")    this._faireLapin(g, comp);
    else if (F === "axo")      this._faireAxo(g, comp);
    else if (F === "drone")    this._faireDrone(g, comp);

    g.traverse(m => { if (m.isMesh) m.castShadow = true; });
    this._appliquerContours(g, 1.06);
    return g;
  },

  _corpsMascotte(g, comp, options) {
    const o = options || {};
    const blanc = 0xFDF6E3;

    [-1, 1].forEach(c => {
      const jambe = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.16, 12), this._mat(comp.corps));
      jambe.position.set(0.08 * c, 0.14, 0);
      jambe.castShadow = true;
      const chaussure = this._ovale(0.08, 0.055, 0.13, o.chaussures || 0xEF6461);
      chaussure.position.set(0.08 * c, 0.05, 0.03);
      const bout = this._ovale(0.05, 0.04, 0.05, blanc);
      bout.position.set(0.08 * c, 0.05, 0.13);
      g.add(jambe, chaussure, bout);
    });

    const corps = this._ovale(0.17, 0.2, 0.14, comp.corps);
    corps.position.set(0, 0.36, 0);
    g.add(corps);
    const ventre = this._ovale(0.11, 0.14, 0.06, o.ventre || comp.accent);
    ventre.position.set(0, 0.34, 0.1);
    ventre.userData.sansContour = true;
    g.add(ventre);

    [-1, 1].forEach(c => {
      const bras = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.17, 12), this._mat(comp.corps));
      bras.position.set(0.19 * c, 0.38, 0);
      bras.rotation.z = 0.5 * c;
      bras.castShadow = true;
      const gant = this._ovale(0.055, 0.055, 0.055, blanc);
      gant.position.set(0.24 * c, 0.3, 0);
      g.add(bras, gant);
    });

    const tete = this._ovale(0.24, 0.23, 0.22, comp.corps);
    tete.position.set(0, 0.74, 0.02);
    g.add(tete);

    const iris = o.iris || 0x2E7D53;
    g.add(this._oeil(-0.09, 0.78, 0.2, 0.06, iris));
    g.add(this._oeil( 0.09, 0.78, 0.2, 0.06, iris));
  },

  _faireRenard(g, comp) {
    this._corpsMascotte(g, comp, { iris: 0x2E7D53, chaussures: 0xEF6461 });
    const museau = this._ovale(0.1, 0.075, 0.1, comp.accent);
    museau.position.set(0, 0.68, 0.22);
    const truffe = this._ovale(0.028, 0.024, 0.028, 0x1a1c2e);
    truffe.position.set(0, 0.7, 0.31);
    truffe.userData.sansContour = true;
    g.add(museau, truffe);
    [-1, 1].forEach(c => {
      const joue = this._ovale(0.06, 0.05, 0.04, comp.accent);
      joue.position.set(0.18 * c, 0.68, 0.14);
      g.add(joue);
    });
    [-1, 1].forEach(cote => {
      const piv = new THREE.Group();
      piv.position.set(0.13 * cote, 0.92, 0);
      const ext = this._ovale(0.07, 0.14, 0.045, comp.corps);
      ext.position.y = 0.09;
      const int = this._ovale(0.04, 0.09, 0.03, comp.accent);
      int.position.set(0, 0.08, 0.025);
      int.userData.sansContour = true;
      const pointe = this._ovale(0.035, 0.05, 0.03, 0x1a1c2e);
      pointe.position.y = 0.19;
      piv.add(ext, int, pointe);
      piv.rotation.z = -0.2 * cote;
      g.add(piv);
      g.userData.animes.push({ o: piv, type: "oreilles", cote: cote });
    });
    const queue = new THREE.Group();
    queue.position.set(0, 0.3, -0.13);
    const q1 = this._ovale(0.09, 0.09, 0.12, comp.corps); q1.position.set(0, 0.02, -0.1);
    const q2 = this._ovale(0.11, 0.11, 0.13, comp.corps); q2.position.set(0, 0.1, -0.24);
    const q3 = this._ovale(0.09, 0.09, 0.11, comp.accent); q3.position.set(0, 0.2, -0.35);
    queue.add(q1, q2, q3);
    g.add(queue);
    g.userData.animes.push({ o: queue, type: "queue" });
  },

  _faireDragon(g, comp) {
    this._corpsMascotte(g, comp, { iris: 0xC98A2B, chaussures: 0x845EC2 });
    const museau = this._ovale(0.11, 0.07, 0.1, comp.corps);
    museau.position.set(0, 0.67, 0.22);
    g.add(museau);
    [-1, 1].forEach(c => {
      const n = this._ovale(0.014, 0.014, 0.014, 0x1a1c2e);
      n.position.set(0.04 * c, 0.69, 0.31);
      n.userData.sansContour = true;
      g.add(n);
    });
    [-1, 1].forEach(c => {
      const corne = this._ovale(0.035, 0.09, 0.035, comp.accent);
      corne.position.set(0.11 * c, 0.95, -0.02);
      corne.rotation.z = -0.35 * c;
      g.add(corne);
    });
    [-1, 1].forEach(cote => {
      const piv = new THREE.Group();
      piv.position.set(0.12 * cote, 0.45, -0.12);
      const aile = this._ovale(0.14, 0.08, 0.03, comp.accent);
      aile.position.x = 0.14 * cote;
      aile.rotation.z = 0.35 * cote;
      piv.add(aile);
      g.add(piv);
      g.userData.animes.push({ o: piv, type: "ailes", cote: cote });
    });
    const queue = new THREE.Group();
    queue.position.set(0, 0.26, -0.1);
    const seg = this._ovale(0.06, 0.06, 0.16, comp.corps); seg.position.set(0, 0, -0.12);
    const pointe = this._ovale(0.045, 0.045, 0.08, comp.accent);
    pointe.position.set(0, 0, -0.28);
    queue.add(seg, pointe);
    g.add(queue);
    g.userData.animes.push({ o: queue, type: "queue" });
  },

  _faireChouette(g, comp) {
    const blanc = 0xFDF6E3;
    const corps = this._ovale(0.22, 0.3, 0.2, comp.corps);
    corps.position.set(0, 0.4, 0);
    const ventre = this._ovale(0.15, 0.22, 0.1, comp.accent);
    ventre.position.set(0, 0.36, 0.12);
    ventre.userData.sansContour = true;
    g.add(corps, ventre);
    g.add(this._oeil(-0.1, 0.56, 0.16, 0.075, 0xC98A2B));
    g.add(this._oeil( 0.1, 0.56, 0.16, 0.075, 0xC98A2B));
    const bec = this._ovale(0.035, 0.05, 0.06, 0xFFB347);
    bec.position.set(0, 0.47, 0.24);
    g.add(bec);
    [-1, 1].forEach(c => {
      const touffe = this._ovale(0.035, 0.08, 0.035, comp.corps);
      touffe.position.set(0.13 * c, 0.72, 0);
      touffe.rotation.z = -0.35 * c;
      g.add(touffe);
    });
    [-1, 1].forEach(cote => {
      const piv = new THREE.Group();
      piv.position.set(0.2 * cote, 0.48, 0);
      const aile = this._ovale(0.06, 0.2, 0.12, comp.corps);
      aile.position.y = -0.12;
      piv.add(aile);
      piv.rotation.z = 0.22 * cote;
      g.add(piv);
      g.userData.animes.push({ o: piv, type: "ailes", cote: cote, doux: true });
    });
    [-1, 1].forEach(c => {
      const patte = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.1, 10), this._mat(0xFFB347));
      patte.position.set(0.08 * c, 0.06, 0.02);
      patte.castShadow = true;
      g.add(patte);
    });
    [-1, 1].forEach(c => {
      const sourcil = this._ovale(0.07, 0.02, 0.03, blanc);
      sourcil.position.set(0.1 * c, 0.66, 0.17);
      sourcil.rotation.z = 0.25 * c;
      sourcil.userData.sansContour = true;
      g.add(sourcil);
    });
  },

  _faireLapin(g, comp) {
    this._corpsMascotte(g, comp, { iris: 0x845EC2, chaussures: 0x43BCCD });
    const museau = this._ovale(0.09, 0.06, 0.07, 0xFDF6E3);
    museau.position.set(0, 0.68, 0.2);
    const truffe = this._ovale(0.022, 0.018, 0.02, comp.accent);
    truffe.position.set(0, 0.72, 0.27);
    truffe.userData.sansContour = true;
    const dents = this._ovale(0.028, 0.026, 0.014, 0xFFFFFF);
    dents.position.set(0, 0.63, 0.24);
    dents.userData.sansContour = true;
    g.add(museau, truffe, dents);
    [-1, 1].forEach(cote => {
      const piv = new THREE.Group();
      piv.position.set(0.09 * cote, 0.93, -0.02);
      const ext = this._ovale(0.05, 0.19, 0.03, comp.corps);
      ext.position.y = 0.15;
      const int = this._ovale(0.028, 0.13, 0.02, comp.accent);
      int.position.set(0, 0.15, 0.022);
      int.userData.sansContour = true;
      piv.add(ext, int);
      piv.rotation.z = -0.15 * cote;
      g.add(piv);
      g.userData.animes.push({ o: piv, type: "oreilles", cote: cote });
    });
    const pompon = this._ovale(0.08, 0.08, 0.08, 0xFDF6E3);
    pompon.position.set(0, 0.3, -0.15);
    g.add(pompon);
    [-1, 1].forEach(c => {
      const joue = this._ovale(0.045, 0.035, 0.03, comp.accent);
      joue.position.set(0.16 * c, 0.68, 0.15);
      joue.userData.sansContour = true;
      g.add(joue);
    });
  },

  _faireAxo(g, comp) {
    this._corpsMascotte(g, comp, { iris: 0x3C6E8F, chaussures: 0xFFD166, ventre: 0xFDE8EE });
    const sourire = new THREE.Mesh(
      new THREE.TorusGeometry(0.045, 0.01, 6, 12, Math.PI),
      this._mat(0x8f4a3c)
    );
    sourire.position.set(0, 0.68, 0.21);
    sourire.rotation.x = Math.PI;
    sourire.userData.sansContour = true;
    g.add(sourire);
    [-1, 1].forEach(c => {
      const joue = this._ovale(0.04, 0.03, 0.02, comp.accent);
      joue.position.set(0.15 * c, 0.7, 0.17);
      joue.userData.sansContour = true;
      g.add(joue);
    });
    [-1, 1].forEach(cote => {
      [-0.05, 0.02, 0.09].forEach((h, i) => {
        const piv = new THREE.Group();
        piv.position.set(0.2 * cote, 0.76 + h, 0.02);
        const tige = this._ovale(0.015, 0.015, 0.07, comp.accent);
        tige.position.set(0.05 * cote, 0.01, 0);
        tige.rotation.y = 0.6 * cote;
        tige.userData.sansContour = true;
        const boule = this._ovale(0.03, 0.03, 0.03, comp.accent);
        boule.position.set(0.1 * cote, 0.02, -0.02);
        boule.userData.sansContour = true;
        piv.add(tige, boule);
        g.add(piv);
        g.userData.animes.push({ o: piv, type: "branchies", cote: cote, decale: i });
      });
    });
    const queue = new THREE.Group();
    queue.position.set(0, 0.3, -0.12);
    const nageoire = this._ovale(0.02, 0.1, 0.14, comp.accent);
    nageoire.position.set(0, 0.02, -0.1);
    queue.add(nageoire);
    g.add(queue);
    g.userData.animes.push({ o: queue, type: "queue" });
  },

  _faireDrone(g, comp) {
    const matCorps = new THREE.MeshStandardMaterial({
      color: comp.corps, roughness: 0.35, metalness: 0.65
    });
    const matLum = new THREE.MeshStandardMaterial({
      color: comp.accent, emissive: comp.accent, emissiveIntensity: 0.9, roughness: 0.4
    });
    const corps = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 18), matCorps);
    corps.position.y = 0.5;
    const oeil = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 12), matLum);
    oeil.position.set(0, 0.52, 0.24);
    oeil.userData.sansContour = true;
    const anneau = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 10, 32), matLum);
    anneau.rotation.x = Math.PI / 2;
    anneau.position.y = 0.5;
    anneau.userData.sansContour = true;
    g.add(corps, oeil, anneau);
    g.userData.animes.push({ o: anneau, type: "anneau" });
    g.userData.vole = true;
  },

  animerCompagnon(comp, temps) {
    if (!comp) return;
    // Animations des modèles .glb (marche, etc.)
    if (comp.userData.mixer) {
      const dt = temps - (comp.userData._dernierTemps !== undefined ? comp.userData._dernierTemps : temps);
      comp.userData._dernierTemps = temps;
      if (dt > 0 && dt < 0.2) comp.userData.mixer.update(dt);
    }
    if (!comp.userData.animes) return;
    comp.userData.animes.forEach(a => {
      if (a.type === "queue") {
        a.o.rotation.y = Math.sin(temps * 6) * 0.4;
      } else if (a.type === "ailes") {
        const amp = a.doux ? 0.1 : 0.5;
        const vit = a.doux ? 3 : 9;
        a.o.rotation.z = (a.cote * 0.25) + Math.sin(temps * vit) * amp * a.cote;
      } else if (a.type === "oreilles") {
        a.o.rotation.z = (-0.16 * a.cote) + Math.sin(temps * 2.4 + a.cote) * 0.1;
      } else if (a.type === "branchies") {
        a.o.rotation.y = Math.sin(temps * 4 + a.decale * 0.9) * 0.3;
      } else if (a.type === "anneau") {
        a.o.rotation.z = temps * 2.2;
      }
    });
  }
};
