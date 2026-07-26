import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
  useStoreApi,
  ConnectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './theme.css';

import Toolbar from './components/Toolbar';
import LibraryPanel from './components/LibraryPanel';
import InspectorPanel from './components/InspectorPanel';
import CeffNode from './components/CeffNode';
import CeffEdge from './components/CeffEdge';
import ContextMenu from './components/ContextMenu';
import { DEFAULT_TEMPLATES } from './data/templates';
import { DEFAULT_NAMES } from './data/names';
import { STARTER_NODES, STARTER_EDGES } from './data/starterChart';
import { LEVEL_DEFAULT_COLOR } from './data/palette';
import {
  loadCharts,
  saveChart,
  deleteChart,
  loadTemplates,
  saveTemplates,
  loadNames,
  saveNames,
  exportChartToFile,
  importChartFromFile,
} from './utils/storage';
import { exportOrgChartToPdf } from './utils/pdfExport';
import { computeSnap } from './utils/snapping';

const nodeTypes = { ceffNode: CeffNode };
const edgeTypes = { ceff: CeffEdge };

let idCounter = 0;
const newId = () => `n-${Date.now()}-${idCounter++}`;

// Copie les bulles et les liens en créant de NOUVELLES références d'objets.
// React Flow compare par référence : restaurer les objets d'origine lui ferait
// croire que rien n'a changé, et les liens ne seraient plus tracés après une
// annulation (leurs tables internes de connexion ne seraient pas reconstruites).
function cloneGraph(nodes, edges) {
  return {
    nodes: nodes.map((n) => ({ ...n, position: { ...n.position }, data: { ...n.data } })),
    edges: edges.map((e) => ({ ...e, data: { ...e.data } })),
  };
}

// Retire les états d'interface (sélection, survol) avant d'enregistrer ou
// d'exporter : sinon un organigramme rouvert réapparaîtrait avec des bulles
// sélectionnées sans raison.
function forStorage(nodes, edges) {
  return {
    nodes: nodes.map(({ selected, dragging, ...n }) => n),
    edges: edges.map(({ selected, ...e }) => e),
  };
}

const BLANK_NODE = {
  id: 'n-root',
  type: 'ceffNode',
  position: { x: 320, y: 40 },
  data: { label: 'Directeur général', sublabel: 'Direction', color: 'primaire' },
};

// Page vierge à l'ouverture (comme un nouveau classeur Excel) : l'organigramme
// d'équipe fourni par défaut est conservé, mais rangé dans "Charger" plutôt
// qu'imposé à chaque lancement — on ne le crée qu'une seule fois, au tout
// premier démarrage (avant qu'il n'y ait le moindre organigramme enregistré).
const STARTER_CHART_NAME = 'Équipe CEFF (modèle)';

function seedStarterChartOnce() {
  const charts = loadCharts();
  if (Object.keys(charts).length > 0) return charts;
  return saveChart(STARTER_CHART_NAME, { nodes: STARTER_NODES, edges: STARTER_EDGES }).charts;
}

