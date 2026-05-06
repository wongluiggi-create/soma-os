import { useState, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
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
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Descargar configuración y perfil desde Firestore
        const docRef = doc(db, 'usuarios', currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserName(data.nombre || '');
          setAvatarUrl(data.avatarUrl || '');
          setCategoriasIngreso(data.categoriasIngreso || []);
          setCategoriasEgreso(data.categoriasEgreso || []);
          setTarjetas(data.tarjetas || []);
          setPeso(data.peso || '');
          setEstatura(data.estatura || '');
        }
      } else {
        setUser(null);
        // Limpiar datos al cerrar sesión
        setUserName('');
        setAvatarUrl('');
        setCategoriasIngreso([]);
        setCategoriasEgreso([]);
        setTarjetas([]);
        setPeso('');
        setEstatura('');
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const [userName, setUserName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const [categoriasIngreso, setCategoriasIngreso] = useState([]);
  const [categoriasEgreso, setCategoriasEgreso] = useState([]);

  const [tarjetas, setTarjetas] = useState([]);

  const [peso, setPeso] = useState('');
  const [estatura, setEstatura] = useState('');

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
            avatarUrl={avatarUrl}
            setAvatarUrl={setAvatarUrl}
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
