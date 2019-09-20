const formatDuration = x =>
  [[x / 60000, 'm'], [x / 1000 % 60, 's'], [x % 1000, 'ms']]
    .filter(([n, _]) => n >= 1)
    .map(([n, l]) => `${Math.floor(n)}${l}`)
    .join(' ');
const padRight = (n, s) => s + ' '.repeat(n - s.length);
const formatGrid = (...rows) => {
  if (rows.length === 0) {
    return;
  }
  rows = rows.map(r => r.map(x => '' + x));
  const cols = [...rows[0].keys()].map(i => rows.map(r => r[i]));
  const widths = cols.map(c => c.reduce((x, y) => x > y.length ? x : y.length, 0));
  const totalWidth = widths.reduce((x, y) => x + y, 0) + (cols.length - 1) * 3 + 4;
  const topBottom = '-'.repeat(totalWidth);
  return topBottom + '\n' + rows.map(r => `| ${r.map((s, i) => padRight(widths[i], s)).join(' | ')} |`).join('\n') + '\n' + topBottom;
};
const measure = f => {
  const start = Date.now();
  const result = f();

  if (result && result.then) {
    return result.then(result => {
      const duration = Date.now() - start;
      return { duration, result };
    });
  } else {
    const duration = Date.now() - start;
    return { duration, result };
  }
};

module.exports = { formatDuration, formatGrid, measure };
