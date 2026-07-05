/* ============================================================
   MENUS  —  navigation, serveurs, personnage, blocs, réglages
   ============================================================ */

(function () {
  const $ = (s) => document.querySelector(s);
  const D = window.GAME_DATA;
  let couleursPerso = null;
  let apercu = null;   // petit rendu 3D du personnage

  // ============================================================
  //  NAVIGATION
  // ============================================================
  function montrerEcran(id) {
    document.querySelectorAll(".ecran").forEach(e => e.classList.remove("actif"));
    $("#" + id).classList.add("actif");
    if (id === "ecran-perso") demarrerApercu(); else arreterApercu();
  }

  function init() {
    window.Reglages.charger();
    window.Blocs.charger();
    couleursPerso = window.Perso.charger();

    brancherMenuPrincipal();
    remplirServeurs();
    construirePanneauPerso();
    remplirBlocs();
    brancherReglages();
    construireMenuTouches();
    demarrerFond();
    montrerEcran("ecran-titre");
  }

  function brancherMenuPrincipal() {
    $("#btn-jouer").onclick    = () => montrerEcran("ecran-serveurs");
    $("#btn-perso").onclick    = () => montrerEcran("ecran-perso");
    $("#btn-blocs").onclick    = () => montrerEcran("ecran-blocs");
    $("#btn-reglages").onclick = () => montrerEcran("ecran-reglages");
    document.querySelectorAll(".btn-retour").forEach(b => {
      b.onclick = () => montrerEcran("ecran-titre");
    });
  }

  // ============================================================
  //  SERVEURS  (biomes + mondes créés)
  // ============================================================
  function remplirServeurs() {
    const grille = $("#grille-serveurs");
    grille.innerHTML = "";

    const carteMonde = (serveur, perso) => {
      const carte = document.createElement("div");
      carte.className = "carte";
      carte.tabIndex = 0;

      const pastille = document.createElement("div");
      pastille.className = "pastille";
      pastille.innerHTML =
        `<span style="background:${serveur.couleurCiel}"></span>` +
        `<span style="background:${serveur.couleurSol}"></span>`;
      carte.appendChild(pastille);

      const nom = document.createElement("div");
      nom.className = "nom";
      nom.textContent = (serveur.emoji ? serveur.emoji + " " : "") + serveur.nom;
      carte.appendChild(nom);

      const desc = document.createElement("div");
      desc.className = "desc";
      const nbCubes = (window.Sauvegarde.lire("monde-" + serveur.id, []) || []).length;
      desc.textContent = (serveur.description || "Créé par toi") +
        (nbCubes ? " · " + nbCubes + " blocs posés" : "");
      carte.appendChild(desc);

      const actions = document.createElement("div");
      actions.className = "actions-monde";
      const btnVider = document.createElement("button");
      btnVider.textContent = "🧹 Vider";
      btnVider.onclick = (e) => {
        e.stopPropagation();
        if (confirm("Casser TOUS les blocs de « " + serveur.nom + " » ?")) {
          window.Sauvegarde.effacer("monde-" + serveur.id);
          remplirServeurs();
        }
      };
      actions.appendChild(btnVider);
      if (perso) {
        const btnSuppr = document.createElement("button");
        btnSuppr.textContent = "🗑 Supprimer";
        btnSuppr.onclick = (e) => {
          e.stopPropagation();
          if (confirm("Supprimer le monde « " + serveur.nom + " » ?")) {
            const liste = window.Sauvegarde.lire("mondes", []).filter(x => x.id !== serveur.id);
            window.Sauvegarde.ecrire("mondes", liste);
            window.Sauvegarde.effacer("monde-" + serveur.id);
            remplirServeurs();
          }
        };
        actions.appendChild(btnSuppr);
      }
      carte.appendChild(actions);

      const lancer = () => lancerJeu(serveur);
      carte.onclick = lancer;
      carte.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); lancer(); } };
      return carte;
    };

    D.serveurs.forEach(s => grille.appendChild(carteMonde(s, false)));
    window.Sauvegarde.lire("mondes", []).forEach(m => grille.appendChild(carteMonde(m, true)));

    // carte de création
    const creer = document.createElement("div");
    creer.className = "carte creer-monde";
    creer.tabIndex = 0;
    creer.innerHTML = "➕ Créer un monde";
    creer.onclick = () => $("#form-monde").style.display = "flex";
    grille.appendChild(creer);

    $("#btn-monde-annuler").onclick = () => $("#form-monde").style.display = "none";
    $("#btn-monde-creer").onclick = () => {
      const nom = $("#monde-nom").value.trim() || "Mon monde";
      const monde = {
        id: "monde-" + Date.now(),
        nom: nom,
        couleurCiel: $("#monde-ciel").value,
        couleurSol: $("#monde-sol").value
      };
      const liste = window.Sauvegarde.lire("mondes", []);
      liste.push(monde);
      window.Sauvegarde.ecrire("mondes", liste);
      $("#form-monde").style.display = "none";
      $("#monde-nom").value = "";
      remplirServeurs();
    };
  }

  // ============================================================
  //  PERSONNAGE  —  panneaux de couleurs par partie du corps
  // ============================================================
  const PALETTE = [
    "#F2C79B", "#C68B59", "#8D5524", "#FDF6E3",
    "#EF6461", "#FFD166", "#7CB342", "#43BCCD",
    "#3D5A80", "#845EC2", "#FF9EB6", "#222831"
  ];

  function construirePanneauPerso() {
    const zone = $("#zone-couleurs");
    zone.innerHTML = "";
    const parties = [
      { cle: "tete",   nom: "Tête" },
      { cle: "torse",  nom: "Torse" },
      { cle: "bras",   nom: "Bras" },
      { cle: "jambes", nom: "Jambes" }
    ];
    parties.forEach(partie => {
      const bloc = document.createElement("div");
      bloc.className = "panneau-partie";
      const titre = document.createElement("h3");
      titre.textContent = partie.nom;
      bloc.appendChild(titre);

      const rangee = document.createElement("div");
      rangee.className = "rangee-couleurs";
      PALETTE.forEach(couleur => {
        const puce = document.createElement("button");
        puce.className = "puce";
        puce.style.background = couleur;
        if (couleursPerso[partie.cle] === couleur) puce.classList.add("choisie");
        puce.onclick = () => {
          couleursPerso[partie.cle] = couleur;
          window.Perso.sauver(couleursPerso);
          rangee.querySelectorAll(".puce").forEach(x => x.classList.remove("choisie"));
          puce.classList.add("choisie");
          majApercu();
        };
        rangee.appendChild(puce);
      });
      // couleur libre
      const libre = document.createElement("input");
      libre.type = "color";
      libre.className = "puce-libre";
      libre.value = couleursPerso[partie.cle];
      libre.oninput = () => {
        couleursPerso[partie.cle] = libre.value;
        window.Perso.sauver(couleursPerso);
        rangee.querySelectorAll(".puce").forEach(x => x.classList.remove("choisie"));
        majApercu();
      };
      rangee.appendChild(libre);
      bloc.appendChild(rangee);
      zone.appendChild(bloc);
    });
  }

  // petit rendu 3D tournant du bonhomme
  function demarrerApercu() {
    if (apercu) return;
    const canvas = $("#canvas-perso");
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 20);
    camera.position.set(0, 1.5, 4);
    camera.lookAt(0, 0.95, 0);
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(240, 300, false);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x554444, 1.1));
    const dir = new THREE.DirectionalLight(0xffffff, 0.7);
    dir.position.set(2, 4, 3);
    scene.add(dir);
    const bonhomme = window.Perso.construire(couleursPerso);
    scene.add(bonhomme);
    apercu = { scene, camera, renderer, bonhomme, rafId: 0, horloge: new THREE.Clock() };
    const boucle = () => {
      if (!apercu) return;
      apercu.rafId = requestAnimationFrame(boucle);
      const t = apercu.horloge.getElapsedTime();
      bonhomme.rotation.y = t * 0.9;
      window.Perso.animer(bonhomme, t, 0.5);
      renderer.render(scene, camera);
    };
    boucle();
  }

  function majApercu() {
    if (apercu) window.Perso.peindre(apercu.bonhomme, couleursPerso);
  }

  function arreterApercu() {
    if (!apercu) return;
    cancelAnimationFrame(apercu.rafId);
    apercu.renderer.dispose();
    apercu = null;
  }

  // ============================================================
  //  BLOCS  —  liste + création depuis une image
  // ============================================================
  function remplirBlocs() {
    const grille = $("#grille-blocs");
    grille.innerHTML = "";

    window.Blocs.tous().forEach(bloc => {
      const carte = document.createElement("div");
      carte.className = "carte carte-bloc";
      const cadre = document.createElement("div");
      cadre.className = "portrait";
      cadre.innerHTML = `<img src="${window.Blocs.vignette(bloc)}" alt="">`;
      carte.appendChild(cadre);
      const nom = document.createElement("div");
      nom.className = "nom"; nom.textContent = bloc.nom;
      carte.appendChild(nom);
      if (bloc.image) {
        const actions = document.createElement("div");
        actions.className = "actions-monde";
        const btn = document.createElement("button");
        btn.textContent = "🗑 Supprimer";
        btn.onclick = () => {
          if (confirm("Supprimer le bloc « " + bloc.nom + " » ? (les cubes déjà posés deviendront violets)")) {
            window.Blocs.supprimer(bloc.id);
            remplirBlocs();
          }
        };
        actions.appendChild(btn);
        carte.appendChild(actions);
      } else {
        const desc = document.createElement("div");
        desc.className = "desc"; desc.textContent = "Bloc de base";
        carte.appendChild(desc);
      }
      grille.appendChild(carte);
    });

    // création
    $("#btn-bloc-creer").onclick = () => {
      const fichier = $("#bloc-fichier").files[0];
      if (!fichier) { $("#bloc-message").textContent = "Choisis d'abord une image !"; return; }
      const nom = $("#bloc-nom").value.trim() || "Mon bloc";
      $("#bloc-message").textContent = "Création en cours…";
      window.Blocs.ajouterDepuisImage(nom, fichier, (bloc, erreur) => {
        if (erreur) { $("#bloc-message").textContent = "⚠️ " + erreur; return; }
        $("#bloc-message").textContent = "✅ « " + bloc.nom + " » ajouté !";
        $("#bloc-nom").value = "";
        $("#bloc-fichier").value = "";
        remplirBlocs();
      });
    };
  }

  // ============================================================
  //  RÉGLAGES
  // ============================================================
  function brancherReglages() {
    const r = window.Reglages.actuel;
    const fov = $("#reglage-fov"), sens = $("#reglage-sensibilite"),
          dist = $("#reglage-distance"),
          ombres = $("#reglage-ombres"), invY = $("#reglage-invy");
    fov.value = r.fov; sens.value = r.sensibilite; dist.value = r.distance;
    ombres.checked = r.ombres; invY.checked = r.inverserY;
    $("#valeur-fov").textContent = r.fov;
    $("#valeur-sensibilite").textContent = r.sensibilite;
    $("#valeur-distance").textContent = r.distance;

    fov.oninput = () => { r.fov = +fov.value; $("#valeur-fov").textContent = fov.value; window.Reglages.sauver(); };
    sens.oninput = () => { r.sensibilite = +sens.value; $("#valeur-sensibilite").textContent = sens.value; window.Reglages.sauver(); };
    dist.oninput = () => { r.distance = +dist.value; $("#valeur-distance").textContent = dist.value; window.Reglages.sauver(); };
    ombres.onchange = () => { r.ombres = ombres.checked; window.Reglages.sauver(); };
    invY.onchange = () => { r.inverserY = invY.checked; window.Reglages.sauver(); };
  }

  // ---- touches remappables ----
  let captureEnCours = null;

  function construireMenuTouches() {
    const zone = $("#zone-touches");
    zone.innerHTML = "";
    const t = window.Reglages.actuel.touches;
    Object.keys(window.Reglages.NOMS_ACTIONS).forEach(action => {
      const ligne = document.createElement("div");
      ligne.className = "ligne-touche";
      const nom = document.createElement("span");
      nom.textContent = window.Reglages.NOMS_ACTIONS[action];
      const touche = document.createElement("button");
      touche.className = "case-touche";
      touche.textContent = window.Reglages.etiquetteTouche(t[action]);
      touche.onclick = () => {
        if (captureEnCours) captureEnCours.el.classList.remove("attente");
        captureEnCours = { action, el: touche };
        touche.classList.add("attente");
        touche.textContent = "…";
      };
      ligne.appendChild(nom);
      ligne.appendChild(touche);
      zone.appendChild(ligne);
    });

    $("#btn-preset-zqsd").onclick = () => appliquerPreset("zqsd");
    $("#btn-preset-fleches").onclick = () => appliquerPreset("fleches");
  }

  function appliquerPreset(nom) {
    window.Reglages.actuel.touches = Object.assign({}, window.Reglages.PRESETS[nom]);
    window.Reglages.sauver();
    construireMenuTouches();
  }

  window.addEventListener("keydown", (e) => {
    if (!captureEnCours) return;
    e.preventDefault();
    window.Reglages.actuel.touches[captureEnCours.action] = e.code;
    window.Reglages.sauver();
    captureEnCours = null;
    construireMenuTouches();
  });

  // ============================================================
  //  LANCEMENT DU JEU
  // ============================================================
  function lancerJeu(serveur) {
    montrerEcran("ecran-jeu");
    window.Jeu.demarrer({
      serveur: serveur,
      reglages: window.Reglages.actuel,
      canvas: $("#canvas-jeu")
    });
    $("#btn-quitter").onclick = () => {
      window.Jeu.arreter();
      remplirServeurs();
      montrerEcran("ecran-serveurs");
    };
  }

  // ============================================================
  //  FOND DU MENU  —  étoiles + cubes flottants
  // ============================================================
  function demarrerFond() {
    const canvas = $("#canvas-fond");
    const ctx = canvas.getContext("2d");
    const etoiles = [];
    for (let i = 0; i < 90; i++) {
      etoiles.push({
        x: Math.random(), y: Math.random(),
        taille: 0.6 + Math.random() * 1.8,
        vitesse: 0.4 + Math.random() * 1.4,
        phase: Math.random() * Math.PI * 2
      });
    }
    const cubes = [];
    for (let i = 0; i < 8; i++) {
      cubes.push({
        x: Math.random(), y: 0.15 + Math.random() * 0.7,
        taille: 18 + Math.random() * 30,
        angle: Math.random() * Math.PI * 2,
        vAngle: (Math.random() - 0.5) * 0.4,
        vy: 4 + Math.random() * 7,
        teinte: ["#FFD166", "#EF6461", "#43BCCD", "#7CB342"][i % 4]
      });
    }
    function boucle(t) {
      const l = canvas.width = canvas.clientWidth;
      const h = canvas.height = canvas.clientHeight;
      ctx.clearRect(0, 0, l, h);
      const s = t / 1000;
      etoiles.forEach(e => {
        const alpha = 0.35 + 0.6 * Math.abs(Math.sin(s * e.vitesse + e.phase));
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#FDF6E3";
        ctx.fillRect(e.x * l, e.y * h, e.taille, e.taille);
      });
      ctx.globalAlpha = 0.8;
      cubes.forEach(c => {
        const cx = c.x * l;
        const cy = c.y * h + Math.sin(s * 0.6 + c.x * 9) * c.vy;
        const a = c.angle + s * c.vAngle;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(a);
        ctx.fillStyle = c.teinte;
        ctx.fillRect(-c.taille / 2, -c.taille / 2, c.taille, c.taille);
        ctx.strokeStyle = "rgba(0,0,0,0.35)";
        ctx.lineWidth = 3;
        ctx.strokeRect(-c.taille / 2, -c.taille / 2, c.taille, c.taille);
        ctx.restore();
      });
      ctx.globalAlpha = 1;
      requestAnimationFrame(boucle);
    }
    requestAnimationFrame(boucle);
  }

  window.addEventListener("DOMContentLoaded", init);
})();
