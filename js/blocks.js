/* ============================================================
   BLOCS  —  les blocs de base (dessinés par le jeu) et les
   blocs personnalisés créés à partir d'une image téléchargée.
   L'image est réduite en 64x64 et appliquée sur les 6 faces.
   ============================================================ */

window.Blocs = {
  defauts: [
    { id: "herbe",    nom: "Herbe" },
    { id: "terre",    nom: "Terre" },
    { id: "pierre",   nom: "Pierre" },
    { id: "bois",     nom: "Bois" },
    { id: "planches", nom: "Planches" },
    { id: "sable",    nom: "Sable" },
    { id: "brique",   nom: "Briques" },
    { id: "neige",    nom: "Neige" },
    { id: "verre",    nom: "Verre" }
  ],
  persos: [],          // { id, nom, image (dataURL 64x64) }
  _vignettes: {},      // cache des aperçus

  charger() { this.persos = window.Sauvegarde.lire("blocs", []); },
  sauver()  { window.Sauvegarde.ecrire("blocs", this.persos); },

  tous() { return this.defauts.concat(this.persos); },

  trouver(id) { return this.tous().find(b => b.id === id) || null; },

  // Crée un bloc personnalisé depuis un fichier image
  ajouterDepuisImage(nom, fichier, cb) {
    const lecteur = new FileReader();
    lecteur.onload = () => {
      const img = new Image();
      img.onload = () => {
        // réduction en 64x64, façon pixel-art
        const c = document.createElement("canvas");
        c.width = 64; c.height = 64;
        const ctx = c.getContext("2d");
        // recadrage carré au centre de l'image
        const cote = Math.min(img.width, img.height);
        ctx.drawImage(img,
          (img.width - cote) / 2, (img.height - cote) / 2, cote, cote,
          0, 0, 64, 64);
        const bloc = {
          id: "perso-" + Date.now(),
          nom: nom || "Mon bloc",
          image: c.toDataURL("image/png")
        };
        this.persos.push(bloc);
        if (!this.sauver()) {
          this.persos.pop();
          cb(null, "La mémoire du navigateur est pleine ! Supprime des blocs ou des mondes.");
          return;
        }
        cb(bloc, null);
      };
      img.onerror = () => cb(null, "Ce fichier n'est pas une image lisible.");
      img.src = lecteur.result;
    };
    lecteur.onerror = () => cb(null, "Impossible de lire ce fichier.");
    lecteur.readAsDataURL(fichier);
  },

  supprimer(id) {
    this.persos = this.persos.filter(b => b.id !== id);
    delete this._vignettes[id];
    this.sauver();
  },

  // Aperçu (dataURL) d'un bloc : son image, ou sa texture dessinée
  vignette(bloc) {
    if (bloc.image) return bloc.image;
    if (this._vignettes[bloc.id]) return this._vignettes[bloc.id];
    const url = this.canvasTexture(bloc.id).toDataURL("image/png");
    this._vignettes[bloc.id] = url;
    return url;
  },

  // ============================================================
  //  TEXTURES DE BASE  —  dessinées pixel par pixel (16x16),
  //  aucun fichier à télécharger : léger et rapide !
  // ============================================================
  canvasTexture(id) {
    const c = document.createElement("canvas");
    c.width = 16; c.height = 16;
    const ctx = c.getContext("2d");

    const bruit = (base, variation) => {
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const v = (Math.random() - 0.5) * 2 * variation;
        ctx.fillStyle = this._nuance(base, v);
        ctx.fillRect(x, y, 1, 1);
      }
    };

    if (id === "herbe")  bruit("#5DA83F", 14);
    else if (id === "terre")  bruit("#8A6242", 12);
    else if (id === "pierre") bruit("#8E8E8E", 10);
    else if (id === "sable")  bruit("#E4D08A", 9);
    else if (id === "neige")  bruit("#F2F5F7", 5);
    else if (id === "bois") {
      bruit("#7A5230", 6);
      ctx.fillStyle = "rgba(60,38,20,0.55)";
      [2, 6, 10, 14].forEach(x => ctx.fillRect(x, 0, 1, 16));
    }
    else if (id === "planches") {
      bruit("#C19A6B", 7);
      ctx.fillStyle = "rgba(90,60,30,0.65)";
      [0, 4, 8, 12].forEach(y => ctx.fillRect(0, y, 16, 1));
      ctx.fillRect(8, 1, 1, 3); ctx.fillRect(3, 5, 1, 3);
      ctx.fillRect(11, 9, 1, 3); ctx.fillRect(5, 13, 1, 3);
    }
    else if (id === "brique") {
      ctx.fillStyle = "#C9BBB0";
      ctx.fillRect(0, 0, 16, 16);
      ctx.fillStyle = "#A9502F";
      for (let ligne = 0; ligne < 4; ligne++) {
        const decale = (ligne % 2) * 4;
        for (let col = -1; col < 3; col++) {
          ctx.fillRect(col * 8 + decale + 1, ligne * 4 + 1, 6, 2);
        }
      }
    }
    else if (id === "verre") {
      ctx.fillStyle = "rgba(190,230,245,0.45)";
      ctx.fillRect(0, 0, 16, 16);
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.strokeRect(0.5, 0.5, 15, 15);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillRect(3, 3, 2, 5); ctx.fillRect(5, 5, 2, 2);
    }
    else bruit("#B57EDC", 12);   // bloc inconnu : violet

    return c;
  },

  _nuance(hex, delta) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) + delta, g = ((n >> 8) & 255) + delta, b = (n & 255) + delta;
    r = Math.max(0, Math.min(255, r | 0));
    g = Math.max(0, Math.min(255, g | 0));
    b = Math.max(0, Math.min(255, b | 0));
    return "rgb(" + r + "," + g + "," + b + ")";
  }
};
