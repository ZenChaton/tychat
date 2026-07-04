/* ============================================================
   MAIN  —  chef d'orchestre
   Relie les menus, les données, les réglages et le jeu.
   ============================================================ */

(function () {
  "use strict";

  const D = window.GAME_DATA;
  const $ = (sel) => document.querySelector(sel);

  let perso = null;          // configuration complète du personnage
  let choixCompagnon = null;

  // ============================================================
  //  NAVIGATION
  // ============================================================
  function montrerEcran(id) {
    document.querySelectorAll(".ecran").forEach(e => e.classList.remove("actif"));
    $("#" + id).classList.add("actif");
  }

  // ============================================================
  //  DÉMARRAGE
  // ============================================================
  function init() {
    window.Reglages.charger();
    window.Inventaire.charger();

    // ---- Personnage sauvegardé (ou valeurs de départ) ----
    const persoDefaut = {
      peau: "#F2C79B",
      tenue: "classique",
      cheveux: { style: "court", couleur: "#5B3A1E" },
      chapeau: "aucun", lunettes: "aucun", cape: "aucun",
      chaussures: "aucun",
      sac: "aucun", bijou: "aucun", tatouage: "aucun"
    };
    perso = Object.assign({}, persoDefaut, window.Sauvegarde.lire("perso", {}));
    perso.cheveux = Object.assign({}, persoDefaut.cheveux, perso.cheveux || {});

    const idComp = window.Sauvegarde.lire("compagnon", D.companions[0].id);
    choixCompagnon = D.companions.find(c => c.id === idComp) || D.companions[0];

    fondAnime();
    brancherMenuPrincipal();
    remplirServeurs();
    construireMenuPersonnage();
    remplirCompagnons();
    brancherReglages();
    construireMenuTouches();
    brancherJeu();

    montrerEcran("ecran-titre");
  }

  // La config du personnage -> config pour construireAvatar()
  function configAvatar() {
    const tenue = D.tenues.find(t => t.id === perso.tenue) || D.tenues[0];
    return {
      peau: perso.peau,
      haut: tenue.haut, bas: tenue.bas,
      cheveux: perso.cheveux,
      chapeau: perso.chapeau, lunettes: perso.lunettes, cape: perso.cape,
      chaussures: perso.chaussures,
      sac: perso.sac, bijou: perso.bijou, tatouage: perso.tatouage
    };
  }

  function sauverPerso() {
    window.Sauvegarde.ecrire("perso", perso);
  }

  // ============================================================
  //  MENU PRINCIPAL
  // ============================================================
  function brancherMenuPrincipal() {
    $("#btn-jouer").onclick     = () => montrerEcran("ecran-serveurs");
    $("#btn-perso").onclick     = () => { montrerEcran("ecran-perso"); ouvrirApercu("perso"); };
    $("#btn-compagnon").onclick = () => { montrerEcran("ecran-compagnons"); ouvrirApercu("compagnon"); };
    $("#btn-reglages").onclick  = () => montrerEcran("ecran-reglages");

    document.querySelectorAll(".btn-retour").forEach(b => {
      b.onclick = () => montrerEcran("ecran-titre");
    });
  }

  // ============================================================
  //  SERVEURS
  // ============================================================
  function remplirServeurs() {
    const grille = $("#grille-serveurs");
    grille.innerHTML = "";
    D.servers.forEach(srv => {
      const carte = document.createElement("div");
      carte.className = "carte" + (srv.disponible ? "" : " indispo");
      carte.tabIndex = srv.disponible ? 0 : -1;

      const apercu = document.createElement("div");
      apercu.className = "pastille";
      apercu.innerHTML =
        `<span style="background:${srv.couleurCiel}"></span>` +
        `<span style="background:${srv.couleurSol}"></span>`;
      carte.appendChild(apercu);

      const nom = document.createElement("div");
      nom.className = "nom"; nom.textContent = srv.nom;
      carte.appendChild(nom);

      const desc = document.createElement("div");
      desc.className = "desc"; desc.textContent = srv.description;
      carte.appendChild(desc);

      if (!srv.disponible) {
        const badge = document.createElement("div");
        badge.className = "badge"; badge.textContent = "Bientôt";
        carte.appendChild(badge);
      } else {
        const lancer = () => lancerJeu(srv);
        carte.onclick = lancer;
        carte.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); lancer(); } };
      }
      grille.appendChild(carte);
    });
  }

  // ============================================================
  //  MENU PERSONNAGE  (peau, cheveux, tenue, accessoires)
  //  Tout est généré ici pour garder le HTML léger.
  // ============================================================
  function construireMenuPersonnage() {
    const zone = $("#zone-perso");
    zone.innerHTML = "";

    // ---- Couleur de peau : palette + couleur libre ----
    zone.appendChild(sectionPalette("Couleur de peau", D.peaux, () => perso.peau, (c) => {
      perso.peau = c; sauverPerso(); rafraichirApercuPerso();
    }));

    // ---- Cheveux : coiffure + couleur ----
    zone.appendChild(sectionCartesMini("Coiffure", D.cheveux, () => perso.cheveux.style, (id) => {
      perso.cheveux.style = id; sauverPerso(); rafraichirApercuPerso();
    }));
    zone.appendChild(sectionPalette("Couleur de cheveux", D.couleursCheveux, () => perso.cheveux.couleur, (c) => {
      perso.cheveux.couleur = c; sauverPerso(); rafraichirApercuPerso();
    }));

    // ---- Tenue ----
    zone.appendChild(sectionCartesMini("Tenue", D.tenues, () => perso.tenue, (id) => {
      perso.tenue = id; sauverPerso(); rafraichirApercuPerso();
    }, (t) => `<span style="background:${t.haut}"></span><span style="background:${t.bas}"></span>`));

    // ---- Accessoires ----
    const acc = [
      ["Chapeau", "chapeaux", "chapeau"],
      ["Lunettes & masques", "lunettes", "lunettes"],
      ["Cape", "capes", "cape"],
      ["Chaussures", "chaussures", "chaussures"],
      ["Sac", "sacs", "sac"],
      ["Bijoux", "bijoux", "bijou"],
      ["Tatouage", "tatouages", "tatouage"]
    ];
    acc.forEach(([titre, liste, cle]) => {
      zone.appendChild(sectionCartesMini(titre, D[liste], () => perso[cle], (id) => {
        perso[cle] = id; sauverPerso(); rafraichirApercuPerso();
      }, (item) => `<span style="background:${item.couleur || "#3a3f58"}"></span>`));
    });
  }

  // Section avec des pastilles rondes de couleurs + choix libre
  function sectionPalette(titre, couleurs, lireActuel, surChoix) {
    const sec = document.createElement("div");
    sec.className = "section-perso";
    const h = document.createElement("div");
    h.className = "titre-section"; h.textContent = titre;
    sec.appendChild(h);

    const rangee = document.createElement("div");
    rangee.className = "rangee-swatches";

    const majSelection = () => {
      rangee.querySelectorAll(".swatch").forEach(s => {
        s.classList.toggle("choisie", s.dataset.c === lireActuel());
      });
    };

    couleurs.forEach(c => {
      const s = document.createElement("button");
      s.className = "swatch";
      s.style.background = c;
      s.dataset.c = c;
      s.title = c;
      s.onclick = () => { surChoix(c); majSelection(); };
      rangee.appendChild(s);
    });

    // couleur libre
    const libre = document.createElement("input");
    libre.type = "color";
    libre.className = "swatch-libre";
    libre.value = lireActuel();
    libre.title = "Couleur libre";
    libre.oninput = () => { surChoix(libre.value); majSelection(); };
    rangee.appendChild(libre);

    sec.appendChild(rangee);
    majSelection();
    return sec;
  }

  // Section avec des petites cartes (coiffures, tenues, accessoires)
  function sectionCartesMini(titre, liste, lireActuel, surChoix, renduPastille) {
    const sec = document.createElement("div");
    sec.className = "section-perso";
    const h = document.createElement("div");
    h.className = "titre-section"; h.textContent = titre;
    sec.appendChild(h);

    const grille = document.createElement("div");
    grille.className = "grille mini";

    liste.forEach(item => {
      const carte = document.createElement("div");
      carte.className = "carte mini" + (item.id === lireActuel() ? " choisie" : "");
      carte.tabIndex = 0;
      if (renduPastille && item.id !== "aucun") {
        const p = document.createElement("div");
        p.className = "pastille petite";
        p.innerHTML = renduPastille(item);
        carte.appendChild(p);
      }
      const nom = document.createElement("div");
      nom.className = "nom"; nom.textContent = item.nom;
      carte.appendChild(nom);

      const choisir = () => {
        surChoix(item.id);
        grille.querySelectorAll(".carte").forEach(c => c.classList.remove("choisie"));
        carte.classList.add("choisie");
      };
      carte.onclick = choisir;
      carte.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choisir(); } };
      grille.appendChild(carte);
    });
    sec.appendChild(grille);
    return sec;
  }

  function rafraichirApercuPerso() {
    window.Apercu.montrer("avatar", configAvatar());
  }

  // ============================================================
  //  COMPAGNONS
  // ============================================================
  function remplirCompagnons() {
    const grille = $("#grille-compagnons");
    grille.innerHTML = "";
    D.companions.forEach(comp => {
      const carte = document.createElement("div");
      carte.className = "carte" + (comp.id === choixCompagnon.id ? " choisie" : "");
      carte.tabIndex = 0;

      const past = document.createElement("div");
      past.className = "pastille";
      if (comp.forme === "aucun") {
        past.innerHTML = `<span style="background:#2b080b"></span>`;
      } else {
        past.innerHTML =
          `<span style="background:${comp.corps}"></span>` +
          `<span style="background:${comp.accent}"></span>`;
      }
      carte.appendChild(past);

      const nom = document.createElement("div");
      nom.className = "nom"; nom.textContent = comp.nom;
      carte.appendChild(nom);

      const choisir = () => {
        choixCompagnon = comp;
        window.Sauvegarde.ecrire("compagnon", comp.id);
        grille.querySelectorAll(".carte").forEach(c => c.classList.remove("choisie"));
        carte.classList.add("choisie");
        window.Apercu.montrer("compagnon", comp);
      };
      carte.onclick = choisir;
      carte.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choisir(); } };
      grille.appendChild(carte);
    });
  }

  // ------------------------------------------------------------
  //  APERÇU 3D partagé
  let apercuPret = false;
  function ouvrirApercu(type) {
    const conteneur = (type === "perso") ? $("#apercu-perso") : $("#apercu-compagnon");
    if (!apercuPret) {
      window.Apercu.init(conteneur);
      apercuPret = true;
    } else {
      conteneur.appendChild(window.Apercu.renderer.domElement);
      window.Apercu.conteneur = conteneur;
      window.Apercu._redimensionner();
    }
    if (type === "perso") window.Apercu.montrer("avatar", configAvatar());
    else                  window.Apercu.montrer("compagnon", choixCompagnon);
  }

  // ============================================================
  //  RÉGLAGES (curseurs et interrupteurs)
  // ============================================================
  function brancherReglages() {
    const r = window.Reglages;

    const fov = $("#reg-fov"), fovVal = $("#reg-fov-val");
    fov.value = r.obtenir("fov"); fovVal.textContent = fov.value;
    fov.oninput = () => { fovVal.textContent = fov.value; r.definir("fov", parseInt(fov.value)); };

    const sens = $("#reg-sens"), sensVal = $("#reg-sens-val");
    sens.value = r.obtenir("sensibilite"); sensVal.textContent = sens.value;
    sens.oninput = () => { sensVal.textContent = sens.value; r.definir("sensibilite", parseInt(sens.value)); };

    const vol = $("#reg-volume"), volVal = $("#reg-volume-val");
    vol.value = r.obtenir("volume"); volVal.textContent = vol.value;
    vol.oninput = () => { volVal.textContent = vol.value; r.definir("volume", parseInt(vol.value)); };

    const ombres = $("#reg-ombres");
    ombres.checked = r.obtenir("ombres");
    ombres.onchange = () => r.definir("ombres", ombres.checked);

    const inverser = $("#reg-inverser");
    inverser.checked = r.obtenir("inverserY");
    inverser.onchange = () => r.definir("inverserY", inverser.checked);
  }

  // ============================================================
  //  TOUCHES  —  cases cliquables : clic puis pressez une touche
  // ============================================================
  let actionEnAttente = null;

  function construireMenuTouches() {
    const grille = $("#grille-touches");
    grille.innerHTML = "";
    const r = window.Reglages;

    Object.keys(r.NOMS_ACTIONS).forEach(action => {
      const boite = document.createElement("button");
      boite.className = "touche-case";
      boite.dataset.action = action;

      const nom = document.createElement("span");
      nom.className = "action"; nom.textContent = r.NOMS_ACTIONS[action];
      const kbd = document.createElement("kbd");
      kbd.textContent = r.etiquetteTouche(r.actuel.touches[action]);

      boite.appendChild(nom);
      boite.appendChild(kbd);
      boite.onclick = () => commencerCapture(action, boite);
      grille.appendChild(boite);
    });

    // préréglages rapides
    document.querySelectorAll("[data-preset]").forEach(b => {
      b.onclick = () => {
        const p = r.PRESETS[b.dataset.preset];
        Object.keys(p).forEach(a => r.definirTouche(a, p[a]));
        construireMenuTouches();
      };
    });

    // capture globale de la prochaine touche
    window.addEventListener("keydown", capturerTouche, true);
  }

  function commencerCapture(action, boite) {
    // on annule une éventuelle capture en cours
    document.querySelectorAll(".touche-case.attente").forEach(b => {
      b.classList.remove("attente");
      b.querySelector("kbd").textContent =
        window.Reglages.etiquetteTouche(window.Reglages.actuel.touches[b.dataset.action]);
    });
    actionEnAttente = action;
    boite.classList.add("attente");
    boite.querySelector("kbd").textContent = "…";
  }

  function capturerTouche(e) {
    if (!actionEnAttente) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.code !== "Escape") {
      window.Reglages.definirTouche(actionEnAttente, e.code);
    }
    actionEnAttente = null;
    // on redessine toutes les cases
    const grille = $("#grille-touches");
    if (grille) {
      grille.querySelectorAll(".touche-case").forEach(b => {
        b.classList.remove("attente");
        b.querySelector("kbd").textContent =
          window.Reglages.etiquetteTouche(window.Reglages.actuel.touches[b.dataset.action]);
      });
    }
  }

  // ============================================================
  //  JEU
  // ============================================================
  function brancherJeu() {
    $("#btn-quitter").onclick = quitterJeu;
  }

  function lancerJeu(serveur) {
    montrerEcran("ecran-jeu");
    $("#chargement").style.display = "flex";
    setTimeout(() => {
      window.Jeu.demarrer({
        serveur: serveur,
        perso: configAvatar(),
        compagnon: choixCompagnon,
        reglages: window.Reglages.actuel,
        canvas: $("#canvas-jeu")
      });
      $("#chargement").style.display = "none";
    }, 120);
  }

  function quitterJeu() {
    window.Jeu.arreter();
    montrerEcran("ecran-titre");
  }

  // ============================================================
  //  FOND ANIMÉ  —  éclairs et étoiles qui scintillent
  //  Chaque forme a un halo lumineux (brillance) et une ombre
  //  portée, et sa luminosité pulse doucement.
  // ============================================================
  function fondAnime() {
    const canvas = $("#canvas-fond");
    const ctx = canvas.getContext("2d");
    const couleurs = ["#FFD166", "#FFE9A8", "#FDF6E3", "#FFB347", "#43BCCD"];
    let formes = [];

    function dimensionner() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    dimensionner();
    window.addEventListener("resize", dimensionner);

    // beaucoup d'étoiles, quelques éclairs
    for (let i = 0; i < 26; i++) {
      const estEclair = i % 5 === 0;   // 1 forme sur 5 est un éclair
      formes.push({
        type: estEclair ? "eclair" : "etoile",
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        taille: estEclair ? (22 + Math.random() * 26) : (7 + Math.random() * 16),
        vitesse: 6 + Math.random() * 14,
        rot: (Math.random() - 0.5) * 0.6,
        vrot: (Math.random() - 0.5) * 0.25,
        couleur: couleurs[Math.floor(Math.random() * couleurs.length)],
        alpha: 0.25 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2,      // décalage du scintillement
        vScintille: 1.2 + Math.random() * 2.2    // vitesse du scintillement
      });
    }

    // Étoile à 5 branches centrée sur (0,0)
    function tracerEtoile(s) {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = (i % 2 === 0) ? s : s * 0.45;
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        const x = Math.cos(a) * r, y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
    }

    // Éclair en zigzag centré sur (0,0)
    function tracerEclair(s) {
      const p = [
        [0.5, 0], [0, 0.6], [0.4, 0.6],
        [0.25, 1], [1, 0.35], [0.55, 0.35]
      ];
      ctx.beginPath();
      p.forEach(([x, y], i) => {
        const px = (x - 0.5) * s, py = (y - 0.5) * s * 1.5;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.closePath();
    }

    function dessinerForme(f, scintille) {
      const tracer = () => (f.type === "etoile" ? tracerEtoile(f.taille) : tracerEclair(f.taille));

      // 1) ombre portée : la même forme, sombre, légèrement décalée
      ctx.save();
      ctx.globalAlpha = f.alpha * scintille * 0.45;
      ctx.translate(3, 5);
      tracer();
      ctx.fillStyle = "rgba(10, 2, 3, 0.9)";
      ctx.fill();
      ctx.restore();

      // 2) la forme elle-même avec un halo lumineux (brillance)
      ctx.globalAlpha = f.alpha * scintille;
      ctx.shadowColor = f.couleur;
      ctx.shadowBlur = f.taille * 1.4;
      tracer();
      ctx.fillStyle = f.couleur;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    let dernier = performance.now();
    function boucle(t) {
      const dt = Math.min((t - dernier) / 1000, 0.05);
      dernier = t;
      const temps = t / 1000;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      formes.forEach(f => {
        f.y -= f.vitesse * dt;
        f.rot += f.vrot * dt;
        if (f.y + f.taille * 2 < 0) {
          f.y = canvas.height + f.taille;
          f.x = Math.random() * canvas.width;
        }
        // scintillement : la luminosité monte et descend doucement
        const scintille = 0.55 + 0.45 * Math.sin(temps * f.vScintille + f.phase);
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rot);
        dessinerForme(f, scintille);
        ctx.restore();
      });
      requestAnimationFrame(boucle);
    }
    requestAnimationFrame(boucle);
  }

  // ------------------------------------------------------------
  window.addEventListener("DOMContentLoaded", init);
})();
