import { useState, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
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
import { doc, updateDoc, setDoc, getDoc } from 'firebase/firestore';
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

const IconUndo = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7v6h6"/><path d="M3 13C5 8 9 5 14 5a9 9 0 0 1 0 18c-4 0-7.4-2-9-5"/>
  </svg>
);

const IconRedo = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 7v6h-6"/><path d="M21 13C19 8 15 5 10 5a9 9 0 0 0 0 18c4 0 7.4-2 9-5"/>
  </svg>
);

const IconFitView = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
  </svg>
);

const IconExport = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

// ── Texto editable en línea ───────────────────────────────
const EditableInline = ({ value, placeholder, className, style, onSave, onFocus, onEnter }) => {
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
          if (e.key === 'Enter') {
            e.preventDefault();
            setEditing(false);
            onSave(text);
            onEnter?.();
          }
          if (e.key === 'Escape') { setEditing(false); onSave(text); }
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

// ── Constantes de formato ─────────────────────────────────
const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48];
const FONT_WEIGHTS = [
  { value: 100, label: 'Thin'       },
  { value: 200, label: 'ExtraLight' },
  { value: 300, label: 'Light'      },
  { value: 400, label: 'Regular'    },
  { value: 500, label: 'Medium'     },
  { value: 600, label: 'SemiBold'   },
  { value: 700, label: 'Bold'       },
  { value: 800, label: 'ExtraBold'  },
  { value: 900, label: 'Black'      },
];

const SHAPE_COLORS = [
  { hex: '#f07f12', label: 'Naranja' },
  { hex: '#a292c5', label: 'Lila'    },
  { hex: '#fdc815', label: 'Amarillo'},
  { hex: '#4a9eda', label: 'Azul'    },
  { hex: '#5cc86e', label: 'Verde'   },
  { hex: '#e05555', label: 'Rojo'    },
  { hex: '#ffffff', label: 'Blanco'  },
];

const STICKY_COLORS = [
  { hex: '#fef08a', label: 'Amarillo' },
  { hex: '#bbf7d0', label: 'Verde'    },
  { hex: '#bfdbfe', label: 'Azul'     },
  { hex: '#fecdd3', label: 'Rosa'     },
  { hex: '#e9d5ff', label: 'Lila'     },
  { hex: '#fed7aa', label: 'Naranja'  },
  { hex: '#f1f5f9', label: 'Blanco'   },
];

// ── Barra de formato (TextNode) ───────────────────────────
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
      <button className="t-node-btn t-node-btn-dup" onClick={(e) => { e.stopPropagation(); onDuplicate(); }} title="Duplicar (Ctrl+D)">
        <IconDuplicate />
      </button>
      <button className="t-node-btn t-node-btn-delete" onClick={(e) => { e.stopPropagation(); deleteElements({ nodes: [{ id }] }); }} title="Eliminar">
        <IconTrash />
      </button>
      <span className="t-sep-v" />

      <select className="t-weight-select" value={fmt.weight || 400}
        onChange={(e) => { e.stopPropagation(); upd({ weight: Number(e.target.value) }); }}>
        {FONT_WEIGHTS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
      </select>

      <button className={`t-node-btn t-fmt-btn ${fmt.italic ? 'active' : ''}`}
        onClick={(e) => { e.stopPropagation(); upd({ italic: !fmt.italic }); }}
        title="Cursiva">
        <em style={{ fontFamily: 'serif', fontSize: '12px' }}>I</em>
      </button>

      <select className="t-size-select" value={fmt.size || 14}
        onChange={(e) => { e.stopPropagation(); upd({ size: Number(e.target.value) }); }}>
        {FONT_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      <span className="t-sep-v" />

      <button className={`t-node-btn t-fmt-btn ${fmt.align === 'left' ? 'active' : ''}`}
        onClick={(e) => { e.stopPropagation(); upd({ align: 'left' }); }} title="Izquierda">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/></svg>
      </button>
      <button className={`t-node-btn t-fmt-btn ${!fmt.align || fmt.align === 'center' ? 'active' : ''}`}
        onClick={(e) => { e.stopPropagation(); upd({ align: 'center' }); }} title="Centro">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
      </button>
      <button className={`t-node-btn t-fmt-btn ${fmt.align === 'right' ? 'active' : ''}`}
        onClick={(e) => { e.stopPropagation(); upd({ align: 'right' }); }} title="Derecha">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/></svg>
      </button>

      <span className="t-sep-v" />

      {/* Color del texto */}
      <label className="t-color-pick" title="Color del texto">
        <span className="t-color-dot" style={{ background: fmt.color || '#ffffff' }} />
        <input type="color" value={fmt.color || '#ffffff'} onChange={(e) => upd({ color: e.target.value })} />
      </label>

      {/* Color de fondo (solo en modo recuadro) */}
      {boxed && (
        <label className="t-color-pick" title="Color de fondo">
          <span className="t-color-dot t-color-dot-bg" style={{ background: data.bgColor || '#2a2e32' }} />
          <input type="color" value={data.bgColor || '#2a2e32'}
            onChange={(e) => { e.stopPropagation(); updateNodeData(id, { ...data, bgColor: e.target.value }); }} />
        </label>
      )}

      <span className="t-sep-v" />

      <button className={`t-node-btn t-fmt-btn ${boxed ? 'active' : ''}`}
        onClick={(e) => { e.stopPropagation(); updateNodeData(id, { ...data, boxed: !boxed }); }}
        title={boxed ? 'Quitar recuadro' : 'Agregar recuadro'}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
      </button>

      <button className={`t-node-btn t-fmt-btn ${listMode ? 'active' : ''}`}
        onClick={toggleList} title={listMode ? 'Modo texto' : 'Modo lista'}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/>
          <circle cx="4" cy="6" r="1.5" fill="currentColor"/><circle cx="4" cy="12" r="1.5" fill="currentColor"/><circle cx="4" cy="18" r="1.5" fill="currentColor"/>
        </svg>
      </button>

      {listMode && (
        <>
          <span className="t-sep-v" />
          <button className={`t-node-btn t-fmt-btn t-list-type-btn ${(data.listType ?? 'bullet') === 'bullet' ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); updateNodeData(id, { ...data, listType: 'bullet' }); }} title="Viñetas">•</button>
          <button className={`t-node-btn t-fmt-btn t-list-type-btn ${data.listType === 'number' ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); updateNodeData(id, { ...data, listType: 'number' }); }} title="Numeración">1.</button>
          <button className={`t-node-btn t-fmt-btn t-list-type-btn ${data.listType === 'check' ? 'active' : ''}`}
            onClick={(e) => { e.stopPropagation(); updateNodeData(id, { ...data, listType: 'check' }); }} title="Casillas">☑</button>
        </>
      )}
    </div>
  );
};

