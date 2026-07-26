// Palette CEFF (charte v2.2). Chaque couleur de fond a une couleur de texte assortie imposée.
export const CEFF_COLORS = [
  { key: 'primaire', label: 'Bleu marine', bg: '#1F3864', text: '#FFFFFF' },
  { key: 'accent', label: 'Rouge cramoisi', bg: '#9B2020', text: '#FFFFFF' },
  { key: 'fond-bleu', label: 'Bleu clair', bg: '#D9E1F2', text: '#1F3864' },
  { key: 'fond-gris', label: 'Gris clair', bg: '#F2F2F2', text: '#404040' },
  { key: 'fond-jaune', label: 'Jaune clair', bg: '#FFF2CC', text: '#404040' },
  { key: 'fond-orange', label: 'Orange clair', bg: '#FCE4D6', text: '#404040' },
  { key: 'fond-vert', label: 'Vert clair', bg: '#E2EFDA', text: '#404040' },
  { key: 'blanc', label: 'Blanc', bg: '#FFFFFF', text: '#404040' },
];

// Texte noir ou blanc selon la luminance du fond, pour rester lisible avec
// une couleur libre choisie hors palette.
function readableTextFor(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#404040' : '#FFFFFF';
}

export function colorByKey(key) {
  // Couleur libre (exception à la charte §18-1, choisie explicitement par
  // l'utilisateur) : un code hex au lieu d'une clé de la palette officielle.
  if (typeof key === 'string' && /^#[0-9a-f]{6}$/i.test(key)) {
    return { key, label: 'Personnalisée', bg: key, text: readableTextFor(key) };
  }
  return CEFF_COLORS.find((c) => c.key === key) || CEFF_COLORS[3];
}

// Codage par niveau imposé par la charte (§14). Les niveaux 3 et 4 partagent
// volontairement le même gris : la charte plafonne à trois fonds de niveau et
// range « plus de trois fonds de niveau différents » parmi les interdits (§18).
export const LEVEL_DEFAULT_COLOR = {
  1: 'primaire',
  2: 'fond-bleu',
  3: 'fond-gris',
  4: 'fond-gris',
};

export const LEVELS = [
  { value: 1, label: 'Niveau 1, direction' },
  { value: 2, label: 'Niveau 2, responsables' },
  { value: 3, label: 'Niveau 3, équipes' },
  { value: 4, label: 'Niveau 4, fonctions' },
];

export const STATUS_BADGES = ['INTÉRIM', 'NOUVEAU', 'RENFORT', 'SOUS-TRAITANT'];

// Charte §14 : largeur constante et hauteur homogène pour toutes les boîtes.
// Valeurs alignées sur la grille base 8.
export const NODE_WIDTH = 192;
export const NODE_MIN_HEIGHT = 56;
