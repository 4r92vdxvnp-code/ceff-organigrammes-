import { useState } from 'react';
import { colorByKey, LEVEL_DEFAULT_COLOR } from '../data/palette';

let templateCounter = 0;

export default function LibraryPanel({ templates, setTemplates, onAddTemplate, open, onClose }) {
  const [editingId, setEditingId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ label: '', sublabel: '', level: 3 });

  function startCreate() {
    setDraft({ label: '', sublabel: '', level: 3 });
    setCreating(true);
    setEditingId(null);
  }

  function startEdit(tpl) {
    setDraft({ label: tpl.label, sublabel: tpl.sublabel || '', level: tpl.level });
    setEditingId(tpl.id);
    setCreating(false);
  }

  function cancelEdit() {
    setEditingId(null);
    setCreating(false);
  }

  function saveDraft() {
    if (!draft.label.trim()) return;
    if (creating) {
      const id = `tpl-custom-${Date.now()}-${templateCounter++}`;
      setTemplates((prev) => [...prev, { id, ...draft }]);
    } else if (editingId) {
      setTemplates((prev) => prev.map((t) => (t.id === editingId ? { ...t, ...draft } : t)));
    }
    cancelEdit();
  }

  function removeTemplate(id) {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    if (editingId === id) cancelEdit();
  }

  function handleDragStart(e, tpl) {
    e.dataTransfer.setData('application/ceff-template', JSON.stringify(tpl));
    e.dataTransfer.effectAllowed = 'move';
  }

  return (
    <aside
      className={`ceff-panel ceff-panel-left${open ? ' open' : ''}`}
      style={{
        width: 240,
        borderRight: 'var(--ceff-bordure)',
        padding: 'var(--ceff-esp-3) var(--ceff-esp-2)',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--ceff-esp-2)',
        background: 'var(--ceff-blanc)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ceff-primaire)' }}>Bibliothèque</div>
          <div style={{ fontSize: 11, color: 'var(--ceff-texte-2)', marginTop: 2 }}>
            Glissez une fonction dans l'organigramme (ou touchez-la pour l'ajouter).
          </div>
        </div>
        <button className="ceff-btn-icon ceff-mobile-only" onClick={onClose} title="Fermer">
          ✕
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {templates.map((tpl) => {
          const color = colorByKey(LEVEL_DEFAULT_COLOR[tpl.level]);
          const isEditing = editingId === tpl.id;
          return (
            <div key={tpl.id}>
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, tpl)}
                onClick={() => onAddTemplate(tpl)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  border: '1px solid var(--ceff-fond-gris)',
                  borderRadius: 'var(--ceff-rayon-tuile)',
                  padding: '8px 10px',
                  cursor: 'pointer',
                  background: 'var(--ceff-blanc)',
                  transition: 'box-shadow var(--ceff-transition)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = 'var(--ceff-ombre-1)')}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    background: color.bg,
                    border: color.bg === '#FFFFFF' ? '1px solid var(--ceff-fond-gris)' : 'none',
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tpl.label}
                  </div>
                  {tpl.sublabel && (
                    <div style={{ fontSize: 10, color: 'var(--ceff-texte-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tpl.sublabel}
                    </div>
                  )}
                </div>
                <button
                  className="ceff-btn-icon"
                  style={{ width: 20, height: 20, padding: 0, fontSize: 10 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    startEdit(tpl);
                  }}
                  title="Modifier"
                >
                  ✎
                </button>
                <button
                  className="ceff-btn-icon"
                  style={{ width: 20, height: 20, padding: 0, fontSize: 10, color: 'var(--ceff-accent)' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTemplate(tpl.id);
                  }}
                  title="Supprimer"
                >
                  ✕
                </button>
              </div>

              {isEditing && (
                <TemplateForm draft={draft} setDraft={setDraft} onSave={saveDraft} onCancel={cancelEdit} />
              )}
            </div>
          );
        })}
      </div>

      {creating ? (
        <TemplateForm draft={draft} setDraft={setDraft} onSave={saveDraft} onCancel={cancelEdit} />
      ) : (
        <button className="ceff-btn ceff-btn-outline" onClick={startCreate}>
          + Nouvelle bulle modèle
        </button>
      )}
    </aside>
  );
}

function TemplateForm({ draft, setDraft, onSave, onCancel }) {
  return (
    <div
      style={{
        marginTop: 6,
        padding: 10,
        border: '1px solid var(--ceff-fond-gris)',
        borderRadius: 'var(--ceff-rayon-tuile)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        background: 'var(--ceff-fond-gris)',
      }}
    >
      <input
        placeholder="Fonction (ex. Chef de chantier)"
        value={draft.label}
        onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
        autoFocus
      />
      <input
        placeholder="Précision (ex. Pôle Travaux)"
        value={draft.sublabel}
        onChange={(e) => setDraft((d) => ({ ...d, sublabel: e.target.value }))}
      />
      <select value={draft.level} onChange={(e) => setDraft((d) => ({ ...d, level: Number(e.target.value) }))}>
        <option value={1}>Niveau 1, direction</option>
        <option value={2}>Niveau 2, responsables</option>
        <option value={3}>Niveau 3, équipes</option>
        <option value={4}>Niveau 4, fonctions</option>
      </select>
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="ceff-btn ceff-btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={onSave}>
          Enregistrer
        </button>
        <button className="ceff-btn ceff-btn-outline" style={{ flex: 1, justifyContent: 'center' }} onClick={onCancel}>
          Annuler
        </button>
      </div>
    </div>
  );
}
