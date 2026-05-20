import { useState, useRef, useEffect, useMemo } from 'react';
import { storage, db, auth } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy, getDoc, setDoc } from 'firebase/firestore';
import './Proyectos.css';
import './Finanzas.css';
import './Fitness.css';

const HEAT_WEEKS = 53;
const MEAL_CATEGORIES = ['Desayuno', 'Media Mañana', 'Almuerzo', 'Merienda', 'Cena'];

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
  const [draggingRutinaId, setDraggingRutinaId] = useState(null);
  const [draggingFromDay, setDraggingFromDay] = useState(null);
  const [dragOverDay, setDragOverDay] = useState(null);
  const [localSeries, setLocalSeries] = useState({});
  const [dayPage, setDayPage] = useState(0);
  const [expandedDays, setExpandedDays] = useState(new Set());

  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(today.setDate(diff));
  });
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
  const [fitnessAnualGraph, setFitnessAnualGraph] = useState(() => Array(HEAT_WEEKS * 7).fill(0));
  const [pesoRegistros, setPesoRegistros] = useState([]);
  const [nuevoPeso, setNuevoPeso] = useState('');

  const rachaDiaria = useMemo(() => {
    const fechas = new Set(
      rutinas.flatMap(r => (r.historial || []).map(h => h.fechaISO).filter(Boolean))
    );
    const diasConRutinas = new Set(rutinas.flatMap(r => r.diasAsignados || []));
    let streak = 0;
    const hoy = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(hoy);
      d.setDate(hoy.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      const dow = d.getDay() === 0 ? 6 : d.getDay() - 1;
      if (fechas.has(iso)) { streak++; }
      else if (diasConRutinas.size > 0 && !diasConRutinas.has(dow)) { continue; }
      else { break; }
    }
    return streak;
  }, [rutinas]);

  const fitnessHeatData = useMemo(() => {
    const intensityMap = {};
    rutinas.forEach(r => {
      (r.historial || []).forEach(h => {
        if (h.fechaISO && h.intensidad) {
          intensityMap[h.fechaISO] = Math.max(intensityMap[h.fechaISO] || 0, h.intensidad);
        }
      });
    });
    const today = new Date();
    const yearStart = new Date(today.getFullYear(), 0, 1);
    const dayOffset = yearStart.getDay() === 0 ? 6 : yearStart.getDay() - 1;
    const startDate = new Date(yearStart);
    startDate.setDate(yearStart.getDate() - dayOffset);
    return Array.from({ length: HEAT_WEEKS * 7 }).map((_, i) => {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      const intensity = intensityMap[iso] || 0;
      const level = intensity === 0 ? 0 : Math.min(Math.ceil(intensity * 4 / 5), 4);
      return { iso, level, isToday: d.toDateString() === today.toDateString(), isFuture: d > today, date: d };
    });
  }, [rutinas]);

  const toggleFitnessAnual = async (index) => {
    const newGraph = [...fitnessAnualGraph];
    newGraph[index] = (newGraph[index] + 1) % 5;
    setFitnessAnualGraph(newGraph);
    if (auth.currentUser) {
      await setDoc(doc(db, 'usuarios', auth.currentUser.uid), { fitnessAnualGraph: newGraph }, { merge: true });
    }
  };

  const pesoChartData = useMemo(() => {
    const KCAL_POR_INTENSIDAD = { 1: 150, 2: 250, 3: 350, 4: 450, 5: 450 };
    if (pesoRegistros.length === 0) return null;

    const sorted = [...pesoRegistros].sort((a, b) => a.fecha.localeCompare(b.fecha));
    const todayISO = new Date().toISOString().split('T')[0];

    const kcalMap = {};
    comidas.forEach(c => {
      const f = c.fecha || (c.createdAt ? c.createdAt.split('T')[0] : null);
      if (f) kcalMap[f] = (kcalMap[f] || 0) + (c.calorias || 0);
    });

    const burnMap = {};
    const workoutDaysSet = new Set();
    rutinas.forEach(r => {
      (r.historial || []).forEach(h => {
        if (h.fechaISO) {
          burnMap[h.fechaISO] = (burnMap[h.fechaISO] || 0) + (KCAL_POR_INTENSIDAD[h.intensidad] || 250);
          workoutDaysSet.add(h.fechaISO);
        }
      });
    });

    const startDate = new Date(sorted[0].fecha + 'T12:00:00');
    startDate.setDate(startDate.getDate() - 7);
    const endDate = new Date(todayISO + 'T12:00:00');
    endDate.setDate(endDate.getDate() + 3);
    const totalMs = endDate - startDate;

    const mL = 38, mT = 12, cW = 640, cH = 130;
    const toX = (iso) => mL + ((new Date(iso + 'T12:00:00') - startDate) / totalMs) * cW;
    const toYf = (w, minW, maxW) => mT + cH - ((w - minW) / Math.max(maxW - minW, 1)) * cH;

    const projSegments = [];
    for (let s = 0; s < sorted.length; s++) {
      const startISO = sorted[s].fecha;
      const startW = sorted[s].peso;
      const endISO = s < sorted.length - 1 ? sorted[s + 1].fecha : todayISO;
      let cumNet = 0;
      const segEnd = new Date(endISO + 'T12:00:00');
      projSegments.push({ iso: startISO, peso: startW });
      const segD = new Date(startISO + 'T12:00:00');
      segD.setDate(segD.getDate() + 1);
      while (segD <= segEnd) {
        const iso = segD.toISOString().split('T')[0];
        cumNet += (kcalMap[iso] || 0) - metasNutricion.calorias - (burnMap[iso] || 0);
        if (iso !== endISO || s === sorted.length - 1) {
          projSegments.push({ iso, peso: startW + cumNet / 7700 });
        }
        segD.setDate(segD.getDate() + 1);
      }
    }

    const allW = [...sorted.map(r => r.peso), ...projSegments.map(p => p.peso)];
    const minW = Math.min(...allW) - 1.5;
    const maxW = Math.max(...allW) + 1.5;
    const toY = (w) => toYf(w, minW, maxW);

    const actualPts = sorted.map(r => ({ x: toX(r.fecha), y: toY(r.peso), peso: r.peso, fecha: r.fecha }));
    const projPts = projSegments.map(p => ({ x: toX(p.iso), y: toY(p.peso) }));

    const buildPath = (pts) => pts.length < 2 ? '' :
      `M ${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)} ` +
      pts.slice(1).map(p => `L ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

    const projMap = {};
    projSegments.forEach(p => { projMap[p.iso] = p.peso; });

    const workoutPts = [...workoutDaysSet]
      .filter(iso => iso >= sorted[0].fecha && iso <= todayISO && projMap[iso] !== undefined)
      .map(iso => ({ x: toX(iso), y: toY(projMap[iso]) }));

    const xLabels = [];
    const firstMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1, 12, 0, 0);
    if (firstMonth < startDate) firstMonth.setMonth(firstMonth.getMonth() + 1);
    const monthCursor = new Date(firstMonth);
    while (monthCursor <= endDate) {
      xLabels.push({ x: toX(monthCursor.toISOString().split('T')[0]), label: monthCursor.toLocaleString('es-ES', { month: 'short' }) });
      monthCursor.setMonth(monthCursor.getMonth() + 1);
    }

    const yLabels = [];
    const range = maxW - minW;
    const yStep = range <= 4 ? 0.5 : range <= 8 ? 1 : 2;
    const yStart = Math.ceil(minW / yStep) * yStep;
    const ySteps = Math.floor((maxW - yStart) / yStep) + 1;
    for (let i = 0; i < ySteps; i++) {
      const w = Math.round((yStart + i * yStep) * 10) / 10;
      yLabels.push({ y: toY(w), label: w % 1 === 0 ? w.toString() : w.toFixed(1) });
    }

    return {
      actualPath: buildPath(actualPts), projPath: buildPath(projPts),
      actualPts, workoutPts, xLabels, yLabels,
      mL, mT, cW, cH, todayX: toX(todayISO), sorted,
    };
  }, [pesoRegistros, comidas, rutinas, metasNutricion]);

  const adherenciaData = useMemo(() => {
    const hoy = new Date();
    return Array.from({ length: 30 }).map((_, i) => {
      const d = new Date(hoy);
      d.setDate(hoy.getDate() - (29 - i));
      const iso = d.toISOString().split('T')[0];
      const comidasDia = comidas.filter(c => (c.fecha || (c.createdAt ? c.createdAt.split('T')[0] : null)) === iso);
      const categsLogged = new Set(comidasDia.map(c => c.tipo).filter(t => MEAL_CATEGORIES.includes(t)));
      return { iso, count: categsLogged.size };
    });
  }, [comidas]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    const unUser = onSnapshot(doc(db, 'usuarios', uid), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.metasNutricion) {
        setMetasNutricion(data.metasNutricion);
        setMetasForm(data.metasNutricion);
      }
      if (data.fitnessAnualGraph) setFitnessAnualGraph(data.fitnessAnualGraph);
    });

    const qRutinas = query(collection(db, 'usuarios', uid, 'rutinas'), orderBy('createdAt', 'desc'));
    const unRutinas = onSnapshot(qRutinas, (snap) => {
      setRutinas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qComidas = query(collection(db, 'usuarios', uid, 'comidas'), orderBy('createdAt', 'asc'));
    const unComidas = onSnapshot(qComidas, (snap) => {
      setComidas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qPeso = query(collection(db, 'usuarios', uid, 'pesoRegistros'), orderBy('fecha', 'asc'));
    const unPeso = onSnapshot(qPeso, snap => {
      setPesoRegistros(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unUser(); unRutinas(); unComidas(); unPeso(); };
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

  // --- PESO CRUD ---
  const registrarPeso = async () => {
    const kg = parseFloat(nuevoPeso);
    if (isNaN(kg) || kg <= 0 || !auth.currentUser) return;
    await addDoc(collection(db, 'usuarios', auth.currentUser.uid, 'pesoRegistros'), {
      fecha: selectedDate,
      peso: kg,
      createdAt: new Date().toISOString(),
    });
    setNuevoPeso('');
  };

  const eliminarPesoRegistro = async (id) => {
    if (auth.currentUser) await deleteDoc(doc(db, 'usuarios', auth.currentUser.uid, 'pesoRegistros', id));
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

  // --- ACTIVITY GRAPH (Rutinas tab) — datos reales del calendario semanal ---
  // Se calcula después de weekDays/completedPerDay en el flujo de render

  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const todayDate = new Date();
  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const prevWeek = () => { const d = new Date(currentWeekStart); d.setDate(d.getDate() - 7); setCurrentWeekStart(d); };
  const nextWeek = () => { const d = new Date(currentWeekStart); d.setDate(d.getDate() + 7); setCurrentWeekStart(d); };

  const completedPerDay = weekDays.map(date => {
    const dayISO = date.toISOString().split('T')[0];
    return rutinas.reduce((count, r) =>
      count + (r.historial || []).filter(h => h.fechaISO === dayISO).length, 0
    );
  });
  const maxCompleted = Math.max(...completedPerDay, 1);

  // Intensidad manual por día: máximo nivel (1-5) registrado ese día
  const HEAT_OPACITIES = [0, 0.18, 0.36, 0.55, 0.73, 0.92];
  const intensidadPerDay = weekDays.map(date => {
    const dayISO = date.toISOString().split('T')[0];
    const entries = rutinas.flatMap(r => (r.historial || []).filter(h => h.fechaISO === dayISO));
    if (entries.length === 0) return 0;
    return Math.max(...entries.map(h => h.intensidad || 0));
  });

  const getHeatBg = (level) => {
    if (!level) return undefined;
    return `rgba(240,127,18,${HEAT_OPACITIES[Math.min(level, 5)]})`;
  };

  // Curva SVG para el gráfico de Actividad Semanal — usa intensidad manual (0-5 → normalizado)
  const volCoords = intensidadPerDay.map((v, i) => ({ x: i * 100 + 50, y: 100 - (v / 5) * 88 }));
  let linePath = '', areaPath = '';
  if (volCoords.length > 0) {
    linePath = `M ${volCoords[0].x},${volCoords[0].y}`;
    for (let i = 0; i < volCoords.length - 1; i++) {
      const cx = (volCoords[i].x + volCoords[i + 1].x) / 2;
      linePath += ` C ${cx},${volCoords[i].y} ${cx},${volCoords[i + 1].y} ${volCoords[i + 1].x},${volCoords[i + 1].y}`;
    }
    areaPath = `${linePath} L ${volCoords[volCoords.length - 1].x},100 L ${volCoords[0].x},100 Z`;
  }

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

  const getLocalSeries = (rutinaId, dayISO, ejercicios) => {
    const key = `${rutinaId}_${dayISO}`;
    return localSeries[key] || ejercicios.map(e => Array(e.series).fill(false));
  };

  const toggleLocalSerie = (rutinaId, ejercicioId, idx, dayISO) => {
    const rutina = rutinas.find(r => r.id === rutinaId);
    if (!rutina) return;
    const key = `${rutinaId}_${dayISO}`;
    const current = localSeries[key] || rutina.ejercicios.map(e => Array(e.series).fill(false));
    const updated = current.map((arr, ejIdx) => {
      if (rutina.ejercicios[ejIdx]?.id !== ejercicioId) return arr;
      const n = [...arr]; n[idx] = !n[idx]; return n;
    });
    setLocalSeries(prev => ({ ...prev, [key]: updated }));
  };

  const toggleFechaEspecifica = async (rutinaId, dayISO) => {
    const r = rutinas.find(r => r.id === rutinaId);
    if (!r || !auth.currentUser) return;
    const fechas = r.fechasEspecificas || [];
    const nuevo = fechas.includes(dayISO) ? fechas.filter(f => f !== dayISO) : [...fechas, dayISO];
    await updateRutinaDB(rutinaId, { fechasEspecificas: nuevo });
  };

  const desregistrarEntrenamiento = async (rutinaId, dayISO) => {
    const r = rutinas.find(r => r.id === rutinaId);
    if (!r || !auth.currentUser) return;
    const idx = (r.historial || []).findIndex(h => h.fechaISO === dayISO);
    if (idx === -1) return;
    await updateRutinaDB(rutinaId, { historial: r.historial.filter((_, i) => i !== idx) });
  };

  const setIntensidadPendiente = async (rutinaId, nivel) => {
    const r = rutinas.find(r => r.id === rutinaId);
    if (!r || !auth.currentUser) return;
    const nuevo = (r.intensidadPendiente || 0) === nivel ? 0 : nivel;
    await updateRutinaDB(rutinaId, { intensidadPendiente: nuevo });
  };

  const registrarEntrenamiento = async (rutinaId, dayISO, viaVideo = false) => {
    const r = rutinas.find(r => r.id === rutinaId);
    if (r && auth.currentUser) {
      const total = r.ejercicios.reduce((a, e) => a + e.series, 0);
      const seriesState = localSeries[`${rutinaId}_${dayISO}`] || r.ejercicios.map(e => Array(e.series).fill(false));
      const done  = seriesState.reduce((a, arr) => a + arr.filter(Boolean).length, 0);
      const detalle = viaVideo ? 'Completado vía video' : `${done}/${total} series completadas`;
      const intensidad = r.intensidadPendiente || 3;
      const reg   = { id: Date.now(), fecha: new Date(dayISO + 'T12:00:00').toLocaleDateString(), fechaISO: dayISO, detalle, source: viaVideo ? 'video' : 'manual', seriesCompletadas: viaVideo ? total : done, seriesTotal: total, intensidad };
      const reset = r.ejercicios.map(e => ({ ...e, seriesEstado: Array(e.series).fill(false) }));
      await updateRutinaDB(rutinaId, { historial: [reg, ...(r.historial || [])], ejercicios: reset, intensidadPendiente: 0 });
      setLocalSeries(prev => { const n = { ...prev }; delete n[`${rutinaId}_${dayISO}`]; return n; });
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

  const moverRutinaDeCalendario = async (rutinaId, fromDay, toDay) => {
    if (fromDay === toDay) return;
    const r = rutinas.find(x => x.id === rutinaId);
    if (r && auth.currentUser) {
      const dias = (r.diasAsignados || []).filter(d => d !== fromDay);
      if (!dias.includes(toDay)) dias.push(toDay);
      await updateRutinaDB(rutinaId, { diasAsignados: dias.sort((a, b) => a - b) });
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
          {/* Intensidad Anual — ancho completo, sobre el calendario */}
          {(() => {
            const LABELS = ['Nula', 'Baja', 'Media', 'Alta', 'Fuerte'];
            const pastCount = fitnessHeatData.filter(d => !d.isFuture).length;
            const activeCount = fitnessHeatData.filter((d, i) => !d.isFuture && fitnessAnualGraph[i] > 0).length;
            const fitnessPct = pastCount > 0 ? Math.round((activeCount / pastCount) * 100) : 0;
            return (
              <div className="proyecto-card" style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 500, color: 'var(--text-primary)' }}>Intensidad Anual</h3>
                    <span className="status-badge" style={{ backgroundColor: 'rgba(240, 127, 18, 0.12)', color: 'var(--soma-orange)', border: '1px solid rgba(240, 127, 18, 0.35)' }}>
                      {fitnessPct}% General
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
                    {[['', 'Nula'], ['heat-1', 'Baja'], ['heat-2', 'Media'], ['heat-3', 'Alta'], ['heat-4', 'Fuerte']].map(([cls, lbl]) => (
                      <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <div className={`activity-block${cls ? ` ${cls}` : ''}`} style={{ width: '12px', height: '12px', cursor: 'default', transform: 'none' }} />
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{lbl}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="fitness-heat-wrapper">
                  <div className="fitness-x-axis">
                    {Array.from({ length: HEAT_WEEKS }).map((_, i) => (
                      <span key={i} className="graph-label-x">{i % 4 === 0 ? i + 1 : ''}</span>
                    ))}
                  </div>
                  <div className="fitness-heat-inner">
                    <div className="activity-y-axis">
                      <span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span>
                    </div>
                    <div className="fitness-heat-graph">
                      {fitnessHeatData.map((day, i) => {
                        const lvl = fitnessAnualGraph[i] ?? 0;
                        return (
                          <div
                            key={i}
                            className={`activity-block${lvl > 0 ? ` heat-${lvl}` : ''}${day.isToday ? ' is-today' : ''}${day.isFuture ? ' is-future' : ''}`}
                            title={`${day.date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })} — ${LABELS[lvl]}`}
                            onClick={!day.isFuture ? () => toggleFitnessAnual(i) : undefined}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="finance-content-grid">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', minWidth: 0 }}>

              {/* Calendario Semanal — Planner */}
              <div className="proyecto-card cal-planner-card">
                <div className="calendar-header-fitness">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <h3>Calendario Semanal</h3>
                    <div className={`racha-badge ${rachaClass}`}>
                      <span className="racha-icon">{rachaIcon}</span>
                      <span className="racha-text">{rachaDiaria} {rachaDiaria === 1 ? 'Día' : 'Días'}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <button className="btn-icon-action" onClick={() => setDayPage(p => Math.max(0, p - 1))} disabled={dayPage === 0} style={{ opacity: dayPage === 0 ? 0.3 : 1 }}>‹</button>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', minWidth: '4rem', textAlign: 'center' }}>
                      {dayPage === 0 ? 'Lun – Jue' : 'Vie – Dom'}
                    </span>
                    <button className="btn-icon-action" onClick={() => setDayPage(p => Math.min(1, p + 1))} disabled={dayPage === 1} style={{ opacity: dayPage === 1 ? 0.3 : 1 }}>›</button>
                    <span style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.1)', margin: '0 0.25rem' }} />
                    <button className="btn-icon-action" onClick={prevWeek}>←</button>
                    <span className="calendar-month">{currentWeekStart.toLocaleString('es-ES', { month: 'short', year: 'numeric' })}</span>
                    <button className="btn-icon-action" onClick={nextWeek}>→</button>
                  </div>
                </div>

                <div className="cal-planner-columns">
                  {weekDays.slice(dayPage * 4, dayPage * 4 + 4).map((date, i) => {
                    const wIdx           = dayPage * 4 + i;
                    const isToday        = date.toDateString() === todayDate.toDateString();
                    const dayISO         = date.toISOString().split('T')[0];
                    const heatBg         = getHeatBg(intensidadPerDay[wIdx]);
                    const draggingRutina = rutinas.find(r => r.id === draggingRutinaId);
                    const willRemove     = draggingFromDay === null && draggingRutina && (draggingRutina.diasAsignados || []).includes(wIdx);
                    const dayRoutines    = rutinasActivas.filter(r =>
                      (r.diasAsignados || []).includes(wIdx) || (r.fechasEspecificas || []).includes(dayISO)
                    );
                    const doneToday      = dayRoutines.filter(r => (r.historial || []).some(h => h.fechaISO === dayISO));
                    const MAX_CAL        = 2;
                    const isExpanded     = expandedDays.has(wIdx);
                    const visibleRoutines = isExpanded ? dayRoutines : dayRoutines.slice(0, MAX_CAL);
                    const hiddenCount    = dayRoutines.length - MAX_CAL;
                    return (
                      <div
                        key={wIdx}
                        className={[
                          'cal-day-col',
                          isToday ? 'today' : '',
                          draggingRutinaId ? 'drop-target' : '',
                          dragOverDay === wIdx && draggingRutinaId ? 'drag-over' : '',
                          willRemove && dragOverDay === wIdx ? 'will-remove' : '',
                        ].filter(Boolean).join(' ')}
                        onDragOver={e => { e.preventDefault(); setDragOverDay(wIdx); }}
                        onDragLeave={() => setDragOverDay(null)}
                        onDrop={e => {
                          e.preventDefault();
                          if (draggingRutinaId) {
                            if (draggingFromDay !== null) {
                              moverRutinaDeCalendario(draggingRutinaId, draggingFromDay, wIdx);
                            } else {
                              toggleDiaRutina(draggingRutinaId, wIdx);
                            }
                          }
                          setDraggingRutinaId(null);
                          setDraggingFromDay(null);
                          setDragOverDay(null);
                        }}
                      >
                        <div className="cal-day-header" style={heatBg ? { background: heatBg } : undefined}>
                          <div className="cal-day-name-num">
                            <span className="cal-day-name">{dayNames[wIdx]}</span>
                            <span className={`cal-day-num ${isToday ? 'today' : ''}`}>{date.getDate()}</span>
                          </div>
                          {doneToday.length > 0 && (
                            <span className="cal-done-count">✓ {doneToday.length}</span>
                          )}
                        </div>

                        <div className="cal-day-body">
                          {dayRoutines.length === 0 && (
                            <div className="cal-empty-day">Sin rutinas</div>
                          )}
                          {visibleRoutines.map(rutina => {
                            const localSer   = getLocalSeries(rutina.id, dayISO, rutina.ejercicios);
                            const total      = rutina.ejercicios.reduce((a, e) => a + e.series, 0);
                            const done       = localSer.reduce((a, arr) => a + arr.filter(Boolean).length, 0);
                            const progreso   = total > 0 ? Math.round((done / total) * 100) : 0;
                            const isDoneToday = (rutina.historial || []).some(h => h.fechaISO === dayISO);
                            return (
                              <div
                                key={rutina.id}
                                className={`cal-routine-card ${isDoneToday ? 'done' : ''}`}
                                draggable
                                onDragStart={e => { e.stopPropagation(); setDraggingRutinaId(rutina.id); setDraggingFromDay(wIdx); }}
                                onDragEnd={() => { setDraggingRutinaId(null); setDraggingFromDay(null); setDragOverDay(null); }}
                              >
                                <div className="cal-routine-card-header">
                                  <span className="drag-handle" style={{ fontSize: '0.9rem' }}>⠿</span>
                                  <span className="cal-routine-title" title={rutina.titulo}>{rutina.titulo}</span>
                                  {isDoneToday && <span className="cal-done-badge">✓</span>}
                                  <button
                                    className={`btn-pin-date${(rutina.fechasEspecificas || []).includes(dayISO) ? ' active' : ''}`}
                                    onClick={e => { e.stopPropagation(); toggleFechaEspecifica(rutina.id, dayISO); }}
                                    title={(rutina.fechasEspecificas || []).includes(dayISO) ? 'Quitar de esta fecha' : 'Fijar solo a esta fecha'}
                                  >📌</button>
                                  {(rutina.enlaces || []).filter(e => e.guardado).length > 0 && (
                                    <a href={(rutina.enlaces.find(e => e.guardado) || {}).url} target="_blank" rel="noopener noreferrer" className="cal-video-link" title="Ver video">🎬</a>
                                  )}
                                </div>

                                <div className="progress-bar-bg" style={{ marginTop: '0.35rem', height: '4px' }}>
                                  <div className="progress-bar-fill" style={{ width: `${progreso}%` }} />
                                </div>

                                <div className="cal-exercise-list">
                                  {rutina.ejercicios.map((ej, ejIdx) => (
                                    <div key={ej.id} className="cal-exercise-row">
                                      <span className="cal-exercise-name" title={ej.nombre}>{ej.nombre}</span>
                                      <div className="series-tracker" style={{ gap: '3px' }}>
                                        {(localSer[ejIdx] || []).map((s, idx) => (
                                          <label key={idx} className="serie-checkbox-wrapper">
                                            <input type="checkbox" checked={s} onChange={() => toggleLocalSerie(rutina.id, ej.id, idx, dayISO)} />
                                            <div className="serie-checkbox-custom" style={{ width: '18px', height: '18px', fontSize: '0.6rem' }}>{idx + 1}</div>
                                          </label>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                <div className="register-workout-row" style={{ marginTop: '0.5rem' }}>
                                  <button
                                    className={`btn-register-workout ${progreso === 100 ? 'complete' : progreso > 0 ? 'partial' : ''}`}
                                    onClick={() => registrarEntrenamiento(rutina.id, dayISO)}
                                    title={`${done}/${total} series`}
                                  >
                                    <span className="register-check">✓</span>
                                    <span>Registrar</span>
                                    <span className="register-progress">{done}/{total}</span>
                                  </button>
                                  {(rutina.enlaces || []).some(e => e.guardado) && (
                                    <button className="btn-register-video" onClick={() => registrarEntrenamiento(rutina.id, dayISO, true)} title="Vía video">🎬</button>
                                  )}
                                </div>
                                {isDoneToday && (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.4rem' }}>
                                    <p className="cal-done-label" style={{ margin: 0 }}>
                                      ✓ {(rutina.historial || []).filter(h => h.fechaISO === dayISO).length} sesión(es)
                                    </p>
                                    <button
                                      className="btn-icon-action"
                                      style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem' }}
                                      onClick={() => desregistrarEntrenamiento(rutina.id, dayISO)}
                                      title="Deshacer último registro"
                                    >↩</button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {!isExpanded && hiddenCount > 0 && (
                            <button className="cal-more-btn" onClick={() => setExpandedDays(prev => { const n = new Set(prev); n.add(wIdx); return n; })}>+{hiddenCount} más</button>
                          )}
                          {isExpanded && dayRoutines.length > MAX_CAL && (
                            <button className="cal-more-btn" onClick={() => setExpandedDays(prev => { const n = new Set(prev); n.delete(wIdx); return n; })}>Mostrar menos</button>
                          )}
                        </div>
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
                    <div
                      key={rutina.id}
                      className="proyecto-card"
                      draggable
                      onDragStart={() => setDraggingRutinaId(rutina.id)}
                      onDragEnd={() => { setDraggingRutinaId(null); setDragOverDay(null); }}
                    >
                      <div className="proyecto-card-header">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span className="drag-handle" title="Arrastrar al calendario">⠿</span>
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

                      <div className="intensity-picker">
                        <span className="intensity-picker-label">Intensidad</span>
                        <div className="intensity-dots">
                          {[1,2,3,4,5].map(level => (
                            <button
                              key={level}
                              className={`intensity-dot ${(rutina.intensidadPendiente || 0) >= level ? 'active' : ''}`}
                              style={{ opacity: HEAT_OPACITIES[level] + 0.08 }}
                              onClick={() => setIntensidadPendiente(rutina.id, level)}
                              title={`Intensidad ${level}`}
                            />
                          ))}
                        </div>
                      </div>

                      <div className="register-workout-row">
                        <button
                          className={`btn-register-workout ${progreso === 100 ? 'complete' : progreso > 0 ? 'partial' : ''}`}
                          onClick={() => registrarEntrenamiento(rutina.id, new Date().toISOString().split('T')[0])}
                          title={`${done}/${total} series completadas`}
                        >
                          <span className="register-check">✓</span>
                          <span>Registrar</span>
                          <span className="register-progress">{done}/{total}</span>
                        </button>
                        {(rutina.enlaces || []).some(e => e.guardado) && (
                          <button
                            className="btn-register-video"
                            onClick={() => registrarEntrenamiento(rutina.id, new Date().toISOString().split('T')[0], true)}
                            title="Registrar como completado vía video"
                          >
                            🎬
                          </button>
                        )}
                      </div>
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
                  <h3 className="summary-title" style={{ marginBottom: '1rem' }}>Actividad Semanal</h3>
                  <p className="chart-legend">
                    {weekDays[0].toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} – {weekDays[6].toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
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

          {/* REGISTRO DE PESO */}
          <div className="peso-tracking-card">
            {pesoRegistros.length === 0 ? (
              <div className="peso-empty-layout">
                <div>
                  <h3 style={{ margin: '0 0 0.3rem', fontSize: '1rem', fontWeight: 500 }}>Registro de Peso</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Registra tu primer peso para ver la tendencia calórica.</p>
                </div>
                <div className="peso-input-row">
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                  </span>
                  <input type="number" step="0.1" min="20" max="300" placeholder="kg" value={nuevoPeso}
                    onChange={e => setNuevoPeso(e.target.value)} onKeyDown={e => e.key === 'Enter' && registrarPeso()} />
                  <button className="btn-primary" onClick={registrarPeso}>Registrar</button>
                </div>
              </div>
            ) : pesoChartData && (
              <div className="peso-columns-layout">

                {/* Columna izquierda: gráfica + leyenda */}
                <div className="peso-chart-col">
                  <svg viewBox="0 0 700 175" style={{ width: '100%', height: 'auto' }}>
                    {pesoChartData.yLabels.map((l, i) => (
                      <line key={i} x1={pesoChartData.mL} x2={pesoChartData.mL + pesoChartData.cW} y1={l.y} y2={l.y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                    ))}
                    {pesoChartData.yLabels.map((l, i) => (
                      <text key={i} x={pesoChartData.mL - 4} y={l.y + 4} textAnchor="end" fill="var(--text-secondary)" fontSize="9">{l.label}</text>
                    ))}
                    {pesoChartData.xLabels.map((l, i) => (
                      <text key={i} x={l.x} y={pesoChartData.mT + pesoChartData.cH + 20} textAnchor="middle" fill="var(--text-secondary)" fontSize="9">{l.label}</text>
                    ))}
                    <line x1={pesoChartData.todayX} x2={pesoChartData.todayX} y1={pesoChartData.mT} y2={pesoChartData.mT + pesoChartData.cH} stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="4 4" />
                    {pesoChartData.projPath && <path d={pesoChartData.projPath} fill="none" stroke="var(--soma-orange)" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.6" />}
                    {pesoChartData.actualPath && <path d={pesoChartData.actualPath} fill="none" stroke="var(--soma-purple)" strokeWidth="2.5" />}
                    {pesoChartData.workoutPts.map((pt, i) => (
                      <circle key={i} cx={pt.x} cy={pt.y} r="3" fill="var(--soma-orange)" opacity="0.75" />
                    ))}
                    {pesoChartData.actualPts.map((pt, i) => (
                      <g key={i}>
                        <circle cx={pt.x} cy={pt.y} r="5" fill="var(--soma-purple)" stroke="rgba(0,0,0,0.5)" strokeWidth="2" />
                        <text x={pt.x} y={pt.y - 9} textAnchor="middle" fill="var(--soma-purple)" fontSize="9" fontWeight="600">{pt.peso}kg</text>
                      </g>
                    ))}
                  </svg>
                  <div className="peso-legend">
                    <div><span className="peso-legend-line purple" /> Peso registrado</div>
                    <div><span className="peso-legend-line orange-dashed" /> Proyección calórica</div>
                    <div><span className="peso-legend-dot orange" /> Entrenamiento</div>
                  </div>
                </div>

                {/* Columna derecha: título, formulario y lista */}
                <div className="peso-controls-col">
                  <div style={{ marginBottom: '1rem' }}>
                    <h3 style={{ margin: '0 0 0.3rem', fontSize: '1rem', fontWeight: 500 }}>Registro de Peso</h3>
                    {(() => {
                      const last = [...pesoRegistros].sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
                      return (
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          Último: <strong style={{ color: 'var(--soma-purple)' }}>{last.peso} kg</strong> · {new Date(last.fecha + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        </p>
                      );
                    })()}
                  </div>
                  <div className="peso-input-row" style={{ marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </span>
                    <input type="number" step="0.1" min="20" max="300" placeholder="kg" value={nuevoPeso}
                      onChange={e => setNuevoPeso(e.target.value)} onKeyDown={e => e.key === 'Enter' && registrarPeso()} />
                    <button className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={registrarPeso}>Registrar</button>
                  </div>
                  <div className="peso-entries-list">
                    {[...pesoRegistros].sort((a, b) => b.fecha.localeCompare(a.fecha)).map(r => (
                      <div key={r.id} className="peso-entry-item">
                        <div>
                          <span className="peso-entry-value">{r.peso} kg</span>
                          <span className="peso-entry-date">
                            {new Date(r.fecha + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                        <button className="btn-icon-action delete-icon" onClick={() => eliminarPesoRegistro(r.id)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>

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

          {/* REGISTRO DIARIO — 5 CATEGORÍAS */}
          <div className="daily-log-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Registro del Día</h3>
              <span className="status-badge" style={{ backgroundColor: 'rgba(162,146,197,0.1)', color: 'var(--soma-purple)', border: '1px solid rgba(162,146,197,0.3)' }}>
                {MEAL_CATEGORIES.filter(cat => comidasDelDia.some(c => c.tipo === cat)).length}/5
              </span>
            </div>
          </div>

          <div className="meal-categories-grid">
            {MEAL_CATEGORIES.map((cat, idx) => {
              const catComidas = comidasDelDia.filter(c => c.tipo === cat);
              const catKcal = catComidas.reduce((a, c) => a + (c.calorias || 0), 0);
              const isLogged = catComidas.length > 0;
              return (
                <div key={cat} className={`meal-category-card${isLogged ? ' logged' : ''}${idx === 4 ? ' full-width' : ''}`}>
                  <div className="meal-cat-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span className={`meal-cat-dot${isLogged ? ' active' : ''}`} />
                      <span className="meal-cat-name">{cat}</span>
                      {catKcal > 0 && <span className="meal-cat-kcal">{catKcal} kcal</span>}
                    </div>
                    <button
                      className="btn-icon-action"
                      style={{ fontSize: '1.1rem', fontWeight: 300, lineHeight: 1, padding: '0.1rem 0.4rem' }}
                      onClick={() => {
                        setNewComidaForm({ tipo: cat, hora: '', descripcion: '', calorias: '', proteina: '', carbs: '', grasas: '' });
                        setIsComidaModalOpen(true);
                      }}
                    >+</button>
                  </div>
                  {catComidas.length > 0 ? (
                    <div className="meal-cat-items">
                      {catComidas.map(c => (
                        <div key={c.id} className="meal-cat-item">
                          <div className="meal-item-info">
                            {c.hora && <span className="meal-item-hora">{c.hora}</span>}
                            <span className="meal-item-desc" title={c.descripcion}>{c.descripcion || '—'}</span>
                          </div>
                          <div className="meal-item-right">
                            <span className="meal-item-kcal">{c.calorias} kcal</span>
                            {c.proteina > 0 && <span className="macro-badge" style={{ color: '#3498db', border: '1px solid rgba(52,152,219,0.3)', fontSize: '0.65rem' }}>P:{c.proteina}g</span>}
                            {c.carbs > 0 && <span className="macro-badge" style={{ color: 'var(--soma-yellow)', border: '1px solid rgba(253,200,21,0.3)', fontSize: '0.65rem' }}>C:{c.carbs}g</span>}
                            {c.grasas > 0 && <span className="macro-badge" style={{ color: 'var(--soma-orange)', border: '1px solid rgba(240,127,18,0.3)', fontSize: '0.65rem' }}>G:{c.grasas}g</span>}
                            <button className="btn-icon-action delete-icon" onClick={() => eliminarComida(c.id)}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="meal-cat-empty">Sin registros</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Adherencia gráfica — últimos 30 días */}
          {(() => {
            const svgW = 700, mL = 28, mT = 10, cW = svgW - mL - 10;
            const barAreaH = 60, baseline = mT + barAreaH;
            const slotW = cW / 30;
            const barW = Math.max(slotW - 4, 4);
            const todayISO = new Date().toISOString().split('T')[0];
            const hoyCount = adherenciaData[adherenciaData.length - 1]?.count ?? 0;
            return (
              <div className="adherencia-chart-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Adherencia últimos 30 días</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--soma-purple)', fontWeight: 600 }}>{hoyCount}/5 hoy</span>
                </div>
                <svg viewBox={`0 0 ${svgW} 105`} style={{ width: '100%', height: 'auto' }}>
                  <text x={mL - 4} y={mT + 4} textAnchor="end" fill="var(--text-secondary)" fontSize="8">5</text>
                  <text x={mL - 4} y={baseline + 4} textAnchor="end" fill="var(--text-secondary)" fontSize="8">0</text>
                  <line x1={mL} x2={mL + cW} y1={baseline} y2={baseline} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                  {adherenciaData.map((d, i) => {
                    const x = mL + i * slotW + (slotW - barW) / 2;
                    const barH = (d.count / 5) * barAreaH;
                    const alpha = d.count === 0 ? 0.05 : 0.18 + (d.count / 5) * 0.82;
                    const isToday = d.iso === todayISO;
                    return (
                      <g key={i}>
                        <rect x={x} y={baseline - Math.max(barH, d.count > 0 ? 3 : 0)} width={barW}
                          height={Math.max(barH, d.count > 0 ? 3 : 2)} rx="2" fill={`rgba(162,146,197,${alpha})`} />
                        {isToday && <rect x={x - 1} y={mT} width={barW + 2} height={barAreaH} rx="2"
                          fill="none" stroke="var(--soma-orange)" strokeWidth="1.5" opacity="0.6" />}
                      </g>
                    );
                  })}
                  {adherenciaData.filter((_, i) => i % 7 === 0).map((d, idx) => (
                    <text key={idx} x={mL + idx * 7 * slotW + slotW / 2} y={baseline + 18}
                      textAnchor="middle" fill="var(--text-secondary)" fontSize="8">
                      {new Date(d.iso + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    </text>
                  ))}
                </svg>
              </div>
            );
          })()}
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
              <div className="input-group">
                <label>Tipo de Comida</label>
                <select value={newComidaForm.tipo} onChange={e => setNewComidaForm(p => ({ ...p, tipo: e.target.value }))} className="modal-select">
                  <option value="">Seleccionar...</option>
                  {MEAL_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  <option value="Otro">Otro</option>
                </select>
              </div>
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
