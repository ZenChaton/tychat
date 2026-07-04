/* ============================================================
   INVENTAIRE  —  6 cases en bas de l'écran
   - Touches 1 à 6 (ou clic) pour choisir la case active.
   - L'objet de la case active est tenu en main.
   - Ramasser quand c'est plein : l'objet ramassé remplace
     celui de la case active, qui tombe au sol.
   ============================================================ */

window.Inventaire = {
  TAILLE: 6,
  cases: [],        // tableau d'ids d'armes (ou null)
  actif: 0,         // index de la case sélectionnée
  onChangement: null,   // appelé quand la main doit changer

  charger() {
    const sauve = window.Sauvegarde.lire("inventaire", null);
    if (sauve && Array.isArray(sauve.cases) && sauve.cases.length === this.TAILLE) {
      this.cases = sauve.cases;
      this.actif = Math.min(Math.max(sauve.actif || 0, 0), this.TAILLE - 1);
    } else {
      this.cases = ["baton", null, null, null, null, null];
      this.actif = 0;
    }
  },

  _sauver() {
    window.Sauvegarde.ecrire("inventaire", { cases: this.cases, actif: this.actif });
  },

  objetEnMain() {
    return this.cases[this.actif];
  },

  choisir(index) {
    if (index < 0 || index >= this.TAILLE) return;
    this.actif = index;
    this._sauver();
    this.afficher();
    if (this.onChangement) this.onChangement();
  },

  /* Ramasse un objet. Renvoie :
     { ok: true, largue: null }        -> rangé dans une case vide
     { ok: true, largue: "idArme" }    -> plein : échange avec la case active
  */
  ramasser(idArme) {
    const vide = this.cases.indexOf(null);
    if (vide !== -1) {
      this.cases[vide] = idArme;
      this._sauver();
      this.afficher();
      if (vide === this.actif && this.onChangement) this.onChangement();
      return { ok: true, largue: null };
    }
    // plein : on échange avec la case active
    const ancien = this.cases[this.actif];
    this.cases[this.actif] = idArme;
    this._sauver();
    this.afficher();
    if (this.onChangement) this.onChangement();
    return { ok: true, largue: ancien };
  },

  // ---- Affichage DOM ----
  afficher() {
    const barre = document.getElementById("barre-inventaire");
    if (!barre) return;
    barre.innerHTML = "";
    for (let i = 0; i < this.TAILLE; i++) {
      const c = document.createElement("div");
      c.className = "case-inv" + (i === this.actif ? " active" : "");
      const num = document.createElement("span");
      num.className = "num"; num.textContent = i + 1;
      c.appendChild(num);
      const id = this.cases[i];
      if (id) {
        const arme = (window.GAME_DATA.armes || []).find(a => a.id === id);
        const ic = document.createElement("span");
        ic.className = "icone";
        ic.textContent = arme ? arme.emoji : "❓";
        ic.title = arme ? arme.nom : id;
        c.appendChild(ic);
      }
      c.onclick = () => this.choisir(i);
      barre.appendChild(c);
    }
  }
};
