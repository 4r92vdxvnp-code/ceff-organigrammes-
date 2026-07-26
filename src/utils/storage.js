const CHARTS_KEY = 'ceff-organigrammes:charts';
const TEMPLATES_KEY = 'ceff-organigrammes:templates';
const NAMES_KEY = 'ceff-organigrammes:names';

export function loadCharts() {
  try {
    const raw = localStorage.getItem(CHARTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveChart(name, chart) {
  const charts = loadCharts();
  charts[name] = { ...chart, updatedAt: new Date().toISOString() };
  localStorage.setItem(CHARTS_KEY, JSON.stringify(charts));
  return charts;
}

export function deleteChart(name) {
  const charts = loadCharts();
  delete charts[name];
  localStorage.setItem(CHARTS_KEY, JSON.stringify(charts));
  return charts;
}

export function loadTemplates(fallback) {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function saveTemplates(templates) {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
}

export function loadNames(fallback = []) {
  try {
    const raw = localStorage.getItem(NAMES_KEY);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function saveNames(names) {
  localStorage.setItem(NAMES_KEY, JSON.stringify(names));
}

export function exportChartToFile(name, chart) {
  const payload = {
    kind: 'ceff-organigramme',
    version: 1,
    name,
    exportedAt: new Date().toISOString(),
    ...chart,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${slugify(name)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function importChartFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data.nodes || !data.edges) {
          reject(new Error('Fichier invalide : nœuds ou liens manquants.'));
          return;
        }
        resolve(data);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function slugify(name) {
  return (name || 'organigramme')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'organigramme';
}
