/* ============================================================
   SAUVEGARDE  —  garde en mémoire les choix du joueur
   (skin, compagnon, réglages) même après avoir fermé la page.
   On protège tout dans des try/catch au cas où le navigateur
   bloque la sauvegarde : le jeu marche quand même.
   ============================================================ */

window.Sauvegarde = {
  _prefixe: "monjeu_",
  _repli: {},   // mémoire de secours si localStorage indisponible

  lire(cle, valeurParDefaut) {
    try {
      const brut = localStorage.getItem(this._prefixe + cle);
      if (brut === null) return valeurParDefaut;
      return JSON.parse(brut);
    } catch (e) {
      return (cle in this._repli) ? this._repli[cle] : valeurParDefaut;
    }
  },

  ecrire(cle, valeur) {
    this._repli[cle] = valeur;
    try {
      localStorage.setItem(this._prefixe + cle, JSON.stringify(valeur));
    } catch (e) {
      /* pas grave : on garde au moins en mémoire pour la session */
    }
  }
};
