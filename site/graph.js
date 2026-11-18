// Shared by index.html (en) and ro/index.html (ro). The stage's build animation, decorative only.
// It plays a SIMULATED build once per visit: the step names are the real rebuild's (watchdog/pipeline/rebuild.py), the timing
// is made up, and the percentage is not the real rebuild's progress. A made-up graph assembles as it goes; at the end the
// "coming soon" block (.stage__done, the page's real content and its no-JS state) comes back.
// Under prefers-reduced-motion nothing plays: the whole graph is drawn and the "coming soon" block stays.
(function () {
  var stage = document.getElementById('stage');
  var svg = document.getElementById('graph');
  if (!stage || !svg) return;

  var lang = document.documentElement.lang === 'ro' ? 'ro' : 'en';

  // [slug, English, Romanian], in the rebuild's order.
  var STEPS = [
    ['schema', 'Prepare the schema', 'Pregătim schema'],
    ['anaf-identities', 'Identify companies (ANAF)', 'Identificăm firmele (ANAF)'],
    ['onrc', 'Load the trade register (ONRC)', 'Încărcăm registrul comerțului (ONRC)'],
    ['estimates', 'Estimate contract values', 'Estimăm valorile contractelor'],
    ['crawl-status', 'Read notice statuses', 'Citim stările anunțurilor'],
    ['crawl-badges', 'Badge records', 'Marcăm înregistrările'],
    ['frameworks', 'Link framework agreements', 'Legăm acordurile-cadru'],
    ['entities', 'Build the organisations', 'Construim organizațiile'],
    ['placement', 'Place organisations on the map', 'Așezăm organizațiile pe hartă'],
    ['mf', 'Public entities (Ministry of Finance)', 'Entitățile publice (Ministerul Finanțelor)'],
    ['amepip', 'State-owned companies (AMEPIP)', 'Companiile de stat (AMEPIP)'],
    ['aep', 'Election results (AEP)', 'Rezultatele alegerilor (AEP)'],
    ['financials', 'Financial statements', 'Situațiile financiare'],
    ['donations', 'Party donations by companies', 'Donațiile firmelor către partide'],
    ['coverage', 'Measure coverage', 'Măsurăm acoperirea'],
    ['signals', 'Run the signal rules', 'Rulăm regulile de semnal'],
    ['record-indexes', 'Index records', 'Indexăm înregistrările'],
    ['rollup', 'Roll up the money', 'Însumăm banii'],
    ['search-index', 'Build the search index', 'Construim indexul de căutare'],
    ['analyze-search', 'Tune search', 'Reglăm căutarea'],
    ['onrc-search', 'Index the trade register', 'Indexăm registrul comerțului'],
    ['commit', 'Commit the new graph', 'Salvăm noul graf'],
    ['check', 'Check it against the live graph', 'Îl verificăm față de graful actual'],
    ['vacuum', 'Clean up', 'Curățăm'],
    ['outlines', 'Draw the county outlines', 'Desenăm contururile județelor'],
    ['switchover', 'Get ready for launch', 'Pregătim lansarea']
  ];
  var STEP_MS = 1400;
  var COUNT_AT = 'estimates'; // the SEAP record count fills in once this step is done
  var stepWord = lang === 'ro' ? 'pasul' : 'step';

  // ---- the graph: a fixed pseudo-random cloud, the same on every visit
  var NS = 'http://www.w3.org/2000/svg';
  var COUNT = 260;
  var seed = 7;
  function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }

  var nodes = [];
  for (var i = 0; i < COUNT; i++) {
    var angle = rnd() * Math.PI * 2;
    var radius = Math.pow(rnd(), 0.6) * 460;
    nodes.push({ x: 500 + Math.cos(angle) * radius * 1.25, y: 280 + Math.sin(angle) * radius * 0.62, hub: rnd() < 0.08 });
  }
  // each node links to a near earlier one, so the graph grows outward from what is already drawn
  var parts = [];
  function el(name, attrs) {
    var e = document.createElementNS(NS, name);
    for (var a in attrs) e.setAttribute(a, attrs[a]);
    return e;
  }
  for (var j = 1; j < COUNT; j++) {
    var best = -1, bestDist = Infinity;
    for (var k = 0; k < j; k++) {
      var dx = nodes[k].x - nodes[j].x, dy = nodes[k].y - nodes[j].y, d = dx * dx + dy * dy;
      if (d < bestDist && rnd() > 0.25) { bestDist = d; best = k; }
    }
    if (best >= 0) {
      var line = el('line', { x1: nodes[best].x, y1: nodes[best].y, x2: nodes[j].x, y2: nodes[j].y, 'class': 'g-edge' });
      svg.appendChild(line);
      parts[j] = [line];
    }
  }
  nodes.forEach(function (n, idx) {
    var dot = el('circle', { cx: n.x, cy: n.y, r: n.hub ? 5 : 2.6, 'class': n.hub ? 'g-node g-node--hub' : 'g-node' });
    svg.appendChild(dot);
    parts[idx] = (parts[idx] || []).concat(dot);
  });
  var drawn = 0;
  function drawUpTo(n) { while (drawn < n) { parts[drawn].forEach(function (p) { p.classList.add('is-on'); }); drawn++; } }

  // ---- the SEAP count: "—" until its step is done, then it counts up to the figure already in the markup
  var countEl = document.querySelector('[data-count]');
  var countTo = countEl ? parseFloat(countEl.dataset.count) : 0;
  var countText = countEl ? countEl.textContent : '';
  function fmtCount(v) {
    return lang === 'ro' ? v.toFixed(2).replace('.', ',') + ' mil.' : v.toFixed(2) + 'M';
  }

  function finish() {
    drawUpTo(COUNT);
    stage.classList.remove('is-building');
    stage.classList.add('is-built');
    if (countEl) countEl.textContent = countText;
  }

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { finish(); return; }

  var build = stage.querySelector('.stage__build');
  var pctEl = document.getElementById('stage-pct');
  var stepEl = document.getElementById('stage-step');
  if (!build || !pctEl || !stepEl) { finish(); return; }
  build.hidden = false;
  stage.classList.add('is-building');

  var countStep = 0;
  STEPS.forEach(function (s, idx) { if (s[0] === COUNT_AT) countStep = idx; });
  var start = null, countShown = 0, lastStep = -1;
  if (countEl) countEl.textContent = '—';

  function frame(t) {
    if (start === null) start = t;
    var progress = (t - start) / (STEP_MS * STEPS.length); // 0 → 1
    if (progress >= 1) { build.hidden = true; finish(); return; }
    var step = Math.floor(progress * STEPS.length);
    pctEl.textContent = Math.floor(progress * 100);
    if (step !== lastStep) {
      lastStep = step;
      var name = STEPS[step][lang === 'ro' ? 2 : 1];
      stepEl.textContent = stepWord + ' ' + (step + 1) + ' / ' + STEPS.length + ' · ' + name.charAt(0).toLowerCase() + name.slice(1);
    }
    drawUpTo(Math.floor(COUNT * progress));
    if (countEl && step > countStep) {
      countShown += (countTo - countShown) * 0.12;
      if (countTo - countShown < 0.005) countShown = countTo;
      countEl.textContent = fmtCount(countShown);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
