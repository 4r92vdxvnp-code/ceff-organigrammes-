import { useRef, useState } from 'react';

export default function Toolbar({
  chartName,
  onRenameChart,
  onNew,
  onSave,
  savedCharts,
  onLoad,
  onDeleteSaved,
  onExportPdf,
  onExportJson,
  onImportJson,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  logoSrc,
  onToggleLibrary,
  showGuides,
  onToggleGuides,
}) {
  const [loadOpen, setLoadOpen] = useState(false);
  const fileInputRef = useRef(null);

  return (
    <header
      className="ceff-toolbar"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--ceff-esp-2)',
        padding: '10px var(--ceff-esp-3)',
        borderBottom: 'var(--ceff-bordure)',
        background: 'var(--ceff-blanc)',
      }}
    >
      {logoSrc && <img src={logoSrc} alt="CEFF" style={{ height: 28, flexShrink: 0 }} />}

      <button className="ceff-btn ceff-btn-outline ceff-mobile-only" onClick={onToggleLibrary}>
        Bibliothèque
      </button>

      <input
        className="ceff-chart-name"
        value={chartName}
        onChange={(e) => onRenameChart(e.target.value)}
        style={{
          border: 'none',
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--ceff-primaire)',
          width: 220,
          flexShrink: 0,
          padding: '6px 8px',
        }}
      />

      <div style={{ width: 1, height: 24, background: 'var(--ceff-fond-gris)' }} />

      <button className="ceff-btn ceff-btn-outline" onClick={onNew}>
        Nouveau
      </button>
      <button className="ceff-btn ceff-btn-primary" onClick={onSave}>
        Enregistrer
      </button>

      <div style={{ position: 'relative' }}>
        <button className="ceff-btn ceff-btn-outline" onClick={() => setLoadOpen((v) => !v)}>
          Charger ▾
        </button>
        {loadOpen && (
          <div
            style={{
              position: 'absolute',
              top: '110%',
              left: 0,
              background: 'var(--ceff-blanc)',
              border: '1px solid var(--ceff-fond-gris)',
              borderRadius: 'var(--ceff-rayon-tuile)',
              boxShadow: 'var(--ceff-ombre-2)',
              minWidth: 220,
              zIndex: 20,
              padding: 6,
            }}
          >
            {Object.keys(savedCharts).length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--ceff-texte-2)', padding: 8 }}>
                Aucun organigramme enregistré.
              </div>
            )}
            {Object.entries(savedCharts)
              .sort((a, b) => (a[1].updatedAt < b[1].updatedAt ? 1 : -1))
              .map(([name]) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    className="ceff-btn-icon"
                    style={{ flex: 1, justifyContent: 'flex-start', fontWeight: 400, fontSize: 12, borderRadius: 'var(--ceff-rayon-tuile)' }}
                    onClick={() => {
                      onLoad(name);
                      setLoadOpen(false);
                    }}
                  >
                    {name}
                  </button>
                  <button
                    className="ceff-btn-icon"
                    style={{ color: 'var(--ceff-accent)', fontSize: 10 }}
                    title="Supprimer"
                    onClick={() => onDeleteSaved(name)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            <div style={{ borderTop: '1px solid var(--ceff-fond-gris)', marginTop: 6, paddingTop: 6 }}>
              <button
                className="ceff-btn-icon"
                style={{ width: '100%', justifyContent: 'flex-start', fontSize: 12 }}
                onClick={() => fileInputRef.current?.click()}
              >
                Importer un fichier JSON…
              </button>
            </div>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImportJson(file);
          e.target.value = '';
          setLoadOpen(false);
        }}
      />

      <button className="ceff-btn-icon" title="Annuler" onClick={onUndo} disabled={!canUndo}>
        ↶
      </button>
      <button className="ceff-btn-icon" title="Rétablir" onClick={onRedo} disabled={!canRedo}>
        ↷
      </button>

      <button
        className="ceff-btn ceff-btn-outline"
        title="Aimante les bulles entre elles et sur le centre du canevas pendant le déplacement"
        onClick={onToggleGuides}
        style={showGuides ? { background: 'var(--ceff-fond-gris)' } : undefined}
      >
        Alignement magnétique
      </button>

      <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
        <span style={{ fontSize: 10, color: 'var(--ceff-texte-2)', opacity: 0.55, whiteSpace: 'nowrap' }}>
          Application développée par Réal Dylan
        </span>
      </div>

      <button className="ceff-btn ceff-btn-outline" onClick={onExportJson}>
        Exporter JSON
      </button>
      <button className="ceff-btn ceff-btn-primary" onClick={onExportPdf}>
        Exporter en PDF
      </button>
    </header>
  );
}
