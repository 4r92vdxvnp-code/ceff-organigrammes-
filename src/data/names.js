// Mémoire de noms pré-remplie avec l'équipe CEFF, pour éviter de ressaisir
// ces noms à chaque nouvel organigramme.
export const DEFAULT_NAMES = [
  'Alexis Compagnon',
  'Blondel Charly',
  'Duval Barbay Antonio',
  'Lebouteiller Mathieu',
  'Réal Dylan',
  'Rose Nicolas',
  'Ségaert Jérôme',
  'Simon Gaétan',
].sort((a, b) => a.localeCompare(b, 'fr'));
