// Shared by index.html (en) and ro/index.html (ro).
// The source rows are the single source of truth: the bar and the summary are derived from their data-status.
// Groups with no rows are left out of the summary.
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
  if (!rows.length || !bar || !summary) return;

  var count = { live: 0, wip: 0, next: 0, skipped: 0 };
  bar.textContent = '';
  rows.forEach(function (row) {
    var status = row.dataset.status;
    if (!(status in count)) return;
    count[status] += 1;
    var segment = document.createElement('span');
    segment.dataset.status = status;
    bar.appendChild(segment);
  });

  summary.textContent = Object.keys(count)
    .filter(function (status) { return count[status] > 0; })
    .map(function (status) { return count[status] + ' ' + label[status](count[status]); })
    .join(' · ');
})();
