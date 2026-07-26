import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { colorByKey } from '../data/palette';

// Boîte d'organigramme CEFF (charte §14) : rayon 8px, fond par niveau,
// deux lignes maximum (sauf boîte d'équipe), badge de statut centré en haut,
// mise en avant = bordure 1px rouge cramoisi.
function CeffNode({ data, selected }) {
  const color = colorByKey(data.color);
  const extraLines = (data.extraLines || []).filter(Boolean);

  return (
    <div
      style={{
        position: 'relative',
        minWidth: 168,
        maxWidth: 220,
        background: color.bg,
        color: color.text,
        borderRadius: 'var(--ceff-rayon-tuile)',
        padding: '12px 16px',
        border: data.highlighted
          ? '1px solid var(--ceff-accent)'
          : selected
          ? '1px solid var(--ceff-primaire)'
          : '1px solid rgba(0,0,0,0.06)',
        boxShadow: selected ? 'var(--ceff-ombre-1)' : 'none',
        textAlign: 'center',
        fontFamily: 'var(--ceff-police)',
      }}
    >
      {data.badge && (
        <span
          className="ceff-badge"
          style={{
            position: 'absolute',
            top: -10,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--ceff-fond-gris)',
            color: 'var(--ceff-texte-2)',
            border: '1px solid var(--ceff-blanc)',
          }}
        >
          {data.badge}
        </span>
      )}

      <Handle
        type="target"
        position={Position.Top}
        id="top"
        style={{ background: 'var(--ceff-connecteur)', width: 6, height: 6, border: 'none' }}
      />

      {data.personName && (
        <div style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.3 }}>{data.personName}</div>
      )}
      <div
        style={{
          fontWeight: data.personName ? 400 : 700,
          fontSize: data.personName ? 11.5 : 13,
          lineHeight: 1.3,
          marginTop: data.personName ? 1 : 0,
          opacity: data.personName ? 0.9 : 1,
        }}
      >
        {data.label || 'Fonction'}
      </div>
      {data.sublabel && (
        <div
          style={{
            fontSize: 11,
            marginTop: 2,
            opacity: color.text === '#FFFFFF' ? 0.85 : 1,
            color: color.text === '#FFFFFF' ? color.text : 'var(--ceff-texte-2)',
          }}
        >
          {data.sublabel}
        </div>
      )}
      {extraLines.map((line, i) => (
        <div
          key={i}
          style={{
            fontSize: 10.5,
            marginTop: 1,
            color: color.text === '#FFFFFF' ? color.text : 'var(--ceff-texte-2)',
            opacity: 0.85,
          }}
        >
          {line}
        </div>
      ))}

      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        style={{ background: 'var(--ceff-connecteur)', width: 6, height: 6, border: 'none' }}
      />
    </div>
  );
}

export default memo(CeffNode);
