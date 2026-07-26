// Bibliothèque de bulles modèles par défaut, réutilisable dans tout organigramme CEFF.
// "level" fixe la couleur de fond par défaut (voir palette.js) ; modifiable ensuite au cas par cas.
export const DEFAULT_TEMPLATES = [
  { id: 'tpl-dg', label: 'Directeur général', sublabel: 'Direction', level: 1 },
  { id: 'tpl-be', label: "Bureau d'étude", sublabel: 'Pôle Études', level: 3 },
  { id: 'tpl-ran', label: "Responsable d'activités Normandie", sublabel: 'Pôle Travaux', level: 2 },
  { id: 'tpl-ra', label: "Responsable d'affaires", sublabel: 'Pôle Travaux', level: 2 },
  { id: 'tpl-admin', label: 'Administration', sublabel: 'Pôle Support', level: 2 },
  { id: 'tpl-qsse', label: 'Responsable QSSE', sublabel: 'Sécurité, qualité, environnement', level: 2 },
  { id: 'tpl-ct', label: 'Conducteur de travaux', sublabel: 'Conduite de travaux', level: 3 },
  { id: 'tpl-cc', label: 'Chef de chantier', sublabel: 'Équipe de chantier', level: 3 },
  { id: 'tpl-ce', label: "Chef d'équipe", sublabel: 'Équipe de chantier', level: 3 },
  { id: 'tpl-monteur', label: 'Monteur', sublabel: '', level: 4 },
  { id: 'tpl-projeteur', label: 'Projeteur-dessinateur', sublabel: 'Pôle Études', level: 4 },
  { id: 'tpl-automates', label: 'Programmeur automates', sublabel: 'Pôle Études', level: 4 },
  { id: 'tpl-instrumentiste', label: 'Instrumentiste', sublabel: 'Pôle Études', level: 4 },
  { id: 'tpl-compta', label: 'Service comptable', sublabel: 'Gestion financière', level: 4 },
];
