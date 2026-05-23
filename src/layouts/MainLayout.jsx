import { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import './MainLayout.css';

const getTodayKey = () => `pomodoro_sessions_${new Date().toISOString().slice(0, 10)}`;

const RING_RADIUS = 14;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const playBeep = (isWorkEnd) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const play = (freq, startAt, dur) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.22, ctx.currentTime + startAt);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startAt + dur);
      osc.start(ctx.currentTime + startAt);
      osc.stop(ctx.currentTime + startAt + dur);
    };
    if (isWorkEnd) {
      play(660, 0, 0.28);
      play(880, 0.33, 0.35);
    } else {
      play(520, 0, 0.28);
      play(440, 0.33, 0.35);
    }
  } catch { /* audio not supported */ }
};

const MainLayout = () => {
  const location = useLocation();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- Lógica del Reloj Pomodoro ---
  const [workMinutes, setWorkMinutes] = useState(() => {
    try { return parseInt(localStorage.getItem('pomodoro_work_min') || '25', 10); } catch { return 25; }
  });
  const [breakMinutes, setBreakMinutes] = useState(() => {
    try { return parseInt(localStorage.getItem('pomodoro_break_min') || '5', 10); } catch { return 5; }
  });
  const [autoStart, setAutoStart] = useState(() => {
    try { return localStorage.getItem('pomodoro_autostart') === 'true'; } catch { return false; }
  });
  const [timeLeft, setTimeLeft] = useState(() => {
    try { return (parseInt(localStorage.getItem('pomodoro_work_min'), 10) || 25) * 60; } catch { return 25 * 60; }
  });
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState('work');
  const [showSettings, setShowSettings] = useState(false);
  const [todaySessions, setTodaySessions] = useState(() => {
    try {
      const saved = localStorage.getItem(getTodayKey());
      return saved ? parseInt(saved, 10) : 0;
    } catch { return 0; }
  });

  const settingsRef = useRef(null);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Título de la pestaña del navegador
  useEffect(() => {
    document.title = isActive
      ? `${mode === 'work' ? '🍅' : '☕'} ${formatTime(timeLeft)} — Soma OS`
      : 'Soma OS';
  }, [timeLeft, isActive, mode]);

  // Atajo de teclado: Espacio = play/pause
  useEffect(() => {
    const handleKey = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsActive(prev => !prev);
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  // Cerrar panel de ajustes al clic fuera
  useEffect(() => {
    if (!showSettings) return;
    const handleClick = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showSettings]);

  // Cuenta regresiva y transición de modo
  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (isActive && timeLeft === 0) {
      setTimeout(() => {
        if (mode === 'work') {
          playBeep(true);
          setTodaySessions(prev => {
            const next = prev + 1;
            try { localStorage.setItem(getTodayKey(), String(next)); } catch { /* localStorage unavailable */ }
            return next;
          });
          setMode('break');
          setTimeLeft(breakMinutes * 60);
          setIsActive(autoStart);
        } else {
          playBeep(false);
          setMode('work');
          setTimeLeft(workMinutes * 60);
          setIsActive(autoStart);
        }
      }, 0);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, mode, workMinutes, breakMinutes, autoStart]);

  const toggleTimer = () => setIsActive(prev => !prev);
  const resetTimer = () => {
    setIsActive(false);
    setMode('work');
    setTimeLeft(workMinutes * 60);
  };

  const adjustWork = (delta) => {
    const next = Math.max(1, Math.min(90, workMinutes + delta));
    setWorkMinutes(next);
    try { localStorage.setItem('pomodoro_work_min', String(next)); } catch { /* localStorage unavailable */ }
    if (mode === 'work' && !isActive) setTimeLeft(next * 60);
  };

  const adjustBreak = (delta) => {
    const next = Math.max(1, Math.min(30, breakMinutes + delta));
    setBreakMinutes(next);
    try { localStorage.setItem('pomodoro_break_min', String(next)); } catch { /* localStorage unavailable */ }
    if (mode === 'break' && !isActive) setTimeLeft(next * 60);
  };

  const toggleAutoStart = () => {
    const next = !autoStart;
    setAutoStart(next);
    try { localStorage.setItem('pomodoro_autostart', String(next)); } catch { /* localStorage unavailable */ }
  };

  const totalTime = mode === 'work' ? workMinutes * 60 : breakMinutes * 60;
  const ringDashOffset = RING_CIRCUMFERENCE * (timeLeft / totalTime);
  const displayDots = Math.min(todaySessions, 8);
  const overflowCount = todaySessions > 8 ? todaySessions - 8 : 0;

  const menuItems = [
    { path: '/', label: 'Home' },
    { path: '/notas', label: 'Notas' },
    { path: '/finanzas', label: 'Finanzas' },
    { path: '/habitos', label: 'Hábitos' },
    { path: '/cursos', label: 'Cursos' },
    { path: '/areas', label: 'Áreas' },
    { path: '/proyectos', label: 'Proyectos' },
    { path: '/fitness', label: 'Fitness' },
  ];

  return (
    <div className="layout-container">
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 998
          }}
        />
      )}
      <header className="top-navbar" style={{ position: 'relative', zIndex: 1000 }}>
        <div className="navbar-brand-group">
          <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <div className="navbar-logo">
            <h2>Soma <span className="logo-accent">OS</span></h2>
          </div>
        </div>

        <nav className={`navbar-nav ${isMobileMenuOpen ? 'open' : ''}`}>
          <ul>
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="navbar-user">
          <div className="pomodoro-wrapper" ref={settingsRef}>
            <div className={`pomodoro-widget ${isActive ? 'active' : ''} ${mode}`}>
              {/* Anillo de progreso */}
              <div className="pomodoro-ring-container" title={mode === 'work' ? 'Modo Trabajo' : 'Modo Descanso'}>
                <svg width="36" height="36" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r={RING_RADIUS} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
                  <circle
                    cx="18" cy="18" r={RING_RADIUS}
                    fill="none"
                    stroke={mode === 'work' ? 'var(--soma-orange)' : '#3b82f6'}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={ringDashOffset}
                    transform="rotate(-90 18 18)"
                    className="pomodoro-ring-arc"
                  />
                </svg>
                <span className="pomodoro-mode-icon">{mode === 'work' ? '🍅' : '☕'}</span>
              </div>

              {/* Tiempo y sesiones */}
              <div className="pomodoro-info">
                <span className="pomodoro-time">{formatTime(timeLeft)}</span>
                <div className="pomodoro-sessions" title={`${todaySessions} sesión${todaySessions !== 1 ? 'es' : ''} completada${todaySessions !== 1 ? 's' : ''} hoy`}>
                  <span className="sessions-label">hoy</span>
                  <div className="sessions-dots">
                    {todaySessions === 0
                      ? <span className="sessions-zero">—</span>
                      : <>
                          {Array.from({ length: displayDots }).map((_, i) => (
                            <span key={i} className="session-dot" />
                          ))}
                          {overflowCount > 0 && <span className="sessions-overflow">+{overflowCount}</span>}
                        </>
                    }
                  </div>
                </div>
              </div>

              {/* Controles */}
              <div className="pomodoro-controls">
                <button className="pomodoro-btn" onClick={toggleTimer} title={`${isActive ? 'Pausar' : 'Iniciar'} (Espacio)`}>
                  {isActive
                    ? <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                    : <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                  }
                </button>
                <button className="pomodoro-btn stop" onClick={resetTimer} title="Reiniciar">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14"></rect></svg>
                </button>
              </div>

              {/* Botón de configuración */}
              <button
                className={`pomodoro-btn settings-btn ${showSettings ? 'settings-open' : ''}`}
                onClick={() => setShowSettings(v => !v)}
                title="Configurar tiempos"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="21" x2="4" y2="14"></line>
                  <line x1="4" y1="10" x2="4" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12" y2="3"></line>
                  <line x1="20" y1="21" x2="20" y2="16"></line>
                  <line x1="20" y1="12" x2="20" y2="3"></line>
                  <line x1="1" y1="14" x2="7" y2="14"></line>
                  <line x1="9" y1="8" x2="15" y2="8"></line>
                  <line x1="17" y1="16" x2="23" y2="16"></line>
                </svg>
              </button>
            </div>

            {/* Panel de configuración */}
            {showSettings && (
              <div className="pomodoro-settings-panel">
                <p className="settings-title">Tiempos</p>
                <div className="settings-row">
                  <span className="settings-row-label">🍅 Trabajo</span>
                  <div className="settings-stepper">
                    <button onClick={() => adjustWork(-1)} disabled={workMinutes <= 1}>−</button>
                    <span className="stepper-value">{workMinutes}m</span>
                    <button onClick={() => adjustWork(+1)} disabled={workMinutes >= 90}>+</button>
                  </div>
                </div>
                <div className="settings-row">
                  <span className="settings-row-label">☕ Descanso</span>
                  <div className="settings-stepper">
                    <button onClick={() => adjustBreak(-1)} disabled={breakMinutes <= 1}>−</button>
                    <span className="stepper-value">{breakMinutes}m</span>
                    <button onClick={() => adjustBreak(+1)} disabled={breakMinutes >= 30}>+</button>
                  </div>
                </div>
                <div className="settings-row">
                  <span className="settings-row-label">⚡ Auto-inicio</span>
                  <button className={`settings-toggle ${autoStart ? 'on' : ''}`} onClick={toggleAutoStart}>
                    {autoStart ? 'ON' : 'OFF'}
                  </button>
                </div>
                <p className="settings-hint">Espacio — pausar / reanudar</p>
              </div>
            )}
          </div>

          <Link to="/configuracion" className="config-link" title="Configuración">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </Link>
        </div>
      </header>

      <main className="main-wrapper">
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
