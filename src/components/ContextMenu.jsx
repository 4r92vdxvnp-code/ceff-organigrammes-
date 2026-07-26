// Menu contextuel générique (clic droit), positionné au point de clic et
// borné à la fenêtre pour ne jamais déborder de l'écran.
export default function ContextMenu({ x, y, items }) {
  const width = 200;
  const left = Math.min(x, window.innerWidth - width - 8);
  const top = Math.min(y, window.innerHeight - items.length * 34 - 16);

  return (
    <div
      style={{
        position: 'fixed',
        top: Math.max(8, top),
        left: Math.max(8, left),
        width,
        background: 'var(--ceff-blanc)',
        border: '1px solid var(--ceff-fond-gris)',
        borderRadius: 'var(--ceff-rayon-tuile)',
        boxShadow: 'var(--ceff-ombre-2)',
        padding: 6,
        zIndex: 95,
      }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item, i) =>
        item.divider ? (
          <div key={i} style={{ height: 1, background: 'var(--ceff-fond-gris)', margin: '4px 2px' }} />
        ) : (
          <button
            key={i}
            type="button"
            disabled={item.disabled}
            onClick={item.onClick}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '7px 10px',
              fontSize: 13,
              fontFamily: 'var(--ceff-police)',
              border: 'none',
              background: 'transparent',
              borderRadius: 'var(--ceff-rayon-tuile)',
              cursor: item.disabled ? 'not-allowed' : 'pointer',
              color: item.disabled ? 'var(--ceff-texte-2)' : item.danger ? 'var(--ceff-accent)' : 'var(--ceff-texte)',
              opacity: item.disabled ? 0.45 : 1,
            }}
            onMouseEnter={(e) => {
              if (!item.disabled) e.currentTarget.style.background = 'var(--ceff-fond-gris)';
            }}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            {item.label}
          </button>
        )
      )}
    </div>
  );
}
