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

  _capsule(rayon, longueur, couleur) {
    const g = new THREE.Group();
    const mat = this._mat(couleur);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(rayon, rayon * 0.85, longueur, 16), mat);
    const haut = new THREE.Mesh(new THREE.SphereGeometry(rayon, 16, 12), mat);
    haut.position.y = longueur / 2;
    const basR = new THREE.Mesh(new THREE.SphereGeometry(rayon * 0.85, 16, 12), mat);
    basR.position.y = -longueur / 2;
    [tube, haut, basR].forEach(m => { m.castShadow = true; g.add(m); });
    return g;
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

  _membreRond(rayon, longueur, couleur, xPivot, yPivot) {
    const pivot = new THREE.Group();
    pivot.position.set(xPivot, yPivot, 0);
    const capsule = this._capsule(rayon, longueur * 0.8, couleur);
    capsule.position.y = -longueur / 2;
    pivot.add(capsule);
    return pivot;
  },

  // ============================================================
  //  AVATAR  —  pieds à y = 0, sommet de la tête vers y = 3.4
  // ============================================================
  construireAvatar(config) {
    const g = new THREE.Group();
    const peau = config.peau, haut = config.haut, bas = config.bas;

    const jambeG = this._membreRond(0.17, 1.1, bas, -0.24, 1.1);
    const jambeD = this._membreRond(0.17, 1.1, bas,  0.24, 1.1);
    [jambeG, jambeD].forEach(j => {
      const pied = this._ovale(0.17, 0.11, 0.28, bas);
      pied.position.set(0, -1.02, 0.07);
      j.add(pied);
    });

    const bassin = this._ovale(0.36, 0.24, 0.26, bas);
    bassin.position.set(0, 1.18, 0);
    const torse = this._ovale(0.42, 0.56, 0.3, haut);
    torse.position.set(0, 1.82, 0);
    const epauleG = this._ovale(0.16, 0.14, 0.16, haut); epauleG.position.set(-0.44, 2.24, 0);
    const epauleD = this._ovale(0.16, 0.14, 0.16, haut); epauleD.position.set( 0.44, 2.24, 0);

    const brasG = this._membreRond(0.12, 1.0, haut, -0.56, 2.26);
    const brasD = this._membreRond(0.12, 1.0, haut,  0.56, 2.26);
    [brasG, brasD].forEach(b => {
      const main = this._ovale(0.14, 0.15, 0.14, peau);
      main.position.y = -1.0;
      b.add(main);
    });

    const cou = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.2, 14), this._mat(peau));
    cou.position.set(0, 2.42, 0); cou.castShadow = true;
    const tete = this._ovale(0.42, 0.46, 0.42, peau);
    tete.position.set(0, 2.95, 0);

    // ---- Visage ----
    const irisCouleur = 0x3C6E8F;
    const oeilG = this._oeil(-0.15, 3.0, 0.34, 0.085, irisCouleur);
    const oeilD = this._oeil( 0.15, 3.0, 0.34, 0.085, irisCouleur);
    const sourcilCouleur = (config.cheveux && config.cheveux.style !== "aucun")
      ? config.cheveux.couleur : 0x3a2a1a;
    const sourcilG = this._ovale(0.09, 0.022, 0.03, sourcilCouleur);
    sourcilG.position.set(-0.15, 3.16, 0.38); sourcilG.rotation.z = 0.15;
    sourcilG.userData.sansContour = true;
    const sourcilD = this._ovale(0.09, 0.022, 0.03, sourcilCouleur);
    sourcilD.position.set(0.15, 3.16, 0.38); sourcilD.rotation.z = -0.15;
    sourcilD.userData.sansContour = true;
    const nez = this._ovale(0.055, 0.05, 0.06, peau);
    nez.position.set(0, 2.92, 0.42);
    const sourire = new THREE.Mesh(
      new THREE.TorusGeometry(0.1, 0.018, 8, 16, Math.PI),
      this._mat(0x8f4a3c)
    );
    sourire.position.set(0, 2.82, 0.38);
    sourire.rotation.x = Math.PI;
    sourire.userData.sansContour = true;

    g.add(jambeG, jambeD, bassin, torse, epauleG, epauleD,
          brasG, brasD, cou, tete, oeilG, oeilD,
          sourcilG, sourcilD, nez, sourire);

    // ---- Accessoires ----
    this._ajouterCheveux(g, config.cheveux);
    this._ajouterChapeau(g, config.chapeau);
    this._ajouterLunettes(g, config.lunettes);
    this._ajouterCape(g, config.cape);
    this._ajouterChaussures(g, jambeG, jambeD, config.chaussures);
    this._ajouterSac(g, config.sac);
    this._ajouterBijou(g, brasG, config.bijou);
    this._ajouterTatouage(brasG, config.tatouage);

    // ---- Arme : TENUE dans la main, pointée vers l'avant ----
    const porteArme = new THREE.Group();
    porteArme.position.set(0, -1.0, 0.14);
    // le manche est dans la paume, la lame part devant, un peu relevée
    porteArme.rotation.x = Math.PI / 2 - 0.35;
    brasD.add(porteArme);
    if (config.arme) {
      const arme = this.construireArme(config.arme);
      if (arme) { arme.position.y = -0.1; porteArme.add(arme); }
    }

    g.userData.jambeG = jambeG;
    g.userData.jambeD = jambeD;
    g.userData.brasG = brasG;
    g.userData.brasD = brasD;
    g.userData.porteArme = porteArme;

    this._appliquerContours(g);
    return g;
  },

  // ------------------------------------------------------------
  //  Accessoires
  // ------------------------------------------------------------
  _trouve(liste, id) {
    if (!id || id === "aucun") return null;
    return (window.GAME_DATA[liste] || []).find(a => a.id === id) || null;
  },

  _ajouterCheveux(g, cheveux) {
    if (!cheveux || cheveux.style === "aucun") return;
    const c = cheveux.couleur || "#5B3A1E";
    const calotte = () => {
      const ca = this._ovale(0.45, 0.3, 0.45, c);
      ca.position.set(0, 3.15, -0.03);
      g.add(ca);
    };

    if (cheveux.style === "court" || cheveux.style === "long") {
      calotte();
      [-0.16, 0, 0.16].forEach((x, i) => {
        const meche = this._ovale(0.09, 0.13, 0.09, c);
        meche.position.set(x, 3.3 - (i % 2) * 0.03, 0.3);
        g.add(meche);
      });
    }
    if (cheveux.style === "long") {
      const arriere = this._ovale(0.38, 0.5, 0.16, c);
      arriere.position.set(0, 2.75, -0.34);
      g.add(arriere);
    }
    if (cheveux.style === "iroquois") {
      for (let i = 0; i < 5; i++) {
        const pointe = this._ovale(0.08, 0.17 - Math.abs(i - 2) * 0.02, 0.1, c);
        pointe.position.set(0, 3.36, 0.28 - i * 0.15);
        pointe.rotation.x = (i - 2) * 0.18;
        g.add(pointe);
      }
    }
    if (cheveux.style === "couettes") {
      calotte();
      [-1, 1].forEach(cote => {
        const attache = this._ovale(0.07, 0.07, 0.07, 0xEF6461);
        attache.position.set(0.42 * cote, 3.05, -0.05);
        const couette = this._ovale(0.1, 0.24, 0.1, c);
        couette.position.set(0.5 * cote, 2.8, -0.05);
        couette.rotation.z = 0.35 * cote;
        const bout = this._ovale(0.08, 0.1, 0.08, c);
        bout.position.set(0.56 * cote, 2.58, -0.05);
        g.add(attache, couette, bout);
      });
    }
    if (cheveux.style === "banane") {
      calotte();
      // grosse mèche roulée vers l'avant, en trois volumes
      const b1 = this._ovale(0.3, 0.16, 0.2, c); b1.position.set(0, 3.42, 0.18);
      const b2 = this._ovale(0.24, 0.14, 0.16, c); b2.position.set(0, 3.5, 0.34);
      const b3 = this._ovale(0.16, 0.1, 0.12, c); b3.position.set(0, 3.44, 0.48);
      g.add(b1, b2, b3);
    }
    if (cheveux.style === "boucles") {
      // nuage de petites boules sur tout le crâne
      const positions = [
        [0, 3.35, 0], [0.22, 3.28, 0.16], [-0.22, 3.28, 0.16],
        [0.3, 3.2, -0.1], [-0.3, 3.2, -0.1], [0, 3.3, -0.28],
        [0.15, 3.38, 0.22], [-0.15, 3.38, 0.22], [0, 3.25, 0.32]
      ];
      positions.forEach(p => {
        const boucle = this._ovale(0.14, 0.13, 0.14, c);
        boucle.position.set(p[0], p[1], p[2]);
        g.add(boucle);
      });
    }
  },

  _ajouterChapeau(g, id) {
    const ch = this._trouve("chapeaux", id);
    if (!ch) return;
    if (ch.id === "casquette") {
      const dome = this._ovale(0.46, 0.24, 0.46, ch.couleur);
      dome.position.set(0, 3.28, 0);
      const visiere = this._ovale(0.28, 0.035, 0.24, ch.couleur);
      visiere.position.set(0, 3.22, 0.52);
      const bouton = this._ovale(0.05, 0.05, 0.05, ch.couleur);
      bouton.position.set(0, 3.5, 0);
      g.add(dome, visiere, bouton);
    } else if (ch.id === "hautforme") {
      const bord = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.06, 28), this._mat(ch.couleur));
      bord.position.set(0, 3.32, 0); bord.castShadow = true;
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.36, 0.62, 28), this._mat(ch.couleur));
      tube.position.set(0, 3.66, 0); tube.castShadow = true;
      const ruban = new THREE.Mesh(new THREE.CylinderGeometry(0.365, 0.37, 0.1, 28), this._mat(0xEF6461));
      ruban.position.set(0, 3.42, 0);
      g.add(bord, tube, ruban);
    } else if (ch.id === "couronne") {
      const anneau = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.44, 0.2, 24, 1, true),
        this._mat(ch.couleur, { metalness: 0.6, roughness: 0.3 })
      );
      anneau.material.side = THREE.DoubleSide;
      anneau.position.set(0, 3.38, 0);
      g.add(anneau);
      // pointes arrondies + joyau
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const pointe = this._ovale(0.05, 0.1, 0.05, ch.couleur);
        pointe.position.set(Math.cos(a) * 0.4, 3.53, Math.sin(a) * 0.4);
        g.add(pointe);
      }
      const joyau = this._ovale(0.06, 0.07, 0.04, 0xEF6461);
      joyau.position.set(0, 3.4, 0.43);
      g.add(joyau);
    } else if (ch.id === "bandana") {
      const bande = this._ovale(0.45, 0.16, 0.45, ch.couleur);
      bande.position.set(0, 3.22, 0);
      const noeud = this._ovale(0.09, 0.08, 0.08, ch.couleur);
      noeud.position.set(0, 3.14, -0.42);
      const panG = this._ovale(0.06, 0.16, 0.04, ch.couleur);
      panG.position.set(-0.08, 2.98, -0.46); panG.rotation.z = 0.3;
      const panD = this._ovale(0.06, 0.14, 0.04, ch.couleur);
      panD.position.set(0.07, 3.0, -0.46); panD.rotation.z = -0.25;
      g.add(bande, noeud, panG, panD);
    } else if (ch.id === "paille") {
      const dome = this._ovale(0.36, 0.22, 0.36, ch.couleur);
      dome.position.set(0, 3.32, 0);
      const bord = this._ovale(0.68, 0.045, 0.68, ch.couleur);
      bord.position.set(0, 3.26, 0);
      const ruban = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.36, 0.08, 24), this._mat(0xEF6461));
      ruban.position.set(0, 3.3, 0);
      g.add(dome, bord, ruban);
    } else if (ch.id === "bonnet") {
      const dome = this._ovale(0.46, 0.32, 0.46, ch.couleur);
      dome.position.set(0, 3.24, 0);
      const revers = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.47, 0.14, 24), this._mat(0xFDF6E3));
      revers.position.set(0, 3.1, 0);
      const pompon = this._ovale(0.11, 0.11, 0.11, 0xFDF6E3);
      pompon.position.set(0, 3.6, 0);
      g.add(dome, revers, pompon);
    } else if (ch.id === "viking") {
      const dome = this._ovale(0.46, 0.28, 0.46, ch.couleur, { metalness: 0.5, roughness: 0.4 });
      dome.position.set(0, 3.22, 0);
      [-1, 1].forEach(cote => {
        const base = this._ovale(0.09, 0.12, 0.09, 0xE8C979);
        base.position.set(0.42 * cote, 3.3, 0);
        base.rotation.z = -0.5 * cote;
        const corne = this._ovale(0.06, 0.16, 0.06, 0xFDF6E3);
        corne.position.set(0.52 * cote, 3.46, 0);
        corne.rotation.z = -0.5 * cote;
        g.add(base, corne);
      });
      g.add(dome);
    }
  },

  _ajouterLunettes(g, id) {
    const lu = this._trouve("lunettes", id);
    if (!lu) return;
    if (lu.id === "soleil") {
      [-1, 1].forEach(c => {
        const verre = this._ovale(0.12, 0.09, 0.03, lu.couleur);
        verre.position.set(0.15 * c, 3.0, 0.4);
        g.add(verre);
      });
      const pont = this._ovale(0.05, 0.02, 0.02, lu.couleur);
      pont.position.set(0, 3.02, 0.42);
      g.add(pont);
    } else if (lu.id === "rondes") {
      [-1, 1].forEach(c => {
        const cercle = new THREE.Mesh(
          new THREE.TorusGeometry(0.1, 0.018, 8, 20),
          this._mat(lu.couleur, { metalness: 0.5, roughness: 0.4 })
        );
        cercle.position.set(0.15 * c, 3.0, 0.41);
        cercle.castShadow = true;
        g.add(cercle);
      });
      const pont = this._ovale(0.045, 0.016, 0.016, lu.couleur);
      pont.position.set(0, 3.02, 0.42);
      g.add(pont);
    } else if (lu.id === "masque") {
      const bande = this._ovale(0.4, 0.11, 0.1, lu.couleur);
      bande.position.set(0, 3.0, 0.36);
      [-1, 1].forEach(c => {
        const trou = this._ovale(0.08, 0.06, 0.03, 0xFDF6E3);
        trou.position.set(0.15 * c, 3.0, 0.44);
        trou.userData.sansContour = true;
        g.add(trou);
      });
      g.add(bande);
    }
  },

  _ajouterCape(g, id) {
    const ca = this._trouve("capes", id);
    if (!ca) return;
    // grand pan souple dans le dos + attaches aux épaules
    const pan = this._ovale(0.48, 0.85, 0.07, ca.couleur);
    pan.position.set(0, 1.6, -0.34);
    const col = this._ovale(0.3, 0.08, 0.12, ca.couleur);
    col.position.set(0, 2.34, -0.16);
    [-1, 1].forEach(c => {
      const attache = this._ovale(0.06, 0.06, 0.05, 0xFFD166);
      attache.position.set(0.3 * c, 2.34, 0.12);
      g.add(attache);
    });
    g.add(pan, col);
    if (ca.id === "royale") {
      const bordure = this._ovale(0.48, 0.1, 0.08, 0xFFD166);
      bordure.position.set(0, 1.2, -0.36);
      g.add(bordure);
    }
    if (ca.id === "nuit") {
      // petites étoiles sur la cape
      [[-0.2, 1.8], [0.15, 1.55], [-0.05, 1.3]].forEach(p => {
        const etoile = this._ovale(0.045, 0.045, 0.02, 0xFFD166);
        etoile.position.set(p[0], p[1], -0.41);
        etoile.userData.sansContour = true;
        g.add(etoile);
      });
    }
  },

  _ajouterChaussures(g, jambeG, jambeD, id) {
    const ch = this._trouve("chaussures", id);
    if (!ch) return;
    [jambeG, jambeD].forEach(jambe => {
      if (ch.id === "cowboy") {
        const tige = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.35, 14), this._mat(ch.couleur));
        tige.position.set(0, -0.88, 0); tige.castShadow = true;
        const pied = this._ovale(0.18, 0.12, 0.3, ch.couleur);
        pied.position.set(0, -1.03, 0.1);
        const bout = this._ovale(0.1, 0.09, 0.1, 0xE8C979);
        bout.position.set(0, -1.05, 0.34);
        jambe.add(tige, pied, bout);
      } else {
        const chaussure = this._ovale(0.19, 0.14, 0.32, ch.couleur);
        chaussure.position.set(0, -1.02, 0.09);
        const bout = this._ovale(0.13, 0.1, 0.12, 0xFDF6E3);
        bout.position.set(0, -1.04, 0.33);
        const semelle = this._ovale(0.19, 0.045, 0.32, 0xFDF6E3);
        semelle.position.set(0, -1.1, 0.09);
        jambe.add(chaussure, bout, semelle);
        if (ch.id === "neon") {
          const bande = this._ovale(0.2, 0.03, 0.3, 0x7CFC9A, { emissive: 0x7CFC9A });
          bande.position.set(0, -1.07, 0.09);
          bande.userData.sansContour = true;
          jambe.add(bande);
        }
      }
    });
  },

  _ajouterSac(g, id) {
    const s = this._trouve("sacs", id);
    if (!s) return;
    if (s.id === "banane") {
      const poche = this._ovale(0.22, 0.13, 0.12, s.couleur);
      poche.position.set(0.12, 1.25, 0.24);
      poche.rotation.z = -0.25;
      const boucle = this._ovale(0.05, 0.04, 0.03, 0x1E1B18);
      boucle.position.set(0.12, 1.31, 0.32);
      g.add(poche, boucle);
      return;
    }
    const sac = this._ovale(0.32, 0.4, 0.16, s.couleur);
    sac.position.set(0, 1.9, -0.42);
    const poche = this._ovale(0.17, 0.16, 0.09, s.couleur);
    poche.position.set(0, 1.66, -0.52);
    const rabat = this._ovale(0.28, 0.14, 0.1, s.couleur);
    rabat.position.set(0, 2.14, -0.44);
    [-1, 1].forEach(c => {
      const sangle = this._ovale(0.045, 0.3, 0.04, 0x3a2a1a);
      sangle.position.set(0.22 * c, 2.0, -0.18);
      sangle.rotation.x = 0.35;
      g.add(sangle);
    });
    g.add(sac, poche, rabat);
  },

  _ajouterBijou(g, brasG, id) {
    const b = this._trouve("bijoux", id);
    if (!b) return;
    if (b.id === "boucles") {
      [-1, 1].forEach(c => {
        const anneau = new THREE.Mesh(
          new THREE.TorusGeometry(0.05, 0.014, 8, 16),
          this._mat(b.couleur, { metalness: 0.7, roughness: 0.3 })
        );
        anneau.position.set(0.42 * c, 2.86, 0.02);
        anneau.castShadow = true;
        g.add(anneau);
      });
    } else if (b.id === "montre") {
      const bracelet = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.13, 0.07, 16),
        this._mat(0x1E1B18)
      );
      bracelet.position.y = -0.82;
      const cadran = this._ovale(0.07, 0.03, 0.07, b.couleur);
      cadran.position.set(0, -0.82, 0.1);
      cadran.rotation.x = Math.PI / 2;
      brasG.add(bracelet, cadran);
    } else {
      const collier = new THREE.Mesh(
        new THREE.TorusGeometry(0.24, 0.045, 10, 24),
        this._mat(b.couleur, { metalness: 0.7, roughness: 0.3 })
      );
      collier.rotation.x = Math.PI / 2.4;
      collier.position.set(0, 2.36, 0.1);
      collier.castShadow = true;
      g.add(collier);
      const pendentif = this._ovale(0.05, 0.06, 0.03, b.couleur);
      pendentif.position.set(0, 2.2, 0.3);
      g.add(pendentif);
    }
  },

  _ajouterTatouage(brasG, id) {
    const t = this._trouve("tatouages", id);
    if (!t) return;
    const motif = this._ovale(0.06, 0.06, 0.02, t.couleur);
    motif.position.set(0, -0.45, 0.12);
    motif.userData.sansContour = true;
    brasG.add(motif);
  },

  // ============================================================
  //  ARMES  —  construites le long de +Y, manche à l'origine
  //  (une fois en main, elles pointent vers l'avant)
  // ============================================================
  construireArme(idArme) {
    const a = (window.GAME_DATA.armes || []).find(x => x.id === idArme);
    if (!a) return null;
    const g = new THREE.Group();
    const mat1 = this._mat(a.couleur1);
    const mat2 = this._mat(a.couleur2, { metalness: 0.4, roughness: 0.4 });

    if (a.modele === "baton") {
      const manche = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 1.1, 12), mat1);
      manche.position.y = 0.4;
      const noeud = this._ovale(0.08, 0.06, 0.08, a.couleur1);
      noeud.position.y = 0.7;
      g.add(manche, noeud);
    } else if (a.modele === "epee") {
      const lame = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.0, 0.03), mat2);
      lame.position.y = 0.75;
      const pointe = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.14, 4), mat2);
      pointe.position.y = 1.3; pointe.rotation.y = Math.PI / 4;
      const garde = this._ovale(0.2, 0.045, 0.06, a.couleur2);
      garde.position.y = 0.24;
      const poignee = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.26, 10), mat1);
      poignee.position.y = 0.08;
      const pommeau = this._ovale(0.06, 0.06, 0.06, a.couleur2);
      pommeau.position.y = -0.06;
      g.add(lame, pointe, garde, poignee, pommeau);
    } else if (a.modele === "hache") {
      const manche = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 1.0, 10), mat1);
      manche.position.y = 0.4;
      const tete = this._ovale(0.2, 0.16, 0.05, a.couleur2);
      tete.position.set(0.16, 0.8, 0);
      const tranchant = this._ovale(0.06, 0.19, 0.04, 0xFDF6E3);
      tranchant.position.set(0.32, 0.8, 0);
      g.add(manche, tete, tranchant);
    } else if (a.modele === "marteau") {
      const manche = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.9, 10), mat1);
      manche.position.y = 0.35;
      const tete = this._ovale(0.14, 0.12, 0.24, a.couleur2);
      tete.position.set(0, 0.78, 0);
      const cercle = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.26, 12), this._mat(a.couleur1));
      cercle.rotation.x = Math.PI / 2;
      cercle.position.set(0, 0.78, 0);
      g.add(manche, tete, cercle);
    }
    g.traverse(m => { if (m.isMesh) m.castShadow = true; });
    this._appliquerContours(g, 1.06);
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


