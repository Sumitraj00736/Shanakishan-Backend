exports.toCSV = (arr) => {
  if(!arr || !arr.length) return '';
  const keys = Object.keys(arr[0]);
  const header = keys.join(',');
  const rows = arr.map(r => keys.map(k => `"${String(r[k]||'').replace(/"/g,'""')}"`).join(','));
  return [header, ...rows].join('\n');
};
