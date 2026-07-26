import { CEFF_COLORS, LEVELS, LEVEL_DEFAULT_COLOR, STATUS_BADGES } from '../data/palette';
import NameAutocomplete from './NameAutocomplete';

export default function InspectorPanel({
  node,
  selectionCount,
  onChange,
  onDelete,
  onDeleteSelection,
  onApplyLevelToSelection,
  onClose,
  savedNames,
  onCommitName,
  onRemoveName,
}) {
  // Plusieurs bulles sélectionnées : on n'édite pas les textes (ils diffèrent),
  // mais on propose les actions qui ont du sens en lot.
  if (selectionCount > 1) {
    return (
      <aside className="ceff-panel ceff-panel-right open" style={panelStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ceff-primaire)' }}>
            {selectionCount} bulles sélectionnées
          </div>
          <button className="ceff-btn-icon" onClick={onClose} title="Fermer">✕</button>
        </div>

        <div style={{ fontSize: 12, color: 'var(--ceff-texte-2)' }}>
          Glissez-en une pour déplacer tout le groupe.
        </div>

        <Field label="Appliquer un niveau au groupe">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {LEVELS.map((l) => (
              <button
                key={l.value}
                className="ceff-btn ceff-btn-outline"
                style={{ justifyContent: 'flex-start', fontSize: 12 }}
                onClick={() => onApplyLevelToSelection(l.value)}
              >
                {l.label}
              </button>
            ))}
          </div>
        </Field>

        <button
          className="ceff-btn ceff-btn-outline"
          style={{ color: 'var(--ceff-accent)', borderColor: 'var(--ceff-accent)', justifyContent: 'center' }}
          onClick={onDeleteSelection}
        >
          Supprimer les {selectionCount} bulles
        </button>
      </aside>
    );
  }

  if (!node) {
    return (
      <aside className="ceff-panel ceff-panel-right" style={panelStyle}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ceff-primaire)' }}>Propriétés</div>
        <div style={{ fontSize: 12, color: 'var(--ceff-texte-2)', marginTop: 8 }}>
          Sélectionnez une bulle pour l'éditer.
        </div>
        <div style={{ fontSize: 11, color: 'var(--ceff-texte-2)', marginTop: 4, opacity: 0.8 }}>
          Maj + glisser sur le fond pour sélectionner plusieurs bulles ;
          Cmd (ou Ctrl) + clic pour les ajouter une à une.
        </div>
      </aside>
    );
  }

  const data = node.data;

  function update(patch) {
    onChange(node.id, patch);
  }

  const extraLines = data.extraLines && data.extraLines.length ? data.extraLines : [''];
  // Un badge hors liste (ou le choix explicite "Autre") bascule en texte libre.
  const badgeIsCustom = data.badgeCustom || (!!data.badge && !STATUS_BADGES.includes(data.badge));
  const badgeSelectValue = badgeIsCustom ? '__autre__' : data.badge || '';
  // Une couleur hors palette CEFF (choisie via le sélecteur libre) n'a pas de clé connue.
  const isCustomColor = !!data.color && !CEFF_COLORS.some((c) => c.key === data.color);

  return (
    <aside className="ceff-panel ceff-panel-right open" style={panelStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ceff-primaire)' }}>Propriétés</div>
        <button className="ceff-btn-icon" onClick={onClose} title="Fermer">✕</button>
      </div>

      <Field label="Nom Prénom (optionnel)">
        <NameAutocomplete
          value={data.personName}
          onChange={(v) => update({ personName: v })}
          names={savedNames}
          onCommit={onCommitName}
          onRemoveName={onRemoveName}
        />
      </Field>

      <Field label="Fonction">
        <input value={data.label || ''} onChange={(e) => update({ label: e.target.value })} />
      </Field>

      <Field label="Précision">
        <input value={data.sublabel || ''} onChange={(e) => update({ sublabel: e.target.value })} />
      </Field>

      <Field label="Détail (boîte d'équipe, 3 lignes max)">
        {extraLines.map((line, i) => (
          <input
            key={i}
            style={{ marginBottom: 4 }}
            value={line}
            placeholder={`Ligne ${i + 1}`}
            onChange={(e) => {
              const next = [...extraLines];
              next[i] = e.target.value;
              update({ extraLines: next.filter((_, idx) => idx < 3) });
            }}
          />
        ))}
        {extraLines.length < 3 && (
          <button
            className="ceff-btn ceff-btn-outline"
            style={{ fontSize: 11, padding: '4px 10px' }}
            onClick={() => update({ extraLines: [...extraLines, ''] })}
          >
            + ligne
          </button>
        )}
      </Field>

      <Field label="Niveau hiérarchique">
        <select
          value={data.level || ''}
          onChange={(e) => {
            const level = Number(e.target.value);
            // Choisir un niveau applique le fond imposé par la charte §14.
            update({ level, color: LEVEL_DEFAULT_COLOR[level] });
          }}
        >
          <option value="">Non défini</option>
          {LEVELS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
        <div style={{ fontSize: 10.5, color: 'var(--ceff-texte-2)', marginTop: 4, opacity: 0.85 }}>
          Les niveaux 3 et 4 partagent le même gris : la charte limite à trois fonds de niveau.
        </div>
      </Field>

      <Field label="Couleur (exception, palette CEFF)">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
          {CEFF_COLORS.map((c) => (
            <button
              key={c.key}
              title={c.label}
              onClick={() => update({ color: c.key })}
              style={{
                width: 26,
                height: 26,
                borderRadius: 7,
                background: c.bg,
                border: data.color === c.key ? '2px solid var(--ceff-primaire)' : '1px solid var(--ceff-fond-gris)',
                cursor: 'pointer',
              }}
            />
          ))}
          <label
            title="Couleur libre, hors palette (la charte recommande de s'en tenir aux couleurs ci-dessus)"
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              cursor: 'pointer',
              position: 'relative',
              border: isCustomColor ? '2px solid var(--ceff-primaire)' : '1px dashed var(--ceff-texte-2)',
              background: isCustomColor
                ? data.color
                : 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
            }}
          >
            <input
              type="color"
              value={isCustomColor ? data.color : '#1F3864'}
              onChange={(e) => update({ color: e.target.value })}
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
            />
          </label>
        </div>
        {isCustomColor && (
          <div style={{ fontSize: 10.5, color: 'var(--ceff-texte-2)', marginTop: 4, opacity: 0.85 }}>
            Couleur libre {data.color} : hors palette CEFF, à réserver aux cas particuliers.
          </div>
        )}
      </Field>

      <Field label="Badge de statut">
        <select
          value={badgeSelectValue}
          onChange={(e) => {
            const v = e.target.value;
            if (v === '__autre__') update({ badgeCustom: true, badge: '' });
            else update({ badgeCustom: false, badge: v || null });
          }}
        >
          <option value="">Aucun</option>
          {STATUS_BADGES.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
          <option value="__autre__">Autre…</option>
        </select>
        {badgeIsCustom && (
          <input
            style={{ marginTop: 6 }}
            value={data.badge || ''}
            placeholder="Texte du badge"
            maxLength={14}
            onChange={(e) => update({ badge: e.target.value.toUpperCase() })}
          />
        )}
      </Field>

      <Field label="Mise en avant">
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--ceff-texte-2)' }}>
          <input
            type="checkbox"
            style={{ width: 'auto' }}
            checked={!!data.highlighted}
            onChange={(e) => update({ highlighted: e.target.checked })}
          />
          Bordure rouge cramoisi (une seule bulle par organigramme)
        </label>
      </Field>

      <button
        className="ceff-btn ceff-btn-outline"
        style={{ color: 'var(--ceff-accent)', borderColor: 'var(--ceff-accent)', justifyContent: 'center' }}
        onClick={() => onDelete(node.id)}
      >
        Supprimer la bulle
      </button>
    </aside>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ceff-texte-2)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.3pt' }}>
        {label}
      </div>
      {children}
    </div>
  );
}

const panelStyle = {
  width: 260,
  borderLeft: 'var(--ceff-bordure)',
  padding: 'var(--ceff-esp-3) var(--ceff-esp-2)',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--ceff-esp-2)',
  background: 'var(--ceff-blanc)',
};
