import { useState, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
  Handle,
  Position,
  NodeResizer,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { auth, db } from '../firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import './Tablero.css';

// ── Iconos ────────────────────────────────────────────────
const IconTrash = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6"/>
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
  </svg>
);

const IconDuplicate = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);

// ── Texto editable en línea (doble clic para editar) ─────
const EditableInline = ({ value, placeholder, className, style, onSave, onFocus }) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  const ref = useRef(null);

  useEffect(() => { setText(value); }, [value]);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  if (editing) {
    return (
      <input
        ref={ref}
        className={`${className} nodrag`}
        style={style}
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => { setEditing(false); onSave(text); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === 'Escape') { setEditing(false); onSave(text); }
          e.stopPropagation();
        }}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }
  return (
    <span
      className={className}
      style={style}
      onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); onFocus?.(); }}
    >
      {text || <span className="t-placeholder">{placeholder}</span>}
    </span>
  );
};

// ── Barra de formato para nodos de texto ─────────────────
const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48];

const FONT_WEIGHTS = [
  { value: 100, label: 'Thin'      },
  { value: 200, label: 'ExtraLight'},
  { value: 300, label: 'Light'     },
  { value: 400, label: 'Regular'   },
  { value: 500, label: 'Medium'    },
  { value: 600, label: 'SemiBold'  },
  { value: 700, label: 'Bold'      },
  { value: 800, label: 'ExtraBold' },
  { value: 900, label: 'Black'     },
];

