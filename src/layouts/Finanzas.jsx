import { useState } from 'react';
import './Proyectos.css'; // Reutilizamos estilos de layout, modales y botones
import './Finanzas.css'; // Estilos específicos de tarjetas de finanzas

const Finanzas = ({ categoriasIngreso = [], categoriasEgreso = [], tarjetas = [], setTarjetas }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeseoModalOpen, setIsDeseoModalOpen] = useState(false);
  const [newTxForm, setNewTxForm] = useState({ tipo: 'egreso', monto: '', descripcion: '', categoria: 'Alimentación', fecha: new Date().toISOString().split('T')[0] });
  const [newDeseoForm, setNewDeseoForm] = useState({ titulo: '', modelo: '', url: '', precio: '', cuotas: 1 });
  
  const [activeFundGoalId, setActiveFundGoalId] = useState(null);
  const [fundAmount, setFundAmount] = useState('');
  const [expandedMetas, setExpandedMetas] = useState({});

  // --- Estados de Datos ---
  const [transacciones, setTransacciones] = useState([
    { id: 1, tipo: 'ingreso', monto: 2500, descripcion: 'Sueldo Mensual', categoria: 'Salario', fecha: '2023-10-01' },
    { id: 2, tipo: 'egreso', monto: 45, descripcion: 'Compra en Supermercado', categoria: 'Alimentación', fecha: '2023-10-05' },
    { id: 3, tipo: 'egreso', monto: 120, descripcion: 'Pago de Luz e Internet', categoria: 'Servicios', fecha: '2023-10-10' },
    { id: 4, tipo: 'ingreso', monto: 300, descripcion: 'Trabajo Freelance', categoria: 'Extra', fecha: '2023-10-15' },
  ]);

  const [metas, setMetas] = useState([
    { id: 1, titulo: 'Fondo de Emergencia', objetivo: 5000, actual: 2100, historial: [{ id: 101, fecha: '2023-10-15', monto: 1100 }, { id: 102, fecha: '2023-10-01', monto: 1000 }] },
    { id: 2, titulo: 'Viaje a Japón', objetivo: 3000, actual: 450, historial: [{ id: 201, fecha: '2023-10-20', monto: 450 }] }
  ]);

  const [deseos, setDeseos] = useState([
    { id: 1, titulo: 'Monitor 4K', modelo: 'Dell UltraSharp', url: 'https://amazon.com', precio: 350, cuotas: 3, cuotasEstado: [true, false, false], completado: false },
    { id: 2, titulo: 'Silla Ergonómica', modelo: 'Herman Miller', url: '', precio: 200, cuotas: 1, cuotasEstado: [true], completado: true },
    { id: 3, titulo: 'Licencia Figma Pro', modelo: 'Anual', url: 'https://figma.com', precio: 144, cuotas: 12, cuotasEstado: Array(12).fill(false), completado: false }
  ]);

  // --- Cálculos ---
  const totalIngresos = transacciones.filter(t => t.tipo === 'ingreso').reduce((acc, curr) => acc + parseFloat(curr.monto), 0);
  const totalEgresos = transacciones.filter(t => t.tipo === 'egreso').reduce((acc, curr) => acc + parseFloat(curr.monto), 0);
  const balanceTotal = totalIngresos - totalEgresos;
  const totalAhorrado = metas.reduce((acc, curr) => acc + parseFloat(curr.actual), 0);

  // --- Formateador de Moneda ---
  const formatCurrency = (value) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'USD' }).format(value);

  // --- Manipulación de Transacciones ---
  const handleCreateTx = () => {
    if (!newTxForm.monto || !newTxForm.descripcion) return alert('El monto y la descripción son obligatorios.');
    
    let categoriaFinal = newTxForm.categoria;

    // Deducir del saldo de la tarjeta si se seleccionó una
    if (newTxForm.tipo === 'egreso' && String(newTxForm.categoria).startsWith('tc-')) {
      const cardId = parseInt(newTxForm.categoria.split('-')[1]);
      const tarjetaSeleccionada = tarjetas.find(t => t.id === cardId);
      if (tarjetaSeleccionada && setTarjetas) {
        categoriaFinal = `💳 ${tarjetaSeleccionada.banco} ${tarjetaSeleccionada.numero}`;
        setTarjetas(prev => prev.map(t => t.id === cardId ? { ...t, utilizado: t.utilizado + parseFloat(newTxForm.monto) } : t));
      }
    }

    const nuevaTx = {
      id: Date.now(),
      tipo: newTxForm.tipo,
      monto: parseFloat(newTxForm.monto),
      descripcion: newTxForm.descripcion,
      categoria: categoriaFinal,
      fecha: newTxForm.fecha
    };
    setTransacciones([nuevaTx, ...transacciones]);
    setIsModalOpen(false);
    setNewTxForm({ tipo: 'egreso', monto: '', descripcion: '', categoria: 'Alimentación', fecha: new Date().toISOString().split('T')[0] });
  };

  const eliminarTx = (id) => setTransacciones(prev => prev.filter(t => t.id !== id));

  // --- Manipulación de Metas y Deseos ---
  const agregarMeta = () => {
    const titulo = prompt('Nombre de la nueva meta:');
    const objetivo = prompt('Monto objetivo:');
    if (titulo && objetivo) {
      setMetas([...metas, { id: Date.now(), titulo, objetivo: parseFloat(objetivo), actual: 0, historial: [] }]);
    }
  };

  const toggleExpandMeta = (id) => {
    setExpandedMetas(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAbonarMeta = (id) => {
    if (fundAmount && !isNaN(fundAmount) && Number(fundAmount) > 0) {
      const nuevoAbono = { id: Date.now(), monto: parseFloat(fundAmount), fecha: new Date().toISOString().split('T')[0] };
      setMetas(prev => prev.map(m => m.id === id ? { ...m, actual: m.actual + parseFloat(fundAmount), historial: [nuevoAbono, ...(m.historial || [])] } : m));
      setActiveFundGoalId(null);
      setFundAmount('');
    }
  };

  const eliminarMeta = (id) => setMetas(prev => prev.filter(m => m.id !== id));

  const handleCreateDeseo = () => {
    if (!newDeseoForm.titulo || !newDeseoForm.precio) return alert('El título y precio son obligatorios.');
    const cuotasNum = parseInt(newDeseoForm.cuotas) || 1;
    const nuevoDeseo = {
      id: Date.now(),
      ...newDeseoForm,
      precio: parseFloat(newDeseoForm.precio),
      cuotas: cuotasNum,
      cuotasEstado: Array(cuotasNum).fill(false),
      completado: false
    };
    setDeseos([...deseos, nuevoDeseo]);
    setIsDeseoModalOpen(false);
    setNewDeseoForm({ titulo: '', modelo: '', url: '', precio: '', cuotas: 1 });
  };

  const toggleCuotaDeseo = (deseoId, index) => {
    setDeseos(prev => prev.map(d => {
      if (d.id === deseoId) {
        const nuevoEstado = [...d.cuotasEstado];
        nuevoEstado[index] = !nuevoEstado[index];
        const completado = nuevoEstado.every(c => c); // Se completa si todas las cuotas son true
        return { ...d, cuotasEstado: nuevoEstado, completado };
      }
      return d;
    }));
  };

  const eliminarDeseo = (id) => setDeseos(prev => prev.filter(d => d.id !== id));

  return (
    <div className="proyectos-container">
      <header className="proyectos-header">
        <div>
          <h1 className="page-title">Finanzas</h1>
          <p className="page-subtitle">Control de ingresos, gastos y crecimiento económico.</p>
        </div>
        <button className="btn-prominent" onClick={() => setIsModalOpen(true)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          Nueva Transacción
        </button>
      </header>

      {/* --- TARJETAS DE RESUMEN --- */}
      <div className="finance-summary-grid">
        <div className="finance-summary-card">
          <span className="summary-title">Balance Total</span>
          <h3 className={`summary-amount ${balanceTotal >= 0 ? 'text-income' : 'text-expense'}`}>{formatCurrency(balanceTotal)}</h3>
        </div>
        <div className="finance-summary-card">
          <span className="summary-title">Ingresos del Mes</span>
          <h3 className="summary-amount text-income">{formatCurrency(totalIngresos)}</h3>
        </div>
        <div className="finance-summary-card">
          <span className="summary-title">Gastos del Mes</span>
          <h3 className="summary-amount text-expense">{formatCurrency(totalEgresos)}</h3>
        </div>
        <div className="finance-summary-card">
          <span className="summary-title">Ahorro / Inversión</span>
          <h3 className="summary-amount text-yellow">{formatCurrency(totalAhorrado)}</h3>
        </div>
      </div>

      {/* --- GRID DE CONTENIDO --- */}
      <div className="finance-content-grid">
        
        {/* Columna Izquierda: Actividad */}
        <div className="proyecto-card">
          <div className="proyecto-card-header">
            <h3>Últimas Transacciones</h3>
          </div>
          <div className="transaction-list">
            {transacciones.map(tx => (
              <div key={tx.id} className="transaction-item">
                <div className="tx-info">
                  <h4>{tx.descripcion}</h4>
                  <p style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> 
                    {tx.fecha} <span style={{ opacity: 0.5 }}>•</span> 
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg> 
                    {tx.categoria}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span className={`tx-amount ${tx.tipo === 'ingreso' ? 'text-income' : 'text-expense'}`}>
                    {tx.tipo === 'ingreso' ? '+' : '-'}{formatCurrency(tx.monto)}
                  </span>
                  <button className="btn-icon-action delete-icon" title="Eliminar Transacción" onClick={() => eliminarTx(tx.id)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                  </button>
                </div>
              </div>
            ))}
            {transacciones.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No hay transacciones registradas.</p>}
          </div>
        </div>

        {/* Columna Derecha: Metas y Deseos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Metas Económicas */}
          <div className="proyecto-card">
            <div className="proyecto-card-header">
              <h3>Metas de Ahorro</h3>
            </div>
            <div className="sub-categorias-container" style={{ marginTop: '0', paddingTop: '0.5rem', border: 'none' }}>
              {metas.map(meta => {
                const progreso = Math.min(Math.round((meta.actual / meta.objetivo) * 100), 100);
                return (
                  <div key={meta.id} className="sub-categoria-card">
                    <div className="sub-categoria-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h4 className="sub-categoria-titulo">{meta.titulo}</h4>
                        <button className="btn-icon-action" style={{ fontSize: '0.8rem' }} onClick={() => toggleExpandMeta(meta.id)}>
                          {expandedMetas[meta.id] ? '🔼' : '🔽'}
                        </button>
                      </div>
                      <div className="link-actions">
                        <button className="btn-icon-action delete-icon" title="Eliminar Meta" onClick={() => eliminarMeta(meta.id)}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                      </div>
                    </div>
                    <div className="proyecto-progress">
                      <div className="progress-info">
                        <span>{formatCurrency(meta.actual)} / {formatCurrency(meta.objetivo)}</span>
                        <span>{progreso}%</span>
                      </div>
                      <div className="progress-bar-bg">
                        <div className="progress-bar-fill" style={{ width: `${progreso}%`, backgroundColor: 'var(--soma-yellow)' }}></div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.2rem' }}>
                        {activeFundGoalId === meta.id ? (
                          <div className="inline-fund-form">
                            <input type="number" className="link-input-modern" style={{ width: '120px', padding: '0.3rem 0.6rem' }} placeholder="Monto..." value={fundAmount} onChange={e => setFundAmount(e.target.value)} autoFocus />
                            <button className="btn-icon-action" style={{ color: 'var(--soma-purple)' }} onClick={() => handleAbonarMeta(meta.id)}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </button>
                            <button className="btn-icon-action delete-icon" onClick={() => { setActiveFundGoalId(null); setFundAmount(''); }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                          </div>
                        ) : (
                          <button className="btn-add-tarea" style={{ margin: 0 }} onClick={() => { setActiveFundGoalId(meta.id); setFundAmount(''); }}>+ Abonar fondos</button>
                        )}
                      </div>
                    </div>

                    {/* Historial de Abonos Desplegable */}
                    {expandedMetas[meta.id] && (
                      <div className="meta-historial">
                        <h5 className="historial-title">Historial de Abonos</h5>
                        {meta.historial && meta.historial.length > 0 ? (
                          <ul className="historial-list">
                            {meta.historial.map(abono => (
                              <li key={abono.id}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> {abono.fecha}
                                </span>
                                <span className="text-income">+{formatCurrency(abono.monto)}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="historial-empty">Sin abonos registrados.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              <button className="btn-add-subcat" onClick={agregarMeta}>+ Nueva Meta</button>
            </div>
          </div>

          {/* Lista de Deseos */}
          <div className="proyecto-card">
            <div className="proyecto-card-header">
              <h3>Lista de Deseos</h3>
            </div>
            <div className="deseos-grid">
              {deseos.map(deseo => (
                <div key={deseo.id} className={`deseo-card ${deseo.completado ? 'completada' : ''}`}>
                  <div className="deseo-card-header">
                    <div className="deseo-title-group">
                      <h4>{deseo.titulo}</h4>
                      {deseo.modelo && <span className="deseo-modelo">{deseo.modelo}</span>}
                    </div>
                    <div className="link-actions">
                      <span className="deseo-precio">{formatCurrency(deseo.precio)}</span>
                      <button className="btn-icon-action delete-icon" title="Eliminar Deseo" onClick={() => eliminarDeseo(deseo.id)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                      </button>
                    </div>
                  </div>
                  <div className="deseo-card-body">
                    {deseo.cuotas > 1 && <span className="deseo-cuota-info">Meta mensual: <strong>{formatCurrency(deseo.precio / deseo.cuotas)}</strong></span>}
                    {deseo.url && <a href={deseo.url} target="_blank" rel="noopener noreferrer" className="header-link-icon" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }} title="Ver en tienda">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                      Enlace a tienda
                    </a>}
                  </div>
                  <div className="deseo-cuotas-container">
                    <div className="cuotas-grid">
                      {deseo.cuotasEstado.map((pagada, index) => (
                        <label key={index} className="cuota-checkbox-wrapper" title={`Cuota ${index + 1}`}>
                          <input type="checkbox" checked={pagada} onChange={() => toggleCuotaDeseo(deseo.id, index)} />
                          <div className="cuota-checkbox-custom">{index + 1}</div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              <button className="btn-add-subcat" style={{ marginTop: '1rem' }} onClick={() => setIsDeseoModalOpen(true)}>+ Añadir a la lista</button>
            </div>
          </div>

        </div>
      </div>

      {/* --- MODAL NUEVA TRANSACCIÓN --- */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Registrar Transacción</h2>
            <div className="modal-form">
              <div className="fecha-inputs-row">
                <div className="input-group">
                  <label>Tipo</label>
                  <select value={newTxForm.tipo} onChange={e => setNewTxForm(prev => ({ ...prev, tipo: e.target.value }))} className="modal-select">
                    <option value="ingreso">Ingreso (+)</option>
                    <option value="egreso">Gasto (-)</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Monto</label>
                  <input type="number" value={newTxForm.monto} onChange={e => setNewTxForm(prev => ({ ...prev, monto: e.target.value }))} placeholder="0.00" />
                </div>
              </div>
              <div className="input-group">
                <label>Descripción</label>
                <input type="text" value={newTxForm.descripcion} onChange={e => setNewTxForm(prev => ({ ...prev, descripcion: e.target.value }))} placeholder="Ej. Pago de arriendo..." />
              </div>
              <div className="fecha-inputs-row">
                <div className="input-group">
                  <label>Categoría</label>
                  <select value={newTxForm.categoria} onChange={e => setNewTxForm(prev => ({ ...prev, categoria: e.target.value }))} className="modal-select">
                    {newTxForm.tipo === 'ingreso' 
                      ? categoriasIngreso.map(cat => <option key={cat} value={cat}>{cat}</option>)
                      : (
                        <>
                          {categoriasEgreso.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                          <optgroup label="Mis Tarjetas de Crédito">
                            {tarjetas.map(t => <option key={`tc-${t.id}`} value={`tc-${t.id}`}>{t.banco} ({t.numero})</option>)}
                          </optgroup>
                        </>
                      )
                    }
                  </select>
                </div>
                <div className="input-group">
                  <label>Fecha</label>
                  <div className="date-badge" style={{ padding: '0' }}>
                    <input type="date" className="date-picker-modern full-width-date" style={{ padding: '0.8rem' }} value={newTxForm.fecha} onChange={e => setNewTxForm(prev => ({ ...prev, fecha: e.target.value }))} />
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleCreateTx}>Guardar Transacción</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL NUEVO DESEO --- */}
      {isDeseoModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Añadir a la Lista de Deseos</h2>
            <div className="modal-form">
              <div className="input-group">
                <label>Nombre del Producto / Experiencia</label>
                <input type="text" value={newDeseoForm.titulo} onChange={e => setNewDeseoForm(prev => ({ ...prev, titulo: e.target.value }))} placeholder="Ej. MacBook Pro..." />
              </div>
              <div className="input-group">
                <label>Modelo o Variante (Opcional)</label>
                <input type="text" value={newDeseoForm.modelo} onChange={e => setNewDeseoForm(prev => ({ ...prev, modelo: e.target.value }))} placeholder="Ej. M3 Pro, 16GB RAM..." />
              </div>
              <div className="input-group">
                <label>Enlace de la tienda (URL)</label>
                <input type="url" value={newDeseoForm.url} onChange={e => setNewDeseoForm(prev => ({ ...prev, url: e.target.value }))} placeholder="https://..." />
              </div>
              <div className="fecha-inputs-row">
                <div className="input-group">
                  <label>Precio Total</label>
                  <input type="number" value={newDeseoForm.precio} onChange={e => setNewDeseoForm(prev => ({ ...prev, precio: e.target.value }))} placeholder="0.00" />
                </div>
                <div className="input-group">
                  <label>Dividir en (Meses/Cuotas)</label>
                  <input type="number" min="1" value={newDeseoForm.cuotas} onChange={e => setNewDeseoForm(prev => ({ ...prev, cuotas: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setIsDeseoModalOpen(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleCreateDeseo}>Guardar Deseo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Finanzas;