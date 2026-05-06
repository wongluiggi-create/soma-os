import { useState } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import './Login.css';

const Login = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        // 1. Crear usuario en Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // 2. Guardar su perfil en Firestore Database
        await setDoc(doc(db, "usuarios", userCredential.user.uid), {
          nombre: name,
          email: email,
          fechaCreacion: new Date().toISOString()
        });
      } else {
        // Iniciar sesión normal
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      console.error(err);
      
      // Traducir los errores específicos de Firebase al español
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        setError('Correo o contraseña incorrectos.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este correo ya está registrado. Ve a "Inicia Sesión".');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Demasiados intentos fallidos. Intenta más tarde.');
      } else {
        setError(`Error de Firebase: ${err.message}`); // Mostrará el error técnico si es otro distinto
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <h1 className="login-logo">Soma <span style={{ color: 'var(--soma-yellow)' }}>OS</span></h1>
        <p className="login-subtitle">{isRegistering ? 'Crea tu cuenta para comenzar' : 'Inicia sesión en tu sistema'}</p>
        
        {error && <div style={{ color: '#e74c3c', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</div>}

        <form className="login-form" onSubmit={handleSubmit}>
          {isRegistering && (
            <input type="text" placeholder="Tu Nombre (Ej. Luiggi)" className="login-input" value={name} onChange={e => setName(e.target.value)} required />
          )}
          <input type="email" placeholder="Correo Electrónico" className="login-input" value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Contraseña (mínimo 6 caracteres)" className="login-input" value={password} onChange={e => setPassword(e.target.value)} required />
          
          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? 'Procesando...' : (isRegistering ? 'Registrarse' : 'Ingresar')}
          </button>
        </form>

        <button className="login-toggle" onClick={() => setIsRegistering(!isRegistering)}>
          {isRegistering ? '¿Ya tienes cuenta? Inicia Sesión' : '¿No tienes cuenta? Regístrate aquí'}
        </button>
      </div>
    </div>
  );
};

export default Login;