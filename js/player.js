/* ============================================================
   PERSONNAGE  —  bonhomme cubique, couleurs au choix
   pour chaque partie du corps (tête, torse, bras, jambes)
   ============================================================ */

window.Perso = {
  COULEURS_DEFAUT: { tete: "#F2C79B", torse: "#43BCCD", bras: "#F2C79B", jambes: "#3D5A80" },

  charger() {
    const s = window.Sauvegarde.lire("perso", {});
    return Object.assign({}, this.COULEURS_DEFAUT, s);
  },

  sauver(couleurs) { window.Sauvegarde.ecrire("perso", couleurs); },

  _bloc(lx, ly, lz, couleur) {
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(lx, ly, lz),
      new THREE.MeshLambertMaterial({ color: couleur })
    );
    return m;
  },

  // Construit l'avatar : pieds à y=0, ~1.8 de haut
  construire(couleurs) {
    const c = Object.assign({}, this.COULEURS_DEFAUT, couleurs || {});
    const g = new THREE.Group();

    const tete = this._bloc(0.5, 0.5, 0.5, c.tete);
    tete.position.y = 1.55;
    // deux yeux pour lui donner vie
    const oeilG = this._bloc(0.08, 0.1, 0.02, "#222831");
    oeilG.position.set(-0.11, 1.6, 0.26);
    const oeilD = oeilG.clone(); oeilD.position.x = 0.11;

    const torse = this._bloc(0.56, 0.7, 0.32, c.torse);
    torse.position.y = 0.95;

    const brasG = new THREE.Group();
    brasG.position.set(-0.37, 1.28, 0);
    const brasGm = this._bloc(0.17, 0.66, 0.2, c.bras);
    brasGm.position.y = -0.33;
    brasG.add(brasGm);
    const brasD = new THREE.Group();
    brasD.position.set(0.37, 1.28, 0);
    const brasDm = this._bloc(0.17, 0.66, 0.2, c.bras);
    brasDm.position.y = -0.33;
    brasD.add(brasDm);

    const jambeG = new THREE.Group();
    jambeG.position.set(-0.14, 0.6, 0);
    const jambeGm = this._bloc(0.2, 0.6, 0.24, c.jambes);
    jambeGm.position.y = -0.3;
    jambeG.add(jambeGm);
    const jambeD = new THREE.Group();
    jambeD.position.set(0.14, 0.6, 0);
    const jambeDm = this._bloc(0.2, 0.6, 0.24, c.jambes);
    jambeDm.position.y = -0.3;
    jambeD.add(jambeDm);

    g.add(tete, oeilG, oeilD, torse, brasG, brasD, jambeG, jambeD);
    g.userData = { tete, oeilG, oeilD, brasG, brasD, jambeG, jambeD };
    g.traverse(m => { if (m.isMesh) { m.castShadow = true; } });
    return g;
  },

  // Balancement de marche (t = temps, vitesse = 0 à 1)
  animer(avatar, t, vitesse) {
    const u = avatar.userData;
    if (!u.brasG) return;
    const a = Math.sin(t * 9) * 0.7 * vitesse;
    u.brasG.rotation.x = a;
    u.brasD.rotation.x = -a;
    u.jambeG.rotation.x = -a;
    u.jambeD.rotation.x = a;
  },

  // Change les couleurs sans reconstruire
  peindre(avatar, couleurs) {
    const u = avatar.userData;
    if (u.tete) u.tete.material.color.set(couleurs.tete);
    if (u.brasG) u.brasG.children[0].material.color.set(couleurs.bras);
    if (u.brasD) u.brasD.children[0].material.color.set(couleurs.bras);
    if (u.jambeG) u.jambeG.children[0].material.color.set(couleurs.jambes);
    if (u.jambeD) u.jambeD.children[0].material.color.set(couleurs.jambes);
    avatar.children.forEach(enfant => {
      if (enfant.isMesh && enfant.position.y === 0.95) enfant.material.color.set(couleurs.torse);
    });
  }
};
