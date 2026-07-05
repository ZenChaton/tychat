/* ============================================================
   ÉDITEUR DE MONDES  —  crée tes propres serveurs !
   ------------------------------------------------------------
   - Choisis un objet dans la palette (à droite), puis clique
     sur le sol pour le poser. Repose-le autant de fois que tu
     veux. Échap (ou le bouton ✋) pour arrêter.
   - Clique sur un objet posé pour le sélectionner : tu peux le
     tourner, l'agrandir, le réduire ou le supprimer.
   - Caméra : clic droit maintenu pour tourner, molette pour
     zoomer, ZQSD / flèches pour se déplacer.
   ============================================================ */

window.Editeur = {
  actif: false,
  monde: null,          // { id, nom, couleurCiel, couleurSol, objets: [...] }
  objets: [],           // entrées { item, x, z, ry, taille }
  meshes: [],           // groupes 3D correspondants (même index)
  itemActif: null,      // objet du catalogue en cours de placement
  fantome: null,
  selection: -1,

  // caméra orbitale
  cible: null, angleH: 0.7, angleV: 0.9, distance: 34,

  ouvrir(monde, callbacks) {
    this.callbacks = callbacks;
    this.monde = monde || {
      id: "monde-" + Date.now(),
      nom: "", couleurCiel: "#87CEEB", couleurSol: "#7CB342",
      objets: []
    };
    this.objets = (this.monde.objets || []).map(o => Object.assign({}, o));
    this.meshes = [];
    this.itemActif = null; this.fantome = null; this.selection = -1;
    this.cible = new THREE.Vector3(0, 0, 0);
    this.angleH = 0.7; this.angleV = 0.9; this.distance = 34;

    const canvas = document.getElementById("canvas-editeur");
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.monde.couleurCiel);
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 600);
    this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x556677, 1.0));
    const soleil = new THREE.DirectionalLight(0xffffff, 0.8);
    soleil.position.set(30, 50, 20);
    this.scene.add(soleil);

    this.sol = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.MeshStandardMaterial({ color: this.monde.couleurSol, roughness: 1 })
    );
    this.sol.rotation.x = -Math.PI / 2;
    this.scene.add(this.sol);
    this.grille = new THREE.GridHelper(400, 100, 0xffffff, 0xffffff);
    this.grille.material.transparent = true;
    this.grille.material.opacity = 0.12;
    this.scene.add(this.grille);

    // marqueur du point de départ du joueur
    const spawn = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.2, 0.1, 24),
      new THREE.MeshStandardMaterial({ color: 0xFFD166, emissive: 0xFFD166, emissiveIntensity: 0.4 })
    );
    spawn.position.set(0, 0.05, 0);
    this.scene.add(spawn);

    this.raycaster = new THREE.Raycaster();
    this.souris = new THREE.Vector2();

    // reconstruit les objets d'un monde existant
    this.objets.forEach((o, i) => this._construireMesh(o, i));

    this._brancherUI();
    this._brancherEvenements(canvas);
    this.touches = {};
    this.actif = true;
    this.horloge = new THREE.Clock();
    this._redim();
    this._boucle();
    this._majAide("Choisis un objet dans la palette, puis clique sur le sol pour le poser !");
  },

  // ============================================================
  //  INTERFACE  (palette, boutons)
  // ============================================================
  _brancherUI() {
    document.getElementById("editeur-nom").value = this.monde.nom || "";
    const ciel = document.getElementById("editeur-ciel");
    const sol = document.getElementById("editeur-sol");
    ciel.value = this.monde.couleurCiel;
    sol.value = this.monde.couleurSol;
    ciel.oninput = () => {
      this.monde.couleurCiel = ciel.value;
      this.scene.background.set(ciel.value);
    };
    sol.oninput = () => {
      this.monde.couleurSol = sol.value;
      this.sol.material.color.set(sol.value);
    };

    // catégories
    const zoneCat = document.getElementById("editeur-categories");
    zoneCat.innerHTML = "";
    window.EditeurCatalogue.categories.forEach((cat, i) => {
      const b = document.createElement("button");
      b.className = "cat-btn" + (i === 0 ? " actif" : "");
      b.textContent = cat.emoji + " " + cat.nom;
      b.onclick = () => {
        zoneCat.querySelectorAll(".cat-btn").forEach(x => x.classList.remove("actif"));
        b.classList.add("actif");
        this._remplirItems(cat);
      };
      zoneCat.appendChild(b);
    });
    this._remplirItems(window.EditeurCatalogue.categories[0]);

    // boutons d'outils (objet sélectionné)
    document.getElementById("btn-ed-tourner").onclick = () => this._tournerSelection();
    document.getElementById("btn-ed-plus").onclick = () => this._redimSelection(1.15);
    document.getElementById("btn-ed-moins").onclick = () => this._redimSelection(1 / 1.15);
    document.getElementById("btn-ed-monter").onclick = () => this._bougerHauteur(0.5);
    document.getElementById("btn-ed-descendre").onclick = () => this._bougerHauteur(-0.5);
    document.getElementById("btn-ed-suppr").onclick = () => this._supprimerSelection();
    document.getElementById("btn-ed-fini").onclick = () => this._deselectionner();
    document.getElementById("btn-ed-stop").onclick = () => this._annulerPlacement();

    document.getElementById("btn-editeur-retour").onclick = () => {
      this.fermer(); this.callbacks.retour();
    };
    document.getElementById("btn-editeur-sauver").onclick = () => this._sauvegarder();
  },

  _remplirItems(cat) {
    const zone = document.getElementById("editeur-items");
    zone.innerHTML = "";
    cat.items.forEach(item => {
      const carte = document.createElement("div");
      carte.className = "item-editeur";
      const cadre = document.createElement("div");
      cadre.className = "vignette";
      carte.appendChild(cadre);
      const source = item.type === "ennemi"
        ? { builder: () => window.Perso.construireGrognon().groupe }
        : { fichier: item.fichier, piece: item.piece };
      window.Portraits.demander("ed-" + item.id, source, (url) => {
        if (url) cadre.innerHTML = `<img src="${url}" alt="">`;
      });
      const nom = document.createElement("div");
      nom.className = "nom-item"; nom.textContent = item.nom;
      carte.appendChild(nom);
      carte.onclick = () => this._choisirItem(item, carte);
      zone.appendChild(carte);
    });
  },

  _choisirItem(item, carte) {
    document.querySelectorAll(".item-editeur").forEach(c => c.classList.remove("actif"));
    if (carte) carte.classList.add("actif");
    this._deselectionner();
    this.itemActif = item;
    this.rotationFantome = 0;
    if (this.fantome) { this.scene.remove(this.fantome); this.fantome = null; }
    this._construireVisuel(item, (groupe) => {
      if (this.itemActif !== item || !this.actif) return;
      groupe.traverse(m => {
        if (m.isMesh) {
          m.material = m.material.clone();
          m.material.transparent = true;
          m.material.opacity = 0.55;
        }
      });
      this.fantome = groupe;
      this.fantome.visible = false;
      this.scene.add(this.fantome);
    });
    document.getElementById("editeur-stop").style.display = "flex";
    this._majAide("Clique sur le sol pour poser · R : tourner · Échap : arrêter de poser");
  },

  _annulerPlacement() {
    this.itemActif = null;
    if (this.fantome) { this.scene.remove(this.fantome); this.fantome = null; }
    document.querySelectorAll(".item-editeur").forEach(c => c.classList.remove("actif"));
    document.getElementById("editeur-stop").style.display = "none";
    this._majAide("Clique sur un objet pour le modifier, ou choisis-en un dans la palette.");
  },

  // Construit le visuel 3D d'un objet du catalogue
  _construireVisuel(item, cb) {
    if (item.type === "ennemi") {
      cb(window.Perso.construireGrognon().groupe);
      return;
    }
    window.Modeles.charger(item.fichier, (clone) => {
      let objet = item.piece ? window.Modeles.extrairePiece(clone, item.piece) : clone;
      if (item.type === "arme") {
        objet = window.Modeles.normaliserArme(objet, this._donneesArme(item.arme) || { taille: 1.2 });
        objet.position.y = 1.2;
        const socle = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.8, 1.6),
          new THREE.MeshStandardMaterial({ color: 0x5A6472 }));
        socle.position.y = 0.4;
        const tout = new THREE.Group();
        tout.add(socle, objet);
        cb(tout);
        return;
      }
      const taille = (item.type === "vehicule")
        ? { taille: this._donneesVehicule(item.vehicule).taille || 5, axe: "long" }
        : { taille: item.taille, axe: item.axe };
      window.Modeles.normaliser(objet, taille);
      const env = new THREE.Group();
      env.add(objet);
      cb(env);
    });
  },

  _donneesArme(id) { return (window.GAME_DATA.armes || []).find(a => a.id === id); },
  _donneesVehicule(id) { return (window.GAME_DATA.vehicules || []).find(v => v.id === id) || {}; },

  _construireMesh(entree, index) {
    const item = window.EditeurCatalogue.trouver(entree.item);
    if (!item) return;
    const support = new THREE.Group();
    support.position.set(entree.x, entree.y || 0, entree.z);
    support.rotation.y = (entree.ry || 0) * Math.PI / 180;
    this.scene.add(support);
    this.meshes[index] = support;
    this._construireVisuel(item, (groupe) => {
      if (!this.actif) return;
      const base = entree.tailleBase || item.taille || 1;
      if (entree.taille && base) groupe.scale.multiplyScalar(entree.taille / base);
      support.add(groupe);
    });
  },

  // ============================================================
  //  ÉVÉNEMENTS
  // ============================================================
  _brancherEvenements(canvas) {
    this._evMove = (e) => {
      const r = canvas.getBoundingClientRect();
      this.souris.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      this.souris.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      if (this.boutonDroit) {
        this.angleH -= e.movementX * 0.005;
        this.angleV = Math.max(0.15, Math.min(1.35, this.angleV + e.movementY * 0.004));
      }
      this._majFantome();
    };
    this._evDown = (e) => {
      if (e.target !== canvas) return;
      if (e.button === 2) { this.boutonDroit = true; return; }
      if (e.button !== 0) return;
      if (this.itemActif && this.fantome && this.fantome.visible) this._poser();
      else this._selectionnerSousSouris();
    };
    this._evUp = (e) => { if (e.button === 2) this.boutonDroit = false; };
    this._evWheel = (e) => {
      if (e.target !== canvas) return;
      e.preventDefault();
      this.distance = Math.max(8, Math.min(120, this.distance + e.deltaY * 0.04));
    };
    this._evKeyDown = (e) => {
      if (e.target.tagName === "INPUT") return;
      this.touches[e.code] = true;
      if (e.code === "Escape") this._annulerPlacement();
      if (e.code === "KeyR") {
        if (this.itemActif) this.rotationFantome = (this.rotationFantome + 45) % 360;
        else this._tournerSelection();
      }
      if (e.code === "Delete" || e.code === "Backspace") this._supprimerSelection();
    };
    this._evKeyUp = (e) => { this.touches[e.code] = false; };
    this._evCtx = (e) => { if (e.target === canvas) e.preventDefault(); };
    this._evRedim = () => this._redim();

    window.addEventListener("mousemove", this._evMove);
    window.addEventListener("mousedown", this._evDown);
    window.addEventListener("mouseup", this._evUp);
    window.addEventListener("wheel", this._evWheel, { passive: false });
    window.addEventListener("keydown", this._evKeyDown);
    window.addEventListener("keyup", this._evKeyUp);
    window.addEventListener("contextmenu", this._evCtx);
    window.addEventListener("resize", this._evRedim);
  },

  _pointAuSol() {
    this.raycaster.setFromCamera(this.souris, this.camera);
    const inter = this.raycaster.intersectObject(this.sol);
    return inter.length ? inter[0].point : null;
  },

  _majFantome() {
    if (!this.itemActif || !this.fantome) return;
    const p = this._pointAuSol();
    if (!p) { this.fantome.visible = false; return; }
    this.fantome.visible = true;
    this.fantome.position.set(Math.round(p.x), 0, Math.round(p.z));
    this.fantome.rotation.y = this.rotationFantome * Math.PI / 180;
  },

  _poser() {
    const item = this.itemActif;
    const entree = {
      item: item.id,
      x: this.fantome.position.x,
      z: this.fantome.position.z,
      ry: this.rotationFantome,
      taille: item.taille || null,
      tailleBase: item.taille || null
    };
    this.objets.push(entree);
    this._construireMesh(entree, this.objets.length - 1);
  },

  _selectionnerSousSouris() {
    this.raycaster.setFromCamera(this.souris, this.camera);
    const valides = this.meshes.filter(m => m);
    const inter = this.raycaster.intersectObjects(valides, true);
    if (!inter.length) { this._deselectionner(); return; }
    // on remonte jusqu'au groupe racine
    let o = inter[0].object;
    while (o.parent && !this.meshes.includes(o)) o = o.parent;
    const index = this.meshes.indexOf(o);
    if (index === -1) { this._deselectionner(); return; }
    this.selection = index;
    document.getElementById("editeur-outils").style.display = "flex";
    this._majAide("Objet sélectionné : ⟳ tourner · ＋/－ taille · ⬆/⬇ hauteur · 🗑 supprimer");
  },

  _deselectionner() {
    this.selection = -1;
    document.getElementById("editeur-outils").style.display = "none";
  },

  _tournerSelection() {
    if (this.selection < 0) return;
    const e = this.objets[this.selection];
    e.ry = ((e.ry || 0) + 45) % 360;
    this.meshes[this.selection].rotation.y = e.ry * Math.PI / 180;
  },

  _redimSelection(facteur) {
    if (this.selection < 0) return;
    const e = this.objets[this.selection];
    const avant = e.taille || e.tailleBase || 1;
    e.taille = Math.max(0.2, Math.min(50, avant * facteur));
    this.meshes[this.selection].scale.multiplyScalar(e.taille / avant);
  },

  _bougerHauteur(pas) {
    if (this.selection < 0) return;
    const e = this.objets[this.selection];
    e.y = Math.max(0, Math.min(60, (e.y || 0) + pas));
    this.meshes[this.selection].position.y = e.y;
  },

  _supprimerSelection() {
    if (this.selection < 0) return;
    this.scene.remove(this.meshes[this.selection]);
    this.objets.splice(this.selection, 1);
    this.meshes.splice(this.selection, 1);
    this._deselectionner();
  },

  _sauvegarder() {
    const nom = document.getElementById("editeur-nom").value.trim() || "Mon monde";
    this.monde.nom = nom;
    this.monde.objets = this.objets.map(o => ({
      item: o.item, x: o.x, z: o.z, y: o.y || 0, ry: o.ry || 0,
      taille: o.taille, tailleBase: o.tailleBase
    }));
    const monde = this.monde;
    this.fermer();
    this.callbacks.sauver(monde);
  },

  _majAide(texte) {
    const el = document.getElementById("editeur-aide");
    if (el) el.textContent = texte;
  },

  // ============================================================
  //  BOUCLE
  // ============================================================
  _redim() {
    const l = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(l, h, false);
    this.camera.aspect = l / h;
    this.camera.updateProjectionMatrix();
  },

  _boucle() {
    if (!this.actif) return;
    this.rafId = requestAnimationFrame(() => this._boucle());
    const dt = Math.min(this.horloge.getDelta(), 0.05);

    // déplacement de la cible avec le clavier
    const v = 22 * dt;
    const avant = new THREE.Vector3(Math.sin(this.angleH), 0, Math.cos(this.angleH));
    const droite = new THREE.Vector3(-Math.cos(this.angleH), 0, Math.sin(this.angleH));
    if (this.touches["KeyW"] || this.touches["KeyZ"] || this.touches["ArrowUp"])    this.cible.addScaledVector(avant, -v);
    if (this.touches["KeyS"] || this.touches["ArrowDown"])                          this.cible.addScaledVector(avant, v);
    if (this.touches["KeyA"] || this.touches["KeyQ"] || this.touches["ArrowLeft"])  this.cible.addScaledVector(droite, -v);
    if (this.touches["KeyD"] || this.touches["ArrowRight"])                         this.cible.addScaledVector(droite, v);

    const dh = this.distance * Math.cos(this.angleV);
    this.camera.position.set(
      this.cible.x + Math.sin(this.angleH) * dh,
      this.cible.y + Math.sin(this.angleV) * this.distance,
      this.cible.z + Math.cos(this.angleH) * dh
    );
    this.camera.lookAt(this.cible);

    this.renderer.render(this.scene, this.camera);
  },

  fermer() {
    this.actif = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    window.removeEventListener("mousemove", this._evMove);
    window.removeEventListener("mousedown", this._evDown);
    window.removeEventListener("mouseup", this._evUp);
    window.removeEventListener("wheel", this._evWheel);
    window.removeEventListener("keydown", this._evKeyDown);
    window.removeEventListener("keyup", this._evKeyUp);
    window.removeEventListener("contextmenu", this._evCtx);
    window.removeEventListener("resize", this._evRedim);
    if (this.scene) {
      while (this.scene.children.length) this.scene.remove(this.scene.children[0]);
    }
    this.meshes = []; this.fantome = null; this.itemActif = null;
  }
};
