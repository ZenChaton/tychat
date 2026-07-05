/* ============================================================
   JEU  —  monde de cubes façon Minecraft
   - Clic droit : poser le bloc choisi (grille stricte 1x1x1,
     jamais deux blocs au même endroit)
   - Clic gauche : casser le bloc visé
   - Molette / 1-9 : changer de bloc
   - V : vue 1ère / 3ème personne
   Les constructions sont sauvegardées automatiquement,
   monde par monde.
   ============================================================ */

window.Jeu = {
  actif: false,
  renderer: null, scene: null, camera: null,
  avatar: null, horloge: null, animationId: null,

  yaw: Math.PI, pitch: 0.15,
  vitesseY: 0, auSol: true, touches: {},
  vueFP: false,

  RAYON: 0.32, HAUTEUR: 1.8, PORTEE: 8,

  cubes: null,           // Map "x,y,z" -> { mesh, bloc }
  materiaux: {},         // cache des matériaux par id de bloc
  geoCube: null,
  blocActif: 0,          // index dans Blocs.tous()
  surlignage: null, fantome: null,
  visee: null,           // { casse:[x,y,z], pose:[x,y,z] }
  aSauver: false, timerSauve: 0,

  serveur: null, reglages: null,
  _mouvement: 0,

  demarrer(config) {
    this.reglages = config.reglages;
    this.serveur = config.serveur;
    const canvas = config.canvas;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(config.serveur.couleurCiel);
    this.scene.fog = new THREE.Fog(config.serveur.couleurCiel,
      this.reglages.distance * 0.55, this.reglages.distance);

    this.camera = new THREE.PerspectiveCamera(this.reglages.fov, 1, 0.08, 400);
    this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.shadowMap.enabled = this.reglages.ombres;

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x668866, 0.95));
    const soleil = new THREE.DirectionalLight(0xffffff, 0.7);
    soleil.position.set(30, 50, 15);
    if (this.reglages.ombres) {
      soleil.castShadow = true;
      soleil.shadow.mapSize.set(1024, 1024);
      soleil.shadow.camera.left = -40; soleil.shadow.camera.right = 40;
      soleil.shadow.camera.top = 40;   soleil.shadow.camera.bottom = -40;
    }
    this.scene.add(soleil);

    // le sol
    const sol = new THREE.Mesh(
      new THREE.PlaneGeometry(600, 600),
      new THREE.MeshLambertMaterial({ color: config.serveur.couleurSol })
    );
    sol.rotation.x = -Math.PI / 2;
    sol.receiveShadow = this.reglages.ombres;
    this.scene.add(sol);
    const grille = new THREE.GridHelper(600, 600, 0xffffff, 0xffffff);
    grille.material.transparent = true;
    grille.material.opacity = 0.07;
    grille.position.y = 0.005;
    this.scene.add(grille);

    // ---- état ----
    this.cubes = new Map();
    this.materiaux = {};
    this.geoCube = new THREE.BoxGeometry(1, 1, 1);
    this.blocActif = 0;
    this.vueFP = true;                    // on construit mieux à la 1ère personne
    this.aSauver = false; this.timerSauve = 0;
    this.yaw = Math.PI; this.pitch = 0.15;
    this.vitesseY = 0; this.auSol = true; this.touches = {};

    // ---- le joueur ----
    this.avatar = window.Perso.construire(window.Perso.charger());
    this.avatar.position.set(0.5, 0, 0.5);
    this.scene.add(this.avatar);
    this._appliquerVue();

    // ---- surlignage du bloc visé + fantôme de pose ----
    this.surlignage = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002)),
      new THREE.LineBasicMaterial({ color: 0x111111, linewidth: 2 })
    );
    this.surlignage.visible = false;
    this.scene.add(this.surlignage);
    this.fantome = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28 })
    );
    this.fantome.visible = false;
    this.scene.add(this.fantome);

    // ---- constructions sauvegardées ----
    const sauve = window.Sauvegarde.lire("monde-" + this.serveur.id, []);
    sauve.forEach(c => this._poserCube(c[0], c[1], c[2], c[3], true));

    this.horloge = new THREE.Clock();
    this.actif = true;
    this._brancherEvenements(canvas);
    this._majBarreBlocs();
    this._redimensionner();
    this._boucle();
  },

  // ============================================================
  //  CUBES
  // ============================================================
  _cle(x, y, z) { return x + "," + y + "," + z; },

  _materiau(idBloc) {
    if (this.materiaux[idBloc]) return this.materiaux[idBloc];
    const bloc = window.Blocs.trouver(idBloc);
    let texture;
    if (bloc && bloc.image) {
      texture = new THREE.TextureLoader().load(bloc.image);
    } else {
      texture = new THREE.CanvasTexture(window.Blocs.canvasTexture(idBloc));
    }
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    const mat = new THREE.MeshLambertMaterial({
      map: texture,
      transparent: idBloc === "verre",
      opacity: idBloc === "verre" ? 0.6 : 1
    });
    this.materiaux[idBloc] = mat;
    return mat;
  },

  _poserCube(x, y, z, idBloc, silencieux) {
    if (y < 0 || this.cubes.has(this._cle(x, y, z))) return false;
    const mesh = new THREE.Mesh(this.geoCube, this._materiau(idBloc));
    mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
    mesh.castShadow = this.reglages.ombres;
    mesh.receiveShadow = this.reglages.ombres;
    this.scene.add(mesh);
    this.cubes.set(this._cle(x, y, z), { mesh, bloc: idBloc });
    if (!silencieux) this.aSauver = true;
    return true;
  },

  _casserCube(x, y, z) {
    const cle = this._cle(x, y, z);
    const c = this.cubes.get(cle);
    if (!c) return;
    this.scene.remove(c.mesh);
    this.cubes.delete(cle);
    this.aSauver = true;
  },

  _sauverMonde() {
    const liste = [];
    this.cubes.forEach((c, cle) => {
      const p = cle.split(",").map(Number);
      liste.push([p[0], p[1], p[2], c.bloc]);
    });
    window.Sauvegarde.ecrire("monde-" + this.serveur.id, liste);
    this.aSauver = false;
  },

  // ============================================================
  //  VISÉE  —  petit rayon pas à pas dans la grille
  // ============================================================
  _calculerVisee() {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    const depart = this.vueFP
      ? this.camera.position.clone()
      : this.avatar.position.clone().add(new THREE.Vector3(0, 1.55, 0));

    const p = depart.clone();
    const pas = 0.045;
    let precedente = null;
    this.visee = null;

    for (let d = 0; d < this.PORTEE; d += pas) {
      p.addScaledVector(dir, pas);
      const cx = Math.floor(p.x), cy = Math.floor(p.y), cz = Math.floor(p.z);
      if (cy < 0) {
        // on touche le sol : on peut poser dessus
        const pose = [Math.floor(p.x), 0, Math.floor(p.z)];
        this.visee = { casse: null, pose };
        break;
      }
      const cle = this._cle(cx, cy, cz);
      if (this.cubes.has(cle)) {
        this.visee = { casse: [cx, cy, cz], pose: precedente };
        break;
      }
      if (!precedente || precedente[0] !== cx || precedente[1] !== cy || precedente[2] !== cz) {
        precedente = [cx, cy, cz];
      }
    }

    // mise à jour du surlignage et du fantôme
    if (this.visee && this.visee.casse) {
      this.surlignage.visible = true;
      this.surlignage.position.set(
        this.visee.casse[0] + 0.5, this.visee.casse[1] + 0.5, this.visee.casse[2] + 0.5);
    } else this.surlignage.visible = false;

    const pose = this.visee && this.visee.pose;
    if (pose && !this._poseChevaucheJoueur(pose[0], pose[1], pose[2])) {
      this.fantome.visible = true;
      this.fantome.position.set(pose[0] + 0.5, pose[1] + 0.5, pose[2] + 0.5);
    } else this.fantome.visible = false;
  },

  _poseChevaucheJoueur(cx, cy, cz) {
    const p = this.avatar.position;
    return cx + 1 > p.x - this.RAYON && cx < p.x + this.RAYON &&
           cz + 1 > p.z - this.RAYON && cz < p.z + this.RAYON &&
           cy + 1 > p.y && cy < p.y + this.HAUTEUR;
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
        const nb = window.Blocs.tous().length;
        if (n >= 1 && n <= Math.min(9, nb)) {
          this.blocActif = n - 1;
          this._majBarreBlocs();
        }
      }
      if (e.code === "KeyV") { this.vueFP = !this.vueFP; this._appliquerVue(); }
    };
    this._onKeyUp = (e) => { this.touches[e.code] = false; };

    this._onMouseMove = (e) => {
      if (document.pointerLockElement !== canvas) return;
      const sens = 0.0022 * (this.reglages.sensibilite / 50);
      this.yaw -= e.movementX * sens;
      const sensY = this.reglages.inverserY ? -1 : 1;
      this.pitch += e.movementY * sens * sensY;
      this.pitch = Math.max(-1.35, Math.min(1.35, this.pitch));
    };

    this._onMouseDown = (e) => {
      if (document.pointerLockElement !== canvas) return;
      if (!this.visee) return;
      if (e.button === 0 && this.visee.casse) {
        this._casserCube(this.visee.casse[0], this.visee.casse[1], this.visee.casse[2]);
      }
      if (e.button === 2 && this.visee.pose) {
        const p = this.visee.pose;
        if (!this._poseChevaucheJoueur(p[0], p[1], p[2])) {
          const bloc = window.Blocs.tous()[this.blocActif];
          if (bloc) this._poserCube(p[0], p[1], p[2], bloc.id);
        }
      }
    };
    this._onWheel = (e) => {
      if (document.pointerLockElement !== canvas) return;
      const nb = window.Blocs.tous().length;
      this.blocActif = (this.blocActif + (e.deltaY > 0 ? 1 : -1) + nb) % nb;
      this._majBarreBlocs();
    };
    this._onCtx = (e) => e.preventDefault();
    this._onClickCanvas = () => { if (this.actif) canvas.requestPointerLock(); };
    this._onResize = () => this._redimensionner();

    window.addEventListener("keydown", this._onKeyDown);
    window.addEventListener("keyup", this._onKeyUp);
    window.addEventListener("mousemove", this._onMouseMove);
    window.addEventListener("mousedown", this._onMouseDown);
    window.addEventListener("wheel", this._onWheel);
    window.addEventListener("contextmenu", this._onCtx);
    window.addEventListener("resize", this._onResize);
    canvas.addEventListener("click", this._onClickCanvas);
  },

  _appliquerVue() {
    const u = this.avatar.userData;
    const visible = !this.vueFP;
    if (u.tete) u.tete.visible = visible;
    if (u.oeilG) u.oeilG.visible = visible;
    if (u.oeilD) u.oeilD.visible = visible;
    const viseur = document.getElementById("viseur");
    if (viseur) viseur.style.display = "block";
  },

  _redimensionner() {
    const l = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(l, h, false);
    this.camera.aspect = l / h;
    this.camera.updateProjectionMatrix();
  },

  // ============================================================
  //  BARRE DE BLOCS (HUD)
  // ============================================================
  _majBarreBlocs() {
    const barre = document.getElementById("barre-blocs");
    if (!barre) return;
    barre.innerHTML = "";
    window.Blocs.tous().forEach((bloc, i) => {
      const caseB = document.createElement("div");
      caseB.className = "case-bloc" + (i === this.blocActif ? " active" : "");
      const img = document.createElement("img");
      img.src = window.Blocs.vignette(bloc);
      img.alt = bloc.nom;
      caseB.appendChild(img);
      if (i < 9) {
        const num = document.createElement("span");
        num.className = "num"; num.textContent = i + 1;
        caseB.appendChild(num);
      }
      caseB.title = bloc.nom;
      caseB.onclick = () => { this.blocActif = i; this._majBarreBlocs(); };
      barre.appendChild(caseB);
    });
    const nomEl = document.getElementById("nom-bloc");
    const actif = window.Blocs.tous()[this.blocActif];
    if (nomEl && actif) nomEl.textContent = actif.nom;
  },

  // ============================================================
  //  BOUCLE
  // ============================================================
  _boucle() {
    if (!this.actif) return;
    this.animationId = requestAnimationFrame(() => this._boucle());
    const dt = Math.min(this.horloge.getDelta(), 0.05);
    const t = this.horloge.getElapsedTime();

    this._deplacer(dt);
    this._calculerVisee();
    this._placerCamera();
    window.Perso.animer(this.avatar, t, this._mouvement);

    // sauvegarde automatique
    this.timerSauve += dt;
    if (this.aSauver && this.timerSauve > 3) {
      this._sauverMonde();
      this.timerSauve = 0;
    }

    this.renderer.render(this.scene, this.camera);
  },

  // ============================================================
  //  DÉPLACEMENT & COLLISIONS (grille de cubes)
  // ============================================================
  _celluleSolide(cx, cy, cz) {
    return cy < 0 || this.cubes.has(this._cle(cx, cy, cz));
  },

  _collision(px, py, pz) {
    const r = this.RAYON;
    const x0 = Math.floor(px - r), x1 = Math.floor(px + r);
    const z0 = Math.floor(pz - r), z1 = Math.floor(pz + r);
    const y0 = Math.floor(py + 0.001), y1 = Math.floor(py + this.HAUTEUR - 0.001);
    for (let cx = x0; cx <= x1; cx++)
      for (let cy = Math.max(0, y0); cy <= y1; cy++)
        for (let cz = z0; cz <= z1; cz++)
          if (this.cubes.has(this._cle(cx, cy, cz))) return true;
    return false;
  },

  _deplacer(dt) {
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
    const bouge = dir.lengthSq() > 0.0001;
    this._mouvement += ((bouge ? 1 : 0) - this._mouvement) * Math.min(1, dt * 10);

    const p = this.avatar.position;
    const vitesse = 5.4;

    if (bouge) {
      dir.normalize();
      // axe X
      p.x += dir.x * vitesse * dt;
      if (this._collision(p.x, p.y, p.z)) {
        p.x = dir.x > 0
          ? Math.floor(p.x + this.RAYON) - this.RAYON - 0.001
          : Math.floor(p.x - this.RAYON) + 1 + this.RAYON + 0.001;
      }
      // axe Z
      p.z += dir.z * vitesse * dt;
      if (this._collision(p.x, p.y, p.z)) {
        p.z = dir.z > 0
          ? Math.floor(p.z + this.RAYON) - this.RAYON - 0.001
          : Math.floor(p.z - this.RAYON) + 1 + this.RAYON + 0.001;
      }
      if (!this.vueFP) this.avatar.rotation.y = Math.atan2(dir.x, dir.z);
    }
    if (this.vueFP) this.avatar.rotation.y = this.yaw;

    // saut & gravité
    if (this.touches[m.sauter] && this.auSol) {
      this.vitesseY = 8.2;
      this.auSol = false;
    }
    this.vitesseY -= 23 * dt;
    p.y += this.vitesseY * dt;

    if (this.vitesseY <= 0) {
      // atterrissage : sur le sol ou sur un cube
      if (p.y <= 0) { p.y = 0; this.vitesseY = 0; this.auSol = true; }
      else if (this._collision(p.x, p.y, p.z)) {
        p.y = Math.floor(p.y) + 1;
        this.vitesseY = 0;
        this.auSol = true;
      } else this.auSol = false;
    } else if (this._collision(p.x, p.y, p.z)) {
      // on se cogne la tête
      p.y = Math.floor(p.y + this.HAUTEUR) - this.HAUTEUR - 0.001;
      this.vitesseY = 0;
    }
  },

  _placerCamera() {
    const p = this.avatar.position;
    if (this.vueFP) {
      const oeil = new THREE.Vector3(p.x, p.y + 1.62, p.z);
      const regard = new THREE.Vector3(
        Math.sin(this.yaw) * Math.cos(this.pitch),
        -Math.sin(this.pitch),
        Math.cos(this.yaw) * Math.cos(this.pitch)
      );
      this.camera.position.copy(oeil);
      this.camera.lookAt(oeil.add(regard));
      return;
    }
    const pitch = Math.max(-0.3, Math.min(1.1, this.pitch));
    const dist = 5.2;
    const distH = dist * Math.cos(pitch);
    this.camera.position.set(
      p.x - Math.sin(this.yaw) * distH,
      p.y + 1.9 + Math.sin(pitch) * dist,
      p.z - Math.cos(this.yaw) * distH
    );
    this.camera.lookAt(p.x, p.y + 1.3, p.z);
  },

  // ============================================================
  //  ARRÊT
  // ============================================================
  arreter() {
    if (this.aSauver) this._sauverMonde();
    this.actif = false;
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (document.pointerLockElement) document.exitPointerLock();
    window.removeEventListener("keydown", this._onKeyDown);
    window.removeEventListener("keyup", this._onKeyUp);
    window.removeEventListener("mousemove", this._onMouseMove);
    window.removeEventListener("mousedown", this._onMouseDown);
    window.removeEventListener("wheel", this._onWheel);
    window.removeEventListener("contextmenu", this._onCtx);
    window.removeEventListener("resize", this._onResize);
    if (this.scene) {
      while (this.scene.children.length) this.scene.remove(this.scene.children[0]);
    }
    this.cubes = null; this.avatar = null; this.materiaux = {};
  }
};
