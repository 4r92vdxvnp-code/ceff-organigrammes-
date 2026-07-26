import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  useReactFlow,
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

const nodeTypes = { ceffNode: CeffNode };
const edgeTypes = { ceff: CeffEdge };

let idCounter = 0;
const newId = () => `n-${Date.now()}-${idCounter++}`;

const BLANK_NODE = {
  id: 'n-root',
  type: 'ceffNode',
  position: { x: 320, y: 40 },
  data: { label: 'Directeur général', sublabel: 'Direction', color: 'primaire' },
};

function Flow() {
  const [nodes, setNodes] = useState(STARTER_NODES);
  const [edges, setEdges] = useState(STARTER_EDGES);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [chartName, setChartName] = useState('Sans titre');
  const [templates, setTemplates] = useState(() => loadTemplates(DEFAULT_TEMPLATES));
  const [savedCharts, setSavedCharts] = useState(() => loadCharts());
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
  const { screenToFlowPosition, flowToScreenPosition, getZoom } = useReactFlow();

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId) || null, [nodes, selectedNodeId]);

  const snapshot = useCallback((prevNodes, prevEdges) => {
    setHistory((h) => ({ past: [...h.past, { nodes: prevNodes, edges: prevEdges }].slice(-50), future: [] }));
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

  function undo() {
    setHistory((h) => {
      if (!h.past.length) return h;
      const previous = h.past[h.past.length - 1];
      setNodes(previous.nodes);
      setEdges(previous.edges);
      return { past: h.past.slice(0, -1), future: [{ nodes, edges }, ...h.future].slice(0, 50) };
    });
  }

  function redo() {
    setHistory((h) => {
      if (!h.future.length) return h;
      const next = h.future[0];
      setNodes(next.nodes);
      setEdges(next.edges);
      return { past: [...h.past, { nodes, edges }].slice(-50), future: h.future.slice(1) };
    });
  }

  const onNodesChange = useCallback((changes) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
    const removed = changes.filter((c) => c.type === 'remove').map((c) => c.id);
    if (removed.length) {
      setEdges((eds) => eds.filter((e) => !removed.includes(e.source) && !removed.includes(e.target)));
      setSelectedNodeId((id) => (removed.includes(id) ? null : id));
    }
  }, []);

  const onEdgesChange = useCallback((changes) => setEdges((eds) => applyEdgeChanges(changes, eds)), []);

  const onNodeDragStart = useCallback(() => {
    snapshot(nodes, edges);
    setDragging(true);
  }, [nodes, edges, snapshot]);

  // Aimante la bulle déplacée : sur le centre du canevas, et sur les bords /
  // centres des autres bulles (alignement horizontal et vertical entre elles).
  const onNodeDrag = useCallback(
    (_event, node) => {
      if (!showGuides || !wrapperRef.current) {
        setSnap({ x: false, y: false });
        setGuideValues({ x: null, y: null });
        return;
      }
      const rect = wrapperRef.current.getBoundingClientRect();
      const centerFlow = screenToFlowPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      const threshold = 8 / getZoom();
      const w = node.measured?.width || node.width || 190;
      const h = node.measured?.height || node.height || 70;

      const left = node.position.x;
      const centerX = left + w / 2;
      const right = left + w;
      const top = node.position.y;
      const centerY = top + h / 2;
      const bottom = top + h;

      const candidatesX = [centerFlow.x];
      const candidatesY = [centerFlow.y];
      nodes.forEach((n) => {
        if (n.id === node.id) return;
        const nw = n.measured?.width || n.width || 190;
        const nh = n.measured?.height || n.height || 70;
        candidatesX.push(n.position.x, n.position.x + nw / 2, n.position.x + nw);
        candidatesY.push(n.position.y, n.position.y + nh / 2, n.position.y + nh);
      });

      function bestMatch(values, candidates) {
        let best = null;
        for (const c of candidates) {
          for (const v of values) {
            const diff = c - v;
            if (Math.abs(diff) < threshold && (!best || Math.abs(diff) < Math.abs(best.delta))) {
              best = { delta: diff, guideValue: c };
            }
          }
        }
        return best;
      }

      const matchX = bestMatch([left, centerX, right], candidatesX);
      const matchY = bestMatch([top, centerY, bottom], candidatesY);

      setSnap({ x: !!matchX, y: !!matchY });
      setGuideValues({ x: matchX ? matchX.guideValue : null, y: matchY ? matchY.guideValue : null });

      if (matchX || matchY) {
        setNodes((nds) =>
          nds.map((n) =>
            n.id === node.id
              ? {
                  ...n,
                  position: {
                    x: matchX ? n.position.x + matchX.delta : n.position.x,
                    y: matchY ? n.position.y + matchY.delta : n.position.y,
                  },
                }
              : n
          )
        );
      }
    },
    [showGuides, nodes, screenToFlowPosition, getZoom]
  );

  const onNodeDragStop = useCallback(() => {
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

  const onNodeClick = useCallback((_e, node) => setSelectedNodeId(node.id), []);
  const onPaneClick = useCallback(() => setSelectedNodeId(null), []);

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
    setSelectedNodeId(null);
  }

  function deleteEdge(id) {
    commit(nodes, edges.filter((e) => e.id !== id));
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
    setSelectedNodeId(node.id);
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
    setNodes([BLANK_NODE]);
    setEdges([]);
    setChartName('Sans titre');
    setSelectedNodeId(null);
    setHistory({ past: [], future: [] });
  }

  function handleSave() {
    let name = chartName;
    if (!name || name === 'Sans titre') {
      name = window.prompt("Nom de l'organigramme (affaire / projet) :", 'Nouvel organigramme') || '';
      if (!name.trim()) return;
      setChartName(name);
    }
    const updated = saveChart(name, { nodes, edges });
    setSavedCharts(updated);
  }

  function handleLoad(name) {
    const chart = savedCharts[name];
    if (!chart) return;
    setNodes(chart.nodes);
    setEdges(chart.edges);
    setChartName(name);
    setSelectedNodeId(null);
    setHistory({ past: [], future: [] });
  }

  function handleDeleteSaved(name) {
    if (!window.confirm(`Supprimer l'organigramme enregistré "${name}" ?`)) return;
    setSavedCharts(deleteChart(name));
  }

  function handleExportJson() {
    exportChartToFile(chartName, { nodes, edges });
  }

  async function handleImportJson(file) {
    try {
      const data = await importChartFromFile(file);
      snapshot(nodes, edges);
      setNodes(data.nodes);
      setEdges(data.edges);
      setChartName(data.name || file.name.replace(/\.json$/i, ''));
      setSelectedNodeId(null);
    } catch (err) {
      window.alert("Impossible d'importer ce fichier : " + err.message);
    }
  }

  function handleExportPdf() {
    setPdfDialogOpen(true);
  }

  function confirmExportPdf(includeLogo) {
    setPdfDialogOpen(false);
    exportOrgChartToPdf(nodes, edges, chartName, { includeLogo });
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
        { label: 'Supprimer', danger: true, onClick: () => { deleteNode(contextMenu.id); setContextMenu(null); } },
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
        logoSrc="/logo-ceff.jpg"
        onToggleLibrary={() => setLibraryOpen((v) => !v)}
        showGuides={showGuides}
        onToggleGuides={() => setShowGuides((v) => !v)}
      />
      <div
        className={`ceff-backdrop${libraryOpen || selectedNode ? ' open' : ''}`}
        onClick={() => {
          setLibraryOpen(false);
          setSelectedNodeId(null);
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
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
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
        </div>
        <InspectorPanel
          node={selectedNode}
          onChange={updateNodeData}
          onDelete={deleteNode}
          onClose={() => setSelectedNodeId(null)}
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
