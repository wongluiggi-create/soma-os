import { useState, useEffect, useMemo } from 'react';
import { auth, db } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import './Proyectos.css';
import './Finanzas.css';
import './Home.css';

const MESES_NOMBRES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const CAT_COLORS = ['#F07F12','#A291D0','#4A9EF5','#52C77A','#F5C842','#FF6B6B','#4DD0E1','#FF8A65','#BA68C8','#81C784','#E57373','#64B5F6'];

const catColor = name => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return CAT_COLORS[Math.abs(h) % CAT_COLORS.length];
};

// ── Donut chart ──────────────────────────────────────────────
const DonutChart = ({ egresos, formatCurrency }) => {
  const cats = useMemo(() => {
    const map = {};
    egresos.forEach(tx => { map[tx.categoria] = (map[tx.categoria] || 0) + tx.monto; });
    return Object.entries(map)
      .map(([label, value]) => ({ label, value, color: catColor(label) }))
      .sort((a, b) => b.value - a.value);
  }, [egresos]);

  const total = cats.reduce((s, c) => s + c.value, 0);
  if (total === 0) return <p className="chart-empty">Sin gastos en este período.</p>;

  const SIZE = 160, CX = 80, CY = 80, R = 65, IR = 40;
  const pt = (a, r) => ({ x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) });

  let ang = -Math.PI / 2;
  const segs = cats.map(cat => {
    const sweep = (cat.value / total) * 2 * Math.PI;
    const a1 = ang, a2 = ang + sweep;
    ang = a2;
    const large = sweep > Math.PI ? 1 : 0;
    const o1 = pt(a1, R), o2 = pt(a2, R), i1 = pt(a1, IR), i2 = pt(a2, IR);
    const d = cats.length === 1
      ? null
      : `M ${o1.x} ${o1.y} A ${R} ${R} 0 ${large} 1 ${o2.x} ${o2.y} L ${i2.x} ${i2.y} A ${IR} ${IR} 0 ${large} 0 ${i1.x} ${i1.y} Z`;
    return { ...cat, d, pct: Math.round((cat.value / total) * 100) };
  });

  return (
    <div className="donut-chart-wrapper">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ flexShrink: 0 }}>
        {cats.length === 1
          ? <circle cx={CX} cy={CY} r={(R + IR) / 2} fill="none" stroke={cats[0].color} strokeWidth={R - IR} />
          : segs.map((s, i) => <path key={i} d={s.d} fill={s.color} />)
        }
      </svg>
      <div className="donut-legend">
        {segs.map((s, i) => (
          <div key={i} className="donut-legend-item">
            <span className="donut-legend-dot" style={{ backgroundColor: s.color }} />
            <span className="donut-legend-label" title={s.label}>{s.label}</span>
            <span className="donut-legend-pct">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Finanzas ─────────────────────────────────────────────────
const Finanzas = ({ categoriasIngreso = [], categoriasEgreso = [], tarjetas = [], setTarjetas }) => {
  const [isModalOpen, setIsModalOpen]       = useState(false);
  const [editingTxId, setEditingTxId]       = useState(null);
  const [isDeseoModalOpen, setIsDeseoModalOpen] = useState(false);
  const [isMetaModalOpen, setIsMetaModalOpen]   = useState(false);
  const [newTxForm, setNewTxForm] = useState({ tipo: 'egreso', monto: '', descripcion: '', categoria: 'Alimentación', fecha: new Date().toISOString().split('T')[0] });
  const [newDeseoForm, setNewDeseoForm] = useState({ titulo: '', modelo: '', url: '', precio: '', cuotas: 1 });
  const [newMetaForm, setNewMetaForm]   = useState({ titulo: '', objetivo: '' });
  const [activeFundGoalId, setActiveFundGoalId] = useState(null);
  const [fundAmount, setFundAmount]             = useState('');
  const [expandedMetas, setExpandedMetas]       = useState({});
  const [confirmDeleteTxId, setConfirmDeleteTxId] = useState(null);
  const [busquedaTx, setBusquedaTx]   = useState('');
  const [filtroTipo, setFiltroTipo]   = useState('');
  const [transacciones, setTransacciones] = useState([]);
  const [metas, setMetas]   = useState([]);
  const [deseos, setDeseos] = useState([]);
  const [periodo, setPeriodo] = useState(() => {
    const h = new Date();
    return { tipo: 'mes', mes: h.getMonth(), año: h.getFullYear() };
  });

  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const unTx    = onSnapshot(query(collection(db, 'usuarios', uid, 'transacciones'), orderBy('fecha', 'desc')), s => setTransacciones(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unMetas  = onSnapshot(query(collection(db, 'usuarios', uid, 'metas')),  s => setMetas(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unDeseos = onSnapshot(query(collection(db, 'usuarios', uid, 'deseos')), s => setDeseos(s.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unTx(); unMetas(); unDeseos(); };
  }, []);

  // ── Transacciones filtradas por período ───────────────────
  const txFiltradas = useMemo(() => transacciones.filter(tx => {
    if (periodo.tipo === 'todo') return true;
    const [a, m] = tx.fecha.split('-').map(Number);
    if (periodo.tipo === 'mes') return a === periodo.año && m - 1 === periodo.mes;
    if (periodo.tipo === 'año') return a === periodo.año;
    return true;
  }), [transacciones, periodo]);

  // ── Transacciones visibles (+ búsqueda y tipo) ────────────
  const txMostradas = useMemo(() => txFiltradas.filter(tx => {
    if (filtroTipo && tx.tipo !== filtroTipo) return false;
    if (busquedaTx) {
      const q = busquedaTx.toLowerCase();
      return tx.descripcion.toLowerCase().includes(q) || tx.categoria.toLowerCase().includes(q);
    }
    return true;
  }), [txFiltradas, filtroTipo, busquedaTx]);

  const totalIngresos  = txFiltradas.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + t.monto, 0);
  const totalEgresos   = txFiltradas.filter(t => t.tipo === 'egreso').reduce((s, t) => s + t.monto, 0);
  const balanceTotal   = totalIngresos - totalEgresos;
  const totalAhorrado  = metas.reduce((s, m) => s + parseFloat(m.actual || 0), 0);
  const egresosChart   = txFiltradas.filter(t => t.tipo === 'egreso');

  const formatCurrency = v => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(v);

  const irMes = d => setPeriodo(p => {
    let mes = p.mes + d, año = p.año;
    if (mes < 0)  { mes = 11; año--; }
    if (mes > 11) { mes = 0;  año++; }
    return { ...p, mes, año };
  });

  const periodoLabel = periodo.tipo === 'mes' ? `${MESES_NOMBRES[periodo.mes]} ${periodo.año}` : periodo.tipo === 'año' ? String(periodo.año) : 'Todo';

  // ── Modal helpers ────────────────────────────────────────
  const abrirModalNueva = () => {
    setEditingTxId(null);
    setNewTxForm({ tipo: 'egreso', monto: '', descripcion: '', categoria: 'Alimentación', fecha: new Date().toISOString().split('T')[0] });
    setIsModalOpen(true);
  };
  const abrirModalEditar = tx => {
    setEditingTxId(tx.id);
    setNewTxForm({ tipo: tx.tipo, monto: String(tx.monto), descripcion: tx.descripcion, categoria: tx.categoria, fecha: tx.fecha });
    setIsModalOpen(true);
  };

  const handleSaveTx = async () => {
    if (!newTxForm.monto || !newTxForm.descripcion) return alert('El monto y la descripción son obligatorios.');
    if (!auth.currentUser) return;

    if (editingTxId) {
      try {
        await updateDoc(doc(db, 'usuarios', auth.currentUser.uid, 'transacciones', editingTxId), {
          tipo: newTxForm.tipo, monto: parseFloat(newTxForm.monto),
          descripcion: newTxForm.descripcion, categoria: newTxForm.categoria, fecha: newTxForm.fecha,
        });
      } catch (e) { console.error(e); }
      setIsModalOpen(false); setEditingTxId(null);
      return;
    }

    let categoriaFinal = newTxForm.categoria;
    if (newTxForm.tipo === 'egreso' && String(newTxForm.categoria).startsWith('tc-')) {
      const cardId = parseInt(newTxForm.categoria.split('-')[1]);
      const tc = tarjetas.find(t => t.id === cardId);
      if (tc && setTarjetas) {
        categoriaFinal = `💳 ${tc.banco} ${tc.numero}`;
        const nts = tarjetas.map(t => t.id === cardId ? { ...t, utilizado: t.utilizado + parseFloat(newTxForm.monto) } : t);
        setTarjetas(nts);
        await updateDoc(doc(db, 'usuarios', auth.currentUser.uid), { tarjetas: nts });
      }
    }
    try {
      await addDoc(collection(db, 'usuarios', auth.currentUser.uid, 'transacciones'), {
        tipo: newTxForm.tipo, monto: parseFloat(newTxForm.monto),
        descripcion: newTxForm.descripcion, categoria: categoriaFinal,
        fecha: newTxForm.fecha, createdAt: new Date().toISOString(),
      });
    } catch (e) { console.error(e); alert('Error al guardar.'); }
    setIsModalOpen(false);
    setNewTxForm({ tipo: 'egreso', monto: '', descripcion: '', categoria: 'Alimentación', fecha: new Date().toISOString().split('T')[0] });
  };

  const eliminarTx = async id => {
    if (!auth.currentUser) return;
    await deleteDoc(doc(db, 'usuarios', auth.currentUser.uid, 'transacciones', id));
    setConfirmDeleteTxId(null);
  };

  const handleCreateMeta = async () => {
    if (!newMetaForm.titulo || !newMetaForm.objetivo) return alert('El nombre y monto son obligatorios.');
    if (!auth.currentUser) return;
    await addDoc(collection(db, 'usuarios', auth.currentUser.uid, 'metas'), { titulo: newMetaForm.titulo, objetivo: parseFloat(newMetaForm.objetivo), actual: 0, historial: [], createdAt: new Date().toISOString() });
    setIsMetaModalOpen(false); setNewMetaForm({ titulo: '', objetivo: '' });
  };

  const handleAbonarMeta = async id => {
    const meta = metas.find(m => m.id === id);
    if (meta && fundAmount && !isNaN(fundAmount) && Number(fundAmount) > 0 && auth.currentUser) {
      await updateDoc(doc(db, 'usuarios', auth.currentUser.uid, 'metas', id), {
        actual: meta.actual + parseFloat(fundAmount),
        historial: [{ id: Date.now(), monto: parseFloat(fundAmount), fecha: new Date().toISOString().split('T')[0] }, ...(meta.historial || [])],
      });
      setActiveFundGoalId(null); setFundAmount('');
    }
  };

  const eliminarMeta = async id => { if (auth.currentUser) await deleteDoc(doc(db, 'usuarios', auth.currentUser.uid, 'metas', id)); };

  const handleCreateDeseo = async () => {
    if (!newDeseoForm.titulo || !newDeseoForm.precio) return alert('El título y precio son obligatorios.');
    if (!auth.currentUser) return;
    const c = parseInt(newDeseoForm.cuotas) || 1;
    await addDoc(collection(db, 'usuarios', auth.currentUser.uid, 'deseos'), { ...newDeseoForm, precio: parseFloat(newDeseoForm.precio), cuotas: c, cuotasEstado: Array(c).fill(false), completado: false, createdAt: new Date().toISOString() });
    setIsDeseoModalOpen(false); setNewDeseoForm({ titulo: '', modelo: '', url: '', precio: '', cuotas: 1 });
  };

  const toggleCuotaDeseo = async (deseoId, index) => {
    const deseo = deseos.find(d => d.id === deseoId);
    if (deseo && auth.currentUser) {
      const ns = [...deseo.cuotasEstado]; ns[index] = !ns[index];
      await updateDoc(doc(db, 'usuarios', auth.currentUser.uid, 'deseos', deseoId), { cuotasEstado: ns, completado: ns.every(c => c) });
    }
  };

  const eliminarDeseo = async id => { if (auth.currentUser) await deleteDoc(doc(db, 'usuarios', auth.currentUser.uid, 'deseos', id)); };

  return (
    <div className="proyectos-container">
      <header className="proyectos-header">
        <div>
          <h1 className="page-title">Finanzas</h1>
          <p className="page-subtitle">Control de ingresos, gastos y crecimiento económico.</p>
        </div>
        <button className="btn-prominent" onClick={abrirModalNueva}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nueva Transacción
        </button>
      </header>

      {/* ── Selector de período ─── */}
      <div className="periodo-selector">
        <div className="periodo-tabs">
          {[['mes','Este mes'],['año','Este año'],['todo','Todo']].map(([tipo, label]) => (
            <button key={tipo} className={`btn-periodo${periodo.tipo === tipo ? ' active' : ''}`}
              onClick={() => setPeriodo(p => tipo === 'todo' ? { ...p, tipo: 'todo' } : { ...p, tipo })}>
              {label}
            </button>
          ))}
        </div>
        {periodo.tipo !== 'todo' && (
          <div className="periodo-nav">
            <button className="btn-calendar-nav" onClick={() => periodo.tipo === 'mes' ? irMes(-1) : setPeriodo(p => ({ ...p, año: p.año - 1 }))}>‹</button>
            <span className="periodo-label">{periodoLabel}</span>
            <button className="btn-calendar-nav" onClick={() => periodo.tipo === 'mes' ? irMes(1) : setPeriodo(p => ({ ...p, año: p.año + 1 }))}>›</button>
          </div>
        )}
      </div>

      {/* ── Resumen ─── */}
      <div className="finance-single-block" style={{ marginBottom: '2rem' }}>
        <div className="finance-main-balance">
          <span className="finance-label">Balance</span>
          <h2 className={`finance-val-main ${balanceTotal >= 0 ? 'text-income' : 'text-expense'}`}>{formatCurrency(balanceTotal)}</h2>
        </div>
        <div className="finance-details-row">
          <div className="finance-detail">
            <span className="finance-label">Ingresos</span>
            <span className="finance-val-sub text-income">+{formatCurrency(totalIngresos)}</span>
          </div>
          <div className="finance-detail">
            <span className="finance-label">Gastos</span>
            <span className="finance-val-sub text-expense">-{formatCurrency(totalEgresos)}</span>
          </div>
        </div>
        <div className="finance-savings">
          <span className="finance-label">Ahorro / Inversión</span>
          <span className="finance-val-sub text-yellow">{formatCurrency(totalAhorrado)}</span>
        </div>
      </div>

      {/* ── Grid principal ─── */}
      <div className="finance-content-grid">

        {/* Columna izq: Transacciones */}
        <div className="proyecto-card">
          <div className="proyecto-card-header"><h3>Transacciones</h3></div>

          <div className="tx-toolbar">
            <div className="fin-search-wrapper">
              <svg className="fin-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" className="fin-search-input" placeholder="Buscar descripción o categoría..." value={busquedaTx} onChange={e => setBusquedaTx(e.target.value)} />
              {busquedaTx && <button className="fin-search-clear" onClick={() => setBusquedaTx('')}>×</button>}
            </div>
            <div className="tx-tipo-btns">
              {[['','Todos'],['ingreso','Ingresos'],['egreso','Gastos']].map(([val, label]) => (
                <button key={val} className={`btn-tx-tipo${filtroTipo === val ? ' active' : ''}`}
                  style={filtroTipo === val && val === 'ingreso' ? { borderColor: 'var(--soma-purple)', color: 'var(--soma-purple)', backgroundColor: 'rgba(162,146,197,0.1)' }
                    : filtroTipo === val && val === 'egreso' ? { borderColor: 'var(--soma-orange)', color: 'var(--soma-orange)', backgroundColor: 'rgba(240,127,18,0.1)' } : {}}
                  onClick={() => setFiltroTipo(filtroTipo === val ? '' : val)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="transaction-list">
            {txMostradas.length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', padding: '1rem 0' }}>No hay transacciones para mostrar.</p>}
            {txMostradas.map(tx => (
              <div key={tx.id} className="transaction-item">
                <div className="tx-info">
                  <h4>{tx.descripcion}</h4>
                  <p style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    {tx.fecha} <span style={{ opacity: 0.5 }}>•</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
                    {tx.categoria}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
                  <span className={`tx-amount ${tx.tipo === 'ingreso' ? 'text-income' : 'text-expense'}`}>
                    {tx.tipo === 'ingreso' ? '+' : '-'}{formatCurrency(tx.monto)}
                  </span>
                  <button className="btn-icon-action" title="Editar" onClick={() => abrirModalEditar(tx)}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  {confirmDeleteTxId === tx.id ? (
                    <div className="confirm-delete-inline">
                      <span>¿Eliminar?</span>
                      <button className="btn-confirm-yes" onClick={() => eliminarTx(tx.id)}>Sí</button>
                      <button className="btn-confirm-no" onClick={() => setConfirmDeleteTxId(null)}>No</button>
                    </div>
                  ) : (
                    <button className="btn-icon-action delete-icon" title="Eliminar" onClick={() => setConfirmDeleteTxId(tx.id)}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Columna der */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* Gráfico */}
          <div className="proyecto-card">
            <div className="proyecto-card-header"><h3>Gastos por categoría</h3></div>
            <DonutChart egresos={egresosChart} formatCurrency={formatCurrency} />
          </div>

          {/* Metas */}
          <div className="proyecto-card">
            <div className="proyecto-card-header"><h3>Metas de Ahorro</h3></div>
            <div className="sub-categorias-container" style={{ marginTop: 0, paddingTop: '0.5rem', border: 'none' }}>
              {metas.map(meta => {
                const progreso = Math.min(Math.round((meta.actual / meta.objetivo) * 100), 100);
                return (
                  <div key={meta.id} className="sub-categoria-card">
                    <div className="sub-categoria-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h4 className="sub-categoria-titulo">{meta.titulo}</h4>
                        <button className="btn-icon-action" onClick={() => setExpandedMetas(p => ({ ...p, [meta.id]: !p[meta.id] }))}>
                          {expandedMetas[meta.id] ? '🔼' : '🔽'}
                        </button>
                      </div>
                      <button className="btn-icon-action delete-icon" onClick={() => eliminarMeta(meta.id)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                      </button>
                    </div>
                    <div className="proyecto-progress">
                      <div className="progress-info">
                        <span>{formatCurrency(meta.actual)} / {formatCurrency(meta.objetivo)}</span>
                        <span>{progreso}%</span>
                      </div>
                      <div className="progress-bar-bg">
                        <div className="progress-bar-fill" style={{ width: `${progreso}%`, backgroundColor: 'var(--soma-yellow)' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.2rem' }}>
                        {activeFundGoalId === meta.id ? (
                          <div className="inline-fund-form">
                            <input type="number" className="link-input-modern" style={{ width: '120px', padding: '0.3rem 0.6rem' }} placeholder="Monto..." value={fundAmount} onChange={e => setFundAmount(e.target.value)} autoFocus onKeyDown={e => { if (e.key === 'Enter') handleAbonarMeta(meta.id); }} />
                            <button className="btn-icon-action" style={{ color: 'var(--soma-purple)' }} onClick={() => handleAbonarMeta(meta.id)}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                            </button>
                            <button className="btn-icon-action delete-icon" onClick={() => { setActiveFundGoalId(null); setFundAmount(''); }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                          </div>
                        ) : (
                          <button className="btn-add-tarea" style={{ margin: 0 }} onClick={() => { setActiveFundGoalId(meta.id); setFundAmount(''); }}>+ Abonar fondos</button>
                        )}
                      </div>
                    </div>
                    {expandedMetas[meta.id] && (
                      <div className="meta-historial">
                        <h5 className="historial-title">Historial de Abonos</h5>
                        {meta.historial?.length > 0 ? (
                          <ul className="historial-list">
                            {meta.historial.map(ab => (
                              <li key={ab.id}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                                  {ab.fecha}
                                </span>
                                <span className="text-income">+{formatCurrency(ab.monto)}</span>
                              </li>
                            ))}
                          </ul>
                        ) : <p className="historial-empty">Sin abonos registrados.</p>}
                      </div>
                    )}
                  </div>
                );
              })}
              <button className="btn-add-subcat" onClick={() => setIsMetaModalOpen(true)}>+ Nueva Meta</button>
            </div>
          </div>

          {/* Lista de Deseos */}
          <div className="proyecto-card">
            <div className="proyecto-card-header"><h3>Lista de Deseos</h3></div>
            <div className="deseos-grid">
              {deseos.map(deseo => {
                const pagadas   = deseo.cuotasEstado.filter(c => c).length;
                const pendientes = deseo.cuotas - pagadas;
                const montoCuota = deseo.precio / deseo.cuotas;
                return (
                  <div key={deseo.id} className={`deseo-card ${deseo.completado ? 'completada' : ''}`}>
                    <div className="deseo-card-header">
                      <div className="deseo-title-group">
                        <h4>{deseo.titulo}</h4>
                        {deseo.modelo && <span className="deseo-modelo">{deseo.modelo}</span>}
                      </div>
                      <div className="link-actions">
                        <span className="deseo-precio">{formatCurrency(deseo.precio)}</span>
                        <button className="btn-icon-action delete-icon" onClick={() => eliminarDeseo(deseo.id)}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        </button>
                      </div>
                    </div>
                    {deseo.cuotas > 1 && !deseo.completado && (
                      <div className="deseo-progreso-row">
                        <span className="deseo-cuota-info">{pagadas} de {deseo.cuotas} cuotas · {formatCurrency(montoCuota)}/mes</span>
                        {pendientes > 0 && <span className="deseo-pendiente-badge">Faltan {formatCurrency(montoCuota * pendientes)}</span>}
                      </div>
                    )}
                    {deseo.url && (
                      <a href={deseo.url} target="_blank" rel="noopener noreferrer" className="header-link-icon" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                        Enlace
                      </a>
                    )}
                    <div className="cuotas-grid">
                      {deseo.cuotasEstado.map((p, i) => (
                        <label key={i} className="cuota-checkbox-wrapper" title={`Cuota ${i + 1}`}>
                          <input type="checkbox" checked={p} onChange={() => toggleCuotaDeseo(deseo.id, i)} />
                          <div className="cuota-checkbox-custom">{i + 1}</div>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
              <button className="btn-add-subcat" style={{ marginTop: '1rem' }} onClick={() => setIsDeseoModalOpen(true)}>+ Añadir a la lista</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal Transacción ─── */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{editingTxId ? 'Editar Transacción' : 'Registrar Transacción'}</h2>
            <div className="modal-form">
              <div className="fecha-inputs-row">
                <div className="input-group">
                  <label>Tipo</label>
                  <select value={newTxForm.tipo} onChange={e => setNewTxForm(p => ({ ...p, tipo: e.target.value }))} className="modal-select">
                    <option value="ingreso">Ingreso (+)</option>
                    <option value="egreso">Gasto (-)</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Monto</label>
                  <input type="number" value={newTxForm.monto} onChange={e => setNewTxForm(p => ({ ...p, monto: e.target.value }))} placeholder="0" autoFocus />
                </div>
              </div>
              <div className="input-group">
                <label>Descripción</label>
                <input type="text" value={newTxForm.descripcion} onChange={e => setNewTxForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Ej. Pago de arriendo..." />
              </div>
              <div className="fecha-inputs-row">
                <div className="input-group">
                  <label>Categoría</label>
                  <select value={newTxForm.categoria} onChange={e => setNewTxForm(p => ({ ...p, categoria: e.target.value }))} className="modal-select">
                    {newTxForm.tipo === 'ingreso'
                      ? categoriasIngreso.map(c => <option key={c} value={c}>{c}</option>)
                      : (<>
                          {categoriasEgreso.map(c => <option key={c} value={c}>{c}</option>)}
                          {!editingTxId && tarjetas.length > 0 && (
                            <optgroup label="Mis Tarjetas">
                              {tarjetas.map(t => <option key={`tc-${t.id}`} value={`tc-${t.id}`}>{t.banco} ({t.numero})</option>)}
                            </optgroup>
                          )}
                        </>)
                    }
                  </select>
                </div>
                <div className="input-group">
                  <label>Fecha</label>
                  <input type="date" className="date-picker-modern full-width-date" style={{ padding: '0.8rem' }} value={newTxForm.fecha} onChange={e => setNewTxForm(p => ({ ...p, fecha: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => { setIsModalOpen(false); setEditingTxId(null); }}>Cancelar</button>
              <button className="btn-primary" onClick={handleSaveTx}>{editingTxId ? 'Guardar cambios' : 'Guardar Transacción'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Deseo ─── */}
      {isDeseoModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Añadir a la Lista de Deseos</h2>
            <div className="modal-form">
              <div className="input-group">
                <label>Nombre</label>
                <input type="text" value={newDeseoForm.titulo} onChange={e => setNewDeseoForm(p => ({ ...p, titulo: e.target.value }))} placeholder="Ej. MacBook Pro..." autoFocus />
              </div>
              <div className="input-group">
                <label>Modelo / Variante (opcional)</label>
                <input type="text" value={newDeseoForm.modelo} onChange={e => setNewDeseoForm(p => ({ ...p, modelo: e.target.value }))} placeholder="Ej. M3 Pro, 16GB..." />
              </div>
              <div className="input-group">
                <label>URL de la tienda (opcional)</label>
                <input type="url" value={newDeseoForm.url} onChange={e => setNewDeseoForm(p => ({ ...p, url: e.target.value }))} placeholder="https://..." />
              </div>
              <div className="fecha-inputs-row">
                <div className="input-group">
                  <label>Precio Total</label>
                  <input type="number" value={newDeseoForm.precio} onChange={e => setNewDeseoForm(p => ({ ...p, precio: e.target.value }))} placeholder="0" />
                </div>
                <div className="input-group">
                  <label>Dividir en cuotas</label>
                  <input type="number" min="1" value={newDeseoForm.cuotas} onChange={e => setNewDeseoForm(p => ({ ...p, cuotas: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setIsDeseoModalOpen(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleCreateDeseo}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Meta ─── */}
      {isMetaModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Nueva Meta de Ahorro</h2>
            <div className="modal-form">
              <div className="input-group">
                <label>Nombre de la meta</label>
                <input type="text" value={newMetaForm.titulo} onChange={e => setNewMetaForm(p => ({ ...p, titulo: e.target.value }))} placeholder="Ej. Fondo de emergencia..." autoFocus />
              </div>
              <div className="input-group">
                <label>Monto Objetivo</label>
                <input type="number" value={newMetaForm.objetivo} onChange={e => setNewMetaForm(p => ({ ...p, objetivo: e.target.value }))} placeholder="0" />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setIsMetaModalOpen(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleCreateMeta}>Guardar Meta</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Finanzas;
