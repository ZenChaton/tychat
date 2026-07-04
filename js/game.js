/* ============================================================
   JEU  —  le bac à sable 3D jouable
   Nouveautés : collisions avec tous les blocs (on peut monter
   dessus), parcours de sauts, monstre à combattre (clic gauche),
   armes à ramasser (touche Ramasser), inventaire 6 cases.
   ============================================================ */

window.Jeu = {
  actif: false,
  renderer: null, scene: null, camera: null,
  avatar: null, compagnon: null,
  horloge: null, animationId: null,

  // état du joueur
  yaw: Math.PI, pitch: 0.25,
  vitesseY: 0, auSol: true,
  phaseMarche: 0,
  touches: {},

  // gameplay
  colliders: [],        // boîtes avec lesquelles on entre en collision
  objetsSol: [],        // armes posées au sol : {id, mesh, angle}
  monstre: null,
  attaque: { active: false, t: 0, touche: false, recharge: 0 },

  RAYON: 0.45,          // demi-largeur du joueur
  HAUTEUR: 2.9,         // hauteur du joueur

  reglages: null,
  _onKeyDown: null, _onKeyUp: null, _onMouseMove: null,
  _onMouseDown: null, _onResize: null, _onClickCanvas: null,

  // ============================================================
  //  DÉMARRAGE
  // ============================================================
  demarrer(config) {
    this.reglages = config.reglages;
    const canvas = config.canvas;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(config.serveur.couleurCiel);
    this.scene.fog = new THREE.Fog(config.serveur.couleurCiel, 45, 130);

    this.camera = new THREE.PerspectiveCamera(config.reglages.fov, 1, 0.1, 400);

    this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = config.reglages.ombres;

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 0.85));
    const soleil = new THREE.DirectionalLight(0xffffff, 0.9);
    soleil.position.set(20, 35, 15);
    soleil.castShadow = config.reglages.ombres;
    soleil.shadow.mapSize.set(1024, 1024);
    soleil.shadow.camera.near = 1;
    soleil.shadow.camera.far = 140;
    soleil.shadow.camera.left = -60; soleil.shadow.camera.right = 60;
    soleil.shadow.camera.top = 60;   soleil.shadow.camera.bottom = -60;
    this.scene.add(soleil);

    const sol = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 300),
      new THREE.MeshStandardMaterial({ color: config.serveur.couleurSol, roughness: 1 })
    );
    sol.rotation.x = -Math.PI / 2;
    sol.receiveShadow = true;
    this.scene.add(sol);

    // ---- Monde ----
    this.colliders = [];
    this.objetsSol = [];
    this._construireDecor(config.reglages.ombres);
    this._construireParcours();
    this._construireZoneArmes();
    this._creerMonstre();

    // ---- Avatar (toute la personnalisation + arme en main) ----
    const conf = Object.assign({}, config.perso, { arme: window.Inventaire.objetEnMain() });
    this.avatar = window.Perso.construireAvatar(conf);
    this._configPerso = config.perso;
    this.avatar.position.set(0, 0, 0);
    this.scene.add(this.avatar);

    // Quand l'inventaire change, on change l'arme en main
    window.Inventaire.onChangement = () => this._changerArmeEnMain();

    // ---- Compagnon ----
    this.compagnon = window.Perso.construireCompagnon(config.compagnon);
    if (this.compagnon) {
      this.compagnon.position.set(-2, 1, -2);
      this.scene.add(this.compagnon);
    }

    this.yaw = Math.PI; this.pitch = 0.25;
    this.vitesseY = 0; this.auSol = true; this.phaseMarche = 0;
    this.touches = {};
    this.attaque = { active: false, t: 0, touche: false, recharge: 0 };
    this.horloge = new THREE.Clock();
    this.actif = true;

    window.Inventaire.afficher();
    this._brancherEvenements(canvas);
    this._redimensionner();
    this._boucle();
  },

  // ------------------------------------------------------------
  //  Ajoute un bloc AU DÉCOR + à la liste des collisions.
  //  Tout ce qui est créé avec ça est solide.
  // ------------------------------------------------------------
  _blocSolide(x, y, z, lx, ly, lz, couleur, ombres) {
    const bloc = new THREE.Mesh(
      new THREE.BoxGeometry(lx, ly, lz),
      new THREE.MeshStandardMaterial({ color: couleur, roughness: 0.9 })
    );
    bloc.position.set(x, y, z);
    bloc.castShadow = ombres; bloc.receiveShadow = ombres;
    this.scene.add(bloc);
    this.colliders.push({
      minX: x - lx / 2, maxX: x + lx / 2,
      minY: y - ly / 2, maxY: y + ly / 2,
      minZ: z - lz / 2, maxZ: z + lz / 2
    });
    return bloc;
  },

  _construireDecor(ombres) {
    const couleurs = [0xEF6461, 0xFFD166, 0x43BCCD, 0x845EC2, 0x2E7D53, 0x4EA8DE];
    for (let i = 0; i < 26; i++) {
      const taille = 1.2 + Math.random() * 3;
      const rayon = 26 + Math.random() * 55;
      const angle = Math.random() * Math.PI * 2;
      const x = Math.cos(angle) * rayon, z = Math.sin(angle) * rayon;
      // on évite le parcours (x>10,z<-6), la zone d'armes et le monstre
      if (x > 8 && z < -4) continue;
      if (x < -12 && z > 8) continue;
      this._blocSolide(
        x, taille / 2, z, taille, taille, taille,
        couleurs[Math.floor(Math.random() * couleurs.length)], ombres
      );
    }
  },

  // ------------------------------------------------------------
  //  PARCOURS : plateformes de plus en plus hautes + drapeau
  // ------------------------------------------------------------
  _construireParcours() {
    const o = this.reglages.ombres;
    const jaune = 0xFFD166, corail = 0xEF6461;
    // départ au sol puis on monte (écarts sautables : ~2.5 de large)
    const marches = [
      [14, 0.5, -8,  3, 1, 3],
      [18, 1.2, -10, 3, 2.4, 3],
      [22, 2.0, -13, 3, 4.0, 3],
      [26, 2.8, -10, 3, 5.6, 3],
      [30, 3.6, -13, 3, 7.2, 3],
      [34, 4.4, -10, 4, 8.8, 4]
    ];
    marches.forEach((m, i) => {
      this._blocSolide(m[0], m[1], m[2], m[3], m[4], m[5], i % 2 ? corail : jaune, o);
    });
    // drapeau au sommet
    const dernier = marches[marches.length - 1];
    const mat = new THREE.MeshStandardMaterial({ color: 0xFDF6E3 });
    const poteau = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3, 8), mat);
    poteau.position.set(dernier[0], dernier[1] + dernier[4] / 2 + 1.5, dernier[2]);
    const drapeau = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.7, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x43BCCD })
    );
    drapeau.position.set(dernier[0] + 0.65, dernier[1] + dernier[4] / 2 + 2.6, dernier[2]);
    this.scene.add(poteau, drapeau);
  },

  // ------------------------------------------------------------
  //  ZONE D'ARMES : 3 socles avec une arme à ramasser dessus
  // ------------------------------------------------------------
  _construireZoneArmes() {
    const o = this.reglages.ombres;
    const armes = ["epee", "hache", "marteau"];
    armes.forEach((id, i) => {
      const x = -18 - i * 4, z = 14;
      this._blocSolide(x, 0.4, z, 1.6, 0.8, 1.6, 0x5A6472, o);
      this._poserObjetSol(id, x, 1.3, z);
    });
  },

  // Pose une arme au sol (ou sur un socle) que l'on peut ramasser
  _poserObjetSol(idArme, x, y, z) {
    const mesh = window.Perso.construireArme(idArme);
    if (!mesh) return;
    mesh.position.set(x, y, z);
    mesh.rotation.z = 0.5;
    this.scene.add(mesh);
    this.objetsSol.push({ id: idArme, mesh: mesh, yBase: y });
  },

  // ------------------------------------------------------------
  //  MONSTRE  —  le "Grognon"
  // ------------------------------------------------------------
  _creerMonstre() {
    const g = new THREE.Group();
    const P = window.Perso;
    // corps rond et trapu, style cartoon
    const corps = P._ovale(0.85, 0.8, 0.75, 0x845EC2);
    corps.position.y = 0.8;
    const ventre = P._ovale(0.55, 0.5, 0.3, 0xB9A5DE);
    ventre.position.set(0, 0.7, 0.5);
    ventre.userData.sansContour = true;
    // yeux méchants qui brillent
    const oeilG = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 12),
      new THREE.MeshStandardMaterial({ color: 0xEF6461, emissive: 0xEF6461, emissiveIntensity: 0.7 }));
    oeilG.position.set(-0.32, 1.1, 0.62);
    oeilG.userData.sansContour = true;
    const oeilD = oeilG.clone(); oeilD.position.x = 0.32;
    // sourcils froncés
    const sourcilG = P._ovale(0.18, 0.04, 0.05, 0x1a1c2e);
    sourcilG.position.set(-0.32, 1.28, 0.66); sourcilG.rotation.z = -0.4;
    sourcilG.userData.sansContour = true;
    const sourcilD = P._ovale(0.18, 0.04, 0.05, 0x1a1c2e);
    sourcilD.position.set(0.32, 1.28, 0.66); sourcilD.rotation.z = 0.4;
    sourcilD.userData.sansContour = true;
    // cornes arrondies
    const corneG = P._ovale(0.12, 0.28, 0.12, 0xFDF6E3);
    corneG.position.set(-0.45, 1.62, 0); corneG.rotation.z = 0.4;
    const corneD = P._ovale(0.12, 0.28, 0.12, 0xFDF6E3);
    corneD.position.set(0.45, 1.62, 0); corneD.rotation.z = -0.4;
    // petites pattes
    [-1, 1].forEach(c => {
      const patte = P._ovale(0.2, 0.18, 0.24, 0x6B4BA3);
      patte.position.set(0.4 * c, 0.15, 0.1);
      g.add(patte);
    });
    // dents qui dépassent
    [-0.15, 0.15].forEach(x => {
      const dent = P._ovale(0.05, 0.09, 0.04, 0xFFFFFF);
      dent.position.set(x, 0.52, 0.68);
      g.add(dent);
    });
    g.add(corps, ventre, oeilG, oeilD, sourcilG, sourcilD, corneG, corneD);

    // barre de vie : 3 petits blocs verts au-dessus de la tête
    const pv = [];
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x7CFC9A, emissive: 0x2E7D53, emissiveIntensity: 0.5 }));
      b.position.set((i - 1) * 0.45, 2.1, 0);
      b.userData.sansContour = true;
      g.add(b); pv.push(b);
    }

    P._appliquerContours(g, 1.05);
    g.position.set(-20, 0, -16);
    this.scene.add(g);
    this.monstre = {
      mesh: g, corps: corps, blocsPV: pv,
      pv: 3, pvMax: 3,
      maison: new THREE.Vector3(-20, 0, -16),
      mort: false, tempsRespawn: 0, tempsFlash: 0
    };
  },

  // ============================================================
  //  ÉVÉNEMENTS
  // ============================================================
  _brancherEvenements(canvas) {
    this._onKeyDown = (e) => {
      this.touches[e.code] = true;
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) {
        e.preventDefault();
      }
      // cases d'inventaire 1 à 6
      if (e.code.startsWith("Digit")) {
        const n = parseInt(e.code.slice(5));
        if (n >= 1 && n <= 6) window.Inventaire.choisir(n - 1);
      }
      // ramasser
      if (e.code === this.reglages.touches.ramasser) this._essayerRamasser();
    };
    this._onKeyUp = (e) => { this.touches[e.code] = false; };

    this._onMouseMove = (e) => {
      if (document.pointerLockElement !== canvas) return;
      const sens = 0.0022 * (this.reglages.sensibilite / 50);
      this.yaw -= e.movementX * sens;
      // souris vers le haut = regarder vers le haut (sauf si "inverser" est coché)
      const sensY = this.reglages.inverserY ? -1 : 1;
      this.pitch += e.movementY * sens * sensY;
      this.pitch = Math.max(-0.4, Math.min(1.1, this.pitch));
    };

    this._onMouseDown = (e) => {
      if (document.pointerLockElement !== canvas) return;
      if (e.button === 0) this._lancerAttaque();
    };

    this._onClickCanvas = () => { if (this.actif) canvas.requestPointerLock(); };
    this._onResize = () => this._redimensionner();

    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("mousemove", this._onMouseMove);
    window.addEventListener("mousedown", this._onMouseDown);
    window.addEventListener("resize", this._onResize);
    canvas.addEventListener("click", this._onClickCanvas);
  },

  _redimensionner() {
    const l = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(l, h, false);
    this.camera.aspect = l / h;
    this.camera.updateProjectionMatrix();
  },

  // ============================================================
  //  BOUCLE
  // ============================================================
  _boucle() {
    if (!this.actif) return;
    this.animationId = requestAnimationFrame(() => this._boucle());
    const dt = Math.min(this.horloge.getDelta(), 0.05);
    const t = this.horloge.getElapsedTime();

    this._deplacerJoueur(dt);
    this._animerAttaque(dt);
    this._placerCamera();
    this._suivreCompagnon(dt, t);
    this._animerObjetsSol(t);
    this._majMonstre(dt);
    this._majAstuce();

    this.renderer.render(this.scene, this.camera);
  },

  // ============================================================
  //  COLLISIONS
  //  Le joueur est une boîte (RAYON x HAUTEUR). On déplace un
  //  axe à la fois : si on rentre dans un bloc, on se cale
  //  contre sa paroi. La gravité gère le fait de monter dessus.
  // ============================================================

  // Le joueur (à la position p, hauteur y) chevauche-t-il ce bloc ?
  _chevauche(c, px, py, pz) {
    const r = this.RAYON;
    return px + r > c.minX && px - r < c.maxX &&
           pz + r > c.minZ && pz - r < c.maxZ &&
           py + this.HAUTEUR > c.minY + 0.05 && py + 0.05 < c.maxY;
  },

  _bougerAxe(axe, delta) {
    const p = this.avatar.position;
    p[axe] += delta;
    const r = this.RAYON;
    for (const c of this.colliders) {
      // si le bloc est plus bas que nos genoux, on pourra monter dessus
      // (la marche automatique se fait par le saut / la gravité) :
      if (c.maxY <= p.y + 0.3) continue;
      if (this._chevauche(c, p.x, p.y, p.z)) {
        if (axe === "x") p.x = (delta > 0) ? c.minX - r : c.maxX + r;
        else             p.z = (delta > 0) ? c.minZ - r : c.maxZ + r;
      }
    }
  },

  // Hauteur du "sol" sous les pieds (0 = le sol, ou le dessus d'un bloc).
  // refY = la hauteur du joueur AVANT la chute de cette image : ainsi,
  // même en tombant très vite, un bloc dont le sommet était sous nos
  // pieds au départ compte comme un sol (fini de s'enfoncer dedans !).
  _hauteurSol(refY) {
    const p = this.avatar.position;
    if (refY === undefined) refY = p.y;
    const r = this.RAYON;
    let h = 0;
    for (const c of this.colliders) {
      const dessus = p.x + r > c.minX && p.x - r < c.maxX &&
                     p.z + r > c.minZ && p.z - r < c.maxZ;
      if (dessus && c.maxY <= refY + 0.25 && c.maxY > h) h = c.maxY;
    }
    return h;
  },

  _deplacerJoueur(dt) {
    const m = this.reglages.touches;
    let av = 0, cot = 0;
    if (this.touches[m.avant])   av += 1;
    if (this.touches[m.arriere]) av -= 1;
    if (this.touches[m.gauche])  cot -= 1;
    if (this.touches[m.droite])  cot += 1;

    const avant = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const droite = new THREE.Vector3(-Math.cos(this.yaw), 0, Math.sin(this.yaw));
    const dir = new THREE.Vector3();
    dir.addScaledVector(avant, av);
    dir.addScaledVector(droite, cot);

    const enMouvement = dir.lengthSq() > 0.0001;
    const vitesse = 8;

    if (enMouvement) {
      dir.normalize();
      this._bougerAxe("x", dir.x * vitesse * dt);
      this._bougerAxe("z", dir.z * vitesse * dt);
      this.avatar.rotation.y = Math.atan2(dir.x, dir.z);
      this.phaseMarche += dt * 10;
    } else {
      this.phaseMarche = 0;
    }
    this._animerMarche(enMouvement);

    // Saut + gravité + atterrissage sur les blocs
    if (this.touches[m.sauter] && this.auSol) {
      this.vitesseY = 9.5;
      this.auSol = false;
    }
    const yAvantChute = this.avatar.position.y;
    this.vitesseY -= 24 * dt;
    this.avatar.position.y += this.vitesseY * dt;

    const solIci = this._hauteurSol(yAvantChute);
    if (this.avatar.position.y <= solIci && this.vitesseY <= 0) {
      this.avatar.position.y = solIci;
      this.vitesseY = 0;
      this.auSol = true;
    } else if (this.avatar.position.y > solIci + 0.02) {
      this.auSol = false;
    }
  },

  _animerMarche(enMouvement) {
    const d = this.avatar.userData;
    if (!d.jambeG) return;
    const b = enMouvement ? Math.sin(this.phaseMarche) * 0.6 : 0;
    d.jambeG.rotation.x = b;
    d.jambeD.rotation.x = -b;
    d.brasG.rotation.x = -b;
    // le bras droit n'est balancé que s'il n'attaque pas
    if (!this.attaque.active) d.brasD.rotation.x = b;
  },

  // ============================================================
  //  ATTAQUE  (clic gauche)
  // ============================================================
  _lancerAttaque() {
    if (this.attaque.active || this.attaque.recharge > 0) return;
    this.attaque.active = true;
    this.attaque.t = 0;
    this.attaque.touche = false;
  },

  _animerAttaque(dt) {
    if (this.attaque.recharge > 0) this.attaque.recharge -= dt;
    if (!this.attaque.active) return;

    this.attaque.t += dt;
    const duree = 0.32;
    const p = Math.min(this.attaque.t / duree, 1);
    // le bras droit part en arrière puis frappe vers l'avant
    this.avatar.userData.brasD.rotation.x = -Math.sin(p * Math.PI) * 2.1;

    // au milieu du geste, on teste si le monstre est touché
    if (!this.attaque.touche && p > 0.4) {
      this.attaque.touche = true;
      this._frapperMonstre();
    }
    if (p >= 1) {
      this.attaque.active = false;
      this.attaque.recharge = 0.25;
      this.avatar.userData.brasD.rotation.x = 0;
    }
  },

  _frapperMonstre() {
    const mo = this.monstre;
    if (!mo || mo.mort) return;
    const d = this.avatar.position.distanceTo(mo.mesh.position);
    if (d > 3.2) return;

    mo.pv -= 1;
    mo.tempsFlash = 0.18;
    mo.corps.material.color.set(0xFF4444);
    // petit recul du monstre
    const recul = mo.mesh.position.clone().sub(this.avatar.position).setY(0).normalize();
    mo.mesh.position.addScaledVector(recul, 0.8);
    // mise à jour de la barre de vie
    mo.blocsPV.forEach((b, i) => { b.visible = i < mo.pv; });

    if (mo.pv <= 0) {
      mo.mort = true;
      mo.tempsRespawn = 8;   // il revient au bout de 8 secondes
    }
  },

  _majMonstre(dt) {
    const mo = this.monstre;
    if (!mo) return;

    // fin du flash rouge
    if (mo.tempsFlash > 0) {
      mo.tempsFlash -= dt;
      if (mo.tempsFlash <= 0) mo.corps.material.color.set(0x845EC2);
    }

    if (mo.mort) {
      // il s'aplatit puis disparaît, et revient plus tard
      mo.mesh.scale.y = Math.max(0.05, mo.mesh.scale.y - dt * 2);
      mo.tempsRespawn -= dt;
      if (mo.tempsRespawn <= 0) {
        mo.mort = false; mo.pv = mo.pvMax;
        mo.mesh.scale.set(1, 1, 1);
        mo.mesh.position.copy(mo.maison);
        mo.blocsPV.forEach(b => { b.visible = true; });
      }
      return;
    }

    // il s'approche doucement du joueur s'il est dans son coin
    const versJoueur = this.avatar.position.clone().sub(mo.mesh.position).setY(0);
    const d = versJoueur.length();
    if (d < 14 && d > 1.6) {
      versJoueur.normalize();
      mo.mesh.position.addScaledVector(versJoueur, dt * 2.2);
      mo.mesh.lookAt(this.avatar.position.x, mo.mesh.position.y, this.avatar.position.z);
    } else if (d > 14) {
      // sinon il rentre chez lui
      const maison = mo.maison.clone().sub(mo.mesh.position).setY(0);
      if (maison.length() > 0.5) {
        maison.normalize();
        mo.mesh.position.addScaledVector(maison, dt * 1.5);
      }
    }
    // s'il touche le joueur, il le bouscule un peu (pas de dégâts)
    if (d < 1.6) {
      const pousse = versJoueur.normalize();
      this._bougerAxe("x", pousse.x * dt * 6);
      this._bougerAxe("z", pousse.z * dt * 6);
    }
    // les blocs de vie regardent la caméra
    mo.blocsPV.forEach(b => b.lookAt(this.camera.position));
  },

  // ============================================================
  //  OBJETS AU SOL  (armes qui flottent en tournant)
  // ============================================================
  _animerObjetsSol(t) {
    this.objetsSol.forEach(o => {
      o.mesh.rotation.y = t * 1.5;
      o.mesh.position.y = o.yBase + Math.sin(t * 2 + o.mesh.position.x) * 0.1;
    });
  },

  _objetProche() {
    let plusProche = null, dMin = 2.2;
    this.objetsSol.forEach(o => {
      const d = this.avatar.position.distanceTo(o.mesh.position);
      if (d < dMin) { dMin = d; plusProche = o; }
    });
    return plusProche;
  },

  _essayerRamasser() {
    const o = this._objetProche();
    if (!o) return;
    const res = window.Inventaire.ramasser(o.id);
    if (!res.ok) return;
    // on retire l'objet du sol
    this.scene.remove(o.mesh);
    this.objetsSol = this.objetsSol.filter(x => x !== o);
    // si l'inventaire était plein, l'ancien objet tombe au sol
    if (res.largue) {
      const p = this.avatar.position;
      this._poserObjetSol(res.largue, p.x + 1, Math.max(p.y, 0) + 0.7, p.z + 1);
    }
  },

  _changerArmeEnMain() {
    if (!this.avatar) return;
    const porte = this.avatar.userData.porteArme;
    while (porte.children.length) porte.remove(porte.children[0]);
    const id = window.Inventaire.objetEnMain();
    if (id) {
      const arme = window.Perso.construireArme(id);
      if (arme) porte.add(arme);
    }
  },

  // Petit message d'aide contextuel
  _majAstuce() {
    const el = document.getElementById("astuce-contexte");
    if (!el) return;
    const o = this._objetProche();
    if (o) {
      const arme = (window.GAME_DATA.armes || []).find(a => a.id === o.id);
      const touche = window.Reglages.etiquetteTouche(this.reglages.touches.ramasser);
      el.textContent = touche + " : ramasser " + (arme ? arme.nom : "l'objet");
      el.style.display = "block";
    } else {
      el.style.display = "none";
    }
  },

  // ============================================================
  //  CAMÉRA & COMPAGNON
  // ============================================================
  _placerCamera() {
    const distH = 7 * Math.cos(this.pitch);
    const cx = this.avatar.position.x - Math.sin(this.yaw) * distH;
    const cz = this.avatar.position.z - Math.cos(this.yaw) * distH;
    const cy = this.avatar.position.y + 3 + Math.sin(this.pitch) * 7;
    this.camera.position.set(cx, cy, cz);
    this.camera.lookAt(
      this.avatar.position.x,
      this.avatar.position.y + 1.8,
      this.avatar.position.z
    );
  },

  _suivreCompagnon(dt, t) {
    if (!this.compagnon) return;
    const derriere = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const cible = this.avatar.position.clone().addScaledVector(derriere, -1.8);
    cible.x += 1.2; cible.z += 0.4;
    // les mascottes trottinent près du sol (petits bonds),
    // le drone flotte plus haut
    if (this.compagnon.userData.vole) {
      cible.y = this.avatar.position.y + 1.4 + Math.sin(t * 2.8) * 0.15;
    } else {
      cible.y = this.avatar.position.y + 0.15 + Math.abs(Math.sin(t * 5)) * 0.18;
    }
    this.compagnon.position.lerp(cible, Math.min(1, dt * 4));
    this.compagnon.lookAt(this.avatar.position.x, this.compagnon.position.y, this.avatar.position.z);
    window.Perso.animerCompagnon(this.compagnon, t);
  },

  // ============================================================
  //  ARRÊT + NETTOYAGE
  // ============================================================
  arreter() {
    this.actif = false;
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (document.pointerLockElement) document.exitPointerLock();

    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    window.removeEventListener("mousemove", this._onMouseMove);
    window.removeEventListener("mousedown", this._onMouseDown);
    window.removeEventListener("resize", this._onResize);
    window.Inventaire.onChangement = null;

    if (this.scene) {
      while (this.scene.children.length) this.scene.remove(this.scene.children[0]);
    }
    this.avatar = null; this.compagnon = null; this.monstre = null;
    this.colliders = []; this.objetsSol = [];
  }
};
