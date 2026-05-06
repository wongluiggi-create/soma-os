import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import Login from './layouts/Login';
import MainLayout from './layouts/MainLayout';
import Home from './layouts/Home';
import Configuracion from './layouts/Configuracion';
import Proyectos from './layouts/Proyectos';
import Areas from './layouts/Areas';
import Cursos from './layouts/Cursos';
import Habitos from './layouts/Habitos';
import Notas from './layouts/Notas';
import Finanzas from './layouts/Finanzas';
import Fitness from './layouts/Fitness';

function App() {
  // --- ESTADO DE AUTENTICACIÓN FIREBASE ---
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const [userName, setUserName] = useState('Luiggi');

  const [categoriasIngreso, setCategoriasIngreso] = useState(['Sueldo', 'Honorarios', 'Ventas', 'Inversiones', 'Regalo', 'Extra', 'Criptomonedas']);
  const [categoriasEgreso, setCategoriasEgreso] = useState(['Alimentación', 'Servicios', 'Arriendo/Hipoteca', 'Transporte', 'Ocio', 'Salud', 'Educación', 'Hogar', 'Deudas', 'Suscripciones', 'Mascotas']);

  const [tarjetas, setTarjetas] = useState([
    { id: 1, tipo: 'Visa', banco: 'Banco Estado', numero: '4321', utilizado: 450000, total: 1500000 },
    { id: 2, tipo: 'Mastercard', banco: 'Banco Santander', numero: '8765', utilizado: 600000, total: 800000 }
  ]);

  const [peso, setPeso] = useState(75);
  const [estatura, setEstatura] = useState(175);

  // Pantalla de carga mientras Firebase verifica si estás logueado
  if (loadingAuth) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-main)', color: 'var(--soma-yellow)' }}>Cargando Soma OS...</div>;

  // Si no hay usuario activo, renderiza la pantalla de Login en lugar del sistema
  if (!user) return <Login />;

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home userName={userName} />} />
          <Route path="notas" element={<Notas />} />
          <Route path="finanzas" element={<Finanzas categoriasIngreso={categoriasIngreso} categoriasEgreso={categoriasEgreso} tarjetas={tarjetas} setTarjetas={setTarjetas} />} />
          <Route path="habitos" element={<Habitos />} />
          <Route path="cursos" element={<Cursos />} />
          <Route path="areas" element={<Areas />} />
          <Route path="proyectos" element={<Proyectos />} />
          <Route path="fitness" element={<Fitness peso={peso} estatura={estatura} />} />
          <Route path="configuracion" element={<Configuracion 
            userName={userName}
            setUserName={setUserName}
            categoriasIngreso={categoriasIngreso} 
            setCategoriasIngreso={setCategoriasIngreso} 
            categoriasEgreso={categoriasEgreso} 
            setCategoriasEgreso={setCategoriasEgreso} 
            tarjetas={tarjetas}
            setTarjetas={setTarjetas}
            peso={peso}
            setPeso={setPeso}
            estatura={estatura}
            setEstatura={setEstatura}
          />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

export default App;
