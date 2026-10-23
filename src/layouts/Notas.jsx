import { useState, useEffect, useMemo } from 'react';
import { auth, db } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { useGoogleCalendar, getEventColor } from '../hooks/useGoogleCalendar';
import './Proyectos.css';
import './Notas.css';

const DIAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const getTodayStr = () => { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,'0')}-${String(h.getDate()).padStart(2,'0')}`; };

const TAGS = [
  { id: 'trabajo',     label: 'Trabajo',     color: '#4A9EF5' },
  { id: 'personal',   label: 'Personal',    color: '#A291D0' },
  { id: 'idea',       label: 'Idea',        color: '#F5C842' },
  { id: 'urgente',    label: 'Urgente',     color: '#FF6B6B' },
  { id: 'aprendizaje',label: 'Aprendizaje', color: '#52C77A' },
];

// ── Agenda 7 días ────────────────────────────────────────────
const Agenda7Dias = ({ eventos }) => {
  const today = new Date();
  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today); d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    const evsDia = eventos.filter(ev => (ev.start?.date || ev.start?.dateTime?.split('T')[0]) === dateStr);
    return { d, dateStr, evsDia };
  });
  return (
    <div className="agenda-7dias">
      <h4 className="agenda-titulo">Próximos 7 días</h4>
      {dias.map(({ d, dateStr, evsDia }) => (
        <div key={dateStr} className={`agenda-dia${dateStr === getTodayStr() ? ' agenda-dia-hoy' : ''}`}>
          <div className="agenda-dia-label">
            <span className="agenda-dia-nombre">{d.toLocaleDateString('es-ES', { weekday: 'short' })}</span>
            <span className="agenda-dia-num">{d.getDate()}</span>
          </div>
          <div className="agenda-eventos">
            {evsDia.length === 0
              ? <span className="agenda-sin-eventos">Sin eventos</span>
              : evsDia.map((ev, i) => {
                  const color = getEventColor(ev);
                  const hora = ev.start?.dateTime ? new Date(ev.start.dateTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : 'Todo el día';
                  return (
                    <div key={i} className="agenda-evento-item" style={{ borderLeftColor: color, backgroundColor: `${color}18` }}>
                      <span className="agenda-evento-hora">{hora}</span>
                      <span className="agenda-evento-titulo">{ev.summary}</span>
                    </div>
                  );
                })}
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Vista Semanal ────────────────────────────────────────────
const VistaSemanal = ({ eventos }) => {
  const [semanaBase, setSemanaBase] = useState(() => {
    const d = new Date(); const day = d.getDay(); d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day)); return d;
  });
  const diasSemana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(semanaBase); d.setDate(semanaBase.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    return { d, dateStr, evsDia: eventos.filter(ev => (ev.start?.date || ev.start?.dateTime?.split('T')[0]) === dateStr) };
  });
  const irSemana = (n) => { const d = new Date(semanaBase); d.setDate(d.getDate() + n * 7); setSemanaBase(d); };
  const rangoLabel = `${diasSemana[0].d.getDate()} ${MESES[diasSemana[0].d.getMonth()].slice(0,3)} — ${diasSemana[6].d.getDate()} ${MESES[diasSemana[6].d.getMonth()].slice(0,3)}`;
  const todayDateStr = getTodayStr();
  return (
    <div className="calendar-grid-wrapper">
      <div className="calendar-nav">
        <button className="btn-calendar-nav" onClick={() => irSemana(-1)}>‹</button>
        <span>{rangoLabel}</span>
        <button className="btn-calendar-nav" onClick={() => irSemana(1)}>›</button>
      </div>
      <div className="semanal-grid">
        {diasSemana.map(({ d, dateStr, evsDia }) => (
          <div key={dateStr} className={`semanal-col${dateStr === todayDateStr ? ' semanal-col-hoy' : ''}`}>
            <div className="semanal-header">
              <span className="semanal-dia-nombre">{d.toLocaleDateString('es-ES', { weekday: 'short' })}</span>
              <span className={`semanal-dia-num${dateStr === todayDateStr ? ' semanal-hoy-num' : ''}`}>{d.getDate()}</span>
            </div>
            <div className="semanal-eventos">
              {evsDia.map((ev, i) => {
                const color = getEventColor(ev);
                const hora = ev.start?.dateTime ? new Date(ev.start.dateTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : null;
                return (
                  <div key={i} className="semanal-evento" style={{ backgroundColor: `${color}25`, borderLeft: `3px solid ${color}` }} title={ev.summary}>
                    {hora && <span className="semanal-evento-hora">{hora}</span>}
                    <span className="semanal-evento-texto">{ev.summary}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Vista Mensual ────────────────────────────────────────────
const VistaMensual = ({ eventos }) => {
  const [mesActual, setMesActual] = useState(new Date());
  const year = mesActual.getFullYear(); const month = mesActual.getMonth();
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayDateStr = getTodayStr();
  const eventosPorDia = useMemo(() => {
    const map = {};
    eventos.forEach(ev => { const f = ev.start?.date || ev.start?.dateTime?.split('T')[0]; if (f) { if (!map[f]) map[f] = []; map[f].push(ev); } });
    return map;
  }, [eventos]);
  const celdas = [];
  for (let i = 0; i < firstDayOfWeek; i++) celdas.push(<div key={`e${i}`} className="calendar-day empty" />);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const evs = eventosPorDia[dateStr] || [];
    celdas.push(
      <div key={d} className={`calendar-day${dateStr === todayDateStr ? ' today' : ''}`}>
        <span className="day-number">{d}</span>
        {evs.slice(0, 2).map((ev, i) => {
          const color = getEventColor(ev);
          return <div key={i} className="event-chip" style={{ backgroundColor: `${color}22`, borderLeft: `2px solid ${color}` }} title={ev.summary}>{ev.summary}</div>;
        })}
        {evs.length > 2 && <div className="event-more">+{evs.length - 2}</div>}
      </div>
    );
  }
  return (
    <div className="calendar-grid-wrapper">
      <div className="calendar-nav">
        <button className="btn-calendar-nav" onClick={() => setMesActual(new Date(year, month - 1))}>‹</button>
        <span>{MESES[month]} {year}</span>
        <button className="btn-calendar-nav" onClick={() => setMesActual(new Date(year, month + 1))}>›</button>
      </div>
      <div className="calendar-grid">
        {DIAS_SEMANA.map((d, i) => <div key={i} className="calendar-day-header">{d}</div>)}
        {celdas}
      </div>
    </div>
  );
};

// ── CalendarGrid con toggle ──────────────────────────────────
const CalendarGrid = ({ eventos }) => {
  const [vista, setVista] = useState('mensual');
  return (
    <div>
      <div className="calendar-view-toggle">
        <button className={`btn-vista${vista === 'mensual' ? ' active' : ''}`} onClick={() => setVista('mensual')}>Mensual</button>
        <button className={`btn-vista${vista === 'semanal' ? ' active' : ''}`} onClick={() => setVista('semanal')}>Semanal</button>
      </div>
      {vista === 'mensual' ? <VistaMensual eventos={eventos} /> : <VistaSemanal eventos={eventos} />}
      <Agenda7Dias eventos={eventos} />
    </div>
  );
};

// ── Notas ────────────────────────────────────────────────────
const Notas = () => {
  const { token, eventos, cargando, error: calError, conectar, desconectar, crearEvento } = useGoogleCalendar();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newNotaForm, setNewNotaForm] = useState({ titulo: '', tareas: [], tag: '' });
  const [notas, setNotas] = useState([]);
  const [tareaEventoModal, setTareaEventoModal] = useState(null);
  const [crearEventoError, setCrearEventoError] = useState('');
  const [crearEventoLoading, setCrearEventoLoading] = useState(false);
  const [editandoTituloId, setEditandoTituloId] = useState(null);
  const [editandoTituloVal, setEditandoTituloVal] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTag, setFiltroTag] = useState('');

  const eventosPorDia = useMemo(() => {
    const map = {};
    eventos.forEach(ev => { const f = ev.start?.date || ev.start?.dateTime?.split('T')[0]; if (f) { if (!map[f]) map[f] = []; map[f].push(ev); } });
    return map;
  }, [eventos]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const q = query(collection(db, 'usuarios', uid, 'notas'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => setNotas(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsubscribe();
  }, []);

  // ── Modal form helpers ────────────────────────────────────
  const addFormTarea = () => setNewNotaForm(f => ({ ...f, tareas: [...f.tareas, { id: Date.now(), texto: '' }] }));
  const updateFormTarea = (id, texto) => setNewNotaForm(f => ({ ...f, tareas: f.tareas.map(t => t.id === id ? { ...t, texto } : t) }));
  const removeFormTarea = (id) => setNewNotaForm(f => ({ ...f, tareas: f.tareas.filter(t => t.id !== id) }));

  const handleCreateNota = async () => {
    if (!newNotaForm.titulo.trim()) return alert('El título es obligatorio');
    if (!auth.currentUser) return;
    try {
      await addDoc(collection(db, 'usuarios', auth.currentUser.uid, 'notas'), {
        titulo: newNotaForm.titulo.trim(),
        descripcion: '',
        fecha: getTodayStr(),
        archivada: false,
        enlaces: [],
        tareas: newNotaForm.tareas.filter(t => t.texto.trim()).map(t => ({ ...t, completada: false })),
        tag: newNotaForm.tag,
        createdAt: new Date().toISOString(),
      });
      setIsModalOpen(false);
      setNewNotaForm({ titulo: '', tareas: [], tag: '' });
    } catch (error) { console.error('Error al crear nota:', error); }
  };

  // ── Título inline ─────────────────────────────────────────
  const iniciarEditarTitulo = (nota) => { setEditandoTituloId(nota.id); setEditandoTituloVal(nota.titulo); };
  const guardarTituloEditado = async (notaId) => {
    const val = editandoTituloVal.trim();
    if (val && auth.currentUser)
      await updateDoc(doc(db, 'usuarios', auth.currentUser.uid, 'notas', notaId), { titulo: val });
    setEditandoTituloId(null);
  };

  const toggleArchivarNota = async (notaId) => {
    const nota = notas.find(n => n.id === notaId);
    if (nota && auth.currentUser)
      await updateDoc(doc(db, 'usuarios', auth.currentUser.uid, 'notas', notaId), { archivada: !nota.archivada });
  };

  const eliminarNota = async (notaId) => {
    if (auth.currentUser) {
      await deleteDoc(doc(db, 'usuarios', auth.currentUser.uid, 'notas', notaId));
      setConfirmDeleteId(null);
    }
  };

  const setTagNota = async (notaId, tagId) => {
    if (auth.currentUser)
      await updateDoc(doc(db, 'usuarios', auth.currentUser.uid, 'notas', notaId), { tag: tagId || null });
  };

  const updateNotaDescLocal = (notaId, text) => setNotas(prev => prev.map(n => n.id === notaId ? { ...n, descripcion: text } : n));
  const saveNotaDesc = async (notaId, text) => {
    if (auth.currentUser) await updateDoc(doc(db, 'usuarios', auth.currentUser.uid, 'notas', notaId), { descripcion: text });
  };

  const setFechaEvento = async (notaId, fecha) => {
    if (auth.currentUser) await updateDoc(doc(db, 'usuarios', auth.currentUser.uid, 'notas', notaId), { fechaEvento: fecha || null });
  };

  const agregarEnlace = async (notaId) => {
    const nota = notas.find(n => n.id === notaId);
    if (nota && auth.currentUser) {
      const nuevosEnlaces = [...(nota.enlaces || []), { id: Date.now(), titulo: '', url: '', guardado: false }];
      await updateDoc(doc(db, 'usuarios', auth.currentUser.uid, 'notas', notaId), { enlaces: nuevosEnlaces });
    }
  };

  const updateEnlaceLocal = (notaId, enlaceId, field, value) =>
    setNotas(prev => prev.map(n => n.id === notaId ? { ...n, enlaces: n.enlaces.map(e => e.id === enlaceId ? { ...e, [field]: value } : e) } : n));

  const updateEnlace = async (notaId, enlaceId, field, value) => {
    const nota = notas.find(n => n.id === notaId);
    if (nota && auth.currentUser)
      await updateDoc(doc(db, 'usuarios', auth.currentUser.uid, 'notas', notaId), { enlaces: nota.enlaces.map(e => e.id === enlaceId ? { ...e, [field]: value } : e) });
  };

  const eliminarEnlace = async (notaId, enlaceId) => {
    const nota = notas.find(n => n.id === notaId);
    if (nota && auth.currentUser)
      await updateDoc(doc(db, 'usuarios', auth.currentUser.uid, 'notas', notaId), { enlaces: nota.enlaces.filter(e => e.id !== enlaceId) });
  };

  const agregarTarea = async (notaId) => {
    const nota = notas.find(n => n.id === notaId);
    if (nota && auth.currentUser)
      await updateDoc(doc(db, 'usuarios', auth.currentUser.uid, 'notas', notaId), { tareas: [...(nota.tareas || []), { id: Date.now(), texto: '', completada: false }] });
  };

  const toggleTarea = async (notaId, tareaId) => {
    const nota = notas.find(n => n.id === notaId);
    if (nota && auth.currentUser)
      await updateDoc(doc(db, 'usuarios', auth.currentUser.uid, 'notas', notaId), { tareas: nota.tareas.map(t => t.id === tareaId ? { ...t, completada: !t.completada } : t) });
  };

  const updateTareaTextoLocal = (notaId, tareaId, texto) =>
    setNotas(prev => prev.map(n => n.id === notaId ? { ...n, tareas: n.tareas.map(t => t.id === tareaId ? { ...t, texto } : t) } : n));

  const saveTareaTexto = async (notaId, tareaId, texto) => {
    const nota = notas.find(n => n.id === notaId);
    if (nota && auth.currentUser)
      await updateDoc(doc(db, 'usuarios', auth.currentUser.uid, 'notas', notaId), { tareas: nota.tareas.map(t => t.id === tareaId ? { ...t, texto } : t) });
  };

  const handleCrearEventoTarea = async () => {
    if (!tareaEventoModal?.titulo || !tareaEventoModal?.fecha) return;
    setCrearEventoLoading(true); setCrearEventoError('');
    const result = await crearEvento(tareaEventoModal.titulo, tareaEventoModal.fecha);
    setCrearEventoLoading(false);
    if (result.ok) setTareaEventoModal(null);
    else setCrearEventoError(result.error);
  };

  const autoResize = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 400) + 'px';
  };

  const notasActivas = useMemo(() => notas.filter(n => {
    if (n.archivada) return false;
    if (filtroTag && n.tag !== filtroTag) return false;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      return n.titulo.toLowerCase().includes(q) ||
             (n.descripcion || '').toLowerCase().includes(q) ||
             (n.tareas || []).some(t => t.texto.toLowerCase().includes(q));
    }
    return true;
  }), [notas, busqueda, filtroTag]);

  const notasArchivadas = notas.filter(n => n.archivada);

  return (
    <div className="proyectos-container">
      <header className="proyectos-header">
        <div>
          <h1 className="page-title">Notas</h1>
          <p className="page-subtitle">Captura tus ideas, apuntes y tareas rápidas.</p>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>+ Nueva Nota</button>
      </header>

      {/* ── Toolbar búsqueda + filtro tag ─── */}
      <div className="notas-toolbar">
        <div className="notas-search-wrapper">
          <svg className="notas-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            type="text"
            className="notas-search-input"
            placeholder="Buscar notas..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
          {busqueda && <button className="notas-search-clear" onClick={() => setBusqueda('')}>×</button>}
        </div>
        <div className="notas-tag-filters">
          <button className={`btn-tag-filter${filtroTag === '' ? ' active' : ''}`} onClick={() => setFiltroTag('')}>Todas</button>
          {TAGS.map(tag => (
            <button
              key={tag.id}
              className={`btn-tag-filter${filtroTag === tag.id ? ' active' : ''}`}
              style={filtroTag === tag.id ? { borderColor: tag.color, color: tag.color, backgroundColor: `${tag.color}18` } : {}}
              onClick={() => setFiltroTag(filtroTag === tag.id ? '' : tag.id)}
            >
              <span className="tag-dot" style={{ backgroundColor: tag.color }} />
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      <div className="proyectos-grid">
        {notasActivas.map(nota => {
          const totalTareas = (nota.tareas || []).length;
          const tareasCompletadas = (nota.tareas || []).filter(t => t.completada).length;
          const fechaIndicador = nota.fechaEvento || nota.fecha;
          const eventosIndicador = (eventosPorDia[fechaIndicador] || []).slice(0, 3);
          const tagInfo = TAGS.find(t => t.id === nota.tag);

          return (
            <div key={nota.id} className="proyecto-card">
              <div className="proyecto-card-main-info" style={{ gap: '0.5rem' }}>
                <div className="proyecto-card-header" style={{ alignItems: 'center' }}>
                  <div className="sub-categoria-header-title" style={{ flex: 1, minWidth: 0 }}>
                    {editandoTituloId === nota.id ? (
                      <input
                        className="titulo-edit-input"
                        value={editandoTituloVal}
                        autoFocus
                        onChange={e => setEditandoTituloVal(e.target.value)}
                        onBlur={() => guardarTituloEditado(nota.id)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') guardarTituloEditado(nota.id);
                          if (e.key === 'Escape') setEditandoTituloId(null);
                        }}
                      />
                    ) : (
                      <h3 onDoubleClick={() => iniciarEditarTitulo(nota)} title="Doble clic para editar">{nota.titulo}</h3>
                    )}
                  </div>
                  <div className="link-actions" style={{ flexShrink: 0 }}>
                    <button className="btn-icon-action" title="Editar Título" onClick={() => iniciarEditarTitulo(nota)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button className="btn-icon-action" title="Archivar Nota" onClick={() => toggleArchivarNota(nota.id)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
                    </button>
                    {confirmDeleteId === nota.id ? (
                      <div className="confirm-delete-inline">
                        <span>¿Eliminar?</span>
                        <button className="btn-confirm-yes" onClick={() => eliminarNota(nota.id)}>Sí</button>
                        <button className="btn-confirm-no" onClick={() => setConfirmDeleteId(null)}>No</button>
                      </div>
                    ) : (
                      <button className="btn-icon-action delete-icon" title="Eliminar Nota" onClick={() => setConfirmDeleteId(nota.id)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Tag */}
                <div className="nota-tag-row">
                  {tagInfo ? (
                    <span className="nota-tag-badge" style={{ backgroundColor: `${tagInfo.color}20`, color: tagInfo.color, borderColor: `${tagInfo.color}40` }}>
                      {tagInfo.label}
                      <button className="nota-tag-remove" onClick={() => setTagNota(nota.id, '')}>×</button>
                    </span>
                  ) : (
                    <div className="nota-tag-selector">
                      {TAGS.map(t => (
                        <button key={t.id} className="nota-tag-option" onClick={() => setTagNota(nota.id, t.id)} title={t.label}>
                          <span style={{ backgroundColor: t.color }} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Fecha + indicadores */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                  <span className="proyecto-fecha">📅 {nota.fecha}</span>
                  {(nota.enlaces || []).filter(e => e.guardado).map(enlace => (
                    <a key={enlace.id} href={enlace.url} target="_blank" rel="noopener noreferrer" className="header-link-icon" title={enlace.titulo} onClick={e => e.stopPropagation()}>📎</a>
                  ))}
                  {token && eventosIndicador.length > 0 && (
                    <div className="nota-eventos-indicador">
                      {eventosIndicador.map((ev, i) => (
                        <span key={i} className="nota-evento-dot" style={{ backgroundColor: getEventColor(ev) }} title={ev.summary} />
                      ))}
                    </div>
                  )}
                </div>

                {token && (
                  <div className="nota-fecha-evento">
                    <label className="nota-fecha-evento-label">🗓 Evento:</label>
                    <input
                      type="date"
                      className="nota-fecha-evento-input"
                      value={nota.fechaEvento || ''}
                      onChange={e => setFechaEvento(nota.id, e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="sub-categoria-content" style={{ marginTop: 0 }}>
                <textarea
                  className="sub-categoria-textarea nota-textarea-autoresize"
                  value={nota.descripcion}
                  onChange={(e) => { updateNotaDescLocal(nota.id, e.target.value); autoResize(e); }}
                  onBlur={(e) => saveNotaDesc(nota.id, e.target.value)}
                  onFocus={autoResize}
                  placeholder="Escribe tus apuntes aquí..."
                />

                <div className="tareas-list-container">
                  <h5 className="tareas-titulo">Tareas ({tareasCompletadas}/{totalTareas})</h5>
                  <ul className="tareas-list">
                    {(nota.tareas || []).map(tarea => (
                      <li key={tarea.id} className="tarea-item">
                        <label className="tarea-label">
                          <input type="checkbox" checked={tarea.completada} onChange={() => toggleTarea(nota.id, tarea.id)} />
                          <input
                            type="text"
                            className={`tarea-texto-input ${tarea.completada ? 'completada' : ''}`}
                            value={tarea.texto}
                            placeholder="Escribe una tarea..."
                            onChange={(e) => updateTareaTextoLocal(nota.id, tarea.id, e.target.value)}
                            onBlur={(e) => saveTareaTexto(nota.id, tarea.id, e.target.value)}
                          />
                        </label>
                        {token && tarea.texto && (
                          <button className="btn-tarea-calendar" title="Crear evento en Google Calendar" onClick={() => setTareaEventoModal({ titulo: tarea.texto, fecha: getTodayStr() })}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                  <button className="btn-add-tarea" onClick={() => agregarTarea(nota.id)}>+ Añadir Tarea</button>
                </div>

                <div className="enlaces-container" style={{ marginTop: '0.5rem' }}>
                  {(nota.enlaces || []).map(enlace => (
                    !enlace.guardado ? (
                      <div key={enlace.id} className="link-editor-container">
                        <div className="link-inputs-row">
                          <input type="text" className="link-input-modern" placeholder="Título del enlace..." value={enlace.titulo} onChange={(e) => updateEnlaceLocal(nota.id, enlace.id, 'titulo', e.target.value)} />
                          <input type="url" className="link-input-modern" placeholder="https://..." value={enlace.url} onChange={(e) => updateEnlaceLocal(nota.id, enlace.id, 'url', e.target.value)} />
                        </div>
                        <div className="link-actions" style={{ justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                          <button className="btn-delete-link" onClick={() => eliminarEnlace(nota.id, enlace.id)}>Cancelar</button>
                          <button className="btn-save-link" onClick={() => { if (enlace.url && enlace.titulo) updateEnlace(nota.id, enlace.id, 'guardado', true); else alert('Ingresa título y URL.'); }}>Guardar</button>
                        </div>
                      </div>
                    ) : (
                      <div key={enlace.id} className="link-saved-display">
                        <a href={enlace.url} target="_blank" rel="noopener noreferrer">📎 {enlace.titulo}</a>
                        <div className="link-actions">
                          <button className="btn-edit-link" onClick={() => updateEnlace(nota.id, enlace.id, 'guardado', false)}>Editar</button>
                          <button className="btn-delete-link" onClick={() => eliminarEnlace(nota.id, enlace.id)}>Eliminar</button>
                        </div>
                      </div>
                    )
                  ))}
                  <button className="btn-add-link" onClick={() => agregarEnlace(nota.id)}>+ Añadir Enlace</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Sección Google Calendar ─── */}
      <section className="calendar-section">
        <div className="calendar-section-header">
          <h2>Mi Calendario</h2>
          {token && <button className="btn-calendar-desconectar" onClick={desconectar}>Desconectar</button>}
        </div>
        {calError && <p className="calendar-error">{calError}</p>}
        {!token ? (
          <div className="calendar-empty-state">
            <span className="calendar-empty-icon">🗓️</span>
            <p>Conecta tu Google Calendar para ver tus eventos</p>
            <button className="btn-conectar-calendar" onClick={conectar}>Conectar Google Calendar</button>
          </div>
        ) : cargando ? (
          <p className="calendar-loading">Cargando eventos...</p>
        ) : (
          <CalendarGrid eventos={eventos} />
        )}
      </section>

      {/* ── Notas Archivadas ─── */}
      {notasArchivadas.length > 0 && (
        <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
          <div className="proyectos-header">
            <h2 className="page-title" style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>Notas Archivadas</h2>
          </div>
          <div className="archived-table-wrapper">
            <table className="archived-table">
              <thead><tr><th>Título</th><th>Fecha</th><th>Tareas</th><th>Acciones</th></tr></thead>
              <tbody>
                {notasArchivadas.map(nota => {
                  const total = (nota.tareas || []).length;
                  const comp = (nota.tareas || []).filter(t => t.completada).length;
                  return (
                    <tr key={nota.id}>
                      <td className="archived-title">{nota.titulo}</td>
                      <td>📅 {nota.fecha}</td>
                      <td>{comp} / {total} completadas</td>
                      <td>
                        <div className="archived-actions">
                          <button className="btn-icon-action" title="Desarchivar" onClick={() => toggleArchivarNota(nota.id)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                          </button>
                          <button className="btn-icon-action delete-icon" title="Eliminar" onClick={() => eliminarNota(nota.id)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal Nueva Nota ─── */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Crear Nueva Nota</h2>
            <div className="modal-form">
              <div className="input-group">
                <label>Título de la nota</label>
                <input
                  type="text"
                  value={newNotaForm.titulo}
                  autoFocus
                  onChange={e => setNewNotaForm({ ...newNotaForm, titulo: e.target.value })}
                  placeholder="Ej. Lista de compras, Ideas para el proyecto..."
                  onKeyDown={e => { if (e.key === 'Enter') handleCreateNota(); }}
                />
              </div>
              <div className="input-group">
                <label>Etiqueta</label>
                <div className="modal-tag-options">
                  {TAGS.map(tag => (
                    <button
                      key={tag.id}
                      type="button"
                      className={`modal-tag-btn${newNotaForm.tag === tag.id ? ' selected' : ''}`}
                      style={newNotaForm.tag === tag.id ? { backgroundColor: `${tag.color}25`, borderColor: tag.color, color: tag.color } : {}}
                      onClick={() => setNewNotaForm(f => ({ ...f, tag: f.tag === tag.id ? '' : tag.id }))}
                    >
                      <span className="tag-dot" style={{ backgroundColor: tag.color }} />
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="input-group">
                <label>Tareas <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(opcional)</span></label>
                <ul className="modal-tareas-list">
                  {newNotaForm.tareas.map(t => (
                    <li key={t.id} className="modal-tarea-item">
                      <span className="modal-tarea-dot" />
                      <input
                        type="text"
                        className="tarea-texto-input"
                        value={t.texto}
                        placeholder="Escribe una tarea..."
                        onChange={e => updateFormTarea(t.id, e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFormTarea(); } }}
                      />
                      <button className="btn-remove-form-tarea" onClick={() => removeFormTarea(t.id)}>×</button>
                    </li>
                  ))}
                </ul>
                <button type="button" className="btn-add-tarea" onClick={addFormTarea}>+ Añadir Tarea</button>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => { setIsModalOpen(false); setNewNotaForm({ titulo: '', tareas: [], tag: '' }); }}>Cancelar</button>
              <button className="btn-primary" onClick={handleCreateNota}>Guardar Nota</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Crear Evento desde Tarea ─── */}
      {tareaEventoModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Crear evento en Google Calendar</h2>
            <div className="modal-form">
              <div className="input-group">
                <label>Título del evento</label>
                <input type="text" value={tareaEventoModal.titulo} onChange={e => setTareaEventoModal({ ...tareaEventoModal, titulo: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Fecha</label>
                <input type="date" value={tareaEventoModal.fecha} onChange={e => setTareaEventoModal({ ...tareaEventoModal, fecha: e.target.value })} />
              </div>
              {crearEventoError && <p className="calendar-error" style={{ margin: 0 }}>{crearEventoError}</p>}
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => { setTareaEventoModal(null); setCrearEventoError(''); }}>Cancelar</button>
              <button className="btn-primary" onClick={handleCrearEventoTarea} disabled={crearEventoLoading}>
                {crearEventoLoading ? 'Creando...' : 'Crear evento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notas;
