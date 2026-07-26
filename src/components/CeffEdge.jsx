import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, useReactFlow } from '@xyflow/react';

// Connecteur CEFF (charte §14) : trait fin 1px, gris, orthogonal, jamais de flèche.
// Pointillé réservé au rattachement fonctionnel (hors hiérarchie directe).
export default function CeffEdge({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, selected, data }) {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 4,
  });

  const dashed = !!data?.dashed;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: 'var(--ceff-connecteur)',
          strokeWidth: 1,
          strokeDasharray: dashed ? '4 3' : undefined,
        }}
      />
      {selected && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
              display: 'flex',
              gap: 4,
              background: 'var(--ceff-blanc)',
              border: '1px solid var(--ceff-fond-gris)',
              borderRadius: 'var(--ceff-rayon-pilule)',
              padding: 3,
              boxShadow: 'var(--ceff-ombre-1)',
            }}
          >
            <button
              type="button"
              title="Rattachement fonctionnel (pointillé)"
              className="ceff-btn-icon"
              style={{ width: 22, height: 22, padding: 0, fontSize: 11 }}
              onClick={() =>
                setEdges((eds) =>
                  eds.map((e) => (e.id === id ? { ...e, data: { ...e.data, dashed: !dashed } } : e))
                )
              }
            >
              ┄
            </button>
            <button
              type="button"
              title="Supprimer le lien"
              className="ceff-btn-icon"
              style={{ width: 22, height: 22, padding: 0, fontSize: 11, color: 'var(--ceff-accent)' }}
              onClick={() => setEdges((eds) => eds.filter((e) => e.id !== id))}
            >
              ✕
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
