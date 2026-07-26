// Organigramme de départ pré-rempli avec l'équipe CEFF (structure inspirée
// de l'exemple de la charte §14). Sert de base au premier lancement ; peut
// être modifié, remplacé ("Nouveau") ou réenregistré sous un autre nom.
function node(id, x, y, color, label, sublabel, personName) {
  return { id, type: 'ceffNode', position: { x, y }, data: { label, sublabel, color, personName } };
}

export const STARTER_NODES = [
  node('n-dg', 460, 40, 'primaire', 'Directeur général', 'Direction', 'Alexis Compagnon'),
  node('n-be', 120, 220, 'fond-bleu', "Bureau d'étude", 'Pôle Études', 'Simon Gaétan'),
  node('n-ran', 460, 220, 'fond-bleu', "Responsable d'activités Normandie", 'Pôle Travaux', 'Blondel Charly'),
  node('n-qsse', 800, 220, 'fond-bleu', 'Responsable QSSE', 'Pôle Support', 'Ségaert Jérôme'),
  node('n-ct', 460, 400, 'fond-gris', 'Conducteur de travaux', 'Conduite de travaux', 'Réal Dylan'),
  node('n-ce', 460, 560, 'fond-gris', "Chef d'équipe", 'Équipe de chantier', 'Duval Barbay Antonio'),
  node('n-m1', 340, 720, 'fond-gris', 'Monteur', '', 'Rose Nicolas'),
  node('n-m2', 600, 720, 'fond-gris', 'Monteur', '', 'Lebouteiller Mathieu'),
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
