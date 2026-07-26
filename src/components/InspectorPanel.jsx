import { CEFF_COLORS } from '../data/palette';
import { STATUS_BADGES } from '../data/palette';
import NameAutocomplete from './NameAutocomplete';

export default function InspectorPanel({ node, onChange, onDelete, onClose, savedNames, onCommitName, onRemoveName }) {
  if (!node) {
    return (
      <aside className="ceff-panel ceff-panel-right" style={panelStyle}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ceff-primaire)' }}>Propriétés</div>
        <div style={{ fontSize: 12, color: 'var(--ceff-texte-2)', marginTop: 8 }}>
          Sélectionnez une bulle pour l'éditer.
        </div>
      </aside>
    );
  }

  const data = node.data;

  function update(patch) {
    onChange(node.id, patch);
  }

  const extraLines = data.extraLines && data.extraLines.length ? data.extraLines : [''];

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

      <Field label="Couleur (palette CEFF)">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
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
        </div>
      </Field>

      <Field label="Badge de statut">
        <select value={data.badge || ''} onChange={(e) => update({ badge: e.target.value || null })}>
          <option value="">Aucun</option>
          {STATUS_BADGES.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
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
