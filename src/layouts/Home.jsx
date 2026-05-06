import { useState } from 'react';
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

  const finanzasData = { balance: 0, ingresos: 0, egresos: 0, ahorros: 0 };
  
  // --- PROYECTOS ACTIVOS ---
  const [mostrarMasProyectos, setMostrarMasProyectos] = useState(false);
  const proyectosActivos = [];
  const proyectosVisibles = mostrarMasProyectos ? proyectosActivos.slice(0, 6) : proyectosActivos.slice(0, 3);

  // --- METAS DE AHORRO ---
  const metasAhorro = [];

  // --- NOTAS PENDIENTES ---
  const notasPendientes = [];

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

  const toggleActivityLevel = (index) => {
    setActivityGraph(prev => {
      const newGraph = [...prev];
      newGraph[index] = (newGraph[index] + 1) % 3; // Cicla entre 0, 1 y 2
      return newGraph;
    });
  };

  // --- CÁLCULO DEL PORCENTAJE GENERAL DE ACTIVIDAD ---
  const totalScore = activityGraph.reduce((a, b) => a + b, 0);
  const maxScore = activityGraph.length * 2; // El nivel máximo ahora es 2
  const activityPercentage = Math.round((totalScore / maxScore) * 100) || 0;

  const areasVida = [];

  const [habitosHoy, setHabitosHoy] = useState([]);

  const toggleHabit = (id) => {
    setHabitosHoy(prev => prev.map(h => h.id === id ? { ...h, completado: !h.completado } : h));
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
          <span className="task-stat-number">12</span>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <div className="activity-block" style={{ width: '12px', height: '12px', cursor: 'default', transform: 'none' }}></div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Bajo (0%)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <div className="activity-block level-1" style={{ width: '12px', height: '12px', cursor: 'default', transform: 'none' }}></div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Medio (50%)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <div className="activity-block level-2" style={{ width: '12px', height: '12px', cursor: 'default', transform: 'none' }}></div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Alto (100%)</span>
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
                  className={`activity-block level-${level}`} 
                  title={`Semana ${Math.floor(i / 7) + 1}, Día ${i % 7 + 1}`}
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
              <div className="transaction-list" style={{ marginTop: '0.5rem' }}>
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginTop: '0.5rem' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginTop: '0.5rem' }}>
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
              <ul className="tareas-list">
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginTop: '0.5rem' }}>
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