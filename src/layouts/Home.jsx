import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, onSnapshot, setDoc, updateDoc, collection, query } from 'firebase/firestore';
import './Proyectos.css';
import './Finanzas.css';
import './Home.css';
import './Fitness.css'; // Importamos para utilizar el diseño animado de la racha

// --- DATOS SIMULADOS PARA EL DASHBOARD ---
const mockActivityGraph = Array.from({ length: 53 * 7 }).map(() => {
  return 0; // Por defecto todo en 0
});

const Home = ({ userName }) => {
  // --- SALUDO DINÁMICO ---
  const [greeting] = useState(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Buenos días';
    if (hour >= 12 && hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  });

  const currentDate = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const formatCurrency = (value) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
  
  // --- ÍNDICE DEL DÍA ACTUAL PARA LA GRÁFICA ---
  const todayObj = new Date();
  const startOfYear = new Date(todayObj.getFullYear(), 0, 1);
  
  // Ajustar para que el índice 0 sea siempre lunes, alineándose con el eje Y
  const dayOffset = startOfYear.getDay() === 0 ? 6 : startOfYear.getDay() - 1;
  const graphStartDate = new Date(startOfYear);
  graphStartDate.setDate(startOfYear.getDate() - dayOffset);
  
  const utcToday = Date.UTC(todayObj.getFullYear(), todayObj.getMonth(), todayObj.getDate());
  const utcGraphStart = Date.UTC(graphStartDate.getFullYear(), graphStartDate.getMonth(), graphStartDate.getDate());
  const currentDayIndex = Math.floor((utcToday - utcGraphStart) / (1000 * 60 * 60 * 24));

  const getTooltipText = (i) => {
    const d = new Date(utcGraphStart + i * (1000 * 60 * 60 * 24));
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dayNamesFull = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    return `${dayNamesFull[i % 7]} ${dd}/${mm}${i === currentDayIndex ? ' (Hoy)' : ''}`;
  };

  // --- ESTADOS PARA DESCARGAR DATOS REALES DE FIREBASE ---
  const [transacciones, setTransacciones] = useState([]);
  const [metas, setMetas] = useState([]);
  const [notas, setNotas] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [areas, setAreas] = useState([]);
  const [habitos, setHabitos] = useState([]);
  const [cursos, setCursos] = useState([]);

  const [mostrarMasProyectos, setMostrarMasProyectos] = useState(false);

  // --- RACHA DE ENTRENAMIENTO ---
  const rachaEntrenamiento = 0;
  let rachaIcon = '🧊';
  let rachaClass = 'racha-none';
  if (rachaEntrenamiento > 0 && rachaEntrenamiento < 3) { rachaIcon = '🏃'; rachaClass = 'racha-low'; }
  else if (rachaEntrenamiento >= 3 && rachaEntrenamiento < 7) { rachaIcon = '🔥'; rachaClass = 'racha-med'; }
  else if (rachaEntrenamiento >= 7) { rachaIcon = '⚡'; rachaClass = 'racha-high'; }

  // --- CALENDARIO 53 SEMANAS ---
  // Simulamos datos de actividad (7 días x 53 semanas = 371 bloques)
  const [activityGraph, setActivityGraph] = useState(mockActivityGraph);

  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const unsubs = [];

    // Descargamos las colecciones activas necesarias para el Dashboard
    const cols = ['transacciones', 'metas', 'notas', 'proyectos', 'areas', 'habitos', 'cursos'];
    cols.forEach(c => {
      const q = query(collection(db, 'usuarios', uid, c));
      const unsub = onSnapshot(q, snap => {
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (c === 'transacciones') setTransacciones(data);
        if (c === 'metas') setMetas(data);
        if (c === 'notas') setNotas(data);
        if (c === 'proyectos') setProyectos(data);
        if (c === 'areas') setAreas(data);
        if (c === 'habitos') setHabitos(data);
        if (c === 'cursos') setCursos(data);
      });
      unsubs.push(unsub);
    });

    const unsubAct = onSnapshot(doc(db, 'usuarios', uid), (docSnap) => {
      if (docSnap.exists() && docSnap.data().activityGraph) {
        setActivityGraph(docSnap.data().activityGraph);
      }
    });
    unsubs.push(unsubAct);

    return () => unsubs.forEach(unsub => unsub());
  }, []);

  // --- PROCESAMIENTO DE DATOS PARA EL DASHBOARD ---
  
  // Helper de progreso (Proyectos, Áreas)
  const getProgress = (item) => {
    if (!item.subCategorias || item.subCategorias.length === 0) return 0;
    const progs = item.subCategorias.map(sc => {
      if (!sc.tareas || sc.tareas.length === 0) return 0;
      return (sc.tareas.filter(t => t.completada).length / sc.tareas.length) * 100;
    });
    return Math.round(progs.reduce((a, b) => a + b, 0) / progs.length);
  };

  const colors = ['var(--soma-purple)', 'var(--soma-orange)', 'var(--soma-yellow)', '#3498db', '#2ecc71'];
  const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;

  // Finanzas del Mes
  let balanceTotal = 0, ingresosMes = 0, egresosMes = 0;
  transacciones.forEach(t => {
    if (t.tipo === 'ingreso') balanceTotal += t.monto;
    if (t.tipo === 'egreso') balanceTotal -= t.monto;
    const d = new Date(t.createdAt || t.fecha);
    if (d.getMonth() === todayObj.getMonth() && d.getFullYear() === todayObj.getFullYear()) {
       if (t.tipo === 'ingreso') ingresosMes += t.monto;
       if (t.tipo === 'egreso') egresosMes += t.monto;
    }
  });
  const ahorrosTotal = metas.reduce((acc, m) => acc + (m.actual || 0), 0);
  const finanzasData = { balance: balanceTotal, ingresos: ingresosMes, egresos: egresosMes, ahorros: ahorrosTotal };

  // Bloques Visibles (Máximo 5 para escritorio)
  const proyectosActivos = proyectos.filter(p => p.estado === 'en progreso' && !p.archivada).map((p, i) => ({
    id: p.id, titulo: p.titulo, progreso: getProgress(p), color: colors[i % colors.length]
  })).slice(0, 5);
  const proyectosVisibles = mostrarMasProyectos ? proyectos.filter(p => p.estado === 'en progreso' && !p.archivada) : proyectosActivos;

  const metasAhorro = metas.slice(0, 5);
  const notasPendientes = notas.filter(n => !n.archivada).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
  const areasVida = areas.filter(a => a.estado === 'en progreso' && !a.archivada).map((a, i) => ({
    nombre: a.titulo, progreso: getProgress(a), color: colors[(i + 2) % colors.length]
  })).slice(0, 5);
  
  const habitosHoy = habitos.map(h => ({
    id: h.id, nombre: h.nombre, completado: !!(h.registros && h.registros[todayStr])
  })).slice(0, 5);

  // Calculo de total de tareas pendientes en todos los módulos
  let totalTareas = 0;
  const countT = (list) => list.forEach(item => {
     if (!item.archivada && item.estado !== 'completado') {
       if (item.tareas) totalTareas += item.tareas.filter(t => !t.completada).length;
       if (item.subCategorias) {
          item.subCategorias.forEach(sc => { if (sc.tareas) totalTareas += sc.tareas.filter(t => !t.completada).length; });
       }
     }
  });
  countT(proyectos); countT(areas); countT(cursos); countT(notas);

  const toggleActivityLevel = async (index) => {
    const newGraph = [...activityGraph];
    newGraph[index] = (newGraph[index] + 1) % 5; // Cicla entre 0, 1, 2, 3 y 4
    setActivityGraph(newGraph); // Actualización visual instantánea
    
    if (auth.currentUser) {
      await setDoc(doc(db, 'usuarios', auth.currentUser.uid), { activityGraph: newGraph }, { merge: true });
    }
  };

  // --- CÁLCULO DEL PORCENTAJE GENERAL DE ACTIVIDAD ---
  const totalScore = activityGraph.reduce((a, b) => a + b, 0);
  const maxScore = activityGraph.length * 4; // El nivel máximo ahora es 4
  const activityPercentage = Math.round((totalScore / maxScore) * 100) || 0;

  const toggleHabit = async (id) => {
    const habit = habitos.find(h => h.id === id);
    if (habit && auth.currentUser) {
      const newRegistros = { ...(habit.registros || {}) };
      if (newRegistros[todayStr]) delete newRegistros[todayStr];
      else newRegistros[todayStr] = true;
      await updateDoc(doc(db, 'usuarios', auth.currentUser.uid, 'habitos', id), {
        registros: newRegistros
      });
    }
  };

  return (
    <div className="home-container">
      {/* --- CABECERA (SALUDO Y TAREAS PENDIENTES) --- */}
      <header className="home-header-flex">
        <div className="home-greeting-section">
          <h1 className="home-greeting-title">{greeting}{userName ? `, ${userName}` : ''} 👋</h1>
          <p className="home-date-subtitle">{currentDate}</p>
        </div>
        <div className="header-task-stat">
          <span className="task-stat-number">{totalTareas}</span>
          <span className="task-stat-label">Tareas Pendientes</span>
        </div>
      </header>

      {/* --- ACTIVIDAD ANUAL (ANCHO COMPLETO) --- */}
      <div className="dashboard-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h3 className="dashboard-card-title">Actividad Anual</h3>
            <span className="status-badge" style={{ backgroundColor: 'rgba(162, 146, 197, 0.15)', color: 'var(--soma-purple)', border: '1px solid rgba(162, 146, 197, 0.3)' }}>
              {activityPercentage}% General
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <div className="activity-block" style={{ width: '12px', height: '12px', cursor: 'default', transform: 'none' }}></div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>0%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <div className="activity-block level-1" style={{ width: '12px', height: '12px', cursor: 'default', transform: 'none' }}></div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>25%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <div className="activity-block level-2" style={{ width: '12px', height: '12px', cursor: 'default', transform: 'none' }}></div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>50%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <div className="activity-block level-3" style={{ width: '12px', height: '12px', cursor: 'default', transform: 'none' }}></div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>75%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <div className="activity-block level-4" style={{ width: '12px', height: '12px', cursor: 'default', transform: 'none' }}></div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>100%</span>
            </div>
          </div>
        </div>
        <div className="activity-graph-wrapper">
          <div className="activity-x-axis">
            {Array.from({ length: 53 }).map((_, i) => (
              <span key={i} className="graph-label-x">{i % 4 === 0 ? i + 1 : ''}</span>
            ))}
          </div>
          <div className="activity-graph-inner">
            <div className="activity-y-axis">
              <span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span>
            </div>
            <div className="activity-graph">
              {activityGraph.map((level, i) => (
                <div 
                  key={i} 
                  className={`activity-block level-${level} ${i === currentDayIndex ? 'is-today' : ''}`} 
                  title={getTooltipText(i)}
                  onClick={() => toggleActivityLevel(i)}
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        
        {/* --- COLUMNA IZQUIERDA --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Resumen Financiero */}
          <div className="dashboard-card">
            <h3 className="dashboard-card-title">Resumen Financiero</h3>
            <div className="finance-single-block">
              <div className="finance-main-balance">
                <span className="finance-label">Balance Total</span>
                <h2 className="finance-val-main">{formatCurrency(finanzasData.balance)}</h2>
              </div>
              <div className="finance-details-row">
                <div className="finance-detail">
                  <span className="finance-label">Ingresos</span>
                  <span className="finance-val-sub text-income">+{formatCurrency(finanzasData.ingresos)}</span>
                </div>
                <div className="finance-detail">
                  <span className="finance-label">Egresos</span>
                  <span className="finance-val-sub text-expense">-{formatCurrency(finanzasData.egresos)}</span>
                </div>
              </div>
              <div className="finance-savings">
                <span className="finance-label">Ahorros</span>
                <span className="finance-val-sub text-yellow">{formatCurrency(finanzasData.ahorros)}</span>
              </div>
            </div>
          </div>

          {/* --- FILA COMPARTIDA: NOTAS Y PROYECTOS --- */}
          <div className="dashboard-shared-row">
            {/* Notas Pendientes */}
            <div className="dashboard-card">
              <h3 className="dashboard-card-title">Notas Recientes</h3>
              <div className="transaction-list limit-items-mobile" style={{ marginTop: '0.5rem' }}>
                {notasPendientes.map(nota => (
                  <div key={nota.id} className="transaction-item" style={{ padding: '0.8rem 1rem' }}>
                    <div className="tx-info">
                      <h4 style={{ fontSize: '0.95rem' }}>{nota.titulo}</h4>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>📅 {nota.fecha}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Proyectos Activos (Barra de Progreso) */}
            <div className="dashboard-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 className="dashboard-card-title">Proyectos Activos</h3>
                {proyectosActivos.length > 3 && (
                  <button className="btn-icon-action" style={{ fontSize: '0.8rem' }} onClick={() => setMostrarMasProyectos(!mostrarMasProyectos)}>
                    {mostrarMasProyectos ? 'Ocultar' : 'Ver más'}
                  </button>
                )}
              </div>
              <div className="limit-items-mobile" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginTop: '0.5rem' }}>
                {proyectosVisibles.map((proyecto) => (
                  <div key={proyecto.id} className="proyecto-progress">
                    <div className="progress-info">
                      <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>{proyecto.titulo}</span>
                      <span>{proyecto.progreso}%</span>
                    </div>
                    <div className="progress-bar-bg" style={{ height: '8px' }}>
                      <div className="progress-bar-fill" style={{ width: `${proyecto.progreso}%`, backgroundColor: proyecto.color }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Metas de Ahorro */}
          <div className="dashboard-card">
            <h3 className="dashboard-card-title">Metas de Ahorro</h3>
            <div className="limit-items-mobile" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginTop: '0.5rem' }}>
              {metasAhorro.map((meta) => {
                const progreso = Math.min(Math.round((meta.actual / meta.objetivo) * 100), 100);
                return (
                  <div key={meta.id} className="proyecto-progress">
                    <div className="progress-info">
                      <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>{meta.titulo}</span>
                      <span>{formatCurrency(meta.actual)} / {formatCurrency(meta.objetivo)} ({progreso}%)</span>
                    </div>
                    <div className="progress-bar-bg" style={{ height: '8px' }}>
                      <div className="progress-bar-fill" style={{ width: `${progreso}%`, backgroundColor: 'var(--soma-yellow)' }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* --- COLUMNA DERECHA --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Racha de Entrenamiento */}
          <div className="dashboard-card">
            <h3 className="dashboard-card-title">Racha de Entrenamiento</h3>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
              <div className={`racha-badge ${rachaClass}`} style={{ fontSize: '1.2rem', padding: '0.8rem 1.5rem', margin: '0.5rem 0' }}>
                <span className="racha-icon" style={{ fontSize: '1.5rem' }}>{rachaIcon}</span>
                <span className="racha-text">{rachaEntrenamiento} Días</span>
              </div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>¡Mantén el ritmo!</span>
            </div>
          </div>

          {/* Hábitos de Hoy */}
          <div className="dashboard-card">
            <h3 className="dashboard-card-title">Hábitos de Hoy</h3>
            <div className="tareas-list-container" style={{ marginTop: 0 }}>
              <ul className="tareas-list limit-items-mobile">
                {habitosHoy.map(habit => (
                  <li key={habit.id} className="tarea-item" style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '0.6rem', borderRadius: '6px' }}>
                    <label className="tarea-label">
                      <input type="checkbox" checked={habit.completado} onChange={() => toggleHabit(habit.id)} />
                      <span className={`tarea-texto-input ${habit.completado ? 'completada' : ''}`} style={{ pointerEvents: 'none' }}>
                        {habit.nombre}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Áreas de la Vida */}
          <div className="dashboard-card">
            <h3 className="dashboard-card-title">Balance de Áreas</h3>
            <div className="limit-items-mobile" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginTop: '0.5rem' }}>
              {areasVida.map((area, index) => (
                <div key={index} className="proyecto-progress">
                  <div className="progress-info">
                    <span style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>{area.nombre}</span>
                    <span>{area.progreso}%</span>
                  </div>
                  <div className="progress-bar-bg" style={{ height: '8px' }}>
                    <div className="progress-bar-fill" style={{ width: `${area.progreso}%`, backgroundColor: area.color }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Home;