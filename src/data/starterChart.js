import { LEVEL_DEFAULT_COLOR } from './palette';

// Organigramme de départ pré-rempli avec l'équipe CEFF (structure inspirée
// de l'exemple de la charte §14). Sert de base au premier lancement ; peut
// être modifié, remplacé ("Nouveau") ou réenregistré sous un autre nom.
//
// Positions calées sur la grille base 8, avec des bulles de largeur constante
// (voir NODE_WIDTH) : les enfants sont exactement centrés sous leur parent et
// l'espacement vertical entre niveaux est constant.
//
// Le niveau détermine le fond, conformément à la charte §14.
function node(id, x, y, level, label, sublabel, personName) {
  return {
    id,
    type: 'ceffNode',
    position: { x, y },
    data: { label, sublabel, personName, level, color: LEVEL_DEFAULT_COLOR[level] },
  };
}

const RANG_1 = 40;
const RANG_2 = 152;
const RANG_3 = 264;
const RANG_4 = 376;
const RANG_5 = 488;

export const STARTER_NODES = [
  node('n-dg', 460, RANG_1, 1, 'Directeur général', 'Direction', 'Alexis Compagnon'),
  node('n-be', 108, RANG_2, 3, "Bureau d'étude", 'Pôle Études', 'Simon Gaétan'),
  node('n-ran', 460, RANG_2, 2, "Responsable d'activités Normandie", 'Pôle Travaux', 'Blondel Charly'),
  node('n-qsse', 812, RANG_2, 2, 'Responsable QSSE', 'Pôle Support', 'Ségaert Jérôme'),
  node('n-ct', 460, RANG_3, 3, 'Conducteur de travaux', 'Conduite de travaux', 'Réal Dylan'),
  node('n-ce', 460, RANG_4, 3, "Chef d'équipe", 'Équipe de chantier', 'Duval Barbay Antonio'),
  node('n-m1', 332, RANG_5, 4, 'Monteur', '', 'Rose Nicolas'),
  node('n-m2', 588, RANG_5, 4, 'Monteur', '', 'Lebouteiller Mathieu'),
];

export const STARTER_EDGES = [
  { id: 'e-dg-be', source: 'n-dg', target: 'n-be', type: 'ceff', data: { dashed: false } },
  { id: 'e-dg-ran', source: 'n-dg', target: 'n-ran', type: 'ceff', data: { dashed: false } },
  { id: 'e-dg-qsse', source: 'n-dg', target: 'n-qsse', type: 'ceff', data: { dashed: false } },
  { id: 'e-ran-ct', source: 'n-ran', target: 'n-ct', type: 'ceff', data: { dashed: false } },
  { id: 'e-ct-ce', source: 'n-ct', target: 'n-ce', type: 'ceff', data: { dashed: false } },
  { id: 'e-ce-m1', source: 'n-ce', target: 'n-m1', type: 'ceff', data: { dashed: false } },
  { id: 'e-ce-m2', source: 'n-ce', target: 'n-m2', type: 'ceff', data: { dashed: false } },
];