/* ============================================================
   APERÇU  —  petite scène 3D qui tourne dans les menus
   ============================================================ */
window.Apercu = {
  renderer: null, scene: null, camera: null,
  modele: null, conteneur: null, angle: 0, _horloge: null,

  init(conteneur) {
    this.conteneur = conteneur;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    conteneur.appendChild(this.renderer.domElement);

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x553333, 0.95));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(3, 6, 4);
    this.scene.add(dir);

    const socle = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.4, 0.3, 32),
      new THREE.MeshStandardMaterial({ color: 0x3a0e13, roughness: 1 })
    );
    socle.position.y = -0.15;
    this.scene.add(socle);

    this._horloge = new THREE.Clock();
    this._redimensionner();
    window.addEventListener("resize", () => this._redimensionner());
    this._boucle();
  },

  _redimensionner() {
    if (!this.conteneur) return;
    const l = this.conteneur.clientWidth || 300;
    const h = this.conteneur.clientHeight || 360;
    this.renderer.setSize(l, h, false);
    this.camera.aspect = l / h;
    this.camera.updateProjectionMatrix();
  },

  montrer(type, donnees) {
    if (this.modele) { this.scene.remove(this.modele); this.modele = null; }

    if (type === "avatar") {
      this.modele = window.Perso.construireAvatar(donnees);
      this.modele.scale.setScalar(0.62);
      this.modele.position.y = 0;
      this.camera.position.set(0, 1.9, 5.4);
      this.camera.lookAt(0, 1.15, 0);
    } else {
      const m = window.Perso.construireCompagnon(donnees);
      if (m) { m.scale.setScalar(1.9); m.position.y = 0.05; this.modele = m; }
      this.camera.position.set(0, 1.3, 3.6);
      this.camera.lookAt(0, 0.95, 0);
    }
    if (this.modele) this.scene.add(this.modele);
    this._redimensionner();
  },

  _boucle() {
    requestAnimationFrame(() => this._boucle());
    const t = this._horloge.getElapsedTime();
    if (this.modele) {
      this.angle += 0.012;
      this.modele.rotation.y = this.angle;
      window.Perso.animerCompagnon(this.modele, t);
    }
    this.renderer.render(this.scene, this.camera);
  }
};