// ── Nodo de Texto ─────────────────────────────────────────
const TextNode = ({ id, data, selected, positionAbsoluteX, positionAbsoluteY }) => {
  const { updateNodeData, deleteElements, setNodes, getNode } = useReactFlow();
  const [editing, setEditing] = useState(data.autoFocus ?? false);
  const [text, setText] = useState(data.label);
  const [activeItemId, setActiveItemId] = useState(null);
  const [draggedItemId, setDraggedItemId] = useState(null);
  const ref = useRef(null);
  const fmt = data.fmt || {};
  const boxed = data.boxed ?? false;
  const listMode = data.listMode ?? false;

  const handleDuplicate = useCallback(() => {
    const src = getNode(id);
    setNodes(nds => [
      ...nds.map(n => ({ ...n, selected: false })),
      {
        id: `text-${Date.now()}`,
        type: 'textoNode',
        position: { x: positionAbsoluteX + 24, y: positionAbsoluteY + 24 },
        zIndex: 1,
        selected: true,
        data: { ...data, autoFocus: false },
        ...(src?.style  && { style:  { ...src.style  } }),
        ...(src?.width  !== undefined && { width:  src.width  }),
        ...(src?.height !== undefined && { height: src.height }),
      },
    ]);
  }, [id, positionAbsoluteX, positionAbsoluteY, data, setNodes, getNode]);

  useEffect(() => {
    if (data.autoFocus) updateNodeData(id, { ...data, autoFocus: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  const textStyle = {
    fontFamily: "'Grift', system-ui, sans-serif",
    fontWeight: fmt.weight || 400,
    fontStyle: fmt.italic ? 'italic' : 'normal',
    fontSize: `${fmt.size || 14}px`,
    textAlign: fmt.align || 'center',
    color: fmt.color || 'var(--text-primary)',
  };

  const listTextStyle = {
    fontFamily: "'Grift', system-ui, sans-serif",
    fontWeight: fmt.weight || 400,
    fontStyle: fmt.italic ? 'italic' : 'normal',
    fontSize: `${fmt.size || 13}px`,
    textAlign: fmt.align || 'left',
    color: fmt.color || 'var(--text-primary)',
  };

  const titulo         = data.titulo   || '';
  const items          = data.items    || [];
  const listaExpandida = data.listaExpandida ?? true;
  const listType       = data.listType ?? 'bullet';

  const upd = (changes) => updateNodeData(id, { ...data, ...changes });

  const toggleLista = (e) => { e.stopPropagation(); upd({ listaExpandida: !listaExpandida }); };

  const saveItemTitulo = (itemId, val) =>
    upd({ items: items.map(it => it.id === itemId ? { ...it, titulo: val } : it) });

  const toggleItemCheck = (itemId) =>
    upd({ items: items.map(it => it.id === itemId ? { ...it, checked: !it.checked } : it) });

  const removeItem = (e, itemId) => { e.stopPropagation(); upd({ items: items.filter(it => it.id !== itemId) }); };

  const addItem = (e) => {
    if (e) e.stopPropagation();
    upd({ items: [...items, { id: `it-${Date.now()}`, titulo: '' }] });
    setNodes(nds => nds.map(n =>
      n.id === id ? { ...n, style: { ...n.style, height: undefined } } : n
    ));
  };

  // Drag-to-reorder
  const onItemDrop = (e, targetId) => {
    e.preventDefault();
    if (!draggedItemId || draggedItemId === targetId) return;
    const from = items.findIndex(it => it.id === draggedItemId);
    const to   = items.findIndex(it => it.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    upd({ items: next });
    setDraggedItemId(null);
  };

  const boxedBg = boxed && data.bgColor ? { background: data.bgColor } : {};

  return (
    <div
      className={`t-node t-text ${boxed ? 't-text-boxed' : 't-text-plain'} ${selected ? 't-selected' : ''}`}
      style={boxedBg}
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

      <div className="t-node-body">
        {listMode ? (
          <div className="t-lista-content">
            <div className="t-lista-header">
              <button className="t-toggle-btn nodrag" onClick={toggleLista}
                title={listaExpandida ? 'Contraer' : 'Expandir'}>
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
                    textDecoration: listType === 'check' && item.checked ? 'line-through' : 'none',
                    opacity: listType === 'check' && item.checked ? 0.5 : 1,
                  };
                  return (
                    <div
                      key={item.id}
                      className={`t-lista-item-row ${activeItemId === item.id ? 't-item-active' : ''} ${draggedItemId === item.id ? 't-item-dragging' : ''}`}
                      draggable
                      onDragStart={() => setDraggedItemId(item.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => onItemDrop(e, item.id)}
                      onDragEnd={() => setDraggedItemId(null)}
                    >
                      <span className="t-drag-handle nodrag" title="Arrastrar para reordenar">⠿</span>

                      {listType === 'check' ? (
                        <input
                          type="checkbox"
                          className="t-lista-check nodrag"
                          checked={item.checked || false}
                          onChange={() => toggleItemCheck(item.id)}
                        />
                      ) : (
                        <span className="t-lista-marker">
                          {listType === 'number' ? `${index + 1}.` : '•'}
                        </span>
                      )}

                      <EditableInline
                        value={item.titulo}
                        placeholder="Ítem..."
                        className="t-lista-item-titulo"
                        style={itemStyle}
                        onSave={(val) => saveItemTitulo(item.id, val)}
                        onFocus={() => setActiveItemId(item.id)}
                        onEnter={() => addItem(null)}
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
      </div>

      <Handle id="bottom" type="source" position={Position.Bottom} className="t-handle" />
      <Handle id="right"  type="source" position={Position.Right}  className="t-handle" />
    </div>
  );
};

// ── Nodo Sticky (nota adhesiva) ───────────────────────────
const StickyNode = ({ id, data, selected, positionAbsoluteX, positionAbsoluteY }) => {
  const { updateNodeData, deleteElements, setNodes, getNode } = useReactFlow();
  const [editing, setEditing] = useState(data.autoFocus ?? false);
  const [text, setText] = useState(data.label || '');
  const ref = useRef(null);
  const color = data.color || '#fef08a';

  const handleDuplicate = useCallback(() => {
    const src = getNode(id);
    setNodes(nds => [
      ...nds.map(n => ({ ...n, selected: false })),
      {
        id: `sticky-${Date.now()}`,
        type: 'stickyNode',
        position: { x: positionAbsoluteX + 24, y: positionAbsoluteY + 24 },
        style: src?.style ? { ...src.style } : { width: 200, height: 160 },
        zIndex: 1,
        selected: true,
        data: { ...data, autoFocus: false },
      },
    ]);
  }, [id, positionAbsoluteX, positionAbsoluteY, data, setNodes, getNode]);

  useEffect(() => {
    if (data.autoFocus) { updateNodeData(id, { ...data, autoFocus: false }); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);

  return (
    <div
      className={`t-sticky ${selected ? 't-sticky-selected' : ''}`}
      style={{ '--sticky-bg': color }}
      onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
    >
      <NodeResizer isVisible={selected} minWidth={120} minHeight={80}
        lineStyle={{ borderColor: 'rgba(0,0,0,0.2)' }}
        handleStyle={{ background: 'rgba(0,0,0,0.25)', border: 'none', borderRadius: '2px', width: '7px', height: '7px' }}
      />

      <Handle id="top"    type="source" position={Position.Top}    className="t-handle t-handle-sticky" />
      <Handle id="left"   type="source" position={Position.Left}   className="t-handle t-handle-sticky" />
      <Handle id="bottom" type="source" position={Position.Bottom} className="t-handle t-handle-sticky" />
      <Handle id="right"  type="source" position={Position.Right}  className="t-handle t-handle-sticky" />

      {selected && (
        <div className="t-sticky-actions" onMouseDown={(e) => e.stopPropagation()}>
          <button className="t-node-btn t-node-btn-dup" onClick={(e) => { e.stopPropagation(); handleDuplicate(); }} title="Duplicar">
            <IconDuplicate />
          </button>
          <button className="t-node-btn t-node-btn-delete" onClick={(e) => { e.stopPropagation(); deleteElements({ nodes: [{ id }] }); }} title="Eliminar">
            <IconTrash />
          </button>
          <span className="t-sep-v" />
          {STICKY_COLORS.map(c => (
            <button key={c.hex} className={`t-color-swatch ${color === c.hex ? 'active' : ''}`}
              style={{ background: c.hex, border: '2px solid transparent' }}
              title={c.label}
              onClick={(e) => { e.stopPropagation(); updateNodeData(id, { ...data, color: c.hex }); }}
            />
          ))}
        </div>
      )}

      <div className="t-sticky-corner" />

      {editing ? (
        <textarea
          ref={ref}
          className="t-sticky-input nodrag"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => { setEditing(false); updateNodeData(id, { ...data, label: text }); }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') { setEditing(false); updateNodeData(id, { ...data, label: text }); }
            e.stopPropagation();
          }}
          placeholder="Escribe aquí..."
        />
      ) : (
        <div className="t-sticky-text">
          {text || <span className="t-sticky-placeholder">Doble clic para editar</span>}
        </div>
      )}
    </div>
  );
};

// ── Nodo de Forma (con texto interno) ────────────────────
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
      style={{ borderColor: color, background: `${color}18`, width: '100%', height: '100%' }}
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
          <button className="t-node-btn t-node-btn-dup" onClick={(e) => { e.stopPropagation(); handleDuplicate(); }} title="Duplicar"><IconDuplicate /></button>
          <button className="t-node-btn t-node-btn-delete" onClick={(e) => { e.stopPropagation(); deleteElements({ nodes: [{ id }] }); }} title="Eliminar"><IconTrash /></button>
          <span className="t-sep-v" />
          {SHAPE_COLORS.map(c => (
            <button key={c.hex} className={`t-color-swatch ${color === c.hex ? 'active' : ''}`}
              style={{ background: c.hex }} title={c.label}
              onClick={(e) => { e.stopPropagation(); updateNodeData(id, { ...data, color: c.hex }); }}
            />
          ))}
        </div>
      )}

      {/* Texto editable dentro de la forma */}
      <div className="t-shape-label-wrap">
        <EditableInline
          value={data.label || ''}
          placeholder=""
          className="t-shape-label"
          style={{ color: data.textColor || color, fontSize: `${data.fontSize || 13}px`, fontWeight: 600 }}
          onSave={(val) => updateNodeData(id, { ...data, label: val })}
        />
      </div>
    </div>
  );
};

// ── Nodo de Imagen ────────────────────────────────────────
const ImageNode = ({ id, data, selected }) => {
  const { updateNodeData, deleteElements } = useReactFlow();
  const [editingUrl, setEditingUrl] = useState(!data.url);
  const [url, setUrl] = useState(data.url || '');
  const inputRef = useRef(null);

  useEffect(() => { if (editingUrl) inputRef.current?.focus(); }, [editingUrl]);

  const commit = () => {
    updateNodeData(id, { ...data, url });
    setEditingUrl(false);
  };

  return (
    <div className={`t-image-node ${selected ? 't-selected' : ''}`}>
      <NodeResizer isVisible={selected} minWidth={80} minHeight={60}
        lineStyle={{ border: '1px solid rgba(255,255,255,0.15)' }}
        handleStyle={{ width: '7px', height: '7px', background: 'rgba(255,255,255,0.3)', border: 'none', borderRadius: '2px' }}
      />

      <Handle id="top"    type="source" position={Position.Top}    className="t-handle" />
      <Handle id="left"   type="source" position={Position.Left}   className="t-handle" />
      <Handle id="bottom" type="source" position={Position.Bottom} className="t-handle" />
      <Handle id="right"  type="source" position={Position.Right}  className="t-handle" />

      {selected && (
        <div className="t-image-actions" onMouseDown={(e) => e.stopPropagation()}>
          <button className="t-node-btn" onClick={(e) => { e.stopPropagation(); setEditingUrl(true); }} title="Cambiar URL">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            URL
          </button>
          <button className="t-node-btn t-node-btn-delete" onClick={(e) => { e.stopPropagation(); deleteElements({ nodes: [{ id }] }); }} title="Eliminar">
            <IconTrash />
          </button>
        </div>
      )}

      {editingUrl ? (
        <div className="t-image-url-form nodrag">
          <input
            ref={inputRef}
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') { setUrl(data.url || ''); setEditingUrl(false); }
              e.stopPropagation();
            }}
          />
          <button onClick={commit}>OK</button>
        </div>
      ) : data.url ? (
        <img
          src={data.url}
          alt=""
          className="t-image-content"
          onDoubleClick={(e) => { e.stopPropagation(); setEditingUrl(true); }}
          draggable={false}
        />
      ) : (
        <div className="t-image-empty" onDoubleClick={(e) => { e.stopPropagation(); setEditingUrl(true); }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          <span>Doble clic para agregar URL</span>
        </div>
      )}
    </div>
  );
};

const nodeTypes = {
  textoNode:  TextNode,
  formaNode:  ShapeNode,
  stickyNode: StickyNode,
  imageNode:  ImageNode,
};

// ── Serialización para Firestore ──────────────────────────
const serializeNode = ({ id, type, position, data, style, zIndex, width, height }) => ({
  id, type, position, data,
  ...(style  !== undefined && { style  }),
  ...(zIndex !== undefined && { zIndex }),
  ...(width  !== undefined && { width  }),
  ...(height !== undefined && { height }),
});
const serializeEdge = ({ id, source, target, sourceHandle, targetHandle, type, animated, label, style }) => ({
  id, source, target,
  ...(sourceHandle !== undefined && { sourceHandle }),
  ...(targetHandle !== undefined && { targetHandle }),
  ...(type         !== undefined && { type }),
  ...(animated     !== undefined && { animated }),
  ...(label        !== undefined && { label }),
  ...(style        !== undefined && { style }),
});

// ── Tablero interno ───────────────────────────────────────
const TableroInner = ({ entityId, entityType, titulo, onClose }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
  const [loading, setLoading] = useState(true);
  const [bgVariant, setBgVariant] = useState('dots');
  const [edgeType, setEdgeType] = useState('smoothstep');
  const [editingEdge, setEditingEdge] = useState(null); // { id, label, x, y }
  const [historyLen, setHistoryLen] = useState(0);  // trigger re-render for undo/redo buttons
  const [historyIdx, setHistoryIdx] = useState(-1);

  const history    = useRef([]);
  const histIdxRef = useRef(-1);
  const readyToSave = useRef(false);
  const saveTimer   = useRef(null);
  const mountedRef  = useRef(true);
  const nodesRef    = useRef([]);
  const edgesRef    = useRef([]);

  const { screenToFlowPosition, deleteElements, fitView } = useReactFlow();
  const localKey = `tablero_draft_${entityType}_${entityId}`;

  // Keep refs in sync for use in callbacks
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { edgesRef.current = edges; }, [edges]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── Historial ──────────────────────────────────────────
  const checkpoint = useCallback((ns, es) => {
    const snap = { nodes: ns.map(serializeNode), edges: es.map(serializeEdge) };
    const slice = history.current.slice(0, histIdxRef.current + 1);
    slice.push(snap);
    if (slice.length > 60) slice.shift();
    history.current = slice;
    histIdxRef.current = slice.length - 1;
    setHistoryLen(slice.length);
    setHistoryIdx(histIdxRef.current);
  }, []);

  const undo = useCallback(() => {
    if (histIdxRef.current <= 0) return;
    histIdxRef.current--;
    const { nodes: n, edges: e } = history.current[histIdxRef.current];
    setNodes(n);
    setEdges(e);
    setHistoryIdx(histIdxRef.current);
  }, [setNodes, setEdges]);

  const redo = useCallback(() => {
    if (histIdxRef.current >= history.current.length - 1) return;
    histIdxRef.current++;
    const { nodes: n, edges: e } = history.current[histIdxRef.current];
    setNodes(n);
    setEdges(e);
    setHistoryIdx(histIdxRef.current);
  }, [setNodes, setEdges]);

  // ── Carga ──────────────────────────────────────────────
  useEffect(() => {
    if (!auth.currentUser || !entityId) return;
    const uid = auth.currentUser.uid;

    getDoc(doc(db, 'usuarios', uid, entityType, entityId)).then((snap) => {
      const localRaw = localStorage.getItem(localKey);
      let loadedNodes = [];
      let loadedEdges = [];

      if (localRaw) {
        try {
          const { nodes: n = [], edges: e = [] } = JSON.parse(localRaw);
          loadedNodes = n; loadedEdges = e;
          setNodes(n); setEdges(e);
          setDoc(doc(db, 'usuarios', uid, entityType, entityId), {
            tablero: JSON.parse(JSON.stringify({ nodes: n, edges: e })),
          }, { merge: true }).then(() => localStorage.removeItem(localKey)).catch(() => {});
        } catch {
          localStorage.removeItem(localKey);
          if (snap.exists() && snap.data()?.tablero) {
            const { nodes: n = [], edges: e = [] } = snap.data().tablero;
            loadedNodes = n; loadedEdges = e;
            setNodes(n); setEdges(e);
          }
        }
      } else if (snap.exists() && snap.data()?.tablero) {
        const { nodes: n = [], edges: e = [] } = snap.data().tablero;
        loadedNodes = n; loadedEdges = e;
        setNodes(n); setEdges(e);
      }

      if (mountedRef.current) setLoading(false);
      setTimeout(() => {
        // Checkpoint inicial
        history.current = [{ nodes: loadedNodes.map(serializeNode), edges: loadedEdges.map(serializeEdge) }];
        histIdxRef.current = 0;
        setHistoryLen(1);
        setHistoryIdx(0);
        readyToSave.current = true;
      }, 400);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityId, entityType]);

  // ── Guardado ───────────────────────────────────────────
  const doSave = useCallback(async (ns, es) => {
    if (!auth.currentUser || !entityId) return;
    try {
      // JSON round-trip elimina valores undefined que Firestore no acepta
      const tablero = JSON.parse(JSON.stringify({
        nodes: ns.map(serializeNode),
        edges: es.map(serializeEdge),
      }));
      await setDoc(
        doc(db, 'usuarios', auth.currentUser.uid, entityType, entityId),
        { tablero },
        { merge: true }
      );
      localStorage.removeItem(localKey);
      if (mountedRef.current) setSaveStatus('saved');
    } catch (err) {
      console.error('[Tablero] Error al guardar:', err);
      if (mountedRef.current) setSaveStatus('error');
    }
  }, [entityId, entityType, localKey]);

  useEffect(() => {
    if (!readyToSave.current) return;
    const draft = { nodes: nodes.map(serializeNode), edges: edges.map(serializeEdge) };
    localStorage.setItem(localKey, JSON.stringify(draft));
    clearTimeout(saveTimer.current);
    if (mountedRef.current) setSaveStatus('idle');
    const snapNodes = nodes;
    const snapEdges = edges;
    saveTimer.current = setTimeout(() => {
      if (!readyToSave.current) return;
      if (mountedRef.current) setSaveStatus('saving');
      doSave(snapNodes, snapEdges);
    }, 1500);
  }, [nodes, edges, doSave, localKey]);

  useEffect(() => {
    return () => {
      clearTimeout(saveTimer.current);
      if (!readyToSave.current || !auth.currentUser) return;
      const localRaw = localStorage.getItem(localKey);
      if (!localRaw) return;
      try {
        const { nodes: n, edges: e } = JSON.parse(localRaw);
        setDoc(
          doc(db, 'usuarios', auth.currentUser.uid, entityType, entityId),
          { tablero: JSON.parse(JSON.stringify({ nodes: n, edges: e })) },
          { merge: true }
        ).then(() => localStorage.removeItem(localKey)).catch(() => {});
      } catch { /* ignore */ }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Atajos de teclado ──────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (e.key === 'Escape') { onClose(); return; }
      if (!ctrl) return;
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if (e.key === 'z' && e.shiftKey)  { e.preventDefault(); redo(); return; }
      if (e.key === 'y')                 { e.preventDefault(); redo(); return; }
      if (e.key === 'a') {
        e.preventDefault();
        setNodes(nds => nds.map(n => ({ ...n, selected: true })));
        return;
      }
      if (e.key === 'd') {
        e.preventDefault();
        setNodes(nds => {
          const sel = nds.find(n => n.selected);
          if (!sel) return nds;
          const dup = {
            ...sel,
            id: `${sel.type}-${Date.now()}`,
            position: { x: sel.position.x + 24, y: sel.position.y + 24 },
            selected: true,
            data: { ...sel.data, autoFocus: false },
          };
          const next = [...nds.map(n => ({ ...n, selected: false })), dup];
          checkpoint(next, edgesRef.current);
          return next;
        });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, undo, redo, setNodes, checkpoint]);

  // ── Callbacks de grafo ─────────────────────────────────
  const onConnect = useCallback((params) => {
    setEdges((eds) => {
      const newEdges = addEdge({ ...params, animated: false, type: edgeType }, eds);
      checkpoint(nodesRef.current, newEdges);
      return newEdges;
    });
  }, [setEdges, edgeType, checkpoint]);

  const onNodeDragStop = useCallback(() => {
    checkpoint(nodesRef.current, edgesRef.current);
  }, [checkpoint]);

  const onBeforeDelete = useCallback(async () => {
    checkpoint(nodesRef.current, edgesRef.current);
    return true;
  }, [checkpoint]);

  // Doble clic en arista → editar etiqueta (ya no elimina)
  const onEdgeDoubleClick = useCallback((e, edge) => {
    e.stopPropagation();
    setEditingEdge({ id: edge.id, label: edge.label || '', x: e.clientX, y: e.clientY });
  }, []);

  const commitEdgeLabel = useCallback((label) => {
    if (!editingEdge) return;
    setEdges(eds => eds.map(e => e.id === editingEdge.id ? { ...e, label } : e));
    checkpoint(nodesRef.current, edgesRef.current);
    setEditingEdge(null);
  }, [editingEdge, setEdges, checkpoint]);

  // ── Añadir nodos ──────────────────────────────────────
  const addTextNode = useCallback((position) => {
    const pos = position || { x: 80 + Math.random() * 300, y: 80 + Math.random() * 200 };
    setNodes((nds) => {
      const next = [
        ...nds.map(n => ({ ...n, selected: false })),
        { id: `text-${Date.now()}`, type: 'textoNode', position: pos, zIndex: 1, selected: true, data: { label: '', fmt: {}, autoFocus: true } },
      ];
      checkpoint(next, edgesRef.current);
      return next;
    });
  }, [setNodes, checkpoint]);

  const addShapeNode = useCallback((shape) => {
    setNodes((nds) => {
      const next = [
        ...nds,
        { id: `shape-${Date.now()}`, type: 'formaNode', position: { x: 60 + Math.random() * 200, y: 60 + Math.random() * 150 }, style: { width: 220, height: 140 }, zIndex: 0, data: { shape, color: shape === 'circle' ? '#a292c5' : '#f07f12', label: '' } },
      ];
      checkpoint(next, edgesRef.current);
      return next;
    });
  }, [setNodes, checkpoint]);

  const addStickyNode = useCallback(() => {
    setNodes((nds) => {
      const next = [
        ...nds,
        { id: `sticky-${Date.now()}`, type: 'stickyNode', position: { x: 60 + Math.random() * 200, y: 60 + Math.random() * 150 }, style: { width: 200, height: 160 }, zIndex: 1, data: { label: '', color: '#fef08a', autoFocus: true } },
      ];
      checkpoint(next, edgesRef.current);
      return next;
    });
  }, [setNodes, checkpoint]);

  const addImageNode = useCallback(() => {
    setNodes((nds) => {
      const next = [
        ...nds,
        { id: `image-${Date.now()}`, type: 'imageNode', position: { x: 80 + Math.random() * 200, y: 80 + Math.random() * 150 }, style: { width: 240, height: 180 }, zIndex: 1, data: { url: '' } },
      ];
      checkpoint(next, edgesRef.current);
      return next;
    });
  }, [setNodes, checkpoint]);

  const clearAll = useCallback(() => {
    if (window.confirm('¿Limpiar todo el tablero? Esta acción no se puede deshacer.')) {
      checkpoint(nodesRef.current, edgesRef.current);
      setNodes([]);
      setEdges([]);
    }
  }, [setNodes, setEdges, checkpoint]);

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

  // ── Exportar PNG ───────────────────────────────────────
  const exportPng = useCallback(async () => {
    const el = document.querySelector('.tablero-canvas');
    if (!el) return;
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(el, { backgroundColor: '#181b1e', pixelRatio: 2 });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${titulo || 'tablero'}.png`;
      a.click();
    } catch (err) {
      console.error('Export error:', err);
    }
  }, [titulo]);

  const canUndo = historyIdx > 0;
  const canRedo = historyIdx < historyLen - 1;

  return (
    <div className="tablero-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="tablero-modal">

        {/* ── Header ── */}
        <div className="tablero-header">
          <div className="tablero-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>
            </svg>
            <span>Tablero — {titulo}</span>
          </div>
          <div className="tablero-header-right">
            {saveStatus === 'saving' && <span className="t-status saving">Guardando...</span>}
            {saveStatus === 'saved'  && <span className="t-status saved">Guardado ✓</span>}
            {saveStatus === 'error'  && <span className="t-status error">Error al guardar ✕</span>}
            <button className="tablero-close" onClick={onClose} title="Cerrar tablero (Esc)">✕</button>
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div className="tablero-toolbar">
          {/* Nodos */}
          <button className="t-btn" onClick={() => addTextNode()}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 6H3m14 6H3m14 6H3M21 6l-4 4 4 4"/></svg>
            Texto
          </button>
          <button className="t-btn" onClick={addStickyNode}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8l6-6V4a2 2 0 0 0-2-2z"/><polyline points="14 2 14 8 20 8"/></svg>
            Nota
          </button>
          <button className="t-btn" onClick={() => addShapeNode('rect')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
            Área rect.
          </button>
          <button className="t-btn" onClick={() => addShapeNode('circle')}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/></svg>
            Área oval
          </button>
          <button className="t-btn" onClick={addImageNode}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            Imagen
          </button>

          <div className="t-sep" />

          {/* Tipo de arista */}
          <div className="t-bg-toggle" title="Tipo de conexión">
            <button className={`t-bg-btn ${edgeType === 'smoothstep' ? 'active' : ''}`} onClick={() => setEdgeType('smoothstep')} title="Suavizada">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 20 Q4 12 12 12 Q20 12 20 4"/></svg>
            </button>
            <button className={`t-bg-btn ${edgeType === 'straight' ? 'active' : ''}`} onClick={() => setEdgeType('straight')} title="Recta">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="4" y1="20" x2="20" y2="4"/></svg>
            </button>
            <button className={`t-bg-btn ${edgeType === 'step' ? 'active' : ''}`} onClick={() => setEdgeType('step')} title="Escalonada">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="4 20 4 12 20 12 20 4"/></svg>
            </button>
          </div>

          <div className="t-sep" />

          {/* Fondo */}
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

          {/* Deshacer / Rehacer */}
          <button className="t-btn" onClick={undo} disabled={!canUndo} title="Deshacer (Ctrl+Z)">
            <IconUndo /> Deshacer
          </button>
          <button className="t-btn" onClick={redo} disabled={!canRedo} title="Rehacer (Ctrl+Y)">
            <IconRedo /> Rehacer
          </button>

          <div className="t-sep" />

          {/* Ajustar vista */}
          <button className="t-btn" onClick={() => fitView({ padding: 0.1, duration: 300 })} title="Ajustar vista (fit)">
            <IconFitView /> Ajustar
          </button>

          {/* Exportar PNG */}
          <button className="t-btn" onClick={exportPng} title="Exportar como PNG">
            <IconExport /> PNG
          </button>

          <div className="t-sep" />

          <button className="t-btn t-btn-danger" onClick={clearAll}>Limpiar todo</button>

          <span className="t-hint">
            2× canvas → texto · 2× arista → etiqueta · Delete → eliminar · Ctrl+Z/Y → deshacer/rehacer · Ctrl+A → seleccionar todo · Ctrl+D → duplicar · Esc → cerrar
          </span>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="t-loading">
            <div className="t-loading-spinner" />
            <span>Cargando tablero...</span>
          </div>
        )}

        {/* ── Canvas ── */}
        <div className="tablero-canvas" onDoubleClick={handleCanvasDoubleClick}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onEdgeDoubleClick={onEdgeDoubleClick}
            onNodeDragStop={onNodeDragStop}
            onBeforeDelete={onBeforeDelete}
            fitView
            colorMode="dark"
            connectionMode="loose"
            defaultEdgeOptions={{ type: edgeType, animated: false }}
          >
            {bgVariant === 'dots'  && <Background variant={BackgroundVariant.Dots}  color="rgba(162,146,197,0.35)" gap={24} size={1.5} />}
            {bgVariant === 'lines' && <Background variant={BackgroundVariant.Lines} color="rgba(255,255,255,0.06)" gap={30} lineWidth={1} />}
            <Controls />
            <MiniMap
              nodeColor={(n) => {
                if (n.type === 'stickyNode') return n.data?.color || '#fef08a';
                if (n.type === 'formaNode')  return n.data?.color || '#a292c5';
                if (n.type === 'imageNode')  return '#4a9eda';
                return '#2a2e32';
              }}
              style={{ background: '#1a1d20', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px' }}
              maskColor="rgba(0,0,0,0.45)"
              zoomable
              pannable
            />
          </ReactFlow>
        </div>

        {/* ── Editor de etiqueta de arista ── */}
        {editingEdge && (
          <div
            className="t-edge-label-editor"
            style={{ left: editingEdge.x, top: editingEdge.y }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <input
              autoFocus
              value={editingEdge.label}
              onChange={(e) => setEditingEdge(prev => ({ ...prev, label: e.target.value }))}
              onBlur={() => commitEdgeLabel(editingEdge.label)}
              onKeyDown={(e) => {
                if (e.key === 'Enter')  { e.stopPropagation(); commitEdgeLabel(editingEdge.label); }
                if (e.key === 'Escape') { e.stopPropagation(); setEditingEdge(null); }
              }}
              placeholder="Etiqueta de conexión..."
            />
          </div>
        )}

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
