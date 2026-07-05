/* ============================================================
   JEU  —  le bac à sable 3D
   Le joueur est maintenant un vrai modèle 3D animé (marche,
   course, coups d'épée, tir…). Nouveautés : armes à feu avec
   projectiles, grenades, véhicules conduisibles, décor
   modulaire (data/decor.js), cœurs de vie et mallettes de soin.
   ============================================================ */

window.Jeu = {
  actif: false,
  renderer: null, scene: null, camera: null,
  avatar: null, compagnon: null,
  horloge: null, animationId: null,

  // caméra / entrées
  yaw: Math.PI, pitch: 0.25,
  vitesseY: 0, auSol: true, touches: {},

  // vie du joueur
  pv: 5, pvMax: 5, invincible: 0, mort: false, tempsMort: 0,

  // combat
  projectiles: [], grenades: [], explosions: [],
  rechargeTir: 0, rechargeMelee: 0, rechargeGrenade: 0,
  boutonTir: false, dernierTir: -10,
  attaque: null,          // { t, touche, donnees } pendant un coup de mêlée

  // monde
  colliders: [], objetsSol: [], soins: [],
  vehicules: [], enVehicule: null,
  monstres: [],

  // animations du joueur
  mixerJoueur: null, clips: {}, actionCourante: null,
  animEtat: null, animVerrou: false,
  porteMain: null, _enMouvement: false,

  RAYON: 0.45, HAUTEUR: 3.0,

  vueFP: false, meshTete: null,
  _inputAv: 0, _inputCot: 0,

  reglages: null, personnage: null,
  _onKeyDown: null, _onKeyUp: null, _onMouseMove: null,
  _onMouseDown: null, _onMouseUp: null, _onResize: null, _onClickCanvas: null,

  // ============================================================
  //  DÉMARRAGE
  // ============================================================
  demarrer(config) {
    this.reglages = config.reglages;
    this.personnage = config.personnage;
    const canvas = config.canvas;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(config.serveur.couleurCiel);
    this.scene.fog = new THREE.Fog(config.serveur.couleurCiel, 55, 160);

    this.camera = new THREE.PerspectiveCamera(config.reglages.fov, 1, 0.1, 500);

    this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = config.reglages.ombres;

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 0.9));
    const soleil = new THREE.DirectionalLight(0xffffff, 0.9);
    soleil.position.set(25, 40, 18);
    soleil.castShadow = config.reglages.ombres;
    soleil.shadow.mapSize.set(2048, 2048);
    soleil.shadow.camera.near = 1;
    soleil.shadow.camera.far = 160;
    soleil.shadow.camera.left = -70; soleil.shadow.camera.right = 70;
    soleil.shadow.camera.top = 70;   soleil.shadow.camera.bottom = -70;
    this.scene.add(soleil);

    const sol = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.MeshStandardMaterial({ color: config.serveur.couleurSol, roughness: 1 })
    );
    sol.rotation.x = -Math.PI / 2;
    sol.receiveShadow = true;
    this.scene.add(sol);

    // ---- état ----
    this.colliders = []; this.objetsSol = []; this.soins = [];
    this.projectiles = []; this.grenades = []; this.explosions = [];
    this.vehicules = []; this.enVehicule = null;
    this.pv = this.pvMax; this.invincible = 0; this.mort = false;
    this.rechargeTir = 0; this.rechargeMelee = 0; this.rechargeGrenade = 0;
    this.boutonTir = false; this.dernierTir = -10; this.attaque = null;
    this.mixerJoueur = null; this.clips = {}; this.actionCourante = null;
    this.animEtat = null; this.animVerrou = false;
    this.vueFP = false; this.meshTete = null;
    this._majViseur();

    // ---- monde ----
    this.monstres = [];
    if (config.serveur.objets) {
      // monde créé dans l'éditeur !
      this._chargerMonde(config.serveur.objets);
    } else {
      this._construireDecorAleatoire(config.reglages.ombres);
      this._construireParcours();
      this._construireZoneArmes();
      this._chargerDecor();
      (window.GAME_DATA.vehicules || []).forEach(v => this._ajouterVehicule(v));
      [[-16, -12], [30, -6], [4, 40]].forEach(p => this._ajouterSoin(p[0], p[1]));
      this._creerMonstre(-20, -16);
    }

    // ---- joueur (modèle GLB animé) ----
    this.avatar = new THREE.Group();
    this.avatar.position.set(0, 0, 0);
    this.scene.add(this.avatar);
    this._chargerJoueur();

    // ---- compagnon ----
    this.compagnon = window.Perso.construireCompagnon(config.compagnon);
    if (this.compagnon) {
      this.compagnon.position.set(-2, 0.5, -2);
      this.scene.add(this.compagnon);
    }

    window.Inventaire.onChangement = () => this._changerArmeEnMain();

    this.yaw = Math.PI; this.pitch = 0.25;
    this.vitesseY = 0; this.auSol = true; this.touches = {};
    this.horloge = new THREE.Clock();
    this.actif = true;

    window.Inventaire.afficher();
    this._majCoeurs();
    this._brancherEvenements(canvas);
    this._redimensionner();
    this._boucle();
  },

  // ============================================================
  //  JOUEUR  —  chargement du modèle + animations + main
  // ============================================================
  _chargerJoueur() {
    const p = this.personnage;
    window.Modeles.charger(p.fichier, (modele, animations) => {
      if (!this.actif) return;
      window.Modeles.normaliser(modele, { taille: 3.1 * (p.echelle || 1) });
      if (p.retourner) modele.rotation.y = Math.PI;
      this.avatar.add(modele);
      this.scene.updateMatrixWorld(true);

      // animations
      if (animations && animations.length) {
        this.mixerJoueur = new THREE.AnimationMixer(modele);
        const cherche = (fin) => animations.find(c => c.name.endsWith(fin));
        ["Idle_Neutral", "Idle_Gun", "Idle_Sword", "Idle_Gun_Shoot",
         "Walk", "Run", "Run_Shoot", "Run_Back", "Run_Left", "Run_Right",
         "Sword_Slash", "Gun_Shoot",
         "Punch_Right", "Death", "HitRecieve", "Wave"].forEach(nom => {
          const c = cherche(nom);
          if (c) this.clips[nom] = c;
        });
        this.mixerJoueur.addEventListener("finished", () => {
          this.animVerrou = false;
          this.animEtat = null;
        });
        this._basculerAnim("Idle_Neutral");
      }

      // la tête : on la cache en vue première personne
      modele.traverse(o => {
        if (!this.meshTete && o.isMesh && /_head$/i.test(o.name)) this.meshTete = o;
      });

      // main droite : on cherche l'os du poignet pour y accrocher l'arme
      let os = null;
      modele.traverse(o => {
        if (!os && o.isBone && /wrist\.?r$|hand\.?r$|fist\.?r$/i.test(o.name)) os = o;
      });
      this.porteMain = new THREE.Group();
      if (os) {
        os.add(this.porteMain);
        // l'os peut être à une échelle bizarre : on compense
        const ws = new THREE.Vector3();
        os.getWorldScale(ws);
        if (ws.x > 0.0001) this.porteMain.scale.setScalar(1 / ws.x);
      } else {
        this.porteMain.position.set(0.45, 1.9, 0.35);
        this.avatar.add(this.porteMain);
      }
      this._changerArmeEnMain();
    });
  },

  _basculerAnim(cle, uneFois) {
    if (!this.mixerJoueur || !this.clips[cle]) return false;
    if (this.animEtat === cle && !uneFois) return true;
    const action = this.mixerJoueur.clipAction(this.clips[cle]);
    action.reset();
    if (uneFois) {
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
    } else {
      action.setLoop(THREE.LoopRepeat, Infinity);
    }
    action.fadeIn(0.12).play();
    if (this.actionCourante && this.actionCourante !== action) {
      this.actionCourante.fadeOut(0.12);
    }
    this.actionCourante = action;
    this.animEtat = cle;
    return true;
  },

  _donneesArme(id) {
    return (window.GAME_DATA.armes || []).find(a => a.id === id) || null;
  },

  _creerModeleArme(id, cb) {
    const a = this._donneesArme(id);
    if (!a) { cb(null); return; }
    window.Modeles.charger(a.fichier, (clone) => {
      cb(window.Modeles.normaliserArme(clone, a));
    });
  },

  _changerArmeEnMain() {
    if (!this.porteMain) return;
    while (this.porteMain.children.length) this.porteMain.remove(this.porteMain.children[0]);
    const id = window.Inventaire.objetEnMain();
    if (!id) return;
    this._creerModeleArme(id, (m) => {
      if (m && window.Inventaire.objetEnMain() === id && this.porteMain) {
        this.porteMain.add(m);
      }
    });
  },

  // ============================================================
  //  DÉCOR
  // ============================================================
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

  _construireDecorAleatoire(ombres) {
    const couleurs = [0xEF6461, 0xFFD166, 0x43BCCD, 0x845EC2];
    for (let i = 0; i < 10; i++) {
      const taille = 1.2 + Math.random() * 2.5;
      const rayon = 40 + Math.random() * 45;
      const angle = Math.random() * Math.PI * 2;
      const x = Math.cos(angle) * rayon, z = Math.sin(angle) * rayon;
      this._blocSolide(x, taille / 2, z, taille, taille, taille,
        couleurs[Math.floor(Math.random() * couleurs.length)], ombres);
    }
  },

  _construireParcours() {
    const o = this.reglages.ombres;
    const jaune = 0xFFD166, corail = 0xEF6461;
    const marches = [
      [14, 0.5, -8,  3, 1, 3], [18, 1.2, -10, 3, 2.4, 3],
      [22, 2.0, -13, 3, 4.0, 3], [26, 2.8, -10, 3, 5.6, 3],
      [30, 3.6, -13, 3, 7.2, 3], [34, 4.4, -10, 4, 8.8, 4]
    ];
    marches.forEach((m, i) => {
      this._blocSolide(m[0], m[1], m[2], m[3], m[4], m[5], i % 2 ? corail : jaune, o);
    });
    const d = marches[marches.length - 1];
    const mat = new THREE.MeshStandardMaterial({ color: 0xFDF6E3 });
    const poteau = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3, 8), mat);
    poteau.position.set(d[0], d[1] + d[4] / 2 + 1.5, d[2]);
    const drapeau = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 0.05),
      new THREE.MeshStandardMaterial({ color: 0x43BCCD }));
    drapeau.position.set(d[0] + 0.65, d[1] + d[4] / 2 + 2.6, d[2]);
    this.scene.add(poteau, drapeau);
  },

  _construireZoneArmes() {
    const o = this.reglages.ombres;
    // toutes les armes à ramasser (l'épée est déjà en poche au départ)
    const armes = ["hache", "marteau", "pistolet", "smg", "assaut", "sniper", "grenade"];
    armes.forEach((id, i) => {
      const x = -16 - (i % 4) * 4, z = 12 + Math.floor(i / 4) * 5;
      this._blocSolide(x, 0.4, z, 1.6, 0.8, 1.6, 0x5A6472, o);
      this._poserObjetSol(id, x, 1.2, z);
    });
  },

  _poserObjetSol(idArme, x, y, z) {
    const groupe = new THREE.Group();
    groupe.position.set(x, y, z);
    this.scene.add(groupe);
    const objet = { id: idArme, mesh: groupe, yBase: y };
    this.objetsSol.push(objet);
    this._creerModeleArme(idArme, (m) => {
      if (m && this.objetsSol.includes(objet)) {
        m.rotation.z = 0.4;
        groupe.add(m);
      }
    });
  },

  // Décor modulaire depuis data/decor.js
  _chargerDecor() {
    (window.GAME_DATA.decor || []).forEach(e => this._placerDecor(e));
  },

  _placerDecor(e) {
    {
      window.Modeles.charger(e.fichier, (clone) => {
        if (!this.actif) return;
        let objet = e.piece ? window.Modeles.extrairePiece(clone, e.piece) : clone;
        window.Modeles.normaliser(objet, { taille: e.taille, echelle: e.echelle, axe: e.axe });
        // centre en X/Z puis place
        this.scene.add(objet);
        objet.updateMatrixWorld(true);
        let boite = new THREE.Box3().setFromObject(objet);
        const centre = new THREE.Vector3(); boite.getCenter(centre);
        objet.position.x -= centre.x;
        objet.position.z -= centre.z;
        objet.position.x += e.x || 0;
        objet.position.z += e.z || 0;
        objet.position.y += e.y || 0;
        objet.rotation.y = (e.ry || 0) * Math.PI / 180;
        objet.updateMatrixWorld(true);

        if (e.collision !== false) {
          boite = new THREE.Box3().setFromObject(objet);
          let { min, max } = boite;
          if (e.collision === "tronc") {
            // seul le centre bloque (parfait pour les arbres)
            const cx = (min.x + max.x) / 2, cz = (min.z + max.z) / 2;
            const lx = (max.x - min.x) * 0.15, lz = (max.z - min.z) * 0.15;
            min = new THREE.Vector3(cx - lx, min.y, cz - lz);
            max = new THREE.Vector3(cx + lx, max.y, cz + lz);
          }
          this.colliders.push({
            minX: min.x, maxX: max.x, minY: min.y,
            maxY: max.y, minZ: min.z, maxZ: max.z
          });
        }
      });
    }
  },

  // ============================================================
  //  VÉHICULES
  // ============================================================
  _ajouterVehicule(v) {
    {
      const groupe = new THREE.Group();
      groupe.position.set(v.x || 0, 0, v.z || 0);
      groupe.rotation.y = (v.ry || 0) * Math.PI / 180;
      this.scene.add(groupe);
      const veh = { donnees: v, groupe: groupe, roues: [], vitesse: 0, pret: false };
      this.vehicules.push(veh);
      window.Modeles.charger(v.fichier, (clone) => {
        if (!this.actif) return;
        // oriente la longueur du véhicule vers l'avant (+Z)
        const boite = new THREE.Box3().setFromObject(clone);
        const dims = new THREE.Vector3(); boite.getSize(dims);
        const interne = new THREE.Group();
        interne.add(clone);
        if (dims.x > dims.z) clone.rotation.y = Math.PI / 2;
        if (v.retourner) interne.rotation.y = Math.PI;
        window.Modeles.normaliser(interne, { taille: v.taille || 5, axe: "long" });
        groupe.add(interne);
        interne.traverse(o => { if (/wheel/i.test(o.name)) veh.roues.push(o); });
        veh.pret = true;
      });
    }
  },

  _vehiculeProche() {
    let proche = null, dMin = 3.8;
    this.vehicules.forEach(v => {
      const d = this.avatar.position.distanceTo(v.groupe.position);
      if (d < dMin) { dMin = d; proche = v; }
    });
    return proche;
  },

  _monterDescendre() {
    if (this.mort) return;
    if (this.enVehicule) {
      // on descend, sur le côté du véhicule
      const v = this.enVehicule;
      const cote = new THREE.Vector3(Math.cos(v.groupe.rotation.y), 0, -Math.sin(v.groupe.rotation.y));
      this.avatar.position.copy(v.groupe.position).addScaledVector(cote, 2.6);
      this.avatar.position.y = 0;
      this.avatar.visible = true;
      this.enVehicule = null;
      this.vitesseY = 0;
    } else {
      const v = this._vehiculeProche();
      if (v && v.pret) {
        this.enVehicule = v;
        this.avatar.visible = false;
      }
    }
    this._majViseur();
  },

  _majConduite(dt) {
    const v = this.enVehicule;
    if (!v) return;
    const t = this.reglages.touches;
    const d = v.donnees;
    let accel = 0, tourne = 0;
    if (this.touches[t.avant])   accel += 1;
    if (this.touches[t.arriere]) accel -= 1;
    if (this.touches[t.gauche])  tourne -= 1;
    if (this.touches[t.droite])  tourne += 1;

    if (accel !== 0) v.vitesse += accel * (d.acceleration || 12) * dt;
    else v.vitesse *= Math.max(0, 1 - 1.6 * dt);   // frottement
    const max = d.vitesseMax || 16;
    v.vitesse = Math.max(-max / 2, Math.min(max, v.vitesse));

    if (Math.abs(v.vitesse) > 0.3) {
      v.groupe.rotation.y -= tourne * dt * 1.7 *
        Math.sign(v.vitesse) * Math.min(1, Math.abs(v.vitesse) / 7);
    }

    const avant = new THREE.Vector3(Math.sin(v.groupe.rotation.y), 0, Math.cos(v.groupe.rotation.y));
    this._bougerAxeObjet(v.groupe, 1.7, 4, "x", avant.x * v.vitesse * dt, 0.6);
    this._bougerAxeObjet(v.groupe, 1.7, 4, "z", avant.z * v.vitesse * dt, 0.6);
    // suit le relief bas (routes, trottoirs)
    v.groupe.position.y = this._solPour(v.groupe.position.x, v.groupe.position.z,
      v.groupe.position.y + 0.6, 1.4);

    v.roues.forEach(r => { r.rotation.x += v.vitesse * dt * 1.4; });

    // le joueur "suit" le véhicule (caméra, monstre, compagnon)
    this.avatar.position.copy(v.groupe.position);
  },

  // ============================================================
  //  SOINS  (mallettes qui rendent des cœurs)
  // ============================================================
  _ajouterSoin(x, z) {
    {
      const groupe = new THREE.Group();
      groupe.position.set(x, 0.8, z);
      this.scene.add(groupe);
      const s = { mesh: groupe, actif: true, timer: 0, yBase: 0.8 };
      this.soins.push(s);
      window.Modeles.charger("assets/models/MalletteSoin.glb", (clone) => {
        if (!this.actif) return;
        window.Modeles.normaliser(clone, { taille: 0.8 });
        clone.position.y = -0.4;
        groupe.add(clone);
      });
    }
  },

  _majSoins(dt, t) {
    this.soins.forEach(s => {
      if (!s.actif) {
        s.timer -= dt;
        if (s.timer <= 0) { s.actif = true; s.mesh.visible = true; }
        return;
      }
      s.mesh.rotation.y = t * 1.2;
      s.mesh.position.y = s.yBase + Math.sin(t * 2) * 0.12;
      if (!this.mort && this.pv < this.pvMax &&
          this.avatar.position.distanceTo(s.mesh.position) < 1.8) {
        this.pv = Math.min(this.pvMax, this.pv + 2);
        this._majCoeurs();
        s.actif = false; s.timer = 20;
        s.mesh.visible = false;
      }
    });
  },

  // ============================================================
  //  VIE DU JOUEUR
  // ============================================================
  _majCoeurs() {
    const el = document.getElementById("coeurs");
    if (!el) return;
    let html = "";
    for (let i = 0; i < this.pvMax; i++) {
      html += `<span class="${i < this.pv ? "plein" : "vide"}">❤</span>`;
    }
    el.innerHTML = html;
  },

  _blesserJoueur(depuis) {
    if (this.invincible > 0 || this.mort || this.enVehicule) return;
    this.pv -= 1;
    this.invincible = 1.2;
    this._majCoeurs();
    // flash rouge à l'écran
    const flash = document.getElementById("degats-flash");
    if (flash) {
      flash.classList.add("actif");
      setTimeout(() => flash.classList.remove("actif"), 220);
    }
    // recul
    if (depuis) {
      const recul = this.avatar.position.clone().sub(depuis).setY(0).normalize();
      this._bougerAxe("x", recul.x * 1.6);
      this._bougerAxe("z", recul.z * 1.6);
    }
    if (this.pv <= 0) this._mourir();
  },

  _mourir() {
    this.mort = true;
    this.tempsMort = 1.8;
    this.animVerrou = true;
    this._basculerAnim("Death", true);
  },

  _reapparaitre() {
    this.mort = false;
    this.animVerrou = false;
    this.animEtat = null;
    this.pv = this.pvMax;
    this.invincible = 2;
    this.avatar.position.set(0, 0, 0);
    this.vitesseY = 0;
    this._majCoeurs();
    this._basculerAnim("Idle_Neutral");
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
      if (e.code.startsWith("Digit")) {
        const n = parseInt(e.code.slice(5));
        if (n >= 1 && n <= 6) window.Inventaire.choisir(n - 1);
      }
      if (e.code === this.reglages.touches.ramasser && !this.enVehicule) this._essayerRamasser();
      if (e.code === this.reglages.touches.vehicule) this._monterDescendre();
      if (e.code === "KeyV") this._basculerVue();
    };
    this._onKeyUp = (e) => { this.touches[e.code] = false; };

    this._onMouseMove = (e) => {
      if (document.pointerLockElement !== canvas) return;
      const sens = 0.0022 * (this.reglages.sensibilite / 50);
      this.yaw -= e.movementX * sens;
      const sensY = this.reglages.inverserY ? -1 : 1;
      this.pitch += e.movementY * sens * sensY;
      this.pitch = Math.max(-1.25, Math.min(1.25, this.pitch));
    };

    this._onMouseDown = (e) => {
      if (document.pointerLockElement !== canvas) return;
      if (e.button !== 0 || this.enVehicule || this.mort) return;
      const arme = this._donneesArme(window.Inventaire.objetEnMain());
      if (!arme) this._coupDePoing();
      else if (arme.type === "melee") this._lancerAttaque(arme);
      else if (arme.type === "tir") { this.boutonTir = true; this._tirer(arme); }
      else if (arme.type === "grenade") this._lancerGrenade(arme);
    };
    this._onMouseUp = (e) => { if (e.button === 0) this.boutonTir = false; };

    this._onClickCanvas = () => { if (this.actif) canvas.requestPointerLock(); };
    this._onResize = () => this._redimensionner();

    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("mousemove", this._onMouseMove);
    window.addEventListener("mousedown", this._onMouseDown);
    window.addEventListener("mouseup", this._onMouseUp);
    window.addEventListener("resize", this._onResize);
    canvas.addEventListener("click", this._onClickCanvas);
  },

  _basculerVue() {
    this.vueFP = !this.vueFP;
    if (this.meshTete) this.meshTete.visible = !this.vueFP;
    this._majViseur();
  },

  _majViseur() {
    const v = document.getElementById("viseur");
    if (v) v.style.display = (this.vueFP && !this.enVehicule) ? "block" : "none";
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

    if (this.invincible > 0) this.invincible -= dt;
    if (this.rechargeTir > 0) this.rechargeTir -= dt;
    if (this.rechargeMelee > 0) this.rechargeMelee -= dt;
    if (this.rechargeGrenade > 0) this.rechargeGrenade -= dt;

    if (this.mort) {
      this.tempsMort -= dt;
      if (this.tempsMort <= 0) this._reapparaitre();
    } else if (this.enVehicule) {
      this._majConduite(dt);
    } else {
      this._deplacerJoueur(dt);
      this._majAttaque(dt);
      // tir automatique si on maintient le bouton
      if (this.boutonTir) {
        const arme = this._donneesArme(window.Inventaire.objetEnMain());
        if (arme && arme.type === "tir" && arme.auto) this._tirer(arme);
      }
    }

    this._majAnimationJoueur(t);
    this._majProjectiles(dt);
    this._majGrenades(dt);
    this._majExplosions(dt);
    this._placerCamera();
    this._suivreCompagnon(dt, t);
    this._animerObjetsSol(t);
    this._majSoins(dt, t);
    this._majMonstres(dt);
    this._majAstuce();

    if (this.mixerJoueur) this.mixerJoueur.update(dt);

    this.renderer.render(this.scene, this.camera);
  },

  // ============================================================
  //  COLLISIONS (génériques : joueur + véhicules)
  // ============================================================
  _chevaucheObjet(c, px, py, pz, rayon, hauteur) {
    return px + rayon > c.minX && px - rayon < c.maxX &&
           pz + rayon > c.minZ && pz - rayon < c.maxZ &&
           py + hauteur > c.minY + 0.05 && py + 0.05 < c.maxY;
  },

  _bougerAxeObjet(objet, rayon, hauteur, axe, delta, margeBas) {
    const p = objet.position;
    p[axe] += delta;
    for (const c of this.colliders) {
      if (c.maxY <= p.y + (margeBas || 0.3)) continue;
      if (this._chevaucheObjet(c, p.x, p.y, p.z, rayon, hauteur)) {
        if (axe === "x") p.x = (delta > 0) ? c.minX - rayon : c.maxX + rayon;
        else             p.z = (delta > 0) ? c.minZ - rayon : c.maxZ + rayon;
      }
    }
  },

  _bougerAxe(axe, delta) {
    this._bougerAxeObjet(this.avatar, this.RAYON, this.HAUTEUR, axe, delta, 0.3);
  },

  _solPour(x, z, refY, rayon) {
    let h = 0;
    for (const c of this.colliders) {
      const dessus = x + rayon > c.minX && x - rayon < c.maxX &&
                     z + rayon > c.minZ && z - rayon < c.maxZ;
      if (dessus && c.maxY <= refY + 0.25 && c.maxY > h) h = c.maxY;
    }
    return h;
  },

  _pointDansCollider(p) {
    for (const c of this.colliders) {
      if (p.x > c.minX && p.x < c.maxX &&
          p.y > c.minY && p.y < c.maxY &&
          p.z > c.minZ && p.z < c.maxZ) return true;
    }
    return false;
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

    this._enMouvement = dir.lengthSq() > 0.0001;
    this._inputAv = av; this._inputCot = cot;
    const vitesse = 8;

    if (this._enMouvement) {
      dir.normalize();
      this._bougerAxe("x", dir.x * vitesse * dt);
      this._bougerAxe("z", dir.z * vitesse * dt);
      if (!this.vueFP) this.avatar.rotation.y = Math.atan2(dir.x, dir.z);
    }
    // en vue première personne, le corps regarde toujours devant
    if (this.vueFP) this.avatar.rotation.y = this.yaw;

    if (this.touches[m.sauter] && this.auSol) {
      this.vitesseY = 9.5;
      this.auSol = false;
    }
    const yAvantChute = this.avatar.position.y;
    this.vitesseY -= 24 * dt;
    this.avatar.position.y += this.vitesseY * dt;

    const solIci = this._solPour(this.avatar.position.x, this.avatar.position.z,
      yAvantChute, this.RAYON);
    if (this.avatar.position.y <= solIci && this.vitesseY <= 0) {
      this.avatar.position.y = solIci;
      this.vitesseY = 0;
      this.auSol = true;
    } else if (this.avatar.position.y > solIci + 0.02) {
      this.auSol = false;
    }
  },

  // ============================================================
  //  ANIMATIONS DU JOUEUR (état selon le contexte)
  // ============================================================
  _majAnimationJoueur(t) {
    if (!this.mixerJoueur || this.animVerrou || this.mort || this.enVehicule) return;
    const arme = this._donneesArme(window.Inventaire.objetEnMain());
    const enTir = this.boutonTir || (t - this.dernierTir < 0.35);
    let cle;
    if (!this.auSol) return;      // en l'air : on garde l'animation en cours
    if (this._enMouvement) {
      if (enTir && this.clips["Run_Shoot"]) {
        cle = "Run_Shoot";
      } else if (this.vueFP && this._inputAv < 0 && this.clips["Run_Back"]) {
        cle = "Run_Back";
      } else if (this.vueFP && this._inputAv === 0 && this._inputCot > 0 && this.clips["Run_Right"]) {
        cle = "Run_Right";
      } else if (this.vueFP && this._inputAv === 0 && this._inputCot < 0 && this.clips["Run_Left"]) {
        cle = "Run_Left";
      } else {
        cle = "Run";
      }
    } else if (enTir && this.clips["Idle_Gun_Shoot"]) {
      cle = "Idle_Gun_Shoot";
    } else if (arme && (arme.type === "tir" || arme.type === "grenade")) {
      cle = "Idle_Gun";
    } else if (arme) {
      cle = "Idle_Sword";
    } else {
      cle = "Idle_Neutral";
    }
    this._basculerAnim(cle);
  },

  // ============================================================
  //  COMBAT  —  mêlée
  // ============================================================
  _coupDePoing() {
    if (this.rechargeMelee > 0 || this.animVerrou) return;
    this.rechargeMelee = 0.5;
    this.animVerrou = true;
    if (!this._basculerAnim("Punch_Right", true)) this.animVerrou = false;
    this.attaque = { t: 0, touche: false, donnees: { degats: 1, portee: 2.4 } };
  },

  _lancerAttaque(arme) {
    if (this.rechargeMelee > 0 || this.animVerrou) return;
    this.rechargeMelee = arme.cadence;
    this.animVerrou = true;
    if (!this._basculerAnim("Sword_Slash", true)) this.animVerrou = false;
    this.attaque = { t: 0, touche: false, donnees: arme };
  },

  _majAttaque(dt) {
    if (!this.attaque) return;
    this.attaque.t += dt;
    if (!this.attaque.touche && this.attaque.t > 0.32) {
      this.attaque.touche = true;
      this._frapperMonstre(this.attaque.donnees.degats, this.attaque.donnees.portee);
    }
    if (this.attaque.t > 1.0) this.attaque = null;
  },

  // ============================================================
  //  COMBAT  —  tir
  // ============================================================
  _directionVisee() {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    return dir;
  },

  _tirer(arme) {
    if (this.rechargeTir > 0 || this.animVerrou) return;
    this.rechargeTir = arme.cadence;
    this.dernierTir = this.horloge.getElapsedTime();

    const dir = this._directionVisee();
    const depart = this.avatar.position.clone();
    depart.y += 2.2;
    depart.addScaledVector(dir, 0.9);

    if (!this._geoProjectile) {
      this._geoProjectile = new THREE.SphereGeometry(0.09, 8, 6);
      this._matProjectile = new THREE.MeshStandardMaterial({
        color: 0xFFE9A8, emissive: 0xFFD166, emissiveIntensity: 1
      });
    }
    const mesh = new THREE.Mesh(this._geoProjectile, this._matProjectile);
    mesh.position.copy(depart);
    this.scene.add(mesh);
    this.projectiles.push({
      mesh: mesh,
      vel: dir.clone().multiplyScalar(arme.vitesse || 34),
      vie: 1.6,
      degats: arme.degats || 1
    });
  },

  _majProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.mesh.position.addScaledVector(p.vel, dt);
      p.vie -= dt;
      let mortP = p.vie <= 0 || p.mesh.position.y < 0.05 ||
                  this._pointDansCollider(p.mesh.position);
      if (!mortP) {
        for (const mo of this.monstres) {
          if (mo.mort) continue;
          const centre = mo.mesh.position.clone(); centre.y += 1;
          if (p.mesh.position.distanceTo(centre) < 1.5) {
            this._degatsMonstre(mo, p.degats);
            mortP = true;
            break;
          }
        }
      }
      if (mortP) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }
  },

  // ============================================================
  //  COMBAT  —  grenades
  // ============================================================
  _lancerGrenade(arme) {
    if (this.rechargeGrenade > 0 || this.animVerrou) return;
    this.rechargeGrenade = arme.cadence;

    const dir = this._directionVisee();
    const groupe = new THREE.Group();
    groupe.position.copy(this.avatar.position);
    groupe.position.y += 2.2;
    groupe.position.addScaledVector(dir, 0.8);
    this.scene.add(groupe);
    window.Modeles.charger(arme.fichier, (clone) => {
      window.Modeles.normaliser(clone, { taille: arme.taille || 0.35, poserAuSol: false });
      groupe.add(clone);
    });
    this.grenades.push({
      mesh: groupe,
      vel: dir.clone().multiplyScalar(11).add(new THREE.Vector3(0, 4.5, 0)),
      fuse: 1.4,
      donnees: arme
    });
  },

  _majGrenades(dt) {
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i];
      g.vel.y -= 18 * dt;
      g.mesh.position.addScaledVector(g.vel, dt);
      g.mesh.rotation.x += dt * 6;
      g.fuse -= dt;
      if (g.fuse <= 0 || g.mesh.position.y <= 0.15) {
        this._exploser(g.mesh.position.clone(), g.donnees);
        this.scene.remove(g.mesh);
        this.grenades.splice(i, 1);
      }
    }
  },

  _exploser(pos, donnees) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(1, 16, 12),
      new THREE.MeshBasicMaterial({
        color: 0xFFB347, transparent: true, opacity: 0.85,
        blending: THREE.AdditiveBlending, depthWrite: false
      })
    );
    mesh.position.copy(pos);
    mesh.scale.setScalar(0.4);
    this.scene.add(mesh);
    this.explosions.push({ mesh: mesh, t: 0, rayon: donnees.rayon || 4 });

    // dégâts de zone sur tous les monstres touchés
    this.monstres.forEach(mo => {
      if (mo.mort) return;
      const d = pos.distanceTo(mo.mesh.position);
      if (d < (donnees.rayon || 4)) {
        this._degatsMonstre(mo, donnees.degats || 3);
        const recul = mo.mesh.position.clone().sub(pos).setY(0).normalize();
        mo.mesh.position.addScaledVector(recul, 2.5);
      }
    });
    // petit souffle sur le joueur (sans dégâts)
    const dj = pos.distanceTo(this.avatar.position);
    if (dj < 3 && !this.enVehicule) {
      const recul = this.avatar.position.clone().sub(pos).setY(0).normalize();
      this._bougerAxe("x", recul.x * 1.2);
      this._bougerAxe("z", recul.z * 1.2);
    }
  },

  _majExplosions(dt) {
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const e = this.explosions[i];
      e.t += dt;
      const p = e.t / 0.35;
      e.mesh.scale.setScalar(0.4 + p * e.rayon);
      e.mesh.material.opacity = 0.85 * (1 - p);
      if (p >= 1) {
        this.scene.remove(e.mesh);
        this.explosions.splice(i, 1);
      }
    }
  },


  // ============================================================
  //  MONDE PERSONNALISÉ  (créé dans l'éditeur)
  // ============================================================
  _chargerMonde(objets) {
    objets.forEach(o => {
      const item = window.EditeurCatalogue.trouver(o.item);
      if (!item) return;
      const oy = o.y || 0;
      if (item.type === "arme") {
        this._blocSolide(o.x, oy + 0.4, o.z, 1.6, 0.8, 1.6, 0x5A6472, this.reglages.ombres);
        this._poserObjetSol(item.arme, o.x, oy + 1.2, o.z);
      } else if (item.type === "ennemi") {
        this._creerMonstre(o.x, o.z);
      } else if (item.type === "soin") {
        this._ajouterSoin(o.x, o.z);
      } else if (item.type === "vehicule") {
        const base = (window.GAME_DATA.vehicules || []).find(v => v.id === item.vehicule);
        if (base) this._ajouterVehicule(Object.assign({}, base, { x: o.x, z: o.z, ry: o.ry || 0 }));
      } else {
        this._placerDecor({
          fichier: item.fichier, piece: item.piece,
          x: o.x, z: o.z, y: oy, ry: o.ry || 0,
          taille: o.taille || item.taille,
          axe: item.axe, collision: item.collision
        });
      }
    });
  },

  // ============================================================
  //  MONSTRE  —  le Grognon
  // ============================================================
  _creerMonstre(x, z) {
    const fab = window.Perso.construireGrognon();
    fab.groupe.position.set(x, 0, z);
    this.scene.add(fab.groupe);
    this.monstres.push({
      mesh: fab.groupe, corps: fab.corps, blocsPV: fab.blocsPV,
      pv: 3, pvMax: 3,
      maison: new THREE.Vector3(x, 0, z),
      mort: false, tempsRespawn: 0, tempsFlash: 0
    });
  },

  _frapperMonstre(degats, portee) {
    this.monstres.forEach(mo => {
      if (mo.mort) return;
      const d = this.avatar.position.distanceTo(mo.mesh.position);
      if (d > (portee || 3.2)) return;
      this._degatsMonstre(mo, degats || 1);
      const recul = mo.mesh.position.clone().sub(this.avatar.position).setY(0).normalize();
      mo.mesh.position.addScaledVector(recul, 0.8);
    });
  },

  _degatsMonstre(mo, n) {
    if (!mo || mo.mort) return;
    mo.pv -= n;
    mo.tempsFlash = 0.18;
    mo.corps.material.color.set(0xFF4444);
    mo.blocsPV.forEach((b, i) => { b.visible = i < mo.pv; });
    if (mo.pv <= 0) {
      mo.mort = true;
      mo.tempsRespawn = 8;
    }
  },

  _majMonstres(dt) {
    this.monstres.forEach(mo => this._majUnMonstre(mo, dt));
  },

  _majUnMonstre(mo, dt) {
    if (mo.tempsFlash > 0) {
      mo.tempsFlash -= dt;
      if (mo.tempsFlash <= 0) mo.corps.material.color.set(0x845EC2);
    }
    if (mo.mort) {
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
    const versJoueur = this.avatar.position.clone().sub(mo.mesh.position).setY(0);
    const d = versJoueur.length();
    if (d < 14 && d > 1.6 && !this.mort) {
      versJoueur.normalize();
      mo.mesh.position.addScaledVector(versJoueur, dt * 2.2);
      mo.mesh.lookAt(this.avatar.position.x, mo.mesh.position.y, this.avatar.position.z);
    } else if (d > 14) {
      const maison = mo.maison.clone().sub(mo.mesh.position).setY(0);
      if (maison.length() > 0.5) {
        maison.normalize();
        mo.mesh.position.addScaledVector(maison, dt * 1.5);
      }
    }
    // il mord !
    if (d < 1.7 && !this.mort) this._blesserJoueur(mo.mesh.position);
    mo.blocsPV.forEach(b => b.lookAt(this.camera.position));
  },

  // ============================================================
  //  OBJETS AU SOL / RAMASSAGE
  // ============================================================
  _animerObjetsSol(t) {
    this.objetsSol.forEach(o => {
      o.mesh.rotation.y = t * 1.5;
      o.mesh.position.y = o.yBase + Math.sin(t * 2 + o.mesh.position.x) * 0.1;
    });
  },

  _objetProche() {
    let plusProche = null, dMin = 2.4;
    this.objetsSol.forEach(o => {
      const d = this.avatar.position.distanceTo(o.mesh.position);
      if (d < dMin) { dMin = d; plusProche = o; }
    });
    return plusProche;
  },

  _essayerRamasser() {
    if (this.mort) return;
    const o = this._objetProche();
    if (!o) return;
    const res = window.Inventaire.ramasser(o.id);
    if (!res.ok) return;
    this.scene.remove(o.mesh);
    this.objetsSol = this.objetsSol.filter(x => x !== o);
    if (res.largue) {
      const p = this.avatar.position;
      this._poserObjetSol(res.largue, p.x + 1, Math.max(p.y, 0) + 0.7, p.z + 1);
    }
  },

  _majAstuce() {
    const el = document.getElementById("astuce-contexte");
    if (!el) return;
    const tv = window.Reglages.etiquetteTouche(this.reglages.touches.vehicule);
    const tr = window.Reglages.etiquetteTouche(this.reglages.touches.ramasser);
    let texte = null;
    if (this.enVehicule) {
      texte = tv + " : descendre du véhicule";
    } else {
      const v = this._vehiculeProche();
      const o = this._objetProche();
      if (v) texte = tv + " : monter dans " + (v.donnees.nom || "le véhicule");
      else if (o) {
        const arme = this._donneesArme(o.id);
        texte = tr + " : ramasser " + (arme ? arme.nom : "l'objet");
      }
    }
    if (texte) { el.textContent = texte; el.style.display = "block"; }
    else el.style.display = "none";
  },

  // ============================================================
  //  CAMÉRA & COMPAGNON
  // ============================================================
  _placerCamera() {
    // ----- vue première personne (sauf en véhicule) -----
    if (this.vueFP && !this.enVehicule) {
      const p = this.pitch;
      const oeil = this.avatar.position.clone();
      oeil.y += 2.6;
      oeil.x += Math.sin(this.yaw) * 0.25;
      oeil.z += Math.cos(this.yaw) * 0.25;
      const regard = new THREE.Vector3(
        Math.sin(this.yaw) * Math.cos(p),
        -Math.sin(p),
        Math.cos(this.yaw) * Math.cos(p)
      );
      this.camera.position.copy(oeil);
      this.camera.lookAt(oeil.clone().add(regard));
      return;
    }
    let yaw = this.yaw, dist = 7, hauteur = 3, viseY = 1.8;
    const pTP = Math.max(-0.4, Math.min(1.1, this.pitch));
    if (this.enVehicule) {
      yaw = this.enVehicule.groupe.rotation.y;
      dist = 11; hauteur = 4.5; viseY = 1.5;
    }
    const distH = dist * Math.cos(pTP);
    const cx = this.avatar.position.x - Math.sin(yaw) * distH;
    const cz = this.avatar.position.z - Math.cos(yaw) * distH;
    const cy = this.avatar.position.y + hauteur + Math.sin(pTP) * dist;
    this.camera.position.set(cx, cy, cz);
    this.camera.lookAt(
      this.avatar.position.x,
      this.avatar.position.y + viseY,
      this.avatar.position.z
    );
  },

  _suivreCompagnon(dt, t) {
    if (!this.compagnon) return;
    const derriere = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const cible = this.avatar.position.clone().addScaledVector(derriere, -1.8);
    cible.x += 1.2; cible.z += 0.4;
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
  //  ARRÊT
  // ============================================================
  arreter() {
    this.actif = false;
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (document.pointerLockElement) document.exitPointerLock();

    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    window.removeEventListener("mousemove", this._onMouseMove);
    window.removeEventListener("mousedown", this._onMouseDown);
    window.removeEventListener("mouseup", this._onMouseUp);
    window.removeEventListener("resize", this._onResize);
    window.Inventaire.onChangement = null;

    if (this.scene) {
      while (this.scene.children.length) this.scene.remove(this.scene.children[0]);
    }
    this.avatar = null; this.compagnon = null; this.monstres = [];
    this.colliders = []; this.objetsSol = []; this.projectiles = [];
    this.grenades = []; this.explosions = []; this.vehicules = [];
    this.soins = []; this.enVehicule = null;
    this.mixerJoueur = null; this.porteMain = null;
  }
};
