import { useState } from 'react';
import './Proyectos.css'; // Reutilizamos los estilos principales del sistema
import './Finanzas.css'; // Reutilizamos el grid de Finanzas
import './Fitness.css'; // Estilos específicos de rutinas y nutrición

const Fitness = ({ peso = 75, estatura = 175 }) => {
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
  const [activeRutinaId, setActiveRutinaId] = useState(null);
  const [newExerciseForm, setNewExerciseForm] = useState({ nombre: '', series: 4, reps: '10', peso: '' });
  const [isComidaModalOpen, setIsComidaModalOpen] = useState(false);
  const [newComidaForm, setNewComidaForm] = useState({ tipo: '', hora: '', descripcion: '', calorias: '', proteina: '', carbs: '', grasas: '' });

  // --- ESTADO CALENDARIO Y RACHAS ---
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Ajustar al lunes
    return new Date(today.setDate(diff));
  });
  const [rachaDiaria] = useState(4); // Ejemplo de racha

  const pesoNum = parseFloat(peso) || 0;
  const estNum = parseFloat(estatura) || 0;
  const imc = estNum > 0 ? (pesoNum / Math.pow(estNum / 100, 2)).toFixed(1) : 0;
  const imcPercent = Math.min(Math.max(((imc - 12) / 28) * 100, 0), 100);

  let bodyType = 'normal';
  let bodyLabel = 'Peso Saludable';
  if (imc < 18.5) { bodyType = 'delgado'; bodyLabel = 'Bajo Peso'; }
  else if (imc >= 25 && imc < 30) { bodyType = 'sobrepeso'; bodyLabel = 'Sobrepeso'; }
  else if (imc >= 30) { bodyType = 'obeso'; bodyLabel = 'Obesidad'; }

  // --- RUTINAS ---
  const [rutinas, setRutinas] = useState([
    {
      id: 1, titulo: 'Día de Empuje (Pecho/Tríceps)', estado: 'activo', archivada: false, historial: [], enlaces: [], categorias: ['Gym', 'Pesas'], diasAsignados: [0, 2, 4],
      ejercicios: [
        { id: 101, nombre: 'Press de Banca', series: 4, reps: '8-10', peso: '60 kg', seriesEstado: [true, true, false, false], imagenes: ['https://placehold.co/60x60/222528/a292c5?text=1', 'https://placehold.co/60x60/222528/a292c5?text=2'] },
        { id: 102, nombre: 'Press Militar', series: 3, reps: '10-12', peso: '40 kg', seriesEstado: [false, false, false], imagenes: [] },
        { id: 103, nombre: 'Extensiones de Tríceps', series: 3, reps: '15', peso: '15 kg', seriesEstado: [false, false, false], imagenes: [] },
      ]
    },
    {
      id: 2, titulo: 'Día de Tirón (Espalda/Bíceps)', estado: 'descanso', archivada: false, historial: [], enlaces: [], categorias: ['Casa', 'Kettlebell'], diasAsignados: [1, 3],
      ejercicios: [
        { id: 201, nombre: 'Dominadas', series: 4, reps: 'Al fallo', peso: 'Corporal', seriesEstado: [false, false, false, false], imagenes: [] },
        { id: 202, nombre: 'Remo con barra', series: 3, reps: '10-12', peso: '24 kg', seriesEstado: [false, false, false], imagenes: [] },
      ]
    }
  ]);

  // --- ALIMENTACIÓN ---
  const [comidas, setComidas] = useState([
    { id: 1, tipo: 'Desayuno', hora: '08:00 AM', descripcion: 'Avena con leche de almendras, plátano y proteína.', calorias: 450, proteina: 30, carbs: 55, grasas: 12 },
    { id: 2, tipo: 'Almuerzo', hora: '01:30 PM', descripcion: 'Pechuga de pollo a la plancha con arroz integral y brócoli.', calorias: 600, proteina: 45, carbs: 60, grasas: 15 },
    { id: 3, tipo: 'Cena', hora: '08:00 PM', descripcion: 'Ensalada de atún con huevo cocido y aceite de oliva.', calorias: 400, proteina: 35, carbs: 10, grasas: 20 },
  ]);

  // --- GRÁFICO DE ACTIVIDAD (Datos Simulados Semanales) ---
  const activityData = [40, 80, 0, 100, 60, 40, 90];
  const coordinates = activityData.map((val, index) => ({
    x: (index * 100) + 50,
    y: 100 - (val * 0.8)
  }));
  let smoothLinePath = "";
  let smoothAreaPath = "";
  if (coordinates.length > 0) {
    smoothLinePath = `M ${coordinates[0].x},${coordinates[0].y}`;
    for (let i = 0; i < coordinates.length - 1; i++) {
      const cpX = (coordinates[i].x + coordinates[i + 1].x) / 2;
      smoothLinePath += ` C ${cpX},${coordinates[i].y} ${cpX},${coordinates[i + 1].y} ${coordinates[i + 1].x},${coordinates[i + 1].y}`;
    }
    smoothAreaPath = `${smoothLinePath} L ${coordinates[coordinates.length - 1].x},100 L ${coordinates[0].x},100 Z`;
  }
  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  // Generamos los días de la semana actual para el calendario superior
  const today = new Date();
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

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

  // --- LÓGICA VISUAL DE RACHAS ---
  let rachaIcon = '🧊';
  let rachaClass = 'racha-none';
  if (rachaDiaria > 0 && rachaDiaria < 3) { rachaIcon = '🏃'; rachaClass = 'racha-low'; }
  else if (rachaDiaria >= 3 && rachaDiaria < 7) { rachaIcon = '🔥'; rachaClass = 'racha-med'; }
  else if (rachaDiaria >= 7) { rachaIcon = '⚡'; rachaClass = 'racha-high'; }

  // --- FUNCIONES RUTINAS ---
  const toggleSerie = (rutinaId, ejercicioId, serieIndex) => {
    setRutinas(prev => prev.map(r => {
      if (r.id === rutinaId) {
        return {
          ...r,
          ejercicios: r.ejercicios.map(e => {
            if (e.id === ejercicioId) {
              const nuevoEstado = [...e.seriesEstado];
              nuevoEstado[serieIndex] = !nuevoEstado[serieIndex];
              return { ...e, seriesEstado: nuevoEstado };
            }
            return e;
          })
        };
      }
      return r;
    }));
  };

  const registrarEntrenamiento = (rutinaId) => {
    setRutinas(prev => prev.map(r => {
      if (r.id === rutinaId) {
        const totalSeries = r.ejercicios.reduce((acc, e) => acc + e.series, 0);
        const seriesCompletadas = r.ejercicios.reduce((acc, e) => acc + e.seriesEstado.filter(s => s).length, 0);
        const nuevoRegistro = { id: Date.now(), fecha: new Date().toLocaleDateString(), detalle: `${seriesCompletadas}/${totalSeries} series completadas` };
        const ejerciciosReseteados = r.ejercicios.map(e => ({ ...e, seriesEstado: Array(e.series).fill(false) }));
        return { ...r, historial: [nuevoRegistro, ...(r.historial || [])], ejercicios: ejerciciosReseteados };
      }
      return r;
    }));
  };

  const eliminarRegistroHistorial = (rutinaId, registroId) => {
    setRutinas(prev => prev.map(r => {
      if (r.id === rutinaId) {
        return { ...r, historial: r.historial.filter(h => h.id !== registroId) };
      }
      return r;
    }));
  };

  const agregarImagenEjercicio = (rutinaId, ejercicioId) => {
    const url = prompt('Ingresa la URL de la imagen de referencia (Ej: enlace de Google Images):');
    if (url && url.trim() !== '') {
      setRutinas(prev => prev.map(r => r.id === rutinaId ? {
        ...r,
        ejercicios: r.ejercicios.map(e => e.id === ejercicioId ? {
          ...e,
          imagenes: [...(e.imagenes || []), url].slice(0, 3) // Límite máximo de 3 imágenes
        } : e)
      } : r));
    }
  };

  // --- GESTIÓN DE CATEGORÍAS DE RUTINA ---
  const agregarCategoriaRutina = (rutinaId) => {
    const cat = prompt('Añadir categoría (Ej. Casa, Gym, Cardio, Kettlebell):');
    if (cat && cat.trim() !== '') {
      setRutinas(prev => prev.map(r => r.id === rutinaId ? { ...r, categorias: [...(r.categorias || []), cat] } : r));
    }
  };

  const eliminarCategoriaRutina = (rutinaId, catIndex) => {
    setRutinas(prev => prev.map(r => r.id === rutinaId ? { ...r, categorias: r.categorias.filter((_, i) => i !== catIndex) } : r));
  };

  // --- VINCULAR RUTINAS AL CALENDARIO ---
  const toggleDiaRutina = (rutinaId, dayIndex) => {
    setRutinas(prev => prev.map(r => {
      if (r.id === rutinaId) {
        const asignados = r.diasAsignados || [];
        const nuevosDias = asignados.includes(dayIndex)
          ? asignados.filter(d => d !== dayIndex)
          : [...asignados, dayIndex].sort();
        return { ...r, diasAsignados: nuevosDias };
      }
      return r;
    }));
  };

  const toggleArchivarRutina = (rutinaId) => {
    setRutinas(prev => prev.map(r => r.id === rutinaId ? { ...r, archivada: !r.archivada } : r));
  };

  const eliminarRutina = (rutinaId) => {
    setRutinas(prev => prev.filter(r => r.id !== rutinaId));
  };

  const rutinasActivas = rutinas.filter(r => !r.archivada);
  const rutinasArchivadas = rutinas.filter(r => r.archivada);

  // --- GESTIÓN DE NUEVOS EJERCICIOS ---
  const openExerciseModal = (rutinaId) => {
    setActiveRutinaId(rutinaId);
    setIsExerciseModalOpen(true);
  };

  const handleCreateExercise = () => {
    if (!newExerciseForm.nombre) return alert('El nombre del ejercicio es obligatorio');
    const numSeries = parseInt(newExerciseForm.series) || 1;
    
    setRutinas(prev => prev.map(r => r.id === activeRutinaId ? {
      ...r,
      ejercicios: [...r.ejercicios, {
        id: Date.now(), nombre: newExerciseForm.nombre, series: numSeries, reps: newExerciseForm.reps, peso: newExerciseForm.peso,
        seriesEstado: Array(numSeries).fill(false), imagenes: []
      }]
    } : r));
    
    setIsExerciseModalOpen(false);
    setNewExerciseForm({ nombre: '', series: 4, reps: '10', peso: '' });
  };

  const agregarEnlaceRutina = (rutinaId) => {
    setRutinas(prev => prev.map(r => r.id === rutinaId ? { ...r, enlaces: [...(r.enlaces || []), { id: Date.now(), titulo: '', url: '', guardado: false }] } : r));
  };

  const updateEnlaceRutina = (rutinaId, enlaceId, field, value) => {
    setRutinas(prev => prev.map(r => r.id === rutinaId ? { ...r, enlaces: r.enlaces.map(e => e.id === enlaceId ? { ...e, [field]: value } : e) } : r));
  };

  const eliminarEnlaceRutina = (rutinaId, enlaceId) => {
    setRutinas(prev => prev.map(r => r.id === rutinaId ? { ...r, enlaces: r.enlaces.filter(e => e.id !== enlaceId) } : r));
  };

  const handleCreateComida = () => {
    if (!newComidaForm.tipo || !newComidaForm.calorias) return alert('El tipo de comida y las calorías son obligatorias.');
    setComidas([...comidas, {
      id: Date.now(),
      tipo: newComidaForm.tipo,
      hora: newComidaForm.hora || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      descripcion: newComidaForm.descripcion || 'Sin descripción',
      calorias: parseInt(newComidaForm.calorias) || 0,
      proteina: parseInt(newComidaForm.proteina) || 0,
      carbs: parseInt(newComidaForm.carbs) || 0,
      grasas: parseInt(newComidaForm.grasas) || 0
    }]);
    setIsComidaModalOpen(false);
    setNewComidaForm({ tipo: '', hora: '', descripcion: '', calorias: '', proteina: '', carbs: '', grasas: '' });
  };

  return (
    <div className="proyectos-container">
      <header className="proyectos-header">
        <div>
          <h1 className="page-title">Fitness</h1>
          <p className="page-subtitle">Seguimiento de rutinas, alimentación y progreso físico.</p>
        </div>
      </header>

      <div className="finance-content-grid">
        {/* --- RUTINAS --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Calendario de Entrenamientos */}
          <div className="proyecto-card" style={{ padding: '1rem 1.5rem' }}>
            <div className="calendar-header-fitness">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <h3>Calendario Semanal</h3>
                <div className={`racha-badge ${rachaClass}`} title="Días consecutivos entrenando">
                  <span className="racha-icon">{rachaIcon}</span>
                  <span className="racha-text">{rachaDiaria} {rachaDiaria === 1 ? 'Día' : 'Días'}</span>
                </div>
              </div>
              <div className="calendar-nav-fitness">
                <button className="btn-icon-action" onClick={prevWeek}>←</button>
                <span className="calendar-month">{currentWeekStart.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}</span>
                <button className="btn-icon-action" onClick={nextWeek}>→</button>
              </div>
            </div>
            <div className="calendar-week">
              {weekDays.map((date, index) => {
                const isToday = date.toDateString() === today.toLocaleDateString();
                const hasRoutine = rutinas.some(r => (r.diasAsignados || []).includes(index));
                return (
                  <div key={index} className={`calendar-day ${isToday ? 'active' : ''}`}>
                    <span style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>{dayNames[index]}</span>
                    <span style={{ fontSize: '1.2rem' }}>{date.getDate()}</span>
                    {hasRoutine && <div className="planned-dot" title="Rutina programada"></div>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="proyectos-header">
            <h2 className="page-title" style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>Rutinas de Entrenamiento</h2>
          </div>
          
          <div className="proyectos-grid">
            {rutinasActivas.map(rutina => {
              const totalSeries = rutina.ejercicios.reduce((acc, e) => acc + e.series, 0);
              const completadas = rutina.ejercicios.reduce((acc, e) => acc + e.seriesEstado.filter(s => s).length, 0);
              const progreso = totalSeries > 0 ? Math.round((completadas / totalSeries) * 100) : 0;
              
              return (
                <div key={rutina.id} className="proyecto-card">
                  <div className="proyecto-card-header">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <h3>{rutina.titulo}</h3>
                        {(rutina.enlaces || []).filter(e => e.guardado).map(enlace => (
                          <a 
                            key={enlace.id} 
                            href={enlace.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="header-link-icon" 
                            title={enlace.titulo} 
                            onClick={e => e.stopPropagation()}
                          >
                            📎
                          </a>
                        ))}
                      </div>
                      <div className="routine-categories">
                        {(rutina.categorias || []).map((cat, i) => (
                          <span key={i} className="routine-tag">{cat} <button className="btn-remove-cat" style={{ fontSize: '0.8rem' }} onClick={() => eliminarCategoriaRutina(rutina.id, i)}>×</button></span>
                        ))}
                        <button className="btn-add-link" style={{ padding: '0.2rem 0.5rem', marginTop: 0 }} onClick={() => agregarCategoriaRutina(rutina.id)}>+ Añadir Etiqueta</button>
                      </div>
                      <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.5rem' }}>
                        {['L','M','M','J','V','S','D'].map((dName, i) => (
                          <button key={i} title="Asignar al calendario" className={`day-pill ${(rutina.diasAsignados || []).includes(i) ? 'active' : ''}`} onClick={() => toggleDiaRutina(rutina.id, i)}>
                            {dName}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className={`status-badge ${rutina.estado === 'activo' ? 'en-progreso' : 'pausado'}`}>{rutina.estado}</span>
                      <button className="btn-icon-action" title="Archivar Rutina" onClick={() => toggleArchivarRutina(rutina.id)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>
                      </button>
                    </div>
                  </div>
                  
                  <div className="proyecto-progress">
                    <div className="progress-info">
                      <span>Progreso del entrenamiento</span>
                      <span>{progreso}%</span>
                    </div>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill" style={{ width: `${progreso}%` }}></div>
                    </div>
                  </div>

                  <div className="exercise-list">
                    {rutina.ejercicios.map(ejercicio => (
                      <div key={ejercicio.id} className="exercise-item">
                        <div className="exercise-main-content">
                          <div className="exercise-info">
                            <span className="exercise-name">{ejercicio.nombre}</span>
                            <span className="exercise-details">
                              {ejercicio.series} series × {ejercicio.reps} {ejercicio.peso && `| ⚖️ ${ejercicio.peso}`}
                            </span>
                          </div>
                          <div className="series-tracker">
                            {ejercicio.seriesEstado.map((estado, index) => (
                              <label key={index} className="serie-checkbox-wrapper" title={`Serie ${index + 1}`}>
                                <input type="checkbox" checked={estado} onChange={() => toggleSerie(rutina.id, ejercicio.id, index)} />
                                <div className="serie-checkbox-custom">{index + 1}</div>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="exercise-images">
                          {(ejercicio.imagenes || []).map((img, i) => (
                            <img key={i} src={img} alt={`Ref ${i}`} className="exercise-image-thumb" />
                          ))}
                          {(!ejercicio.imagenes || ejercicio.imagenes.length < 3) && (
                            <div className="exercise-image-add" title="Añadir foto" onClick={() => agregarImagenEjercicio(rutina.id, ejercicio.id)}>+</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="enlaces-container" style={{ marginTop: '1rem' }}>
                    {(rutina.enlaces || []).map(enlace => (
                      !enlace.guardado ? (
                        <div key={enlace.id} className="link-editor-container">
                          <div className="link-inputs-row">
                            <input 
                              type="text" 
                              className="link-input-modern" 
                              placeholder="Título del enlace (Ej: Video tutorial...)" 
                              value={enlace.titulo} 
                              onChange={(e) => updateEnlaceRutina(rutina.id, enlace.id, 'titulo', e.target.value)}
                            />
                            <input 
                              type="url" 
                              className="link-input-modern" 
                              placeholder="https://..." 
                              value={enlace.url} 
                              onChange={(e) => updateEnlaceRutina(rutina.id, enlace.id, 'url', e.target.value)}
                          />
                          </div>
                          <div className="link-actions" style={{ justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                            <button className="btn-delete-link" onClick={() => eliminarEnlaceRutina(rutina.id, enlace.id)}>Cancelar</button>
                            <button className="btn-save-link" onClick={() => {
                                if(enlace.url && enlace.titulo) updateEnlaceRutina(rutina.id, enlace.id, 'guardado', true);
                                else alert('Ingresa título y URL.');
                            }}>Guardar</button>
                          </div>
                        </div>
                      ) : (
                        <div key={enlace.id} className="link-saved-display">
                          <a 
                            href={enlace.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            📎 {enlace.titulo}
                          </a>
                          <div className="link-actions">
                            <button className="btn-edit-link" onClick={() => updateEnlaceRutina(rutina.id, enlace.id, 'guardado', false)}>Editar</button>
                            <button className="btn-delete-link" onClick={() => eliminarEnlaceRutina(rutina.id, enlace.id)}>Eliminar</button>
                          </div>
                        </div>
                      )
                    ))}
                    <button className="btn-add-link" onClick={() => agregarEnlaceRutina(rutina.id)}>+ Añadir Enlace</button>
                  </div>
                  
                  <button className="btn-add-tarea" style={{ marginTop: '1rem', color: 'var(--soma-purple)' }} onClick={() => registrarEntrenamiento(rutina.id)}>✓ Registrar Entrenamiento</button>

                  <button className="btn-add-subcat" style={{ marginTop: '1rem' }} onClick={() => openExerciseModal(rutina.id)}>+ Añadir Ejercicio</button>
                </div>
              );
            })}
          </div>
        </div>

        {/* --- COLUMNA DERECHA: MÉTRICAS Y GRÁFICO --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="proyecto-card">
            {/* MÉTRICA IMC */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <span className="summary-title">Índice de Masa Corporal (IMC)</span>
                <p className="chart-legend" style={{ marginBottom: 0 }}>Evalúa la relación entre tu peso y estatura.</p>
                <h3 className="summary-amount" style={{ marginTop: '0.5rem' }}>{imc}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.5rem 0 0 0' }}>Peso: {pesoNum}kg | Estatura: {estNum}cm</p>
              </div>
              <span className={`bmi-status-badge ${bodyType}`} style={{ padding: '0.2rem 0.6rem', fontSize: '0.65rem' }}>{bodyLabel}</span>
            </div>
            <div className="bmi-gauge-track" style={{ height: '8px', marginBottom: '2rem' }}>
              <div className="bmi-gauge-marker" style={{ left: `${imcPercent}%`, top: '-3px', height: '14px', width: '4px', borderRadius: '2px' }}></div>
            </div>

            {/* GRÁFICO DE ACTIVIDAD */}
            <div style={{ paddingTop: '2rem', borderTop: '1px dashed rgba(255, 255, 255, 0.1)' }}>
              <h3 className="summary-title" style={{ marginBottom: '1rem' }}>Volumen Semanal</h3>
              <p className="chart-legend">Mide la cantidad total de esfuerzo (series completadas) en los últimos 7 días.</p>
              <svg viewBox="0 0 700 120" style={{ width: '100%', height: 'auto', maxHeight: '140px', overflow: 'visible' }}>
                <defs>
                  <linearGradient id="chartAreaGradient2" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--soma-orange)" stopOpacity="0.4" /><stop offset="100%" stopColor="var(--soma-orange)" stopOpacity="0.0" /></linearGradient>
                </defs>
                <path d={smoothAreaPath} fill="url(#chartAreaGradient2)" style={{ animation: 'fadeUp 1s ease-out forwards' }} />
                <path d={smoothLinePath} fill="none" stroke="var(--soma-orange)" strokeWidth="3" style={{ filter: 'drop-shadow(0px 4px 6px rgba(240, 127, 18, 0.4))', animation: 'fadeUp 1s ease-out forwards' }} />
              </svg>
            </div>
          </div>

          {/* --- ALIMENTACIÓN --- */}
          <div className="proyecto-card">
            <div className="proyecto-card-header">
              <h3>Plan de Alimentación</h3>
            </div>
            <div className="transaction-list" style={{ marginTop: 0 }}>
              {comidas.map(comida => (
                <div key={comida.id} className="transaction-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <div className="tx-info">
                      <h4>{comida.tipo}</h4>
                      <p>🕒 {comida.hora}</p>
                    </div>
                    <span className="tx-amount text-income" style={{ fontSize: '1rem' }}>{comida.calorias} kcal</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>{comida.descripcion}</p>
                  <div className="macros-container">
                    <span className="macro-badge" style={{ color: '#3498db', border: '1px solid rgba(52, 152, 219, 0.3)' }}>P: {comida.proteina}g</span>
                    <span className="macro-badge" style={{ color: 'var(--soma-yellow)', border: '1px solid rgba(253, 200, 21, 0.3)' }}>C: {comida.carbs}g</span>
                    <span className="macro-badge" style={{ color: 'var(--soma-orange)', border: '1px solid rgba(240, 127, 18, 0.3)' }}>G: {comida.grasas}g</span>
                  </div>
                </div>
              ))}
              <button className="btn-add-subcat" onClick={() => setIsComidaModalOpen(true)}>+ Añadir Comida</button>
            </div>
          </div>
        </div>
      </div>

      {/* --- RUTINAS ARCHIVADAS (TABLA) --- */}
      {rutinasArchivadas.length > 0 && (
        <div className="archived-notes-section" style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px dashed rgba(255, 255, 255, 0.1)' }}>
          <div className="proyectos-header">
            <h2 className="page-title" style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>Rutinas Archivadas</h2>
          </div>
          <div className="archived-table-wrapper">
            <table className="archived-table">
              <thead>
                <tr>
                  <th>Rutina</th>
                  <th>Categorías</th>
                  <th>Días Asignados</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rutinasArchivadas.map(rutina => {
                  const diasStr = (rutina.diasAsignados || []).map(d => dayNames[d]).join(', ') || 'Ninguno';
                  const catStr = (rutina.categorias || []).join(', ') || 'Sin categoría';
                  return (
                    <tr key={rutina.id}>
                      <td className="archived-title">{rutina.titulo}</td>
                      <td>{catStr}</td>
                      <td>{diasStr}</td>
                      <td><span className={`status-badge ${rutina.estado === 'activo' ? 'en-progreso' : 'pausado'}`}>{rutina.estado}</span></td>
                      <td>
                        <div className="archived-actions">
                          <button className="btn-icon-action" title="Desarchivar" onClick={() => toggleArchivarRutina(rutina.id)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                          </button>
                          <button className="btn-icon-action delete-icon" title="Eliminar Permanentemente" onClick={() => eliminarRutina(rutina.id)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
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

      {/* --- HISTORIAL DE ENTRENAMIENTOS (TABLA) --- */}
      {rutinas.some(r => r.historial && r.historial.length > 0) && (
        <div className="archived-notes-section" style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px dashed rgba(255, 255, 255, 0.1)' }}>
          <div className="proyectos-header">
            <h2 className="page-title" style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>Historial de Entrenamientos</h2>
          </div>
          <div className="archived-table-wrapper">
            <table className="archived-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Rutina Realizada</th>
                  <th>Desempeño</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rutinas.flatMap(r => (r.historial || []).map(h => ({ ...h, rutinaId: r.id, rutinaTitulo: r.titulo })))
                  .sort((a, b) => b.id - a.id) // Ordenamos del más reciente al más antiguo
                  .map(registro => (
                  <tr key={registro.id}>
                    <td>📅 {registro.fecha}</td>
                    <td className="archived-title">{registro.rutinaTitulo}</td>
                    <td>{registro.detalle}</td>
                    <td>
                      <div className="archived-actions">
                        <button 
                          className="btn-icon-action delete-icon" 
                          title="Eliminar Registro" 
                          onClick={() => eliminarRegistroHistorial(registro.rutinaId, registro.id)}
                        >
                          <svg 
                            width="16" 
                            height="16" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                          >
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            <line x1="10" y1="11" x2="10" y2="17"></line>
                            <line x1="14" y1="11" x2="14" y2="17"></line>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- MODAL NUEVO EJERCICIO --- */}
      {isExerciseModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Añadir Ejercicio</h2>
            <div className="modal-form">
              <div className="input-group">
                <label>Nombre del Ejercicio</label>
                <input type="text" value={newExerciseForm.nombre} onChange={e => setNewExerciseForm(prev => ({ ...prev, nombre: e.target.value }))} placeholder="Ej. Sentadillas Búlgara..." />
              </div>
              <div className="fecha-inputs-row">
                <div className="input-group">
                  <label>N° de Series</label>
                  <input type="number" min="1" max="10" value={newExerciseForm.series} onChange={e => setNewExerciseForm(prev => ({ ...prev, series: e.target.value }))} />
                </div>
                <div className="input-group">
                  <label>Repeticiones</label>
                  <input type="text" value={newExerciseForm.reps} onChange={e => setNewExerciseForm(prev => ({ ...prev, reps: e.target.value }))} placeholder="Ej. 10-12, Al fallo..." />
                </div>
              </div>
              <div className="input-group">
                <label>Peso a levantar (Opcional)</label>
                <input type="text" value={newExerciseForm.peso} onChange={e => setNewExerciseForm(prev => ({ ...prev, peso: e.target.value }))} placeholder="Ej. 20 kg, 15 lbs, Corporal..." />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setIsExerciseModalOpen(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleCreateExercise}>Guardar Ejercicio</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL NUEVA COMIDA --- */}
      {isComidaModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Añadir Comida</h2>
            <div className="modal-form">
              <div className="fecha-inputs-row">
                <div className="input-group">
                  <label>Tipo de Comida</label>
                  <input type="text" value={newComidaForm.tipo} onChange={e => setNewComidaForm(prev => ({ ...prev, tipo: e.target.value }))} placeholder="Ej. Almuerzo, Snack..." />
                </div>
                <div className="input-group">
                  <label>Hora (Opcional)</label>
                  <input type="time" value={newComidaForm.hora} onChange={e => setNewComidaForm(prev => ({ ...prev, hora: e.target.value }))} />
                </div>
              </div>
              <div className="input-group">
                <label>Descripción</label>
                <input type="text" value={newComidaForm.descripcion} onChange={e => setNewComidaForm(prev => ({ ...prev, descripcion: e.target.value }))} placeholder="Ej. Pechuga de pollo con arroz..." />
              </div>
              <div className="fecha-inputs-row">
                <div className="input-group">
                  <label>Calorías (kcal)</label>
                  <input type="number" min="0" value={newComidaForm.calorias} onChange={e => setNewComidaForm(prev => ({ ...prev, calorias: e.target.value }))} placeholder="0" />
                </div>
                <div className="input-group">
                  <label>Proteínas (g)</label>
                  <input type="number" min="0" value={newComidaForm.proteina} onChange={e => setNewComidaForm(prev => ({ ...prev, proteina: e.target.value }))} placeholder="0" />
                </div>
              </div>
              <div className="fecha-inputs-row">
                <div className="input-group">
                  <label>Carbohidratos (g)</label>
                  <input type="number" min="0" value={newComidaForm.carbs} onChange={e => setNewComidaForm(prev => ({ ...prev, carbs: e.target.value }))} placeholder="0" />
                </div>
                <div className="input-group">
                  <label>Grasas (g)</label>
                  <input type="number" min="0" value={newComidaForm.grasas} onChange={e => setNewComidaForm(prev => ({ ...prev, grasas: e.target.value }))} placeholder="0" />
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setIsComidaModalOpen(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleCreateComida}>Guardar Comida</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Fitness;