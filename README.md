# Organigrammes CEFF

Application web pour créer des organigrammes de principe (pôles, rôles) à insérer
dans les mémoires techniques CEFF. Respecte la charte graphique CEFF v2.2
(couleurs, typographie, style des organigrammes §14).

## Démarrer l'application (ordinateur)

Prérequis : [Node.js](https://nodejs.org/) installé (version 18 ou plus récente).

Dans un terminal, à la racine du dossier `ceff-organigrammes` :

```bash
npm install
npm run dev
```

Puis ouvrir l'adresse affichée dans le terminal (en général `http://localhost:5173`)
dans un navigateur.

Pour un usage régulier sans repasser par le terminal, générer une version
statique et l'ouvrir directement :

```bash
npm run build
```

Le résultat est dans le dossier `dist/` : ce dossier peut être déposé sur
n'importe quel hébergement statique (ou ouvert en local) pour un accès
permanent, y compris depuis un iPhone via le navigateur.

## Utilisation

- **Bibliothèque** (colonne de gauche) : glisser une fonction dans
  l'organigramme. Créer/modifier/supprimer ses propres bulles modèles avec
  le crayon, la croix, ou "+ Nouvelle bulle modèle".
- **Relier deux bulles** : tirer depuis le petit point en bas d'une bulle
  jusqu'au point en haut d'une autre.
- **Modifier un lien** : cliquer dessus, un petit menu apparaît pour le
  passer en pointillé (rattachement fonctionnel) ou le supprimer.
- **Propriétés** (colonne de droite) : cliquer une bulle pour éditer son
  texte, sa couleur (palette CEFF uniquement), un badge (INTÉRIM, NOUVEAU,
  RENFORT) ou la mettre en avant.
- **Enregistrer / Charger** : chaque organigramme est sauvegardé dans le
  navigateur sous un nom de projet/affaire. "Charger" liste les
  organigrammes enregistrés.
- **Exporter en PDF** : génère un PDF A4 vectoriel (net à l'impression et à
  l'insertion dans un mémoire technique), portrait ou paysage selon la
  forme de l'organigramme.
- **Exporter JSON / Importer un fichier JSON** : pour transférer un
  organigramme entre l'ordinateur et l'iPhone (ou pour une sauvegarde hors
  du navigateur). Le fichier JSON exporté peut être envoyé par mail, AirDrop,
  etc., puis réimporté sur l'autre appareil via "Charger → Importer un
  fichier JSON…".

## Notes techniques

- React + Vite, canvas [@xyflow/react](https://reactflow.dev/) (React Flow).
- Aucune donnée n'est envoyée à un serveur : tout reste dans le navigateur
  (`localStorage`) et dans les fichiers JSON exportés manuellement.
- Export PDF vectoriel via `jsPDF`, en redessinant directement les boîtes et
  connecteurs à partir des données (pas de capture d'écran).