const TextFormatBar = ({ id, data, deleteElements, updateNodeData, setNodes, activeItemId, onDuplicate }) => {
  const fmt = data.fmt || {};
  const boxed = data.boxed ?? false;
  const listMode = data.listMode ?? false;

  const upd = (changes) => {
    if (listMode && activeItemId) {
      const newItems = (data.items || []).map(it =>
        it.id === activeItemId
          ? { ...it, fmt: { ...(it.fmt || {}), ...changes } }
          : it
      );
      updateNodeData(id, { ...data, items: newItems });
    } else {
      updateNodeData(id, { ...data, fmt: { ...fmt, ...changes } });
    }
  };

  const toggleList = (e) => {
    e.stopPropagation();
    const newListMode = !listMode;
    updateNodeData(id, {
      ...data,
      listMode: newListMode,
      fmt: newListMode ? { ...fmt, align: fmt.align || 'left' } : fmt,
      titulo: newListMode ? (data.titulo || data.label || '') : (data.titulo || ''),
      listType: data.listType ?? 'bullet',
      items: data.items?.length
        ? data.items
        : [{ id: `it-${Date.now()}`, titulo: '' }],
    });
    if (newListMode) {
      setNodes(nds => nds.map(n =>
        n.id === id ? { ...n, style: { ...n.style, width: Math.max((n.style?.width || 0), 220), height: undefined } } : n
      ));
    }
  };

  return (
    <div className="t-format-bar" onMouseDown={(e) => e.stopPropagation()}>
      {/* Duplicar */}
      <button className="t-node-btn t-node-btn-dup"
        onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
        title="Duplicar">
        <IconDuplicate />
      </button>

      {/* Eliminar */}
      <button className="t-node-btn t-node-btn-delete"
        onClick={(e) => { e.stopPropagation(); deleteElements({ nodes: [{ id }] }); }}
        title="Eliminar">
        <IconTrash />
      </button>

      <span className="t-sep-v" />

      {/* Peso de fuente */}
      <select className="t-weight-select"
        value={fmt.weight || 400}
        onChange={(e) => { e.stopPropagation(); upd({ weight: Number(e.target.value) }); }}>
        {FONT_WEIGHTS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
      </select>

      {/* Cursiva */}
      <button className={`t-node-btn t-fmt-btn ${fmt.italic ? 'active' : ''}`}
        onClick={(e) => { e.stopPropagation(); upd({ italic: !fmt.italic }); }}
        title="Cursiva">
        <em style={{ fontFamily: 'serif', fontSize: '12px' }}>I</em>
      </button>

      {/* Tamaño */}
      <select className="t-size-select"
        value={fmt.size || 14}
        onChange={(e) => { e.stopPropagation(); upd({ size: Number(e.target.value) }); }}>
        {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      <span className="t-sep-v" />

      {/* Alineación */}
      <button className={`t-node-btn t-fmt-btn ${fmt.align === 'left' ? 'active' : ''}`}
        onClick={(e) => { e.stopPropagation(); upd({ align: 'left' }); }}
        title="Izquierda">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>
      </button>
      <button className={`t-node-btn t-fmt-btn ${!fmt.align || fmt.align === 'center' ? 'active' : ''}`}
        onClick={(e) => { e.stopPropagation(); upd({ align: 'center' }); }}
        title="Centro">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
      </button>
      <button className={`t-node-btn t-fmt-btn ${fmt.align === 'right' ? 'active' : ''}`}
        onClick={(e) => { e.stopPropagation(); upd({ align: 'right' }); }}
        title="Derecha">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg>
      </button>

      <span className="t-sep-v" />

      {/* Color del texto */}
      <label className="t-color-pick" title="Color del texto">
        <span className="t-color-dot" style={{ background: fmt.color || '#ffffff' }} />
        <input type="color" value={fmt.color || '#ffffff'}
          onChange={(e) => upd({ color: e.target.value })} />
      </label>

      <span className="t-sep-v" />

      {/* Recuadro toggle */}
      <button className={`t-node-btn t-fmt-btn ${boxed ? 'active' : ''}`}
        onClick={(e) => { e.stopPropagation(); updateNodeData(id, { ...data, boxed: !boxed }); }}
        title={boxed ? 'Quitar recuadro' : 'Agregar recuadro'}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
      </button>

      {/* Lista toggle */}
      <button className={`t-node-btn t-fmt-btn ${listMode ? 'active' : ''}`}
        onClick={toggleList}
        title={listMode ? 'Modo texto' : 'Modo lista'}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/>
          <circle cx="4" cy="6" r="1.5" fill="currentColor"/><circle cx="4" cy="12" r="1.5" fill="currentColor"/><circle cx="4" cy="18" r="1.5" fill="currentColor"/>
        </svg>
      </button>

      {/* Tipo de lista — solo visible en modo lista */}
      {listMode && (
        <>
          <span className="t-sep-v" />
          <button
            className={`t-node-btn t-fmt-btn t-list-type-btn ${(data.listType ?? 'bullet') === 'bullet' ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); updateNodeData(id, { ...data, listType: 'bullet' }); }}
            title="Viñetas">
            •
          </button>
          <button
            className={`t-node-btn t-fmt-btn t-list-type-btn ${data.listType === 'number' ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); updateNodeData(id, { ...data, listType: 'number' }); }}
            title="Numeración">
            1.
          </button>
        </>
      )}
    </div>
  );
};

// ── Nodo de Texto (con modo lista integrado) ──────────────
const TextNode = ({ id, data, selected, positionAbsoluteX, positionAbsoluteY }) => {
  const { updateNodeData, deleteElements, setNodes } = useReactFlow();
  const [editing, setEditing] = useState(data.autoFocus ?? false);
  const [text, setText] = useState(data.label);
  const [activeItemId, setActiveItemId] = useState(null);
  const ref = useRef(null);
  const fmt = data.fmt || {};
  const boxed = data.boxed ?? false;
  const listMode = data.listMode ?? false;

  const handleDuplicate = useCallback(() => {
    setNodes(nds => [
      ...nds.map(n => ({ ...n, selected: false })),
      {
        id: `text-${Date.now()}`,
        type: 'textoNode',
        position: { x: positionAbsoluteX + 24, y: positionAbsoluteY + 24 },
        zIndex: 1,
        selected: true,
        data: { ...data, autoFocus: false },
      },
    ]);
  }, [positionAbsoluteX, positionAbsoluteY, data, setNodes]);

  // Clear autoFocus flag and open textarea on first render
  useEffect(() => {
    if (data.autoFocus) {
      updateNodeData(id, { ...data, autoFocus: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  // Applied to plain text mode
  const textStyle = {
    fontFamily: "'Grift', system-ui, sans-serif",
    fontWeight: fmt.weight || 400,
    fontStyle: fmt.italic ? 'italic' : 'normal',
    fontSize: `${fmt.size || 14}px`,
    textAlign: fmt.align || 'center',
    color: fmt.color || 'var(--text-primary)',
  };

  // Applied to list items — same formatting but alignment defaults left
  const listTextStyle = {
    fontFamily: "'Grift', system-ui, sans-serif",
    fontWeight: fmt.weight || 400,
    fontStyle: fmt.italic ? 'italic' : 'normal',
    fontSize: `${fmt.size || 13}px`,
    textAlign: fmt.align || 'left',
    color: fmt.color || 'var(--text-primary)',
  };

  // ── Operaciones de lista ───────────────────────────────
  const titulo         = data.titulo   || '';
  const items          = data.items    || [];
  const listaExpandida = data.listaExpandida ?? true;
  const listType       = data.listType ?? 'bullet';

  const upd = (changes) => updateNodeData(id, { ...data, ...changes });

  const toggleLista = (e) => {
    e.stopPropagation();
    upd({ listaExpandida: !listaExpandida });
  };

  const saveItemTitulo = (itemId, val) =>
    upd({ items: items.map(it => it.id === itemId ? { ...it, titulo: val } : it) });

  const removeItem = (e, itemId) => {
    e.stopPropagation();
    upd({ items: items.filter(it => it.id !== itemId) });
  };

  const addItem = (e) => {
    e.stopPropagation();
    upd({ items: [...items, { id: `it-${Date.now()}`, titulo: '' }] });
    setNodes(nds => nds.map(n =>
      n.id === id ? { ...n, style: { ...n.style, height: undefined } } : n
    ));
  };

  return (
    <div
      className={`t-node t-text ${boxed ? 't-text-boxed' : 't-text-plain'} ${selected ? 't-selected' : ''}`}
      onDoubleClick={(e) => { if (!listMode) { e.stopPropagation(); setEditing(true); } }}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={80}
        minHeight={32}
        lineStyle={{ border: '1px solid rgba(255,255,255,0.1)' }}
        handleStyle={{ width: '7px', height: '7px', background: 'rgba(255,255,255,0.25)', border: 'none', borderRadius: '2px' }}
      />

      <Handle id="top"    type="source" position={Position.Top}    className="t-handle" />
      <Handle id="left"   type="source" position={Position.Left}   className="t-handle" />

      {selected && !editing && (
        <TextFormatBar
          id={id}
          data={data}
          deleteElements={deleteElements}
          updateNodeData={updateNodeData}
          setNodes={setNodes}
          activeItemId={activeItemId}
          onDuplicate={handleDuplicate}
        />
      )}

      {listMode ? (
        <div className="t-lista-content">
          {/* Título con toggle de la lista completa */}
          <div className="t-lista-header">
            <button
              className="t-toggle-btn nodrag"
              onClick={toggleLista}
              title={listaExpandida ? 'Contraer lista' : 'Expandir lista'}
            >
              {listaExpandida ? '−' : '+'}
            </button>
            <EditableInline
              value={titulo}
              placeholder="Título de la lista"
              className="t-lista-titulo"
              style={listTextStyle}
              onSave={(val) => upd({ titulo: val })}
              onFocus={() => setActiveItemId(null)}
            />
          </div>

          {/* Ítems planos — solo visibles cuando la lista está expandida */}
          {listaExpandida && (
            <div className="t-lista-body">
              {items.map((item, index) => {
                const ifmt = item.fmt || {};
                const itemStyle = {
                  fontWeight: ifmt.weight   ?? (fmt.weight || 400),
                  fontStyle:  ifmt.italic   !== undefined ? (ifmt.italic ? 'italic' : 'normal') : (fmt.italic ? 'italic' : 'normal'),
                  fontSize:   `${ifmt.size  ?? (fmt.size || 13)}px`,
                  textAlign:  ifmt.align    || fmt.align || 'left',
                  color:      ifmt.color    || fmt.color || 'var(--text-primary)',
                };
                return (
                  <div key={item.id} className={`t-lista-item-row ${activeItemId === item.id ? 't-item-active' : ''}`}>
                    <span className="t-lista-marker">
                      {listType === 'number' ? `${index + 1}.` : '•'}
                    </span>
                    <EditableInline
                      value={item.titulo}
                      placeholder="Ítem..."
                      className="t-lista-item-titulo"
                      style={itemStyle}
                      onSave={(val) => saveItemTitulo(item.id, val)}
                      onFocus={() => setActiveItemId(item.id)}
                    />
                    {selected && (
                      <button className="t-lista-x nodrag" onClick={(e) => removeItem(e, item.id)} title="Eliminar ítem">×</button>
                    )}
                  </div>
                );
              })}

              {selected && (
                <button className="t-lista-add-item nodrag" onClick={addItem}>
                  + Agregar ítem
                </button>
              )}
            </div>
          )}
        </div>
      ) : editing ? (
        <textarea
          ref={ref}
          className="t-node-input"
          style={textStyle}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => { setEditing(false); updateNodeData(id, { ...data, label: text }); }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setEditing(false); updateNodeData(id, { ...data, label: text }); }
          }}
        />
      ) : (
        <div className="t-node-label" style={textStyle}>
          {text || <span className="t-placeholder">Doble clic para editar</span>}
        </div>
      )}

      <Handle id="bottom" type="source" position={Position.Bottom} className="t-handle" />
      <Handle id="right"  type="source" position={Position.Right}  className="t-handle" />
    </div>
  );
};

// ── Paleta de colores para formas ────────────────────────
const SHAPE_COLORS = [
  { hex: '#f07f12', label: 'Naranja' },
  { hex: '#a292c5', label: 'Lila'    },
  { hex: '#fdc815', label: 'Amarillo'},
  { hex: '#4a9eda', label: 'Azul'    },
  { hex: '#5cc86e', label: 'Verde'   },
  { hex: '#e05555', label: 'Rojo'    },
  { hex: '#ffffff', label: 'Blanco'  },
];

// ── Nodo de Forma (área) ──────────────────────────────────
const ShapeNode = ({ id, data, selected, positionAbsoluteX, positionAbsoluteY }) => {
  const { updateNodeData, deleteElements, setNodes } = useReactFlow();
  const color = data.color || '#a292c5';

  const handleDuplicate = useCallback(() => {
    setNodes(nds => [
      ...nds.map(n => ({ ...n, selected: false })),
      {
        id: `shape-${Date.now()}`,
        type: 'formaNode',
        position: { x: positionAbsoluteX + 24, y: positionAbsoluteY + 24 },
        style: { width: 220, height: 140 },
        zIndex: 0,
        selected: true,
        data: { ...data },
      },
    ]);
  }, [positionAbsoluteX, positionAbsoluteY, data, setNodes]);

  return (
    <div
      className={`t-shape-area t-shape-area-${data.shape} ${selected ? 't-shape-selected' : ''}`}
      style={{
        borderColor: color,
        background: `${color}18`,
        width: '100%',
        height: '100%',
      }}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={80}
        minHeight={80}
        lineStyle={{ borderColor: color }}
        handleStyle={{ background: color, border: `2px solid ${color}`, borderRadius: '3px', width: '10px', height: '10px' }}
      />

      <Handle id="top"    type="source" position={Position.Top}    className="t-handle t-handle-shape" />
      <Handle id="left"   type="source" position={Position.Left}   className="t-handle t-handle-shape" />
      <Handle id="bottom" type="source" position={Position.Bottom} className="t-handle t-handle-shape" />
      <Handle id="right"  type="source" position={Position.Right}  className="t-handle t-handle-shape" />

      {selected && (
        <div className="t-shape-actions" onMouseDown={(e) => e.stopPropagation()}>
          <button className="t-node-btn t-node-btn-dup"
            onClick={(e) => { e.stopPropagation(); handleDuplicate(); }}
            title="Duplicar">
            <IconDuplicate />
          </button>
          <button className="t-node-btn t-node-btn-delete"
            onClick={(e) => { e.stopPropagation(); deleteElements({ nodes: [{ id }] }); }}
            title="Eliminar">
            <IconTrash />
          </button>
          <span className="t-sep-v" />
          {SHAPE_COLORS.map(c => (
            <button
              key={c.hex}
              className={`t-color-swatch ${color === c.hex ? 'active' : ''}`}
              style={{ background: c.hex }}
              title={c.label}
              onClick={(e) => { e.stopPropagation(); updateNodeData(id, { ...data, color: c.hex }); }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const nodeTypes = { textoNode: TextNode, formaNode: ShapeNode };

// ── Tablero interno ───────────────────────────────────────
const TableroInner = ({ entityId, entityType, titulo, onClose }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [bgVariant, setBgVariant] = useState('dots');
  const readyToSave = useRef(false);
  const saveTimer = useRef(null);
  const { screenToFlowPosition, deleteElements } = useReactFlow();

  useEffect(() => {
    if (!auth.currentUser || !entityId) return;
    const uid = auth.currentUser.uid;
    getDoc(doc(db, 'usuarios', uid, entityType, entityId)).then((snap) => {
      if (snap.exists() && snap.data()?.tablero) {
        const { nodes: n = [], edges: e = [] } = snap.data().tablero;
        setNodes(n);
        setEdges(e);
      }
      setTimeout(() => { readyToSave.current = true; }, 400);
    });
  }, [entityId, entityType, setNodes, setEdges]);

  useEffect(() => {
    if (!readyToSave.current) return;
    clearTimeout(saveTimer.current);
    setSaveStatus('idle');
    saveTimer.current = setTimeout(async () => {
      if (!auth.currentUser || !readyToSave.current) return;
      setSaveStatus('saving');
      try {
        await updateDoc(
          doc(db, 'usuarios', auth.currentUser.uid, entityType, entityId),
          { tablero: { nodes, edges } }
        );
        setSaveStatus('saved');
      } catch { setSaveStatus('idle'); }
    }, 1500);
    return () => clearTimeout(saveTimer.current);
  }, [nodes, edges, entityId, entityType]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: false }, eds)),
    [setEdges]
  );

  const addTextNode = useCallback((position) => {
    const pos = position || { x: 80 + Math.random() * 300, y: 80 + Math.random() * 200 };
    setNodes((nds) => [
      ...nds.map(n => ({ ...n, selected: false })),
      { id: `text-${Date.now()}`, type: 'textoNode', position: pos, zIndex: 1, selected: true, data: { label: '', fmt: {}, autoFocus: true } },
    ]);
  }, [setNodes]);

  const addShapeNode = useCallback((shape) => {
    setNodes((nds) => [
      ...nds,
      {
        id: `shape-${Date.now()}`,
        type: 'formaNode',
        position: { x: 60 + Math.random() * 200, y: 60 + Math.random() * 150 },
        style: { width: 220, height: 140 },
        zIndex: 0,
        data: { shape, color: shape === 'circle' ? '#a292c5' : '#f07f12' },
      },
    ]);
  }, [setNodes]);

  const onEdgeDoubleClick = useCallback((e, edge) => {
    e.stopPropagation();
    deleteElements({ edges: [{ id: edge.id }] });
  }, [deleteElements]);

  const handleCanvasDoubleClick = useCallback((e) => {
    if (
      e.target.closest('.react-flow__node') ||
      e.target.closest('.react-flow__edge') ||
      e.target.closest('.react-flow__handle') ||
      e.target.closest('.react-flow__controls') ||
      e.target.closest('.react-flow__minimap')
    ) return;
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    addTextNode(position);
  }, [screenToFlowPosition, addTextNode]);

  const clearAll = useCallback(() => {
    if (window.confirm('¿Limpiar todo el tablero? Esta acción no se puede deshacer.')) {
      setNodes([]);
      setEdges([]);
    }
  }, [setNodes, setEdges]);

  return (
    <div className="tablero-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="tablero-modal">

        <div className="tablero-header">
          <div className="tablero-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
            </svg>
            <span>Tablero — {titulo}</span>
          </div>
          <div className="tablero-header-right">
            {saveStatus === 'saving' && <span className="t-status saving">Guardando...</span>}
            {saveStatus === 'saved'  && <span className="t-status saved">Guardado ✓</span>}
            <button className="tablero-close" onClick={onClose} title="Cerrar tablero">✕</button>
          </div>
        </div>

        <div className="tablero-toolbar">
          <button className="t-btn" onClick={() => addTextNode()}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 6H3m14 6H3m14 6H3M21 6l-4 4 4 4"/></svg>
            Texto
          </button>
          <button className="t-btn" onClick={() => addShapeNode('rect')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
            Área rect.
          </button>
          <button className="t-btn" onClick={() => addShapeNode('circle')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/></svg>
            Área oval
          </button>
          <div className="t-sep" />
          <div className="t-bg-toggle" title="Cambiar fondo">
            <button className={`t-bg-btn ${bgVariant === 'dots'  ? 'active' : ''}`} onClick={() => setBgVariant('dots')}  title="Puntos">
              <svg width="13" height="13" viewBox="0 0 12 12" fill="currentColor">
                <circle cx="2" cy="2" r="1.2"/><circle cx="6" cy="2" r="1.2"/><circle cx="10" cy="2" r="1.2"/>
                <circle cx="2" cy="6" r="1.2"/><circle cx="6" cy="6" r="1.2"/><circle cx="10" cy="6" r="1.2"/>
                <circle cx="2" cy="10" r="1.2"/><circle cx="6" cy="10" r="1.2"/><circle cx="10" cy="10" r="1.2"/>
              </svg>
            </button>
            <button className={`t-bg-btn ${bgVariant === 'lines' ? 'active' : ''}`} onClick={() => setBgVariant('lines')} title="Cuadrícula">
              <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1">
                <line x1="0" y1="4" x2="12" y2="4"/><line x1="0" y1="8" x2="12" y2="8"/>
                <line x1="4" y1="0" x2="4" y2="12"/><line x1="8" y1="0" x2="8" y2="12"/>
              </svg>
            </button>
            <button className={`t-bg-btn ${bgVariant === 'none'  ? 'active' : ''}`} onClick={() => setBgVariant('none')}  title="Sin fondo">
              <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2">
                <line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/>
              </svg>
            </button>
          </div>
          <div className="t-sep" />
          <button className="t-btn t-btn-danger" onClick={clearAll}>Limpiar todo</button>
          <span className="t-hint">Doble clic en canvas → texto · Doble clic en línea → eliminar conexión · Delete → eliminar nodo</span>
        </div>

        <div className="tablero-canvas" onDoubleClick={handleCanvasDoubleClick}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onEdgeDoubleClick={onEdgeDoubleClick}
            fitView
            colorMode="dark"
            connectionMode="loose"
            defaultEdgeOptions={{ type: 'smoothstep' }}
          >
            {bgVariant === 'dots' && (
              <Background variant={BackgroundVariant.Dots}  color="rgba(162,146,197,0.35)" gap={24} size={1.5} />
            )}
            {bgVariant === 'lines' && (
              <Background variant={BackgroundVariant.Lines} color="rgba(255,255,255,0.06)" gap={30} lineWidth={1} />
            )}
            <Controls />
          </ReactFlow>
        </div>

      </div>
    </div>
  );
};

const Tablero = (props) => (
  <ReactFlowProvider>
    <TableroInner {...props} />
  </ReactFlowProvider>
);

export default Tablero;
