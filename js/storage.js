/* ============================================================
   SAUVEGARDE  —  mémoire du navigateur (préfixe cubcha:
   pour ne pas mélanger avec TyCha sur le même domaine)
   ============================================================ */

window.Sauvegarde = {
  PREFIXE: "cubcha:",
  _memoire: {},
  _dispo: (function () {
    try {
      localStorage.setItem("cubcha:test", "1");
      localStorage.removeItem("cubcha:test");
      return true;
    } catch (e) { return false; }
  })(),

  lire(cle, defaut) {
    try {
      const brut = this._dispo
        ? localStorage.getItem(this.PREFIXE + cle)
        : this._memoire[cle];
      if (brut === null || brut === undefined) return defaut;
      return JSON.parse(brut);
    } catch (e) { return defaut; }
  },

  ecrire(cle, valeur) {
    try {
      const brut = JSON.stringify(valeur);
      if (this._dispo) localStorage.setItem(this.PREFIXE + cle, brut);
      else this._memoire[cle] = brut;
      return true;
    } catch (e) {
      console.warn("Sauvegarde impossible (espace plein ?)", e);
      return false;
    }
  },

  effacer(cle) {
    if (this._dispo) localStorage.removeItem(this.PREFIXE + cle);
    else delete this._memoire[cle];
  }
};
