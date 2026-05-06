import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import './MainLayout.css';

const MainLayout = () => {
  const location = useLocation();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- Lógica del Reloj Pomodoro ---
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState('work'); // 'work' o 'break'

  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (isActive && timeLeft === 0) {
      // Usamos setTimeout para hacer los cambios de estado asíncronos y evitar renders en cascada
      setTimeout(() => {
        setIsActive(false);
        if (mode === 'work') {
          setMode('break');
          setTimeLeft(5 * 60); // 5 minutos de descanso
        } else {
          setMode('work');
          setTimeLeft(25 * 60); // Vuelve a 25 minutos de trabajo
        }
      }, 0);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, mode]);

  const toggleTimer = () => setIsActive(!isActive);
  const resetTimer = () => {
    setIsActive(false);
    setMode('work');
    setTimeLeft(25 * 60);
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Definimos las rutas del menú
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
      {/* Capa para cerrar menú móvil al hacer clic fuera */}
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
      {/* Menú Horizontal Superior */}
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
          {/* Widget Pomodoro */}
          <div className={`pomodoro-widget ${isActive ? 'active' : ''}`}>
            <span className="pomodoro-mode" title={mode === 'work' ? 'Modo Trabajo' : 'Modo Descanso'}>
              {mode === 'work' ? '🍅' : '☕'}
            </span>
            <span className="pomodoro-time">{formatTime(timeLeft)}</span>
            <button className="pomodoro-btn" onClick={toggleTimer} title={isActive ? 'Pausar' : 'Iniciar'}>
              {isActive 
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              }
            </button>
            <button className="pomodoro-btn stop" onClick={resetTimer} title="Reiniciar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14"></rect></svg>
            </button>
          </div>

          <Link to="/configuracion" className="config-link" title="Configuración">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </Link>
        </div>
      </header>

      {/* Contenedor Principal */}
      <main className="main-wrapper">
        <div className="page-content">
          <Outlet /> 
        </div>
      </main>
    </div>
  );
};

export default MainLayout;