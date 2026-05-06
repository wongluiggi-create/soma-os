import { useState } from 'react';
import './Proyectos.css'; // Reutilizamos estilos generales de layout
import './Habitos.css'; // Estilos específicos para la tabla y gráficos

const Habitos = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newHabitForm, setNewHabitForm] = useState({ nombre: '', contexto: '' });
  
  // Estado de la semana actual (empezando por el lunes)
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Ajustar al lunes
    return new Date(today.setDate(diff));
  });

  // Estado de los hábitos y sus registros
  const [habitos, setHabitos] = useState([
    { 
      id: 1, 
      nombre: 'Tomar 2 Litros de Agua', 
      contexto: 'Mantener hidratación para mejorar la energía y la piel.',
      registros: {} // Formato: { 'YYYY-MM-DD': true }
    },
    { 
      id: 2, 
      nombre: 'Meditar 10 minutos', 
      contexto: 'Mindfulness matutino para reducir el estrés.',
      registros: {}
    }
  ]);

  // Generar los 7 días de la semana visible
  const daysOfWeek = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const formatDateString = (date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // Navegación de semanas
  const prevWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  const nextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    setCurrentWeekStart(new Date(today.setDate(diff)));
  };

  // Alternar el estado de un hábito un día específico
  const toggleHabit = (habitId, dateStr) => {
    setHabitos(prev => prev.map(h => {
      if (h.id === habitId) {
        const newRegistros = { ...h.registros };
        if (newRegistros[dateStr]) delete newRegistros[dateStr];
        else newRegistros[dateStr] = true;
        return { ...h, registros: newRegistros };
      }
      return h;
    }));
  };

  // Crear un nuevo hábito
  const handleCreateHabit = () => {
    if (!newHabitForm.nombre) return alert('El nombre del hábito es obligatorio');
    const nuevoHabito = {
      id: Date.now(),
      nombre: newHabitForm.nombre,
      contexto: newHabitForm.contexto,
      registros: {}
    };
    setHabitos([...habitos, nuevoHabito]);
    setIsModalOpen(false);
    setNewHabitForm({ nombre: '', contexto: '' });
  };

  // --- CÁLCULOS PARA EL GRÁFICO LINEAL ---
  // Calculamos el % de éxito por cada día de la semana actual
  const chartData = daysOfWeek.map(date => {
    const dateStr = formatDateString(date);
    const totalHabitos = habitos.length;
    const completados = habitos.filter(h => h.registros[dateStr]).length;
    const percentage = totalHabitos === 0 ? 0 : (completados / totalHabitos) * 100;
    return percentage;
  });

  // Convertimos los porcentajes en coordenadas X e Y
  const coordinates = chartData.map((percentage, index) => ({
    x: (index * 100) + 50,
    y: 100 - (percentage * 0.8)
  }));

  // Generamos el trazado curvo (Cubic Bezier) para la línea y el área
  let smoothLinePath = "";
  let smoothAreaPath = "";
  if (coordinates.length > 0) {
    smoothLinePath = `M ${coordinates[0].x},${coordinates[0].y}`;
    for (let i = 0; i < coordinates.length - 1; i++) {
      const p0 = coordinates[i];
      const p1 = coordinates[i + 1];
      const cpX = (p0.x + p1.x) / 2; // Punto de control en el medio horizontal
      smoothLinePath += ` C ${cpX},${p0.y} ${cpX},${p1.y} ${p1.x},${p1.y}`;
    }
    smoothAreaPath = `${smoothLinePath} L ${coordinates[coordinates.length - 1].x},100 L ${coordinates[0].x},100 Z`;
  }

  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  return (
    <div className="proyectos-container">
      <header className="proyectos-header">
        <div>
          <h1 className="page-title">Hábitos</h1>
          <p className="page-subtitle">Construye consistencia. El éxito es la suma de pequeños esfuerzos diarios.</p>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>+ Nuevo Hábito</button>
      </header>

      {/* Controles de Navegación de Semana */}
      <div className="week-navigator">
        <button className="btn-nav" onClick={prevWeek}>← Anterior</button>
        <div className="current-week-label">
          <span onClick={goToToday} className="btn-today">Semana del {currentWeekStart.getDate()} de {currentWeekStart.toLocaleString('default', { month: 'long' })}</span>
        </div>
        <button className="btn-nav" onClick={nextWeek}>Siguiente →</button>
      </div>

      {/* Tabla de Hábitos */}
      <div className="habitos-table-wrapper">
        <table className="habitos-table">
          <thead>
            <tr>
              <th className="habit-info-col">Hábito</th>
              {daysOfWeek.map((date, index) => (
                <th key={index} className={formatDateString(date) === formatDateString(new Date()) ? 'today' : ''}>
                  <div className="day-col">
                    <span className="day-name">{dayNames[index]}</span>
                    <span className="day-number">{date.getDate()}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {habitos.map(habit => (
              <tr key={habit.id}>
                <td className="habit-info-cell">
                  <h4 className="habit-name">{habit.nombre}</h4>
                  {habit.contexto && <p className="habit-context">{habit.contexto}</p>}
                </td>
                {daysOfWeek.map(date => {
                  const dateStr = formatDateString(date);
                  const isCompleted = !!habit.registros[dateStr];
                  return (
                    <td key={dateStr} className="habit-check-cell">
                      <label className="habit-checkbox-wrapper">
                        <input 
                          type="checkbox" 
                          checked={isCompleted} 
                          onChange={() => toggleHabit(habit.id, dateStr)} 
                        />
                        <div className="habit-checkbox-custom"></div>
                      </label>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Gráfico Lineal de Progreso */}
      <div className="habit-chart-container">
        <h3 className="chart-title">Panorama Semanal (Rendimiento)</h3>
        <svg viewBox="0 0 700 120" className="habit-line-chart">
          <defs>
            <linearGradient id="chartAreaGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--soma-purple)" stopOpacity="0.5" />
              <stop offset="100%" stopColor="var(--soma-purple)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Cuadrícula de fondo (Grid) */}
          <g className="chart-grid">
            {/* Líneas horizontales (100%, 50%, 0%) */}
            <line x1="30" y1="20" x2="670" y2="20" />
            <line x1="30" y1="60" x2="670" y2="60" />
            <line x1="30" y1="100" x2="670" y2="100" />
            
            {/* Líneas verticales por día */}
            {chartData.map((_, index) => (
              <line key={`v-${index}`} x1={(index * 100) + 50} y1="20" x2={(index * 100) + 50} y2="100" />
            ))}
          </g>

          {/* Etiquetas de Fecha (Eje X) sutiles */}
          <g className="chart-x-labels">
            {daysOfWeek.map((date, index) => (
              <text key={`l-${index}`} x={(index * 100) + 50} y="116" textAnchor="middle" className="chart-date-label">
                {dayNames[index]} {date.getDate()}
              </text>
            ))}
          </g>

          {/* Área sombreada debajo de la línea */}
          <path d={smoothAreaPath} fill="url(#chartAreaGradient)" className="chart-area-fill" />

          {/* Línea principal */}
          <path d={smoothLinePath} fill="none" stroke="var(--soma-purple)" strokeWidth="3" className="chart-line-stroke" />
          
          {/* Puntos del gráfico */}
          {chartData.map((percentage, index) => (
            <g key={`p-${index}`} className="chart-point-group" style={{ animationDelay: `${index * 0.1}s` }}>
              <circle cx={(index * 100) + 50} cy={100 - (percentage * 0.8)} r="12" fill="var(--soma-yellow)" opacity="0.15" />
              <circle cx={(index * 100) + 50} cy={100 - (percentage * 0.8)} r="5" fill="var(--bg-main)" stroke="var(--soma-yellow)" strokeWidth="3" />
            </g>
          ))}
        </svg>
      </div>

      {/* Modal Nuevo Hábito */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Crear Nuevo Hábito</h2>
            <div className="modal-form">
              <div className="input-group">
                <label>Nombre del Hábito</label>
                <input type="text" value={newHabitForm.nombre} onChange={e => setNewHabitForm({...newHabitForm, nombre: e.target.value})} placeholder="Ej. Meditar, Leer 10 páginas..." />
              </div>
              <div className="input-group">
                <label>Contexto / Motivación (Opcional)</label>
                <textarea 
                  className="sub-categoria-textarea" 
                  value={newHabitForm.contexto} 
                  onChange={e => setNewHabitForm({...newHabitForm, contexto: e.target.value})} 
                  placeholder="Breve contexto de por qué quieres lograrlo..."
                  style={{ minHeight: '80px' }}
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