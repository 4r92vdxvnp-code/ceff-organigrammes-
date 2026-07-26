import { useRef, useState } from 'react';

// Champ "Nom Prénom" avec mémoire : suggère les noms déjà saisis dans
// d'autres organigrammes, et permet d'en retirer un de la mémoire.
export default function NameAutocomplete({ value, onChange, names, onCommit, onRemoveName }) {
  const [open, setOpen] = useState(false);
  const blurTimer = useRef(null);

  const query = (value || '').trim().toLowerCase();
  const suggestions = query
    ? names.filter((n) => n.toLowerCase().includes(query) && n.toLowerCase() !== query)
    : names;

  function commitCurrent() {
    if (value && value.trim()) onCommit(value.trim());
  }

  function handleBlur() {
    blurTimer.current = setTimeout(() => {
      setOpen(false);
      commitCurrent();
    }, 150);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitCurrent();
      setOpen(false);
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  function handlePick(name) {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    onChange(name);
    onCommit(name);
    setOpen(false);
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        value={value || ''}
        placeholder="Jean Dupont"
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
      {open && suggestions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '110%',
            left: 0,
            right: 0,
            background: 'var(--ceff-blanc)',
            border: '1px solid var(--ceff-fond-gris)',
            borderRadius: 'var(--ceff-rayon-tuile)',
            boxShadow: 'var(--ceff-ombre-2)',
            zIndex: 30,
            maxHeight: 180,
            overflowY: 'auto',
          }}
        >
          {suggestions.map((name) => (
            <div
              key={name}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 4px' }}
            >
              <button
                type="button"
                className="ceff-btn-icon"
                style={{
                  flex: 1,
                  justifyContent: 'flex-start',
                  fontWeight: 400,
                  fontSize: 12,
                  borderRadius: 'var(--ceff-rayon-tuile)',
                }}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handlePick(name)}
              >
                {name}
              </button>
              <button
                type="button"
                className="ceff-btn-icon"
                style={{ color: 'var(--ceff-accent)', fontSize: 10 }}
                title="Oublier ce nom"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onRemoveName(name)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
