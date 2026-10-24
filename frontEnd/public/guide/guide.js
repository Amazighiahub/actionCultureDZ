// Guide du contributeur : apparitions, barre de progression, arbre lieu → points.
// Fichier séparé : la politique de sécurité du site (script-src 'self') bloque les scripts dans la page.
document.documentElement.classList.add('js');
document.addEventListener('DOMContentLoaded', function () {
  var reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Apparitions au défilement
  var cibles = document.querySelectorAll('.apparait, .telephone, .tableau');
  if ('IntersectionObserver' in window && !reduit) {
    var io = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('vu'); if (e.target.id === 'arbre') tracerArbre(); io.unobserve(e.target); }
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -40px 0px' });
    cibles.forEach(function (c) { io.observe(c); });
  } else {
    cibles.forEach(function (c) { c.classList.add('vu'); });
  }

  // Barre du haut, progression et étape en cours
  var barre = document.getElementById('barre');
  var prog = document.getElementById('progression');
  var liens = Array.prototype.slice.call(document.querySelectorAll('.etapes-nav a'));
  var sections = liens.map(function (a) { return document.querySelector(a.getAttribute('href')); });
  var attente = false;
  function maj() {
    attente = false;
    var y = window.scrollY, h = document.documentElement.scrollHeight - window.innerHeight;
    barre.classList.toggle('visible', y > window.innerHeight * 0.6);
    prog.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, y / h) : 0) + ')';
    var actif = -1;
    sections.forEach(function (s, i) { if (s && s.getBoundingClientRect().top < 140) actif = i; });
    liens.forEach(function (a, i) {
      var etait = a.classList.contains('actif');
      a.classList.toggle('actif', i === actif);
      if (i === actif && !etait) {
        // Page arabe (de droite à gauche) : le défilement horizontal se compte autrement
        if (document.dir === 'rtl') a.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduit ? 'auto' : 'smooth' });
        else a.parentNode.scrollTo({ left: a.offsetLeft - 16, behavior: reduit ? 'auto' : 'smooth' });
      }
    });
  }
  window.addEventListener('scroll', function () { if (!attente) { attente = true; requestAnimationFrame(maj); } }, { passive: true });
  window.addEventListener('resize', function () { maj(); tracerArbre(); });
  maj();

  // Liens de l'arbre lieu → points, dessinés entre les cases
  function tracerArbre() {
    var arbre = document.getElementById('arbre');
    var svg = arbre.querySelector('svg.liens');
    if (getComputedStyle(svg).display === 'none') return;
    var base = arbre.getBoundingClientRect();
    var d = '';
    arbre.querySelectorAll('[data-parent]').forEach(function (n) {
      var p = arbre.querySelector('[data-noeud="' + n.getAttribute('data-parent') + '"]').getBoundingClientRect();
      var e = n.getBoundingClientRect();
      var x1 = p.left + p.width / 2 - base.left, y1 = p.bottom - base.top;
      var x2 = e.left + e.width / 2 - base.left, y2 = e.top - base.top;
      var ym = (y1 + y2) / 2;
      d += 'M' + x1 + ',' + y1 + ' V' + ym + ' H' + x2 + ' V' + y2 + ' ';
    });
    svg.innerHTML = '<path d="' + d + '" pathLength="400" style="--long:400"></path>';
  }
  tracerArbre();
});
