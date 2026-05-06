import { useState, useRef } from 'react';
import { storage, db, auth } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore';
import './Configuracion.css';

const Configuracion = ({ userName, setUserName, avatarUrl, setAvatarUrl, categoriasIngreso = [], setCategoriasIngreso, categoriasEgreso = [], setCategoriasEgreso, tarjetas = [], setTarjetas, peso, setPeso, estatura, setEstatura }) => {
  const [activeTab, setActiveTab] = useState('perfil');
  const [newCatIngreso, setNewCatIngreso] = useState('');
  const [newCatEgreso, setNewCatEgreso] = useState('');
  
  const [notificaciones, setNotificaciones] = useState({
    habitos: true,
    cursos: true,
    areas: true,
    proyectos: true,
    notas: false
  });
  
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [newCardForm, setNewCardForm] = useState({ banco: '', tipo: 'Visa', numero: '', total: '' });

  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);

  const pesoNum = parseFloat(peso) || 0;
  const estNum = parseFloat(estatura) || 0;
  // Cálculo de IMC (Índice de Masa Corporal): peso(kg) / estatura(m)^2
  const imc = estNum > 0 ? (pesoNum / Math.pow(estNum / 100, 2)).toFixed(1) : 0;
  
  let bodyType = 'normal';
  if (imc < 18.5) bodyType = 'delgado';
  else if (imc >= 25 && imc < 30) bodyType = 'sobrepeso';
  else if (imc >= 30) bodyType = 'obeso';
  
  // Mapeamos el IMC a un porcentaje para el gráfico medidor (asumiendo un rango visual de IMC 12 a 40)
  const imcPercent = Math.min(Math.max(((imc - 12) / 28) * 100, 0), 100);

  const formatCurrency = (value) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'USD' }).format(value);

  const toggleNotificacion = (key) => {
    setNotificaciones(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const storageRef = ref(storage, `avatars/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      if (setAvatarUrl) setAvatarUrl(url);
      
      // Guardar URL del avatar en Firestore
      if (auth.currentUser) {
        await setDoc(doc(db, 'usuarios', auth.currentUser.uid), { avatarUrl: url }, { merge: true });
      }
    } catch (error) {
      console.error("Error subiendo el avatar:", error);
      alert("Hubo un error subiendo la imagen. Revisa las reglas de Storage en Firebase.");
    } finally {
      setIsUploading(false);
    }
  };

  // --- Funciones para guardar en Firestore ---
  const handleSaveProfile = async () => {
    if (!auth.currentUser) return;
    try {
      await setDoc(doc(db, 'usuarios', auth.currentUser.uid), { nombre: userName }, { merge: true });
      alert("Perfil guardado correctamente.");
    } catch (error) {
      console.error("Error guardando perfil:", error);
      alert("Hubo un error al guardar tu perfil.");
    }
  };

  const handleSaveHealth = async () => {
    if (!auth.currentUser) return;
    try {
      await setDoc(doc(db, 'usuarios', auth.currentUser.uid), { peso, estatura }, { merge: true });
      alert("Datos de salud guardados correctamente.");
    } catch (error) {
      console.error("Error guardando salud:", error);
      alert("Hubo un error al guardar tus datos de salud.");
    }
  };

  const handleAddCatIngreso = async () => {
    if (newCatIngreso && !categoriasIngreso.includes(newCatIngreso) && setCategoriasIngreso) {
      const nuevas = [...categoriasIngreso, newCatIngreso];
      setCategoriasIngreso(nuevas);
      setNewCatIngreso('');
      if (auth.currentUser) await setDoc(doc(db, 'usuarios', auth.currentUser.uid), { categoriasIngreso: nuevas }, { merge: true });
    }
  };

  const handleRemoveCatIngreso = async (cat) => {
    if (!setCategoriasIngreso) return;
    const nuevas = categoriasIngreso.filter(c => c !== cat);
    setCategoriasIngreso(nuevas);
    if (auth.currentUser) await setDoc(doc(db, 'usuarios', auth.currentUser.uid), { categoriasIngreso: nuevas }, { merge: true });
  };

  const handleAddCatEgreso = async () => {
    if (newCatEgreso && !categoriasEgreso.includes(newCatEgreso) && setCategoriasEgreso) {
      const nuevas = [...categoriasEgreso, newCatEgreso];
      setCategoriasEgreso(nuevas);
      setNewCatEgreso('');
      if (auth.currentUser) await setDoc(doc(db, 'usuarios', auth.currentUser.uid), { categoriasEgreso: nuevas }, { merge: true });
    }
  };

  const handleRemoveCatEgreso = async (cat) => {
    if (!setCategoriasEgreso) return;
    const nuevas = categoriasEgreso.filter(c => c !== cat);
    setCategoriasEgreso(nuevas);
    if (auth.currentUser) await setDoc(doc(db, 'usuarios', auth.currentUser.uid), { categoriasEgreso: nuevas }, { merge: true });
  };

  const handleAddCard = async () => {
    if (!newCardForm.banco || !newCardForm.numero || !newCardForm.total) return alert("Llena todos los campos requeridos.");
    if (!auth.currentUser) return;
    
    const nuevaTarjeta = {
      id: Date.now(),
      banco: newCardForm.banco,
      tipo: newCardForm.tipo,
      numero: newCardForm.numero,
      utilizado: 0,
      total: parseFloat(newCardForm.total)
    };
    
    const nuevasTarjetas = [...tarjetas, nuevaTarjeta];
    if (setTarjetas) setTarjetas(nuevasTarjetas);
    
    try {
      await setDoc(doc(db, 'usuarios', auth.currentUser.uid), { tarjetas: nuevasTarjetas }, { merge: true });
      setIsCardModalOpen(false);
      setNewCardForm({ banco: '', tipo: 'Visa', numero: '', total: '' });
    } catch (error) { console.error("Error guardando tarjeta:", error); }
  };

  return (
    <div className="settings-container">
      {/* Sub-menú lateral de configuración */}
      <aside className="settings-sidebar">
        <h3 className="settings-title">Ajustes</h3>
        <nav className="settings-nav">
          <button className={`settings-tab ${activeTab === 'perfil' ? 'active' : ''}`} onClick={() => setActiveTab('perfil')}>
            Perfil Personal
          </button>
          <button className={`settings-tab ${activeTab === 'bancarios' ? 'active' : ''}`} onClick={() => setActiveTab('bancarios')}>
            Datos Bancarios
          </button>
          <button className={`settings-tab ${activeTab === 'salud' ? 'active' : ''}`} onClick={() => setActiveTab('salud')}>
            Salud y Físico
          </button>
          <button className={`settings-tab ${activeTab === 'categorias' ? 'active' : ''}`} onClick={() => setActiveTab('categorias')}>
            Categorías de Finanzas
          </button>
          <button className={`settings-tab ${activeTab === 'notificaciones' ? 'active' : ''}`} onClick={() => setActiveTab('notificaciones')}>
            Notificaciones
          </button>
        </nav>
      </aside>

      {/* Área principal de contenido */}
      <section className="settings-content">
        {activeTab === 'perfil' && (
          <div className="settings-card profile-card">
            <div className="profile-header">
              <div className="profile-avatar" onClick={() => fileInputRef.current.click()}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                ) : (
                  <span>US</span>
                )}
                <div className="profile-avatar-overlay">
                  <span>{isUploading ? 'Subiendo...' : 'Cambiar'}</span>
                </div>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept="image/*" 
                onChange={handleAvatarUpload} 
              />
              <div className="profile-header-info">
                <h2>{userName || 'Usuario'}</h2>
                <p className="profile-occupation"></p>
                <p className="profile-email"></p>
              </div>
            </div>

            <div className="profile-form">
              <div className="input-group">
                <label>Nombre</label>
                <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} />
              </div>
              <div className="input-group">
                <label>Apellido</label>
                <input type="text" />
              </div>
              <div className="input-group">
                <label>Correo Electrónico</label>
                <input type="email" />
              </div>
              <div className="input-group">
                <label>Teléfono</label>
                <input type="tel" />
              </div>
              <div className="input-group">
                <label>RUT</label>
                <input type="text" />
              </div>
              <div className="input-group">
                <label>Ocupación</label>
                <input type="text" />
              </div>
              <div className="input-group full-width">
                <label>Dirección</label>
                <input type="text" />
              </div>
            </div>
          <div className="form-actions">
            <button className="btn-save" onClick={handleSaveProfile}>Guardar Cambios</button>
          </div>
          </div>
        )}

        {activeTab === 'bancarios' && (
          <div className="settings-card">
            <div className="card-header-flex">
              <h2>Tarjetas Registradas</h2>
              <button className="btn-add" onClick={() => setIsCardModalOpen(true)}>+ Añadir Tarjeta</button>
            </div>
            <p className="section-description">Administra tus métodos de pago (solo se muestra información general y últimos 4 dígitos).</p>
            
            <div className="bank-cards-grid">
              {tarjetas.map(tarjeta => {
                const percent = Math.min(Math.round((tarjeta.utilizado / tarjeta.total) * 100), 100);
                const barColor = percent > 80 ? 'var(--soma-orange)' : 'var(--soma-purple)';
                
                return (
                  <div key={tarjeta.id} className="bank-card">
                    <div className="bank-card-header">
                      <span className="card-type">{tarjeta.tipo}</span>
                      <span className="bank-name">{tarjeta.banco}</span>
                    </div>
                    <div className="bank-card-body">
                      <p className="card-number">**** **** **** {tarjeta.numero}</p>
                      <div className="card-usage-section">
                        <div className="card-limit-info">
                          <div className="limit-text">
                            <span className="limit-label">Utilizado</span>
                            <span className="limit-value used">{formatCurrency(tarjeta.utilizado)}</span>
                          </div>
                          <div className="limit-text text-right">
                            <span className="limit-label">Total</span>
                            <span className="limit-value">{formatCurrency(tarjeta.total)}</span>
                          </div>
                        </div>
                        <div className="limit-bar-track">
                          <div className="limit-bar-fill" style={{ width: `${percent}%`, backgroundColor: barColor }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'salud' && (
          <div className="settings-card">
            <div className="card-header-flex">
              <h2>Datos de Salud y Físico</h2>
            </div>
            <p className="section-description">Información biométrica y médica para tu seguimiento personal.</p>
            
            <div className="health-dashboard">
              <div className="health-form">
                <div className="profile-form">
                  <div className="input-group">
                    <label>Edad (años)</label>
                    <input type="number" />
                  </div>
                  <div className="input-group">
                    <label>Peso (kg)</label>
                    <input type="number" value={peso} onChange={(e) => setPeso(e.target.value)} step="0.1" />
                  </div>
                  <div className="input-group">
                    <label>Estatura (cm)</label>
                    <input type="number" value={estatura} onChange={(e) => setEstatura(e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label>Tipo de Sangre</label>
                    <input type="text" />
                  </div>
                  <div className="input-group full-width">
                    <label>Alergias Conocidas</label>
                    <input type="text" placeholder="Ej. Penicilina, polen..." />
                  </div>
                  <div className="input-group full-width">
                    <label>Condiciones Médicas</label>
                    <input type="text" placeholder="Ej. Asma, hipertensión..." />
                  </div>
                </div>
              <div className="form-actions">
                <button className="btn-save" onClick={handleSaveHealth}>Guardar Cambios</button>
              </div>
              </div>

              {/* Gráficos Analíticos */}
              <div className="health-graphics-container">
                <div className="graphic-card">
                  <div className="graphic-header">
                    <span>Índice de Masa Corporal (IMC)</span>
                    <span className="graphic-value">{imc}</span>
                  </div>
                  
                  <div className="bmi-gauge">
                    <div className="bmi-gauge-track">
                      <div className="bmi-gauge-marker" style={{ left: `${imcPercent}%` }}></div>
                    </div>
                    <div className="bmi-gauge-labels">
                      <span>Bajo</span>
                      <span>Normal</span>
                      <span>Sobrepeso</span>
                      <span>Obeso</span>
                    </div>
                  </div>
                  
                  <div className={`bmi-status-badge ${bodyType}`}>
                    {bodyType === 'delgado' && 'Bajo Peso'}
                    {bodyType === 'normal' && 'Peso Saludable'}
                    {bodyType === 'sobrepeso' && 'Sobrepeso'}
                    {bodyType === 'obeso' && 'Obesidad'}
                  </div>
                </div>

                <div className="graphic-card">
                  <div className="graphic-header">
                    <span>Proporción Estatura / Peso</span>
                  </div>
                  <div className="relation-bar-chart">
                    <div className="bar-group">
                      <div className="bar-track">
                        <div className="bar" style={{ height: `${Math.min((estNum / 220) * 100, 100)}%`, backgroundColor: 'var(--soma-purple)' }}></div>
                      </div>
                      <span>{estatura} cm</span>
                    </div>
                    <div className="bar-group">
                      <div className="bar-track">
                        <div className="bar" style={{ height: `${Math.min((pesoNum / 150) * 100, 100)}%`, backgroundColor: 'var(--soma-yellow)' }}></div>
                      </div>
                      <span>{peso} kg</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'categorias' && (
          <div className="settings-card">
            <div className="card-header-flex">
              <h2>Categorías de Finanzas</h2>
            </div>
            <p className="section-description">Personaliza las categorías que utilizas para clasificar tus transacciones.</p>
            
            <div className="categories-management-grid">
              <div className="category-column">
                <h3 style={{ color: 'var(--soma-purple)' }}>Ingresos (+)</h3>
                <div className="category-add-form">
                  <input type="text" placeholder="Añadir ingreso..." value={newCatIngreso} onChange={(e) => setNewCatIngreso(e.target.value)} />
                  <button className="btn-add-cat" onClick={handleAddCatIngreso}>+</button>
                </div>
                <div className="category-tags-container">
                  {categoriasIngreso.map(cat => (
                    <span key={cat} className="category-tag">{cat} <button className="btn-remove-cat" onClick={() => handleRemoveCatIngreso(cat)}>×</button></span>
                  ))}
                </div>
              </div>

              <div className="category-column">
                <h3 style={{ color: 'var(--soma-orange)' }}>Gastos (-)</h3>
                <div className="category-add-form">
                  <input type="text" placeholder="Añadir gasto..." value={newCatEgreso} onChange={(e) => setNewCatEgreso(e.target.value)} />
                  <button className="btn-add-cat" onClick={handleAddCatEgreso}>+</button>
                </div>
                <div className="category-tags-container">
                  {categoriasEgreso.map(cat => (
                    <span key={cat} className="category-tag">{cat} <button className="btn-remove-cat" onClick={() => handleRemoveCatEgreso(cat)}>×</button></span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notificaciones' && (
          <div className="settings-card">
            <div className="card-header-flex">
              <h2>Preferencias de Notificaciones</h2>
            </div>
            <p className="section-description">Activa o desactiva las alertas que deseas recibir en Soma OS.</p>
            
            <div className="notifications-grid">
              <div className="notification-item">
                <div className="notif-info">
                  <h4>Hábitos Diarios</h4><p>Recordatorios para registrar tus hábitos.</p>
                </div>
                <label className="switch"><input type="checkbox" checked={notificaciones.habitos} onChange={() => toggleNotificacion('habitos')} /><span className="slider"></span></label>
              </div>
              
              <div className="notification-item">
                <div className="notif-info">
                  <h4>Cursos y Clases</h4><p>Alertas de módulos pendientes y tareas.</p>
                </div>
                <label className="switch"><input type="checkbox" checked={notificaciones.cursos} onChange={() => toggleNotificacion('cursos')} /><span className="slider"></span></label>
              </div>
              
              <div className="notification-item">
                <div className="notif-info">
                  <h4>Áreas de Vida</h4><p>Resumen semanal de progreso de áreas.</p>
                </div>
                <label className="switch"><input type="checkbox" checked={notificaciones.areas} onChange={() => toggleNotificacion('areas')} /><span className="slider"></span></label>
              </div>
              
              <div className="notification-item">
                <div className="notif-info">
                  <h4>Proyectos</h4><p>Avisos de plazos, fechas límite y vencimientos.</p>
                </div>
                <label className="switch"><input type="checkbox" checked={notificaciones.proyectos} onChange={() => toggleNotificacion('proyectos')} /><span className="slider"></span></label>
              </div>

              <div className="notification-item">
                <div className="notif-info">
                  <h4>Notas e Ideas</h4><p>Notificaciones sobre tareas no completadas en tus notas.</p>
                </div>
                <label className="switch"><input type="checkbox" checked={notificaciones.notas} onChange={() => toggleNotificacion('notas')} /><span className="slider"></span></label>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Modal para Nueva Tarjeta */}
      {isCardModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Añadir Tarjeta Bancaria</h2>
            <div className="modal-form">
              <div className="input-group">
                <label>Nombre del Banco</label>
                <input type="text" value={newCardForm.banco} onChange={e => setNewCardForm({...newCardForm, banco: e.target.value})} placeholder="Ej. Banco Estado..." />
              </div>
              <div className="fecha-inputs-row">
                <div className="input-group">
                  <label>Tipo</label>
                  <select value={newCardForm.tipo} onChange={e => setNewCardForm({...newCardForm, tipo: e.target.value})} className="modal-select">
                    <option value="Visa">Visa</option>
                    <option value="Mastercard">Mastercard</option>
                    <option value="AMEX">AMEX</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Últimos 4 dígitos</label>
                  <input type="text" maxLength="4" value={newCardForm.numero} onChange={e => setNewCardForm({...newCardForm, numero: e.target.value})} placeholder="Ej. 4321" />
                </div>
              </div>
              <div className="input-group">
                <label>Límite / Cupo Total Aprobado</label>
                <input type="number" value={newCardForm.total} onChange={e => setNewCardForm({...newCardForm, total: e.target.value})} placeholder="0.00" />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setIsCardModalOpen(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleAddCard}>Guardar Tarjeta</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Configuracion;