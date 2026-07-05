/* ============================================================
   PORTRAITS  —  photographie chaque modèle 3D en coulisses
   pour afficher sa vignette directement dans les cartes des
   menus (personnages et compagnons).
   ============================================================ */

window.Portraits = {
  _cache: {},     // cle -> dataURL de l'image
  _file: [],      // travaux en attente
  _occupe: false,
  _pret: false,

  // source : { fichier: "….glb" }  OU  { builder: () => Object3D }
  demander(cle, source, cb) {
    if (this._cache[cle]) { cb(this._cache[cle]); return; }
    this._file.push({ cle, source, cb });
    this._traiter();
  },

  _preparer() {
    if (this._pret) return;
    this._pret = true;
    this.canvas = document.createElement("canvas");
    this.canvas.width = 200; this.canvas.height = 200;
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true });
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x554444, 1.0));
    const dir = new THREE.DirectionalLight(0xffffff, 0.9);
    dir.position.set(2.5, 4, 4);
    this.scene.add(dir);
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
  },

  _traiter() {
    if (this._occupe || !this._file.length) return;
    this._occupe = true;
    this._preparer();
    const job = this._file.shift();

    const rendre = (objet, animations) => {
      // pose vivante : on avance un peu l'animation "Idle" si dispo
      if (animations && animations.length) {
        const mixer = new THREE.AnimationMixer(objet);
        const clip = animations.find(c => /idle/i.test(c.name)) || animations[0];
        mixer.clipAction(clip).play();
        mixer.update(0.6);
      }
      // cadrage : centre + zoom pour remplir la vignette
      const boite = window.Modeles.boiteReelle(objet);
      const dims = new THREE.Vector3(); boite.getSize(dims);
      const centre = new THREE.Vector3(); boite.getCenter(centre);
      objet.position.sub(centre);
      const maxDim = Math.max(dims.x, dims.y, dims.z, 0.0001);
      objet.scale.multiplyScalar(2 / maxDim);
      objet.rotation.y = -0.5;   // trois-quarts, plus vivant
      this.scene.add(objet);
      this.camera.position.set(0.4, 0.55, 3.1);
      this.camera.lookAt(0, 0, 0);
      this.renderer.render(this.scene, this.camera);
      const url = this.canvas.toDataURL("image/png");
      this.scene.remove(objet);
      this._cache[job.cle] = url;
      job.cb(url);
      this._occupe = false;
      this._traiter();
    };

    if (job.source.fichier) {
      if (typeof THREE.GLTFLoader !== "function") { this._fin(job); return; }
      new THREE.GLTFLoader().load(
        job.source.fichier,
        (gltf) => {
          let objet = gltf.scene;
          if (job.source.piece) objet = window.Modeles.extrairePiece(objet, job.source.piece);
          rendre(objet, job.source.piece ? null : gltf.animations);
        },
        undefined,
        () => this._fin(job)
      );
    } else if (job.source.builder) {
      const objet = job.source.builder();
      if (objet) rendre(objet, null); else this._fin(job);
    } else {
      this._fin(job);
    }
  },

  _fin(job) {
    job.cb(null);
    this._occupe = false;
    this._traiter();
  }
};
