import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import './Proyectos.css';
import './Habitos.css';

const EMOJIS = ['🏃','📚','🧘','💪','💧','🥗','✍️','🎯','🌙','🎨','🎸','🧹','🌳','🛌','💊'];
const HABIT_COLORS = ['#A291D0','#F07F12','#4A9EF5','#52C77A','#F5C842','#FF6B6B','#4DD0E1','#FF8A65'];
const FREQ_OPTIONS = [
  { value: 'diario', label: 'Diario' },
  { value: '5', label: '5×/sem' },
  { value: '4', label: '4×/sem' },
  { value: '3', label: '3×/sem' },
  { value: '2', label: '2×/sem' },
  { value: '1', label: '1×/sem' },
];

const formatDateString = date =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const calcStreak = registros => {
  const regs = registros || {};
  let streak = 0;
  const d = new Date();
  while (true) {
    const ds = formatDateString(d);
    if (regs[ds]) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return streak;
};

const Habitos = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newHabitForm, setNewHabitForm] = useState({
    nombre: '', contexto: '', emoji: '🏃', color: HABIT_COLORS[0], frecuencia: 'diario',
  });
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [chartFilter, setChartFilter] = useState('all');
  const [habitos, setHabitos] = useState([]);

  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(today.setDate(diff));
  });

  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const q = query(collection(db, 'usuarios', uid, 'habitos'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => setHabitos(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return unsub;
  }, []);

  const daysOfWeek = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const prevWeek = () => { const d = new Date(currentWeekStart); d.setDate(d.getDate() - 7); setCurrentWeekStart(d); };
  const nextWeek = () => { const d = new Date(currentWeekStart); d.setDate(d.getDate() + 7); setCurrentWeekStart(d); };
  const goToToday = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    setCurrentWeekStart(new Date(today.setDate(diff)));
  };

  const toggleHabit = async (habitId, dateStr) => {
    const habit = habitos.find(h => h.id === habitId);
    if (!habit || !auth.currentUser) return;
    const newRegistros = { ...(habit.registros || {}) };
    if (newRegistros[dateStr]) delete newRegistros[dateStr];
    else newRegistros[dateStr] = true;
    await updateDoc(doc(db, 'usuarios', auth.currentUser.uid, 'habitos', habitId), { registros: newRegistros });
  };

  const deleteHabit = async (habitId) => {
    if (!auth.currentUser) return;
    await deleteDoc(doc(db, 'usuarios', auth.currentUser.uid, 'habitos', habitId));
    setConfirmDeleteId(null);
  };

  const handleCreateHabit = async () => {
    if (!newHabitForm.nombre.trim() || !auth.currentUser) return;
    await addDoc(collection(db, 'usuarios', auth.currentUser.uid, 'habitos'), {
      nombre: newHabitForm.nombre.trim(),
      contexto: newHabitForm.contexto,
      emoji: newHabitForm.emoji,
      color: newHabitForm.color,
      frecuencia: newHabitForm.frecuencia,
      registros: {},
      createdAt: new Date().toISOString(),
    });
    setIsModalOpen(false);
    setNewHabitForm({ nombre: '', contexto: '', emoji: '🏃', color: HABIT_COLORS[0], frecuencia: 'diario' });
  };

  // Resumen semanal
  const weekDayStrings = daysOfWeek.map(d => formatDateString(d));
  const totalPosible = habitos.length * 7;
  const totalCompletado = weekDayStrings.reduce((acc, ds) =>
    acc + habitos.filter(h => (h.registros || {})[ds]).length, 0);
  const pctSemanal = totalPosible === 0 ? 0 : Math.round((totalCompletado / totalPosible) * 100);

  // Datos para el gráfico
  const chartHabit = chartFilter !== 'all' ? habitos.find(h => h.id === chartFilter) : null;
  const chartLineColor = chartHabit ? (chartHabit.color || '#A291D0') : 'var(--soma-purple)';
  const chartDotColor  = chartHabit ? (chartHabit.color || '#F5C842') : 'var(--soma-yellow)';

  const chartData = daysOfWeek.map(date => {
    const ds = formatDateString(date);
    if (chartHabit) return (chartHabit.registros || {})[ds] ? 100 : 0;
    const total = habitos.length;
    const completados = habitos.filter(h => (h.registros || {})[ds]).length;
    return total === 0 ? 0 : (completados / total) * 100;
  });

  const chartWeekDone = chartHabit
    ? weekDayStrings.filter(ds => (chartHabit.registros || {})[ds]).length
    : null;

  const coordinates = chartData.map((pct, i) => ({ x: (i * 100) + 50, y: 100 - (pct * 0.8) }));

  let smoothLinePath = '';
  let smoothAreaPath = '';
  if (coordinates.length > 0) {
    smoothLinePath = `M ${coordinates[0].x},${coordinates[0].y}`;
    for (let i = 0; i < coordinates.length - 1; i++) {
      const p0 = coordinates[i], p1 = coordinates[i + 1];
      const cpX = (p0.x + p1.x) / 2;
      smoothLinePath += ` C ${cpX},${p0.y} ${cpX},${p1.y} ${p1.x},${p1.y}`;
    }
    smoothAreaPath = `${smoothLinePath} L ${coordinates[coordinates.length - 1].x},100 L ${coordinates[0].x},100 Z`;
  }

  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const todayStr = formatDateString(new Date());

  return (
    <div className="proyectos-container">
      <header className="proyectos-header">
        <div>
          <h1 className="page-title">Hábitos</h1>
          <p className="page-subtitle">Construye consistencia. El éxito es la suma de pequeños esfuerzos diarios.</p>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>+ Nuevo Hábito</button>
      </header>

      {/* Resumen semanal */}
      {habitos.length > 0 && (
        <div className="habitos-weekly-summary">
          <span className="weekly-summary-label">Esta semana</span>
          <span className="weekly-summary-count">{totalCompletado}/{totalPosible}</span>
          <div className="weekly-summary-bar">
            <div className="weekly-summary-fill" style={{ width: `${pctSemanal}%` }} />
          </div>
          <span className="weekly-summary-pct">{pctSemanal}%</span>
        </div>
      )}

      {/* Navegación de semana */}
      <div className="week-navigator">
        <button className="btn-nav" onClick={prevWeek}>← Anterior</button>
        <div className="current-week-label">
          <span onClick={goToToday} className="btn-today">
            Semana del {currentWeekStart.getDate()} de {currentWeekStart.toLocaleString('default', { month: 'long' })}
          </span>
        </div>
        <button className="btn-nav" onClick={nextWeek}>Siguiente →</button>
      </div>

      {/* Tabla de hábitos */}
      <div className="habitos-table-wrapper">
        <table className="habitos-table">
          <thead>
            <tr>
              <th className="habit-info-col">Hábito</th>
              {daysOfWeek.map((date, i) => (
                <th key={i} className={formatDateString(date) === todayStr ? 'today' : ''}>
                  <div className="day-col">
                    <span className="day-name">{dayNames[i]}</span>
                    <span className="day-number">{date.getDate()}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {habitos.map(habit => {
              const streak = calcStreak(habit.registros);
              const habitColor = habit.color || 'var(--soma-yellow)';
              return (
                <tr key={habit.id}>
                  <td className="habit-info-cell">
                    <div className="habit-info-row">
                      {habit.emoji && <span className="habit-emoji">{habit.emoji}</span>}
                      <div className="habit-info-text">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                          <h4 className="habit-name">{habit.nombre}</h4>
                          {confirmDeleteId === habit.id ? (
                            <div className="confirm-delete-inline">
                              <span>¿Eliminar?</span>
                              <button className="btn-confirm-yes" onClick={() => deleteHabit(habit.id)}>Sí</button>
                              <button className="btn-confirm-no" onClick={() => setConfirmDeleteId(null)}>No</button>
                            </div>
                          ) : (
                            <button className="btn-icon-action delete-icon" onClick={() => setConfirmDeleteId(habit.id)} title="Eliminar">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                <line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
                              </svg>
                            </button>
                          )}
                        </div>
                        <div className="habit-meta-row">
                          {habit.contexto && <p className="habit-context">{habit.contexto}</p>}
                          <div className="habit-badges">
                            {streak > 0 && (
                              <span className="habit-streak-badge">🔥 {streak} día{streak !== 1 ? 's' : ''}</span>
                            )}
                            {habit.frecuencia && (
                              <span className="habit-freq-badge">
                                {habit.frecuencia === 'diario' ? 'Diario' : `${habit.frecuencia}×/sem`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </td>
                  {daysOfWeek.map(date => {
                    const ds = formatDateString(date);
                    const isCompleted = !!(habit.registros || {})[ds];
                    return (
                      <td key={ds} className="habit-check-cell">
                        <label className="habit-checkbox-wrapper">
                          <input type="checkbox" checked={isCompleted} onChange={() => toggleHabit(habit.id, ds)} />
                          <div
                            className="habit-checkbox-custom"
                            style={isCompleted ? {
                              backgroundColor: habitColor,
                              borderColor: habitColor,
                              boxShadow: `0 0 12px ${habitColor}55`,
                            } : {}}
                          />
                        </label>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Gráfico lineal */}
      <div className="habit-chart-container">
        <h3 className="chart-title">Panorama Semanal (Rendimiento)</h3>

        {/* Filtro por hábito */}
        {habitos.length > 0 && (
          <div className="chart-filter-row">
            <button
              className={`btn-chart-filter${chartFilter === 'all' ? ' active' : ''}`}
              onClick={() => setChartFilter('all')}
            >Todos</button>
            {habitos.map(h => (
              <button
                key={h.id}
                className={`btn-chart-filter${chartFilter === h.id ? ' active' : ''}`}
                style={chartFilter === h.id ? {
                  borderColor: h.color || '#A291D0',
                  color: h.color || '#A291D0',
                  background: `${h.color || '#A291D0'}1A`,
                } : {}}
                onClick={() => setChartFilter(prev => prev === h.id ? 'all' : h.id)}
              >
                {h.emoji && <span>{h.emoji}</span>} {h.nombre}
              </button>
            ))}
          </div>
        )}

        <svg viewBox="-10 0 720 125" className="habit-line-chart">
          <defs>
            <linearGradient id="chartAreaGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={chartLineColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor={chartLineColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Etiquetas eje Y */}
          <g className="chart-y-labels">
            <text x="27" y="23" textAnchor="end" className="chart-y-label">100%</text>
            <text x="27" y="63" textAnchor="end" className="chart-y-label">50%</text>
            <text x="27" y="103" textAnchor="end" className="chart-y-label">0%</text>
          </g>

          {/* Cuadrícula */}
          <g className="chart-grid">
            <line x1="30" y1="20" x2="670" y2="20" />
            <line x1="30" y1="60" x2="670" y2="60" />
            <line x1="30" y1="100" x2="670" y2="100" />
            {chartData.map((_, i) => (
              <line key={`v-${i}`} x1={(i * 100) + 50} y1="20" x2={(i * 100) + 50} y2="100" />
            ))}
          </g>

          {/* Etiquetas eje X */}
          <g className="chart-x-labels">
            {daysOfWeek.map((date, i) => (
              <text key={`l-${i}`} x={(i * 100) + 50} y="118" textAnchor="middle" className="chart-date-label">
                {dayNames[i]} {date.getDate()}
              </text>
            ))}
          </g>

          <path d={smoothAreaPath} fill="url(#chartAreaGradient)" className="chart-area-fill" />
          <path d={smoothLinePath} fill="none" stroke={chartLineColor} strokeWidth="2.5" className="chart-line-stroke" />

          {/* Puntos */}
          {chartData.map((pct, i) => (
            <g key={`p-${i}`} className="chart-point-group" style={{ animationDelay: `${i * 0.1}s` }}>
              <circle cx={(i * 100) + 50} cy={100 - (pct * 0.8)} r="7" fill={chartDotColor} opacity="0.07" />
              <circle cx={(i * 100) + 50} cy={100 - (pct * 0.8)} r="4" fill="var(--bg-main)" stroke={chartDotColor} strokeWidth="2.5" />
            </g>
          ))}
        </svg>

        {/* Stats del hábito seleccionado */}
        {chartHabit && (
          <div className="chart-habit-stats">
            <div className="chart-stat-item">
              <span className="chart-stat-value" style={{ color: chartHabit.color || '#A291D0' }}>
                {chartWeekDone}/7
              </span>
              <span className="chart-stat-label">Esta semana</span>
            </div>
            <div className="chart-stat-item">
              <span className="chart-stat-value">🔥 {calcStreak(chartHabit.registros)}</span>
              <span className="chart-stat-label">Racha actual</span>
            </div>
            <div className="chart-stat-item">
              <span className="chart-stat-value">{Object.keys(chartHabit.registros || {}).length}</span>
              <span className="chart-stat-label">Total histórico</span>
            </div>
          </div>
        )}
      </div>

      {/* Modal nuevo hábito */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Crear Nuevo Hábito</h2>
            <div className="modal-form">
              <div className="input-group">
                <label>Nombre del Hábito</label>
                <input
                  type="text"
                  value={newHabitForm.nombre}
                  onChange={e => setNewHabitForm({ ...newHabitForm, nombre: e.target.value })}
                  placeholder="Ej. Meditar, Leer 10 páginas..."
                />
              </div>
              <div className="input-group">
                <label>Emoji</label>
                <div className="habit-emoji-picker">
                  {EMOJIS.map(em => (
                    <button
                      key={em}
                      type="button"
                      className={`habit-emoji-btn${newHabitForm.emoji === em ? ' selected' : ''}`}
                      onClick={() => setNewHabitForm({ ...newHabitForm, emoji: em })}
                    >{em}</button>
                  ))}
                </div>
              </div>
              <div className="input-group">
                <label>Color</label>
                <div className="habit-color-picker">
                  {HABIT_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      className={`habit-color-btn${newHabitForm.color === c ? ' selected' : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setNewHabitForm({ ...newHabitForm, color: c })}
                    />
                  ))}
                </div>
              </div>
              <div className="input-group">
                <label>Frecuencia objetivo</label>
                <div className="habit-freq-options">
                  {FREQ_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`btn-freq-option${newHabitForm.frecuencia === opt.value ? ' active' : ''}`}
                      onClick={() => setNewHabitForm({ ...newHabitForm, frecuencia: opt.value })}
                    >{opt.label}</button>
                  ))}
                </div>
              </div>
              <div className="input-group">
                <label>Contexto / Motivación (Opcional)</label>
                <textarea
                  className="sub-categoria-textarea"
                  value={newHabitForm.contexto}
                  onChange={e => setNewHabitForm({ ...newHabitForm, contexto: e.target.value })}
                  placeholder="¿Por qué quieres este hábito?"
                  style={{ minHeight: '72px' }}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleCreateHabit}>Crear Hábito</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Habitos;
