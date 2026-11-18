// Shared by index.html (en) and ro/index.html (ro).
// The source rows are the single source of truth: the summary (and the bar, if a page has one) are derived from their data-status.
// Groups with no rows are left out of the summary.
// It also reveals the explorer link when the host's explorer flag is open (see the end of this file).
(function () {
  var words = {
    en: {
      live: function () { return 'live'; },
      wip: function () { return 'in progress'; },
      next: function () { return 'next'; },
      skipped: function () { return 'skipped'; }
    },
    ro: {
      live: function (n) { return n === 1 ? 'funcțională' : 'funcționale'; },
      wip: function () { return 'în lucru'; },
      next: function () { return 'urmează'; },
      skipped: function (n) { return n === 1 ? 'omisă' : 'omise'; }
    }
  };

  var rows = document.querySelectorAll('#sources .source');
  var bar = document.getElementById('sources-bar');
  var summary = document.getElementById('sources-summary');
  var label = words[document.documentElement.lang] || words.en;
  if (!rows.length || !summary) return;

  var count = { live: 0, wip: 0, next: 0, skipped: 0 };
  if (bar) bar.textContent = '';
  rows.forEach(function (row) {
    var status = row.dataset.status;
    if (!(status in count)) return;
    count[status] += 1;
    if (!bar) return;
    var segment = document.createElement('span');
    segment.dataset.status = status;
    bar.appendChild(segment);
  });

  summary.textContent = Object.keys(count)
    .filter(function (status) { return count[status] > 0; })
    .map(function (status) { return count[status] + ' ' + label[status](count[status]); })
    .join(' · ');
})();

// The explorer flag: Caddy answers /site-flags.json with the host's GRIVEI_EXPLORER (deploy/Caddyfile).
// Only the exact value "open" shows the link; a missing file (a bare static preview), an error or any other value keeps it hidden.
(function () {
  var link = document.querySelector('.explore-link');
  if (!link || !window.fetch) return;
  fetch('/site-flags.json', { cache: 'no-store' })
    .then(function (response) { return response.ok ? response.json() : {}; })
    .then(function (flags) { if (flags && flags.explorer === 'open') link.hidden = false; })
    .catch(function () {});
})();
