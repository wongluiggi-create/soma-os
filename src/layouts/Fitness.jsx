import { useState, useRef, useEffect } from 'react';
import { storage, db, auth } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, getDoc, setDoc } from 'firebase/firestore';
import './Proyectos.css';
import './Finanzas.css';
import './Fitness.css';

const Fitness = ({ peso = '', estatura = '' }) => {
  // --- TABS ---
  const [activeTab, setActiveTab] = useState('rutinas');

  // --- NUTRITION STATES ---
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [metasNutricion, setMetasNutricion] = useState({ calorias: 2000, proteinas: 150, carbs: 250, grasas: 65 });
  const [editingMetas, setEditingMetas] = useState(false);
  const [metasForm, setMetasForm] = useState({ calorias: 2000, proteinas: 150, carbs: 250, grasas: 65 });

  // --- RUTINAS STATES ---
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
  const [activeRutinaId, setActiveRutinaId] = useState(null);
  const [newExerciseForm, setNewExerciseForm] = useState({ nombre: '', series: 4, reps: '10', peso: '' });
  const [isRutinaModalOpen, setIsRutinaModalOpen] = useState(false);
  const [newRutinaForm, setNewRutinaForm] = useState({ titulo: '', estado: 'activo' });
  const [isComidaModalOpen, setIsComidaModalOpen] = useState(false);
  const [newComidaForm, setNewComidaForm] = useState({ tipo: '', hora: '', descripcion: '', calorias: '', proteina: '', carbs: '', grasas: '' });

  const fileInputRef = useRef(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [targetEjercicio, setTargetEjercicio] = useState(null);

  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(today.setDate(diff));
  });
  const [rachaDiaria] = useState(0);

  const pesoNum = parseFloat(peso) || 0;
  const estNum = parseFloat(estatura) || 0;
  const imc = estNum > 0 ? (pesoNum / Math.pow(estNum / 100, 2)).toFixed(1) : 0;
  const imcPercent = Math.min(Math.max(((imc - 12) / 28) * 100, 0), 100);

  let bodyType = 'normal';
  let bodyLabel = 'Peso Saludable';
  if (imc < 18.5) { bodyType = 'delgado'; bodyLabel = 'Bajo Peso'; }
  else if (imc >= 25 && imc < 30) { bodyType = 'sobrepeso'; bodyLabel = 'Sobrepeso'; }
  else if (imc >= 30) { bodyType = 'obeso'; bodyLabel = 'Obesidad'; }

  const [rutinas, setRutinas] = useState([]);
  const [comidas, setComidas] = useState([]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    getDoc(doc(db, 'usuarios', uid)).then(snap => {
      if (snap.exists() && snap.data().metasNutricion) {
        const m = snap.data().metasNutricion;
        setMetasNutricion(m);
        setMetasForm(m);
      }
    });

    const qRutinas = query(collection(db, 'usuarios', uid, 'rutinas'), orderBy('createdAt', 'desc'));
    const unRutinas = onSnapshot(qRutinas, (snap) => {
      setRutinas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qComidas = query(collection(db, 'usuarios', uid, 'comidas'), orderBy('createdAt', 'asc'));
    const unComidas = onSnapshot(qComidas, (snap) => {
      setComidas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unRutinas(); unComidas(); };
  }, []);

  // --- DATE NAVIGATION ---
  const goToPrevDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const goToNextDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const formatSelectedDate = (dateStr) => {
    const d = new Date(dateStr + 'T12:00:00');
    const isToday = dateStr === new Date().toISOString().split('T')[0];
    const formatted = d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    return isToday ? `${formatted} · Hoy` : formatted;
  };

  // --- NUTRITION COMPUTED DATA ---
  const comidasDelDia = comidas.filter(c => {
    const fecha = c.fecha || (c.createdAt ? c.createdAt.split('T')[0] : null);
    return fecha === selectedDate;
  });

  const totales = comidasDelDia.reduce((acc, c) => ({
    calorias: acc.calorias + (c.calorias || 0),
    proteinas: acc.proteinas + (c.proteina || 0),
    carbs: acc.carbs + (c.carbs || 0),
    grasas: acc.grasas + (c.grasas || 0),
  }), { calorias: 0, proteinas: 0, carbs: 0, grasas: 0 });

  // Macro kcal conversion (1g prot=4kcal, 1g carbs=4kcal, 1g fat=9kcal)
  const proteinKcal = totales.proteinas * 4;
  const carbsKcal = totales.carbs * 4;
  const fatsKcal = totales.grasas * 9;
  const totalMacroKcal = proteinKcal + carbsKcal + fatsKcal;

  // Donut chart geometry
  const donutR = 52;
  const donutCirc = 2 * Math.PI * donutR;
  const proteinArc = totalMacroKcal > 0 ? (proteinKcal / totalMacroKcal) * donutCirc : 0;
  const carbsArc   = totalMacroKcal > 0 ? (carbsKcal   / totalMacroKcal) * donutCirc : 0;
  const fatsArc    = totalMacroKcal > 0 ? (fatsKcal    / totalMacroKcal) * donutCirc : 0;

  // Calorie ring geometry
  const ringR = 56;
  const ringCirc = 2 * Math.PI * ringR;
  const calPct = metasNutricion.calorias > 0 ? Math.min(totales.calorias / metasNutricion.calorias, 1.05) : 0;
  const calArc = calPct * ringCirc;
  const calColor = calPct > 1 ? 'var(--soma-orange)' : calPct > 0.85 ? 'var(--soma-yellow)' : 'var(--soma-purple)';

  // --- SAVE GOALS ---
  const handleSaveMetas = async () => {
    if (!auth.currentUser) return;
    const metas = {
      calorias:  parseInt(metasForm.calorias)  || 2000,
      proteinas: parseInt(metasForm.proteinas) || 150,
      carbs:     parseInt(metasForm.carbs)     || 250,
      grasas:    parseInt(metasForm.grasas)    || 65,
    };
    setMetasNutricion(metas);
    setEditingMetas(false);
    await setDoc(doc(db, 'usuarios', auth.currentUser.uid), { metasNutricion: metas }, { merge: true });
  };

  // --- COMIDAS CRUD ---
  const eliminarComida = async (id) => {
    if (auth.currentUser) await deleteDoc(doc(db, 'usuarios', auth.currentUser.uid, 'comidas', id));
  };

  const handleCreateComida = async () => {
    if (!newComidaForm.tipo || !newComidaForm.calorias) return alert('El tipo de comida y las calorías son obligatorias.');
    if (!auth.currentUser) return;
    const nuevaComida = {
      tipo:        newComidaForm.tipo,
      hora:        newComidaForm.hora || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      descripcion: newComidaForm.descripcion || '',
      calorias:    parseInt(newComidaForm.calorias)  || 0,
      proteina:    parseInt(newComidaForm.proteina)  || 0,
      carbs:       parseInt(newComidaForm.carbs)     || 0,
      grasas:      parseInt(newComidaForm.grasas)    || 0,
      fecha:       selectedDate,
      createdAt:   new Date().toISOString(),
    };
    await addDoc(collection(db, 'usuarios', auth.currentUser.uid, 'comidas'), nuevaComida);
    setIsComidaModalOpen(false);
    setNewComidaForm({ tipo: '', hora: '', descripcion: '', calorias: '', proteina: '', carbs: '', grasas: '' });
  };

  // --- MACRO PROGRESS BAR COMPONENT ---
  const MacroBar = ({ label, current, goal, color, unit }) => {
    const pct = goal > 0 ? Math.min((current / goal) * 100, 100) : 0;
    const isOver = goal > 0 && current > goal;
    const barColor = isOver ? 'var(--soma-orange)' : color;
    return (
      <div className="macro-bar-row">
        <div className="macro-bar-label-row">
          <span className="macro-bar-name">{label}</span>
          <span className="macro-bar-value" style={{ color: isOver ? 'var(--soma-orange)' : 'var(--text-secondary)' }}>
            {current}{unit} / {goal}{unit}
            <span style={{ fontSize: '0.72rem', opacity: 0.7, marginLeft: '0.4rem' }}>({Math.round(pct)}%)</span>
          </span>
        </div>
        <div className="macro-bar-track">
          <div className="macro-bar-fill" style={{ width: `${pct}%`, backgroundColor: barColor }} />
        </div>
      </div>
    );
  };

  // --- ACTIVITY GRAPH (Rutinas tab) ---
  const activityData = [0, 0, 0, 0, 0, 0, 0];
  const coords = activityData.map((v, i) => ({ x: i * 100 + 50, y: 100 - v * 0.8 }));
  let linePath = '', areaPath = '';
  if (coords.length > 0) {
    linePath = `M ${coords[0].x},${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const cx = (coords[i].x + coords[i + 1].x) / 2;
      linePath += ` C ${cx},${coords[i].y} ${cx},${coords[i + 1].y} ${coords[i + 1].x},${coords[i + 1].y}`;
    }
    areaPath = `${linePath} L ${coords[coords.length - 1].x},100 L ${coords[0].x},100 Z`;
  }

  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const todayDate = new Date();
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const prevWeek = () => { const d = new Date(currentWeekStart); d.setDate(d.getDate() - 7); setCurrentWeekStart(d); };
  const nextWeek = () => { const d = new Date(currentWeekStart); d.setDate(d.getDate() + 7); setCurrentWeekStart(d); };

  let rachaIcon = '🧊', rachaClass = 'racha-none';
  if (rachaDiaria > 0 && rachaDiaria < 3)  { rachaIcon = '🏃'; rachaClass = 'racha-low'; }
  else if (rachaDiaria >= 3 && rachaDiaria < 7) { rachaIcon = '🔥'; rachaClass = 'racha-med'; }
  else if (rachaDiaria >= 7)               { rachaIcon = '⚡'; rachaClass = 'racha-high'; }

  // --- RUTINAS CRUD ---
  const updateRutinaDB = async (id, data) => {
    if (auth.currentUser) await updateDoc(doc(db, 'usuarios', auth.currentUser.uid, 'rutinas', id), data);
  };

  const toggleSerie = async (rutinaId, ejercicioId, idx) => {
    const r = rutinas.find(r => r.id === rutinaId);
    if (r && auth.currentUser) {
      const ejs = r.ejercicios.map(e => {
        if (e.id !== ejercicioId) return e;
        const s = [...e.seriesEstado]; s[idx] = !s[idx]; return { ...e, seriesEstado: s };
      });
      await updateRutinaDB(rutinaId, { ejercicios: ejs });
    }
  };

  const registrarEntrenamiento = async (rutinaId) => {
    const r = rutinas.find(r => r.id === rutinaId);
    if (r && auth.currentUser) {
      const total = r.ejercicios.reduce((a, e) => a + e.series, 0);
      const done  = r.ejercicios.reduce((a, e) => a + e.seriesEstado.filter(Boolean).length, 0);
      const reg   = { id: Date.now(), fecha: new Date().toLocaleDateString(), detalle: `${done}/${total} series completadas` };
      const reset = r.ejercicios.map(e => ({ ...e, seriesEstado: Array(e.series).fill(false) }));
      await updateRutinaDB(rutinaId, { historial: [reg, ...(r.historial || [])], ejercicios: reset });
    }
  };

  const eliminarRegistroHistorial = async (rutinaId, regId) => {
    const r = rutinas.find(r => r.id === rutinaId);
    if (r && auth.currentUser) await updateRutinaDB(rutinaId, { historial: r.historial.filter(h => h.id !== regId) });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !targetEjercicio) return;
    setUploadingImage(true);
    try {
      const sRef = ref(storage, `fitness/${Date.now()}_${file.name}`);
      await uploadBytes(sRef, file);
      const url = await getDownloadURL(sRef);
      const r = rutinas.find(r => r.id === targetEjercicio.rutinaId);
      if (r && auth.currentUser) {
        const ejs = r.ejercicios.map(ej => ej.id === targetEjercicio.ejercicioId
          ? { ...ej, imagenes: [...(ej.imagenes || []), url].slice(0, 2) } : ej);
        await updateRutinaDB(r.id, { ejercicios: ejs });
      }
    } catch (err) { console.error(err); alert('Error subiendo imagen.'); }
    finally { setUploadingImage(false); setTargetEjercicio(null); e.target.value = null; }
  };

  const agregarImagenEjercicio = (rutinaId, ejercicioId) => {
    setTargetEjercicio({ rutinaId, ejercicioId });
    fileInputRef.current?.click();
  };

  const agregarCategoriaRutina = async (rutinaId) => {
    const cat = prompt('Añadir categoría (Ej. Casa, Gym, Cardio):');
    const r = rutinas.find(x => x.id === rutinaId);
    if (cat?.trim() && r && auth.currentUser) await updateRutinaDB(rutinaId, { categorias: [...(r.categorias || []), cat] });
  };

  const eliminarCategoriaRutina = async (rutinaId, i) => {
    const r = rutinas.find(x => x.id === rutinaId);
    if (r && auth.currentUser) await updateRutinaDB(rutinaId, { categorias: r.categorias.filter((_, j) => j !== i) });
  };

  const toggleDiaRutina = async (rutinaId, dayIdx) => {
    const r = rutinas.find(x => x.id === rutinaId);
    if (r && auth.currentUser) {
      const dias = r.diasAsignados || [];
      const nuevo = dias.includes(dayIdx) ? dias.filter(d => d !== dayIdx) : [...dias, dayIdx].sort();
      await updateRutinaDB(rutinaId, { diasAsignados: nuevo });
    }
  };

  const toggleArchivarRutina = async (id) => {
    const r = rutinas.find(x => x.id === id);
    if (r && auth.currentUser) await updateRutinaDB(id, { archivada: !r.archivada });
  };

  const eliminarRutina = async (id) => {
    if (auth.currentUser) await deleteDoc(doc(db, 'usuarios', auth.currentUser.uid, 'rutinas', id));
  };

  const agregarEnlaceRutina = async (id) => {
    const r = rutinas.find(x => x.id === id);
    if (r && auth.currentUser) await updateRutinaDB(id, { enlaces: [...(r.enlaces || []), { id: Date.now(), titulo: '', url: '', guardado: false }] });
  };

  const updateEnlaceRutina = async (rutinaId, enlaceId, field, value) => {
    const r = rutinas.find(x => x.id === rutinaId);
    if (r && auth.currentUser) await updateRutinaDB(rutinaId, { enlaces: r.enlaces.map(e => e.id === enlaceId ? { ...e, [field]: value } : e) });
  };

  const eliminarEnlaceRutina = async (rutinaId, enlaceId) => {
    const r = rutinas.find(x => x.id === rutinaId);
    if (r && auth.currentUser) await updateRutinaDB(rutinaId, { enlaces: r.enlaces.filter(e => e.id !== enlaceId) });
  };

  const handleCreateRutina = async () => {
    if (!newRutinaForm.titulo) return alert('El título es obligatorio');
    if (!auth.currentUser) return;
    await addDoc(collection(db, 'usuarios', auth.currentUser.uid, 'rutinas'), {
      titulo: newRutinaForm.titulo, estado: newRutinaForm.estado,
      archivada: false, diasAsignados: [], categorias: [], ejercicios: [], historial: [], enlaces: [],
      createdAt: new Date().toISOString(),
    });
    setIsRutinaModalOpen(false);
    setNewRutinaForm({ titulo: '', estado: 'activo' });
  };

  const handleCreateExercise = async () => {
    if (!newExerciseForm.nombre) return alert('El nombre del ejercicio es obligatorio');
    if (!auth.currentUser) return;
    const n = parseInt(newExerciseForm.series) || 1;
    const r = rutinas.find(r => r.id === activeRutinaId);
    if (r) await updateRutinaDB(activeRutinaId, {
      ejercicios: [...r.ejercicios, {
        id: Date.now(), nombre: newExerciseForm.nombre, series: n,
        reps: newExerciseForm.reps, peso: newExerciseForm.peso,
        seriesEstado: Array(n).fill(false), imagenes: [],
      }],
    });
    setIsExerciseModalOpen(false);
    setNewExerciseForm({ nombre: '', series: 4, reps: '10', peso: '' });
  };

  const rutinasActivas   = rutinas.filter(r => !r.archivada);
  const rutinasArchivadas = rutinas.filter(r =>  r.archivada);

  // ======================================================
  return (
    <div className="proyectos-container">
      <header className="proyectos-header">
        <div>
          <h1 className="page-title">Fitness</h1>
          <p className="page-subtitle">Seguimiento de rutinas, alimentación y progreso físico.</p>
        </div>
      </header>

      {/* TABS */}
      <div className="fitness-tabs">
        <button className={`fitness-tab-btn ${activeTab === 'rutinas'   ? 'active' : ''}`} onClick={() => setActiveTab('rutinas')}>Rutinas</button>
        <button className={`fitness-tab-btn ${activeTab === 'nutricion' ? 'active' : ''}`} onClick={() => setActiveTab('nutricion')}>Nutrición Diaria</button>
      </div>

      <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleImageUpload} />

      {/* ============================================================ */}
      {/* TAB: RUTINAS                                                  */}
      {/* ============================================================ */}
      {activeTab === 'rutinas' && (
        <div>
          <div className="finance-content-grid">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', minWidth: 0 }}>

              {/* Calendario Semanal */}
              <div className="proyecto-card" style={{ padding: '1rem 1.5rem' }}>
                <div className="calendar-header-fitness">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h3>Calendario Semanal</h3>
                    <div className={`racha-badge ${rachaClass}`}>
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
                  {weekDays.map((date, i) => {
                    const isToday    = date.toDateString() === todayDate.toDateString();
                    const hasRoutine = rutinas.some(r => (r.diasAsignados || []).includes(i));
                    return (
                      <div key={i} className={`calendar-day ${isToday ? 'active' : ''}`}>
                        <span style={{ fontSize: '0.75rem', textTransform: 'uppercase' }}>{dayNames[i]}</span>
                        <span style={{ fontSize: '1.2rem' }}>{date.getDate()}</span>
                        {hasRoutine && <div className="planned-dot"></div>}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="proyectos-header" style={{ alignItems: 'center' }}>
                <h2 className="page-title" style={{ fontSize: '1.5rem', color: 'var(--text-secondary)', margin: 0 }}>Rutinas de Entrenamiento</h2>
                <button className="btn-add-subcat" style={{ padding: '0.4rem 1rem', marginTop: 0 }} onClick={() => setIsRutinaModalOpen(true)}>+ Nueva Rutina</button>
              </div>

              <div className="proyectos-grid">
                {rutinasActivas.map(rutina => {
                  const total     = rutina.ejercicios.reduce((a, e) => a + e.series, 0);
                  const done      = rutina.ejercicios.reduce((a, e) => a + e.seriesEstado.filter(Boolean).length, 0);
                  const progreso  = total > 0 ? Math.round((done / total) * 100) : 0;
                  return (
                    <div key={rutina.id} className="proyecto-card">
                      <div className="proyecto-card-header">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <h3>{rutina.titulo}</h3>
                            {(rutina.enlaces || []).filter(e => e.guardado).map(e => (
                              <a key={e.id} href={e.url} target="_blank" rel="noopener noreferrer" className="header-link-icon" title={e.titulo}>📎</a>
                            ))}
                          </div>
                          <div className="routine-categories">
                            {(rutina.categorias || []).map((cat, i) => (
                              <span key={i} className="routine-tag">{cat} <button className="btn-remove-cat" onClick={() => eliminarCategoriaRutina(rutina.id, i)}>×</button></span>
                            ))}
                            <button className="btn-add-link" style={{ padding: '0.2rem 0.5rem', marginTop: 0 }} onClick={() => agregarCategoriaRutina(rutina.id)}>+ Etiqueta</button>
                          </div>
                          <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.5rem' }}>
                            {['L','M','M','J','V','S','D'].map((d, i) => (
                              <button key={i} className={`day-pill ${(rutina.diasAsignados || []).includes(i) ? 'active' : ''}`} onClick={() => toggleDiaRutina(rutina.id, i)}>{d}</button>
                            ))}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span className={`status-badge ${rutina.estado === 'activo' ? 'en-progreso' : 'pausado'}`}>{rutina.estado}</span>
                          <button className="btn-icon-action" title="Archivar" onClick={() => toggleArchivarRutina(rutina.id)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>
                          </button>
                        </div>
                      </div>

                      <div className="proyecto-progress">
                        <div className="progress-info"><span>Progreso</span><span>{progreso}%</span></div>
                        <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: `${progreso}%` }}></div></div>
                      </div>

                      <div className="exercise-list">
                        {rutina.ejercicios.map(ej => (
                          <div key={ej.id} className="exercise-item">
                            <div className="exercise-main-content">
                              <div className="exercise-info">
                                <span className="exercise-name">{ej.nombre}</span>
                                <span className="exercise-details">{ej.series} series × {ej.reps}{ej.peso && ` | ⚖️ ${ej.peso}`}</span>
                              </div>
                              <div className="series-tracker">
                                {ej.seriesEstado.map((s, idx) => (
                                  <label key={idx} className="serie-checkbox-wrapper">
                                    <input type="checkbox" checked={s} onChange={() => toggleSerie(rutina.id, ej.id, idx)} />
                                    <div className="serie-checkbox-custom">{idx + 1}</div>
                                  </label>
                                ))}
                              </div>
                            </div>
                            <div className="exercise-images">
                              {(ej.imagenes || []).map((img, i) => <img key={i} src={img} alt={`Ref ${i}`} className="exercise-image-thumb" />)}
                              {(!ej.imagenes || ej.imagenes.length < 2) && (
                                <div className="exercise-image-add" onClick={() => agregarImagenEjercicio(rutina.id, ej.id)}>
                                  {uploadingImage && targetEjercicio?.ejercicioId === ej.id ? '⌛' : '+'}
                                </div>
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
                                <input type="text" className="link-input-modern" placeholder="Título..." value={enlace.titulo} onChange={e => updateEnlaceRutina(rutina.id, enlace.id, 'titulo', e.target.value)} />
                                <input type="url" className="link-input-modern" placeholder="https://..." value={enlace.url} onChange={e => updateEnlaceRutina(rutina.id, enlace.id, 'url', e.target.value)} />
                              </div>
                              <div className="link-actions" style={{ justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                                <button className="btn-delete-link" onClick={() => eliminarEnlaceRutina(rutina.id, enlace.id)}>Cancelar</button>
                                <button className="btn-save-link" onClick={() => { if (enlace.url && enlace.titulo) updateEnlaceRutina(rutina.id, enlace.id, 'guardado', true); else alert('Ingresa título y URL.'); }}>Guardar</button>
                              </div>
                            </div>
                          ) : (
                            <div key={enlace.id} className="link-saved-display">
                              <a href={enlace.url} target="_blank" rel="noopener noreferrer">📎 {enlace.titulo}</a>
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
                      <button className="btn-add-subcat" style={{ marginTop: '0.5rem' }} onClick={() => { setActiveRutinaId(rutina.id); setIsExerciseModalOpen(true); }}>+ Añadir Ejercicio</button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Columna derecha: IMC */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', minWidth: 0 }}>
              <div className="proyecto-card">
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
                <div style={{ paddingTop: '2rem', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                  <h3 className="summary-title" style={{ marginBottom: '1rem' }}>Volumen Semanal</h3>
                  <p className="chart-legend">Series completadas en los últimos 7 días.</p>
                  <svg viewBox="0 0 700 120" style={{ width: '100%', height: 'auto', maxHeight: '140px', overflow: 'visible' }}>
                    <defs><linearGradient id="vol-grad" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--soma-orange)" stopOpacity="0.4" /><stop offset="100%" stopColor="var(--soma-orange)" stopOpacity="0" /></linearGradient></defs>
                    <path d={areaPath} fill="url(#vol-grad)" />
                    <path d={linePath} fill="none" stroke="var(--soma-orange)" strokeWidth="3" style={{ filter: 'drop-shadow(0 4px 6px rgba(240,127,18,0.4))' }} />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Rutinas archivadas */}
          {rutinasArchivadas.length > 0 && (
            <div className="archived-notes-section" style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
              <div className="proyectos-header">
                <h2 className="page-title" style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>Rutinas Archivadas</h2>
              </div>
              <div className="archived-table-wrapper">
                <table className="archived-table">
                  <thead><tr><th>Rutina</th><th>Categorías</th><th>Días</th><th>Estado</th><th>Acciones</th></tr></thead>
                  <tbody>
                    {rutinasArchivadas.map(r => (
                      <tr key={r.id}>
                        <td className="archived-title">{r.titulo}</td>
                        <td>{(r.categorias || []).join(', ') || '—'}</td>
                        <td>{(r.diasAsignados || []).map(d => dayNames[d]).join(', ') || '—'}</td>
                        <td><span className={`status-badge ${r.estado === 'activo' ? 'en-progreso' : 'pausado'}`}>{r.estado}</span></td>
                        <td><div className="archived-actions">
                          <button className="btn-icon-action" onClick={() => toggleArchivarRutina(r.id)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg></button>
                          <button className="btn-icon-action delete-icon" onClick={() => eliminarRutina(r.id)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Historial entrenamientos */}
          {rutinas.some(r => r.historial?.length > 0) && (
            <div className="archived-notes-section" style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
              <div className="proyectos-header">
                <h2 className="page-title" style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>Historial de Entrenamientos</h2>
              </div>
              <div className="archived-table-wrapper">
                <table className="archived-table">
                  <thead><tr><th>Fecha</th><th>Rutina</th><th>Desempeño</th><th>Acciones</th></tr></thead>
                  <tbody>
                    {rutinas.flatMap(r => (r.historial || []).map(h => ({ ...h, rutinaId: r.id, rutinaTitulo: r.titulo })))
                      .sort((a, b) => b.id - a.id)
                      .map(reg => (
                        <tr key={reg.id}>
                          <td>📅 {reg.fecha}</td>
                          <td className="archived-title">{reg.rutinaTitulo}</td>
                          <td>{reg.detalle}</td>
                          <td><div className="archived-actions">
                            <button className="btn-icon-action delete-icon" onClick={() => eliminarRegistroHistorial(reg.rutinaId, reg.id)}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg></button>
                          </div></td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB: NUTRICIÓN DIARIA                                        */}
      {/* ============================================================ */}
      {activeTab === 'nutricion' && (
        <div>
          {/* Navegación de fecha */}
          <div className="date-nav-bar">
            <button className="btn-nav" onClick={goToPrevDay}>←</button>
            <span className="date-display">{formatSelectedDate(selectedDate)}</span>
            <button className="btn-nav" onClick={goToNextDay}>→</button>
            {selectedDate !== new Date().toISOString().split('T')[0] && (
              <button className="btn-today" onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}>Hoy</button>
            )}
          </div>

          {/* GRÁFICAS: Calorie Ring + Macro Donut */}
          <div className="nutrition-overview-grid">

            {/* Anillo de calorías */}
            <div className="chart-ring-card">
              <span className="chart-card-title">Calorías del Día</span>
              <svg viewBox="0 0 140 140" width="150" height="150">
                <circle cx="70" cy="70" r={ringR} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="13" />
                <circle cx="70" cy="70" r={ringR} fill="none"
                  stroke={calColor} strokeWidth="13" strokeLinecap="round"
                  strokeDasharray={`${calArc} ${ringCirc}`}
                  strokeDashoffset={ringCirc * 0.25}
                  style={{ transition: 'stroke-dasharray 0.8s ease', filter: `drop-shadow(0 0 5px ${calColor})` }}
                />
                <text x="70" y="62" textAnchor="middle" fill="var(--text-primary)" fontSize="20" fontWeight="700">{totales.calorias}</text>
                <text x="70" y="77" textAnchor="middle" fill="var(--text-secondary)" fontSize="10">de {metasNutricion.calorias} kcal</text>
                <text x="70" y="93" textAnchor="middle" fill={calColor} fontSize="12" fontWeight="600">{Math.round(calPct * 100)}%</text>
              </svg>
              <p className="chart-ring-note">
                {totales.calorias === 0
                  ? 'Sin registros para este día'
                  : metasNutricion.calorias - totales.calorias > 0
                    ? `Faltan ${metasNutricion.calorias - totales.calorias} kcal para la meta`
                    : `Meta superada por ${totales.calorias - metasNutricion.calorias} kcal`}
              </p>
            </div>

            {/* Dona de macros */}
            <div className="chart-ring-card">
              <span className="chart-card-title">Distribución de Macros</span>
              {totalMacroKcal > 0 ? (
                <>
                  <svg viewBox="0 0 140 140" width="150" height="150">
                    <circle cx="70" cy="70" r={donutR} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="18" />
                    {/* Proteínas — azul */}
                    <circle cx="70" cy="70" r={donutR} fill="none" stroke="#3498db" strokeWidth="18" strokeLinecap="butt"
                      strokeDasharray={`${proteinArc} ${donutCirc}`}
                      strokeDashoffset={donutCirc * 0.25}
                      style={{ transition: 'stroke-dasharray 0.8s ease' }}
                    />
                    {/* Carbohidratos — amarillo */}
                    <circle cx="70" cy="70" r={donutR} fill="none" stroke="var(--soma-yellow)" strokeWidth="18" strokeLinecap="butt"
                      strokeDasharray={`${carbsArc} ${donutCirc}`}
                      strokeDashoffset={donutCirc * 0.25 - proteinArc}
                      style={{ transition: 'stroke-dasharray 0.8s ease' }}
                    />
                    {/* Grasas — naranja */}
                    <circle cx="70" cy="70" r={donutR} fill="none" stroke="var(--soma-orange)" strokeWidth="18" strokeLinecap="butt"
                      strokeDasharray={`${fatsArc} ${donutCirc}`}
                      strokeDashoffset={donutCirc * 0.25 - proteinArc - carbsArc}
                      style={{ transition: 'stroke-dasharray 0.8s ease' }}
                    />
                    <text x="70" y="65" textAnchor="middle" fill="var(--text-primary)" fontSize="13" fontWeight="700">{Math.round(totalMacroKcal)}</text>
                    <text x="70" y="79" textAnchor="middle" fill="var(--text-secondary)" fontSize="9">kcal de macros</text>
                  </svg>
                  <div className="donut-legend">
                    <div className="donut-legend-item"><div className="donut-legend-dot" style={{ backgroundColor: '#3498db' }}></div><span>Prot. {Math.round((proteinKcal / totalMacroKcal) * 100)}%</span></div>
                    <div className="donut-legend-item"><div className="donut-legend-dot" style={{ backgroundColor: 'var(--soma-yellow)' }}></div><span>Carb. {Math.round((carbsKcal / totalMacroKcal) * 100)}%</span></div>
                    <div className="donut-legend-item"><div className="donut-legend-dot" style={{ backgroundColor: 'var(--soma-orange)' }}></div><span>Grasas {Math.round((fatsKcal / totalMacroKcal) * 100)}%</span></div>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', flex: 1, justifyContent: 'center' }}>
                  <svg viewBox="0 0 140 140" width="120" height="120">
                    <circle cx="70" cy="70" r={donutR} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="18" strokeDasharray="8 6" />
                    <text x="70" y="74" textAnchor="middle" fill="var(--text-secondary)" fontSize="11">Sin datos</text>
                  </svg>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>Registra alimentos para ver la distribución</span>
                </div>
              )}
            </div>
          </div>

          {/* BARRAS DE PROGRESO DE MACROS */}
          <div className="macro-bars-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Progreso vs. Metas Diarias</span>
              <button className="btn-icon-action" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }} onClick={() => setEditingMetas(!editingMetas)}>
                {editingMetas ? 'Cancelar' : 'Editar Metas'}
              </button>
            </div>

            {editingMetas && (
              <div style={{ marginBottom: '1.2rem', paddingBottom: '1.2rem', borderBottom: '1px dashed rgba(255,255,255,0.1)' }}>
                <div className="goals-form-grid">
                  <div className="input-group"><label>Calorías (kcal)</label><input type="number" min="0" value={metasForm.calorias} onChange={e => setMetasForm(p => ({ ...p, calorias: e.target.value }))} /></div>
                  <div className="input-group"><label>Proteínas (g)</label><input type="number" min="0" value={metasForm.proteinas} onChange={e => setMetasForm(p => ({ ...p, proteinas: e.target.value }))} /></div>
                  <div className="input-group"><label>Carbohidratos (g)</label><input type="number" min="0" value={metasForm.carbs} onChange={e => setMetasForm(p => ({ ...p, carbs: e.target.value }))} /></div>
                  <div className="input-group"><label>Grasas (g)</label><input type="number" min="0" value={metasForm.grasas} onChange={e => setMetasForm(p => ({ ...p, grasas: e.target.value }))} /></div>
                </div>
                <button className="btn-primary" style={{ marginTop: '0.8rem', width: '100%' }} onClick={handleSaveMetas}>Guardar Metas</button>
              </div>
            )}

            <MacroBar label="Calorías"       current={totales.calorias}  goal={metasNutricion.calorias}  color="var(--soma-purple)" unit=" kcal" />
            <MacroBar label="Proteínas"      current={totales.proteinas} goal={metasNutricion.proteinas} color="#3498db"            unit="g" />
            <MacroBar label="Carbohidratos"  current={totales.carbs}     goal={metasNutricion.carbs}     color="var(--soma-yellow)" unit="g" />
            <MacroBar label="Grasas"         current={totales.grasas}    goal={metasNutricion.grasas}    color="var(--soma-orange)" unit="g" />
          </div>

          {/* REGISTRO DIARIO */}
          <div className="daily-log-header">
            <h3 style={{ margin: 0, fontSize: '1rem' }}>Registro del Día</h3>
            <button className="btn-primary" onClick={() => setIsComidaModalOpen(true)}>+ Añadir Comida</button>
          </div>

          {comidasDelDia.length === 0 ? (
            <div className="empty-log-state">
              No hay comidas registradas para este día.
              <span>Haz clic en "+ Añadir Comida" para comenzar.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {comidasDelDia.map(c => (
                <div key={c.id} className="comida-log-item">
                  <div className="comida-log-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
                      <span className="comida-log-name">{c.tipo}</span>
                      {c.hora && <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>🕒 {c.hora}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                      <span className="comida-log-kcal">{c.calorias} kcal</span>
                      <button className="btn-icon-action delete-icon" onClick={() => eliminarComida(c.id)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                      </button>
                    </div>
                  </div>
                  {c.descripcion && <p className="comida-log-desc">{c.descripcion}</p>}
                  <div className="comida-log-macros">
                    {c.proteina > 0 && <span className="macro-badge" style={{ color: '#3498db', border: '1px solid rgba(52,152,219,0.3)' }}>P: {c.proteina}g</span>}
                    {c.carbs    > 0 && <span className="macro-badge" style={{ color: 'var(--soma-yellow)', border: '1px solid rgba(253,200,21,0.3)' }}>C: {c.carbs}g</span>}
                    {c.grasas   > 0 && <span className="macro-badge" style={{ color: 'var(--soma-orange)', border: '1px solid rgba(240,127,18,0.3)' }}>G: {c.grasas}g</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* MODALES                                                       */}
      {/* ============================================================ */}

      {isExerciseModalOpen && (
        <div className="modal-overlay"><div className="modal-content">
          <h2>Añadir Ejercicio</h2>
          <div className="modal-form">
            <div className="input-group"><label>Nombre del Ejercicio</label><input type="text" value={newExerciseForm.nombre} onChange={e => setNewExerciseForm(p => ({ ...p, nombre: e.target.value }))} placeholder="Ej. Sentadilla búlgara..." /></div>
            <div className="fecha-inputs-row">
              <div className="input-group"><label>N° de Series</label><input type="number" min="1" max="10" value={newExerciseForm.series} onChange={e => setNewExerciseForm(p => ({ ...p, series: e.target.value }))} /></div>
              <div className="input-group"><label>Repeticiones</label><input type="text" value={newExerciseForm.reps} onChange={e => setNewExerciseForm(p => ({ ...p, reps: e.target.value }))} placeholder="Ej. 10-12, Al fallo..." /></div>
            </div>
            <div className="input-group"><label>Peso (Opcional)</label><input type="text" value={newExerciseForm.peso} onChange={e => setNewExerciseForm(p => ({ ...p, peso: e.target.value }))} placeholder="Ej. 20 kg, Corporal..." /></div>
          </div>
          <div className="modal-actions">
            <button className="btn-secondary" onClick={() => setIsExerciseModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleCreateExercise}>Guardar Ejercicio</button>
          </div>
        </div></div>
      )}

      {isRutinaModalOpen && (
        <div className="modal-overlay"><div className="modal-content">
          <h2>Crear Nueva Rutina</h2>
          <div className="modal-form">
            <div className="input-group"><label>Nombre de la Rutina</label><input type="text" value={newRutinaForm.titulo} onChange={e => setNewRutinaForm({ ...newRutinaForm, titulo: e.target.value })} placeholder="Ej. Día de Empuje, Full Body..." /></div>
            <div className="input-group"><label>Estado Inicial</label>
              <select value={newRutinaForm.estado} onChange={e => setNewRutinaForm({ ...newRutinaForm, estado: e.target.value })} className="modal-select">
                <option value="activo">Activo</option>
                <option value="descanso">En Descanso</option>
              </select>
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn-secondary" onClick={() => setIsRutinaModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleCreateRutina}>Guardar Rutina</button>
          </div>
        </div></div>
      )}

      {isComidaModalOpen && (
        <div className="modal-overlay"><div className="modal-content">
          <h2>Añadir Comida</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '-0.5rem 0 1rem' }}>Se registrará para: <strong>{formatSelectedDate(selectedDate)}</strong></p>
          <div className="modal-form">
            <div className="fecha-inputs-row">
              <div className="input-group"><label>Tipo de Comida</label><input type="text" value={newComidaForm.tipo} onChange={e => setNewComidaForm(p => ({ ...p, tipo: e.target.value }))} placeholder="Ej. Almuerzo, Snack..." /></div>
              <div className="input-group"><label>Hora (Opcional)</label><input type="time" value={newComidaForm.hora} onChange={e => setNewComidaForm(p => ({ ...p, hora: e.target.value }))} /></div>
            </div>
            <div className="input-group"><label>Descripción</label><input type="text" value={newComidaForm.descripcion} onChange={e => setNewComidaForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Ej. Pechuga de pollo con arroz..." /></div>
            <div className="fecha-inputs-row">
              <div className="input-group"><label>Calorías (kcal)</label><input type="number" min="0" value={newComidaForm.calorias} onChange={e => setNewComidaForm(p => ({ ...p, calorias: e.target.value }))} placeholder="0" /></div>
              <div className="input-group"><label>Proteínas (g)</label><input type="number" min="0" value={newComidaForm.proteina} onChange={e => setNewComidaForm(p => ({ ...p, proteina: e.target.value }))} placeholder="0" /></div>
            </div>
            <div className="fecha-inputs-row">
              <div className="input-group"><label>Carbohidratos (g)</label><input type="number" min="0" value={newComidaForm.carbs} onChange={e => setNewComidaForm(p => ({ ...p, carbs: e.target.value }))} placeholder="0" /></div>
              <div className="input-group"><label>Grasas (g)</label><input type="number" min="0" value={newComidaForm.grasas} onChange={e => setNewComidaForm(p => ({ ...p, grasas: e.target.value }))} placeholder="0" /></div>
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn-secondary" onClick={() => setIsComidaModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={handleCreateComida}>Guardar Comida</button>
          </div>
        </div></div>
      )}
    </div>
  );
};

export default Fitness;
