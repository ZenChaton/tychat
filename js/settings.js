/* ============================================================
   RÉGLAGES  —  caméra, souris, touches, performance
   ============================================================ */

window.Reglages = {
  actuel: null,

  DEFAUT: {
    fov: 75,
    sensibilite: 50,
    ombres: false,          // désactivées par défaut : plus léger !
    inverserY: false,
    distance: 48,           // distance d'affichage (brouillard)
    touches: {
      avant:   "KeyW",
      arriere: "KeyS",
      gauche:  "KeyA",
      droite:  "KeyD",
      sauter:  "Space"
    }
  },

  PRESETS: {
    zqsd:    { avant: "KeyW", arriere: "KeyS", gauche: "KeyA", droite: "KeyD", sauter: "Space" },
    fleches: { avant: "ArrowUp", arriere: "ArrowDown", gauche: "ArrowLeft", droite: "ArrowRight", sauter: "Space" }
  },

  NOMS_ACTIONS: {
    avant: "Avancer", arriere: "Reculer", gauche: "Aller à gauche",
    droite: "Aller à droite", sauter: "Sauter"
  },

  charger() {
    const sauve = window.Sauvegarde.lire("reglages", {});
    this.actuel = Object.assign({}, this.DEFAUT, sauve);
    this.actuel.touches = Object.assign({}, this.DEFAUT.touches, sauve.touches || {});
  },

  sauver() { window.Sauvegarde.ecrire("reglages", this.actuel); },

  etiquetteTouche(code) {
    if (!code) return "?";
    if (code === "Space") return "Espace";
    if (code.startsWith("Key")) {
      const lettre = code.slice(3);
      const azerty = { W: "Z", A: "Q", Q: "A", Z: "W" };
      return (azerty[lettre] || lettre);
    }
    if (code.startsWith("Digit")) return code.slice(5);
    const noms = {
      ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→",
      ShiftLeft: "Maj G", ShiftRight: "Maj D", Enter: "Entrée", Tab: "Tab"
    };
    return noms[code] || code;
  }
};
