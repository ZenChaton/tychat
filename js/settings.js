/* ============================================================
   RÉGLAGES  —  valeurs par défaut + lecture/écriture
   Les touches sont maintenant modifiables une par une dans
   le menu Paramètres (cliquer une case, puis presser une touche).
   ============================================================ */

window.Reglages = {
  PAR_DEFAUT: {
    fov: 75,              // champ de vision (60 à 100)
    sensibilite: 50,      // sensibilité souris (10 à 100)
    volume: 70,           // volume général (0 à 100)
    ombres: true,         // ombres dans le jeu
    inverserY: false,     // inverser le haut/bas de la souris
    touches: {            // codes clavier (event.code)
      avant:    "KeyZ",
      arriere:  "KeyS",
      gauche:   "KeyQ",
      droite:   "KeyD",
      sauter:   "Space",
      ramasser: "KeyE"
    }
  },

  // Préréglages rapides proposés dans le menu
  PRESETS: {
    zqsd:    { avant: "KeyZ", arriere: "KeyS", gauche: "KeyQ", droite: "KeyD", sauter: "Space", ramasser: "KeyE" },
    wasd:    { avant: "KeyW", arriere: "KeyS", gauche: "KeyA", droite: "KeyD", sauter: "Space", ramasser: "KeyE" },
    fleches: { avant: "ArrowUp", arriere: "ArrowDown", gauche: "ArrowLeft", droite: "ArrowRight", sauter: "Space", ramasser: "KeyE" }
  },

  // Noms lisibles des actions (pour le menu)
  NOMS_ACTIONS: {
    avant: "Avancer", arriere: "Reculer", gauche: "Aller à gauche",
    droite: "Aller à droite", sauter: "Sauter", ramasser: "Ramasser"
  },

  actuel: null,

  charger() {
    const sauve = window.Sauvegarde.lire("reglages", {});
    this.actuel = Object.assign({}, this.PAR_DEFAUT, sauve);
    // fusion fine des touches (si une nouvelle action apparaît plus tard)
    this.actuel.touches = Object.assign({}, this.PAR_DEFAUT.touches, sauve.touches || {});
    return this.actuel;
  },

  definir(cle, valeur) {
    if (!this.actuel) this.charger();
    this.actuel[cle] = valeur;
    window.Sauvegarde.ecrire("reglages", this.actuel);
  },

  definirTouche(action, code) {
    if (!this.actuel) this.charger();
    this.actuel.touches[action] = code;
    window.Sauvegarde.ecrire("reglages", this.actuel);
  },

  obtenir(cle) {
    if (!this.actuel) this.charger();
    return this.actuel[cle];
  },

  // Transforme un code clavier en étiquette lisible : "KeyZ" -> "Z"
  etiquetteTouche(code) {
    if (!code) return "?";
    if (code.startsWith("Key")) return code.slice(3);
    if (code.startsWith("Digit")) return code.slice(5);
    const t = {
      Space: "ESPACE", ArrowUp: "\u2191", ArrowDown: "\u2193",
      ArrowLeft: "\u2190", ArrowRight: "\u2192",
      ShiftLeft: "MAJ G", ShiftRight: "MAJ D",
      ControlLeft: "CTRL G", ControlRight: "CTRL D",
      AltLeft: "ALT", AltRight: "ALT GR", Tab: "TAB", Enter: "ENTRÉE"
    };
    return t[code] || code;
  }
};
