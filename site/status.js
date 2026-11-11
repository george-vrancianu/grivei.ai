// Shared by index.html (en) and ro/index.html (ro).
// The source rows are the single source of truth: the bar and the summary are derived from their data-status.
(function () {
  var words = {
    en: function (c) {
      return c.live + ' live · ' + c.wip + ' in progress · ' + c.next + ' next';
    },
    ro: function (c) {
      return c.live + (c.live === 1 ? ' funcțională' : ' funcționale') +
        ' · ' + c.wip + ' în lucru' +
        ' · ' + c.next + ' urmează';
    }
  };

  var rows = document.querySelectorAll('#sources .source');
  var bar = document.getElementById('sources-bar');
  var summary = document.getElementById('sources-summary');
  var format = words[document.documentElement.lang] || words.en;
  if (!rows.length || !bar || !summary) return;

  var count = { live: 0, wip: 0, next: 0 };
  bar.textContent = '';
  rows.forEach(function (row) {
    var status = row.dataset.status;
    if (!(status in count)) return;
    count[status] += 1;
    var segment = document.createElement('span');
    segment.dataset.status = status;
    bar.appendChild(segment);
  });

  summary.textContent = format(count);
})();
