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

// Renvoie { charts, erreur } : sans remontée d'erreur, un stockage plein
// ferait échouer l'enregistrement en silence et l'utilisateur croirait son
// travail sauvegardé.
export function saveChart(name, chart) {
  const charts = loadCharts();
  const previous = charts[name];
  charts[name] = { ...chart, updatedAt: new Date().toISOString() };
  try {
    localStorage.setItem(CHARTS_KEY, JSON.stringify(charts));
    return { charts, erreur: null };
  } catch (e) {
    // On restaure l'état précédent pour ne pas laisser un état incohérent.
    if (previous) charts[name] = previous;
    else delete charts[name];
    return {
      charts,
      erreur:
        "L'espace de stockage du navigateur est plein. Supprimez d'anciens organigrammes " +
        "(menu Charger) ou utilisez « Exporter JSON » pour conserver ce travail.",
    };
  }
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
  try {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  } catch {
    // Sans effet bloquant : la bibliothèque reste utilisable pour la session.
  }
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
  try {
    localStorage.setItem(NAMES_KEY, JSON.stringify(names));
  } catch {
    // Sans effet bloquant : les noms restent disponibles pour la session.
  }
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
        // Contrôle strict : un JSON valide mais de structure inattendue
        // (nombres, objets…) casserait le canevas au rendu.
        if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
          reject(new Error("ce fichier n'est pas un organigramme CEFF (nœuds ou liens manquants)."));
          return;
        }
        // On réimpose le type de nœud et de lien : un fichier ancien ou
        // modifié à la main afficherait sinon des bulles au style par défaut.
        resolve({
          ...data,
          nodes: data.nodes
            .filter((n) => n && n.id && n.position)
            .map((n) => ({ ...n, type: 'ceffNode', data: n.data || {} })),
          edges: data.edges
            .filter((e) => e && e.id && e.source && e.target)
            .map((e) => ({ ...e, type: 'ceff', data: e.data || { dashed: false } })),
        });
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function slugify(name) {
  return (
    (name || 'organigramme')
      .toLowerCase()
      .normalize('NFD')
      // Signes diacritiques combinants (U+0300 à U+036F), en notation
      // échappée : plus lisible et insensible à l'encodage du fichier source.
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'organigramme'
  );
}