function Flow() {
  const [nodes, setNodes] = useState([{ ...BLANK_NODE, data: { ...BLANK_NODE.data } }]);
  const [edges, setEdges] = useState([]);
  const [selectedNodeIds, setSelectedNodeIds] = useState([]);
  const [chartName, setChartName] = useState('Sans titre');
  const [templates, setTemplates] = useState(() => loadTemplates(DEFAULT_TEMPLATES));
  const [savedCharts, setSavedCharts] = useState(() => seedStarterChartOnce());
  const [history, setHistory] = useState({ past: [], future: [] });
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [savedNames, setSavedNames] = useState(() => loadNames(DEFAULT_NAMES));
  const [showGuides, setShowGuides] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [snap, setSnap] = useState({ x: false, y: false });
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [clipboardNode, setClipboardNode] = useState(null);
  const [guideValues, setGuideValues] = useState({ x: null, y: null });
  const historyTimer = useRef(null);
  const wrapperRef = useRef(null);
  const snappedPositionRef = useRef(null);
  const { screenToFlowPosition, flowToScreenPosition, getZoom, getNodes } = useReactFlow();
  // Quand des bulles réapparaissent après avoir disparu (annulation d'une
  // suppression, chargement, import), React Flow ne les remesure pas : leurs
  // dimensions et leurs poignées restent vides et les liens ne sont plus
  // tracés. On force donc une remesure après le rendu.
  const [graphVersion, setGraphVersion] = useState(0);
  const store = useStoreApi();

  const replaceGraph = useCallback((nextNodes, nextEdges) => {
    setNodes(nextNodes);
    setEdges(nextEdges);
    setGraphVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    if (!graphVersion) return;
    // setTimeout plutôt que requestAnimationFrame : rAF ne se déclenche pas
    // tant que l'onglet n'est pas peint (arrière-plan, fenêtre masquée), ce
    // qui laisserait l'organigramme sans ses liens.
    const timer = setTimeout(() => {
      const elements = wrapperRef.current?.querySelectorAll('.react-flow__node') || [];
      const updates = new Map();
      elements.forEach((el) => {
        const id = el.getAttribute('data-id');
        if (id) updates.set(id, { id, nodeElement: el, force: true });
      });
      if (updates.size) {
        store.getState().updateNodeInternals(updates, { triggerFitView: false });
      }
    }, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphVersion]);

  // Le panneau de propriétés n'édite une bulle que si elle est seule sélectionnée.
  const selectedNode = useMemo(
    () => (selectedNodeIds.length === 1 ? nodes.find((n) => n.id === selectedNodeIds[0]) || null : null),
    [nodes, selectedNodeIds]
  );

  const snapshot = useCallback((prevNodes, prevEdges) => {
    setHistory((h) => ({ past: [...h.past, cloneGraph(prevNodes, prevEdges)].slice(-50), future: [] }));
  }, []);

  const commit = useCallback(
    (nextNodes, nextEdges) => {
      snapshot(nodes, edges);
      if (nextNodes) setNodes(nextNodes);
      if (nextEdges) setEdges(nextEdges);
    },
    [nodes, edges, snapshot]
  );

  const commitDebounced = useCallback(
    (nextNodes) => {
      if (historyTimer.current) clearTimeout(historyTimer.current);
      const prevNodes = nodes;
      const prevEdges = edges;
      historyTimer.current = setTimeout(() => snapshot(prevNodes, prevEdges), 500);
      setNodes(nextNodes);
    },
    [nodes, edges, snapshot]
  );

  // Les modifications d'état sont faites hors des fonctions de mise à jour de
  // setHistory : imbriquer des setState dans un updater le rend impur et le
  // fait exécuter deux fois en mode strict.
  function undo() {
    if (!history.past.length) return;
    const previous = history.past[history.past.length - 1];
    setHistory({
      past: history.past.slice(0, -1),
      future: [cloneGraph(nodes, edges), ...history.future].slice(0, 50),
    });
    const restored = cloneGraph(previous.nodes, previous.edges);
    replaceGraph(restored.nodes, restored.edges);
    setSelectedNodeIds([]);
  }

  function redo() {
    if (!history.future.length) return;
    const next = history.future[0];
    setHistory({
      past: [...history.past, cloneGraph(nodes, edges)].slice(-50),
      future: history.future.slice(1),
    });
    const restored = cloneGraph(next.nodes, next.edges);
    replaceGraph(restored.nodes, restored.edges);
    setSelectedNodeIds([]);
  }

  const onNodesChange = useCallback((changes) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
    const removed = changes.filter((c) => c.type === 'remove').map((c) => c.id);
    if (removed.length) {
      setEdges((eds) => eds.filter((e) => !removed.includes(e.source) && !removed.includes(e.target)));
      setSelectedNodeIds((ids) => ids.filter((id) => !removed.includes(id)));
    }
  }, []);

  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);

  // Suppression déclenchée par l'utilisateur (touche Suppr / Retour arrière).
  // C'est le seul endroit où capturer l'historique : le faire dans
  // onNodesChange / onEdgesChange enregistrerait aussi les changements
  // programmatiques en cascade et corromprait la pile d'annulation.
  const onBeforeDelete = useCallback(async () => {
    snapshot(nodes, edges);
    return true;
  }, [nodes, edges, snapshot]);

  const onNodeDragStart = useCallback(() => {
    snapshot(nodes, edges);
    setDragging(true);
  }, [nodes, edges, snapshot]);

  // Aimante la bulle déplacée : sur le centre du canevas, et sur les bords /
  // centres des autres bulles (alignement horizontal et vertical entre elles).
  const onNodeDrag = useCallback(
    (_event, node) => {
      if (!showGuides || !wrapperRef.current || selectedNodeIds.length > 1) {
        snappedPositionRef.current = null;
        setSnap({ x: false, y: false });
        setGuideValues({ x: null, y: null });
        return;
      }
      const rect = wrapperRef.current.getBoundingClientRect();
      const canvasCenter = screenToFlowPosition({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
      const snapped = computeSnap(node, nodes, canvasCenter, 8 / getZoom());

      setSnap({ x: !!snapped?.guideX, y: !!snapped?.guideY });
      setGuideValues({ x: snapped?.guideX ?? null, y: snapped?.guideY ?? null });
      snappedPositionRef.current = snapped;

      if (snapped) {
        setNodes((nds) =>
          nds.map((n) => (n.id === node.id ? { ...n, position: { x: snapped.x, y: snapped.y } } : n))
        );
      }
    },
    [showGuides, nodes, selectedNodeIds, screenToFlowPosition, getZoom]
  );

  // React Flow réécrit la position brute (non aimantée) au relâchement :
  // on réapplique la dernière position aimantée pour éviter le décalage.
  const onNodeDragStop = useCallback(() => {
    const snapped = snappedPositionRef.current;
    if (snapped) {
      setNodes((nds) =>
        nds.map((n) => (n.id === snapped.id ? { ...n, position: { x: snapped.x, y: snapped.y } } : n))
      );
    }
    snappedPositionRef.current = null;
    setDragging(false);
    setSnap({ x: false, y: false });
    setGuideValues({ x: null, y: null });
  }, []);

  const onConnect = useCallback(
    (connection) => {
      snapshot(nodes, edges);
      setEdges((eds) => [
        ...eds,
        {
          id: `e-${connection.source}-${connection.target}-${Date.now()}`,
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle,
          targetHandle: connection.targetHandle,
          type: 'ceff',
          data: { dashed: false },
        },
      ]);
    },
    [nodes, edges, snapshot]
  );

  // React Flow est la source de vérité de la sélection : cela fait fonctionner
  // le clic simple, le Maj + clic et le rectangle de sélection sans code en double.
  const onSelectionChange = useCallback(({ nodes: sel }) => {
    setSelectedNodeIds(sel.map((n) => n.id));
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData('application/ceff-template');
      if (!raw) return;
      const tpl = JSON.parse(raw);
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      snapshot(nodes, edges);
      setNodes((nds) => [
        ...nds,
        {
          id: newId(),
          type: 'ceffNode',
          position,
          data: {
            label: tpl.label,
            sublabel: tpl.sublabel || '',
            level: tpl.level,
            color: LEVEL_DEFAULT_COLOR[tpl.level] || 'fond-gris',
          },
        },
      ]);
    },
    [nodes, edges, screenToFlowPosition, snapshot]
  );

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Ajout par un tap (au lieu d'un glisser), nécessaire sur iPhone où le
  // glisser-déposer HTML5 depuis la bibliothèque n'est pas disponible.
  const addTemplateNode = useCallback(
    (tpl) => {
      const wrapperRect = wrapperRef.current?.getBoundingClientRect();
      const center = wrapperRect
        ? { x: wrapperRect.left + wrapperRect.width / 2, y: wrapperRect.top + wrapperRect.height / 2 }
        : { x: 400, y: 300 };
      const jitter = () => Math.round((Math.random() - 0.5) * 80);
      const position = screenToFlowPosition({ x: center.x + jitter(), y: center.y + jitter() });
      snapshot(nodes, edges);
      setNodes((nds) => [
        ...nds,
        {
          id: newId(),
          type: 'ceffNode',
          position,
          data: {
            label: tpl.label,
            sublabel: tpl.sublabel || '',
            level: tpl.level,
            color: LEVEL_DEFAULT_COLOR[tpl.level] || 'fond-gris',
          },
        },
      ]);
      setLibraryOpen(false);
    },
    [nodes, edges, screenToFlowPosition, snapshot]
  );

  function updateNodeData(id, patch) {
    commitDebounced(nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)));
  }

  function deleteNode(id) {
    commit(
      nodes.filter((n) => n.id !== id),
      edges.filter((e) => e.source !== id && e.target !== id)
    );
    setSelectedNodeIds([]);
  }

  function deleteEdge(id) {
    commit(nodes, edges.filter((e) => e.id !== id));
  }

  // Vide entièrement le canevas (bulles et liens), annulable via "Annuler".
  function deleteAll() {
    if (!nodes.length && !edges.length) return;
    if (!window.confirm("Supprimer toutes les bulles et tous les liens de cet organigramme ?")) return;
    commit([], []);
    setSelectedNodeIds([]);
  }

  // Supprime toutes les bulles sélectionnées, et les liens qui y aboutissent.
  function deleteSelection() {
    if (!selectedNodeIds.length) return;
    commit(
      nodes.filter((n) => !selectedNodeIds.includes(n.id)),
      edges.filter((e) => !selectedNodeIds.includes(e.source) && !selectedNodeIds.includes(e.target))
    );
    setSelectedNodeIds([]);
  }

  // Applique un niveau hiérarchique (et le fond correspondant) à tout le groupe.
  function applyLevelToSelection(level) {
    if (!selectedNodeIds.length) return;
    commit(
      nodes.map((n) =>
        selectedNodeIds.includes(n.id)
          ? { ...n, data: { ...n.data, level, color: LEVEL_DEFAULT_COLOR[level] } }
          : n
      ),
      edges
    );
  }

  function toggleEdgeDashed(id) {
    snapshot(nodes, edges);
    setEdges((eds) => eds.map((e) => (e.id === id ? { ...e, data: { ...e.data, dashed: !e.data?.dashed } } : e)));
  }

  function copyNode(id) {
    const n = nodes.find((x) => x.id === id);
    if (n) setClipboardNode({ ...n.data });
  }

  function cutNode(id) {
    const n = nodes.find((x) => x.id === id);
    if (!n) return;
    setClipboardNode({ ...n.data });
    deleteNode(id);
  }

  function duplicateNode(id) {
    const n = nodes.find((x) => x.id === id);
    if (!n) return;
    commit(
      [...nodes, { id: newId(), type: 'ceffNode', position: { x: n.position.x + 24, y: n.position.y + 24 }, data: { ...n.data } }],
      edges
    );
  }

  function pasteNodeAt(position) {
    if (!clipboardNode) return;
    commit(
      [...nodes, { id: newId(), type: 'ceffNode', position, data: { ...clipboardNode } }],
      edges
    );
  }

  const onNodeContextMenu = useCallback((event, node) => {
    event.preventDefault();
    setSelectedNodeIds((ids) => (ids.includes(node.id) ? ids : [node.id]));
    const flowPosition = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    setContextMenu({ type: 'node', id: node.id, x: event.clientX, y: event.clientY, flowPosition });
  }, [screenToFlowPosition]);

  const onEdgeContextMenu = useCallback((event, edge) => {
    event.preventDefault();
    setContextMenu({ type: 'edge', id: edge.id, x: event.clientX, y: event.clientY });
  }, []);

  const onPaneContextMenu = useCallback(
    (event) => {
      event.preventDefault();
      const flowPosition = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      setContextMenu({ type: 'pane', x: event.clientX, y: event.clientY, flowPosition });
    },
    [screenToFlowPosition]
  );

  function handleNew() {
    if (!window.confirm('Créer un nouvel organigramme ? Les modifications non enregistrées seront perdues.')) return;
    replaceGraph([{ ...BLANK_NODE, data: { ...BLANK_NODE.data } }], []);
    setChartName('Sans titre');
    setSelectedNodeIds([]);
    setHistory({ past: [], future: [] });
  }

  function handleSave() {
    let name = chartName;
    if (!name || name === 'Sans titre') {
      name = window.prompt("Nom de l'organigramme (affaire / projet) :", 'Nouvel organigramme') || '';
      if (!name.trim()) return;
      name = name.trim();
      setChartName(name);
    }
    const { charts, erreur } = saveChart(name, forStorage(nodes, edges));
    setSavedCharts(charts);
    if (erreur) window.alert("Enregistrement impossible.\n\n" + erreur);
  }

  function handleLoad(name) {
    const chart = savedCharts[name];
    if (!chart) return;
    const loaded = cloneGraph(chart.nodes, chart.edges);
    replaceGraph(loaded.nodes, loaded.edges);
    setChartName(name);
    setSelectedNodeIds([]);
    setHistory({ past: [], future: [] });
  }

  function handleDeleteSaved(name) {
    if (!window.confirm(`Supprimer l'organigramme enregistré "${name}" ?`)) return;
    setSavedCharts(deleteChart(name));
  }

  function handleExportJson() {
    exportChartToFile(chartName, forStorage(nodes, edges));
  }

  async function handleImportJson(file) {
    try {
      const data = await importChartFromFile(file);
      snapshot(nodes, edges);
      const imported = cloneGraph(data.nodes, data.edges);
      replaceGraph(imported.nodes, imported.edges);
      setChartName(data.name || file.name.replace(/\.json$/i, ''));
      setSelectedNodeIds([]);
    } catch (err) {
      window.alert("Impossible d'importer ce fichier : " + err.message);
    }
  }

  function handleExportPdf() {
    if (!nodes.length) {
      window.alert("L'organigramme est vide, il n'y a rien à exporter.");
      return;
    }
    setPdfDialogOpen(true);
  }

  function confirmExportPdf(includeLogo) {
    setPdfDialogOpen(false);
    // getNodes() renvoie les nœuds avec leurs dimensions réellement mesurées :
    // indispensable pour calculer une boîte englobante juste, donc un centrage correct.
    exportOrgChartToPdf(getNodes(), edges, chartName, { includeLogo });
  }

  function handleSetTemplates(updater) {
    setTemplates((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveTemplates(next);
      return next;
    });
  }

  function handleCommitName(name) {
    setSavedNames((prev) => {
      if (prev.includes(name)) return prev;
      const next = [...prev, name].sort((a, b) => a.localeCompare(b, 'fr'));
      saveNames(next);
      return next;
    });
  }

  function handleRemoveName(name) {
    setSavedNames((prev) => {
      const next = prev.filter((n) => n !== name);
      saveNames(next);
      return next;
    });
  }

  function buildContextMenuItems() {
    if (!contextMenu) return [];
    if (contextMenu.type === 'node') {
      const multiple = selectedNodeIds.length > 1 && selectedNodeIds.includes(contextMenu.id);
      return [
        { label: 'Copier', onClick: () => { copyNode(contextMenu.id); setContextMenu(null); } },
        { label: 'Couper', onClick: () => { cutNode(contextMenu.id); setContextMenu(null); } },
        { label: 'Dupliquer', onClick: () => { duplicateNode(contextMenu.id); setContextMenu(null); } },
        { divider: true },
        {
          label: 'Coller ici',
          disabled: !clipboardNode,
          onClick: () => {
            pasteNodeAt({ x: contextMenu.flowPosition.x + 40, y: contextMenu.flowPosition.y + 40 });
            setContextMenu(null);
          },
        },
        { divider: true },
        multiple
          ? {
              label: `Supprimer les ${selectedNodeIds.length} bulles`,
              danger: true,
              onClick: () => { deleteSelection(); setContextMenu(null); },
            }
          : { label: 'Supprimer', danger: true, onClick: () => { deleteNode(contextMenu.id); setContextMenu(null); } },
      ];
    }
    if (contextMenu.type === 'edge') {
      const edge = edges.find((e) => e.id === contextMenu.id);
      return [
        {
          label: edge?.data?.dashed ? 'Trait plein' : 'Trait pointillé (sous-traitance)',
          onClick: () => { toggleEdgeDashed(contextMenu.id); setContextMenu(null); },
        },
        { divider: true },
        { label: 'Supprimer le lien', danger: true, onClick: () => { deleteEdge(contextMenu.id); setContextMenu(null); } },
      ];
    }
    if (contextMenu.type === 'pane') {
      return [
        {
          label: 'Coller ici',
          disabled: !clipboardNode,
          onClick: () => { pasteNodeAt(contextMenu.flowPosition); setContextMenu(null); },
        },
        { divider: true },
        {
          label: 'Tout effacer',
          danger: true,
          disabled: !nodes.length && !edges.length,
          onClick: () => { setContextMenu(null); deleteAll(); },
        },
      ];
    }
    return [];
  }

  const wrapperRect = wrapperRef.current?.getBoundingClientRect();
  const guideScreenX =
    showGuides && dragging && guideValues.x != null && wrapperRect
      ? flowToScreenPosition({ x: guideValues.x, y: 0 }).x - wrapperRect.left
      : null;
  const guideScreenY =
    showGuides && dragging && guideValues.y != null && wrapperRect
      ? flowToScreenPosition({ x: 0, y: guideValues.y }).y - wrapperRect.top
      : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Toolbar
        chartName={chartName}
        onRenameChart={setChartName}
        onNew={handleNew}
        onSave={handleSave}
        savedCharts={savedCharts}
        onLoad={handleLoad}
        onDeleteSaved={handleDeleteSaved}
        onExportPdf={handleExportPdf}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        onUndo={undo}
        onRedo={redo}
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
        logoSrc={`${import.meta.env.BASE_URL}logo-ceff.jpg`}
        onToggleLibrary={() => setLibraryOpen((v) => !v)}
        showGuides={showGuides}
        onToggleGuides={() => setShowGuides((v) => !v)}
        onDeleteAll={deleteAll}
        canDeleteAll={nodes.length > 0 || edges.length > 0}
      />
      <div
        className={`ceff-backdrop${libraryOpen || selectedNodeIds.length ? ' open' : ''}`}
        onClick={() => {
          setLibraryOpen(false);
          setSelectedNodeIds([]);
        }}
      />
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <LibraryPanel
          templates={templates}
          setTemplates={handleSetTemplates}
          onAddTemplate={addTemplateNode}
          open={libraryOpen}
          onClose={() => setLibraryOpen(false)}
        />
        <div
          ref={wrapperRef}
          style={{ flex: 1, position: 'relative', background: 'var(--ceff-blanc)' }}
          onDrop={onDrop}
          onDragOver={onDragOver}
        >
          {showGuides && dragging && (guideScreenX != null || guideScreenY != null) && (
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5 }}>
              {guideScreenX != null && (
                <div
                  style={{
                    position: 'absolute',
                    left: guideScreenX,
                    top: 0,
                    bottom: 0,
                    width: 0,
                    borderLeft: `1px ${snap.x ? 'solid' : 'dashed'} ${snap.x ? 'var(--ceff-accent)' : 'var(--ceff-connecteur)'}`,
                    opacity: snap.x ? 0.9 : 0.35,
                  }}
                />
              )}
              {guideScreenY != null && (
                <div
                  style={{
                    position: 'absolute',
                    top: guideScreenY,
                    left: 0,
                    right: 0,
                    height: 0,
                    borderTop: `1px ${snap.y ? 'solid' : 'dashed'} ${snap.y ? 'var(--ceff-accent)' : 'var(--ceff-connecteur)'}`,
                    opacity: snap.y ? 0.9 : 0.35,
                  }}
                />
              )}
            </div>
          )}
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeDragStart={onNodeDragStart}
            onNodeDrag={onNodeDrag}
            onNodeDragStop={onNodeDragStop}
            onConnect={onConnect}
            // "loose" : n'importe quel côté (haut/bas/gauche/droite) peut
            // relier n'importe quel autre côté, pas seulement bas → haut.
            connectionMode={ConnectionMode.Loose}
            onSelectionChange={onSelectionChange}
            onBeforeDelete={onBeforeDelete}
            // Maj = rectangle de sélection sur le fond ; Cmd/Ctrl = ajout
            // bulle par bulle. Utiliser Maj pour les deux les met en conflit.
            multiSelectionKeyCode={['Meta', 'Control']}
            selectionKeyCode="Shift"
            onNodeContextMenu={onNodeContextMenu}
            onEdgeContextMenu={onEdgeContextMenu}
            onPaneContextMenu={onPaneContextMenu}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            defaultEdgeOptions={{ type: 'ceff', data: { dashed: false } }}
            fitView
            deleteKeyCode={['Backspace', 'Delete']}
            minZoom={0.2}
            maxZoom={2}
          >
            <Background color="#F2F2F2" gap={24} />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable nodeColor={() => '#D9E1F2'} maskColor="rgba(31,56,100,0.05)" />
          </ReactFlow>
          <div className="ceff-credit">Application développée par Réal Dylan</div>
        </div>
        <InspectorPanel
          node={selectedNode}
          selectionCount={selectedNodeIds.length}
          onChange={updateNodeData}
          onDelete={deleteNode}
          onDeleteSelection={deleteSelection}
          onApplyLevelToSelection={applyLevelToSelection}
          onClose={() => setSelectedNodeIds([])}
          savedNames={savedNames}
          onCommitName={handleCommitName}
          onRemoveName={handleRemoveName}
        />
      </div>

      {contextMenu && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 90 }}
          onClick={() => setContextMenu(null)}
          onContextMenu={(e) => {
            e.preventDefault();
            setContextMenu(null);
          }}
        >
          <ContextMenu x={contextMenu.x} y={contextMenu.y} items={buildContextMenuItems()} />
        </div>
      )}

      {pdfDialogOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(31, 56, 100, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => setPdfDialogOpen(false)}
        >
          <div
            style={{
              background: 'var(--ceff-blanc)',
              borderRadius: 'var(--ceff-rayon-carte)',
              boxShadow: 'var(--ceff-ombre-2)',
              padding: 'var(--ceff-esp-4)',
              width: 320,
              maxWidth: '90vw',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--ceff-primaire)', marginBottom: 8 }}>
              Export PDF
            </div>
            <div style={{ fontSize: 13, color: 'var(--ceff-texte-2)', marginBottom: 20 }}>
              Souhaitez-vous inclure le logo CEFF sur ce PDF ?
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="ceff-btn ceff-btn-outline"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => confirmExportPdf(false)}
              >
                Sans logo
              </button>
              <button
                className="ceff-btn ceff-btn-primary"
                style={{ flex: 1, justifyContent: 'center' }}
                onClick={() => confirmExportPdf(true)}
              >
                Avec le logo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <Flow />
    </ReactFlowProvider>
  );
}
