import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import './Proyectos.css'; // Reutilizamos los estilos de los otros módulos

const Notas = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newNotaForm, setNewNotaForm] = useState({ titulo: '', descripcion: '' });

  const [notas, setNotas] = useState([]);

  // --- CONEXIÓN EN TIEMPO REAL CON FIREBASE ---
  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;

    const q = query(collection(db, 'usuarios', uid, 'notas'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setNotas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => unsubscribe();
  }, []);

  // --- Funciones para la manipulación de Notas ---
  const handleCreateNota = async () => {
    if (!newNotaForm.titulo) return alert("El título es obligatorio");
    if (!auth.currentUser) return;

    const nuevaNota = {
      titulo: newNotaForm.titulo,
      descripcion: newNotaForm.descripcion,
      fecha: new Date().toISOString().split('T')[0], // Obtiene la fecha actual en formato YYYY-MM-DD
      archivada: false,
      enlaces: [],
      tareas: [],
      createdAt: new Date().toISOString()
    };

    try {
      await addDoc(collection(db, 'usuarios', auth.currentUser.uid, 'notas'), nuevaNota);
      setIsModalOpen(false);
      setNewNotaForm({ titulo: '', descripcion: '' });
    } catch (error) { console.error("Error al crear nota:", error); }
  };

  const editarTituloNota = async (notaId, tituloActual) => {
    const nuevoTitulo = prompt('Editar título de la nota:', tituloActual);
    if (nuevoTitulo !== null && nuevoTitulo.trim() !== '' && auth.currentUser) {
      await updateDoc(doc(db, 'usuarios', auth.currentUser.uid, 'notas', notaId), { titulo: nuevoTitulo });
    }
  };

  const toggleArchivarNota = async (notaId) => {
    const nota = notas.find(n => n.id === notaId);
    if (nota && auth.currentUser) {
      await updateDoc(doc(db, 'usuarios', auth.currentUser.uid, 'notas', notaId), { archivada: !nota.archivada });
    }
  };

  const eliminarNota = async (notaId) => {
    if (auth.currentUser) {
      await deleteDoc(doc(db, 'usuarios', auth.currentUser.uid, 'notas', notaId));
    }
  };

  const updateNotaDescLocal = (notaId, text) => {
    setNotas(prev => prev.map(n => n.id === notaId ? { ...n, descripcion: text } : n));
  };

  const saveNotaDesc = async (notaId, text) => {
    if (auth.currentUser) {
      await updateDoc(doc(db, 'usuarios', auth.currentUser.uid, 'notas', notaId), { descripcion: text });
    }
  };

  // --- Funciones para la manipulación de Enlaces ---
  const agregarEnlace = async (notaId) => {
    const nota = notas.find(n => n.id === notaId);
    if (nota && auth.currentUser) {
      const nuevosEnlaces = [...(nota.enlaces || []), { id: Date.now(), titulo: '', url: '', guardado: false }];
      await updateDoc(doc(db, 'usuarios', auth.currentUser.uid, 'notas', notaId), { enlaces: nuevosEnlaces });
    }
  };

  const updateEnlaceLocal = (notaId, enlaceId, field, value) => {
    setNotas(prev => prev.map(n => n.id === notaId ? { ...n, enlaces: n.enlaces.map(e => e.id === enlaceId ? { ...e, [field]: value } : e) } : n));
  };

  const updateEnlace = async (notaId, enlaceId, field, value) => {
    const nota = notas.find(n => n.id === notaId);
    if (nota && auth.currentUser) {
      const nuevosEnlaces = nota.enlaces.map(e => e.id === enlaceId ? { ...e, [field]: value } : e);
      await updateDoc(doc(db, 'usuarios', auth.currentUser.uid, 'notas', notaId), { enlaces: nuevosEnlaces });
    }
  };

  const eliminarEnlace = async (notaId, enlaceId) => {
    const nota = notas.find(n => n.id === notaId);
    if (nota && auth.currentUser) {
      const nuevosEnlaces = nota.enlaces.filter(e => e.id !== enlaceId);
      await updateDoc(doc(db, 'usuarios', auth.currentUser.uid, 'notas', notaId), { enlaces: nuevosEnlaces });
    }
  };

  // --- Funciones para la manipulación de Tareas (Checklist) ---
  const agregarTarea = async (notaId) => {
    const nota = notas.find(n => n.id === notaId);
    if (nota && auth.currentUser) {
      const nuevasTareas = [...nota.tareas, { id: Date.now(), texto: '', completada: false }];
      await updateDoc(doc(db, 'usuarios', auth.currentUser.uid, 'notas', notaId), { tareas: nuevasTareas });
    }
  };

  const toggleTarea = async (notaId, tareaId) => {
    const nota = notas.find(n => n.id === notaId);
    if (nota && auth.currentUser) {
      const nuevasTareas = nota.tareas.map(t => t.id === tareaId ? { ...t, completada: !t.completada } : t);
      await updateDoc(doc(db, 'usuarios', auth.currentUser.uid, 'notas', notaId), { tareas: nuevasTareas });
    }
  };

  const updateTareaTextoLocal = (notaId, tareaId, texto) => {
    setNotas(prev => prev.map(n => n.id === notaId ? {
      ...n,
      tareas: n.tareas.map(t => t.id === tareaId ? { ...t, texto } : t)
    } : n));
  };

  const saveTareaTexto = async (notaId, tareaId, texto) => {
    const nota = notas.find(n => n.id === notaId);
    if (nota && auth.currentUser) {
      const nuevasTareas = nota.tareas.map(t => t.id === tareaId ? { ...t, texto } : t);
      await updateDoc(doc(db, 'usuarios', auth.currentUser.uid, 'notas', notaId), { tareas: nuevasTareas });
    }
  };

  const notasActivas = notas.filter(n => !n.archivada);
  const notasArchivadas = notas.filter(n => n.archivada);

  return (
    <div className="proyectos-container">
      <header className="proyectos-header">
        <div>
          <h1 className="page-title">Notas</h1>
          <p className="page-subtitle">Captura tus ideas, apuntes y tareas rápidas.</p>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>+ Nueva Nota</button>
      </header>

      <div className="proyectos-grid">
        {notasActivas.map(nota => {
          const totalTareas = nota.tareas.length;
          const tareasCompletadas = nota.tareas.filter(t => t.completada).length;

          return (
            <div key={nota.id} className="proyecto-card">
              <div className="proyecto-card-main-info" style={{ gap: '0.5rem' }}>
                <div className="proyecto-card-header" style={{ alignItems: 'center' }}>
                  <div className="sub-categoria-header-title">
                    <h3>{nota.titulo}</h3>
                  </div>
                  <div className="link-actions">
                    <button className="btn-icon-action" title="Editar Título" onClick={() => editarTituloNota(nota.id, nota.titulo)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button className="btn-icon-action" title="Archivar Nota" onClick={() => toggleArchivarNota(nota.id)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>
                    </button>
                    <button className="btn-icon-action delete-icon" title="Eliminar Nota" onClick={() => eliminarNota(nota.id)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                  <span className="proyecto-fecha">📅 {nota.fecha}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {(nota.enlaces || []).filter(e => e.guardado).map(enlace => (
                      <a key={enlace.id} href={enlace.url} target="_blank" rel="noopener noreferrer" className="header-link-icon" title={enlace.titulo} onClick={e => e.stopPropagation()}>📎</a>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="sub-categoria-content" style={{ marginTop: 0 }}>
                <textarea 
                  className="sub-categoria-textarea" 
                  value={nota.descripcion}
                  onChange={(e) => updateNotaDescLocal(nota.id, e.target.value)}
                  onBlur={(e) => saveNotaDesc(nota.id, e.target.value)}
                  placeholder="Escribe tus apuntes aquí..."
                />

                <div className="tareas-list-container">
                  <h5 className="tareas-titulo">Tareas ({tareasCompletadas}/{totalTareas})</h5>
                  <ul className="tareas-list">
                    {nota.tareas.map(tarea => (
                      <li key={tarea.id} className="tarea-item">
                        <label className="tarea-label">
                          <input type="checkbox" checked={tarea.completada} onChange={() => toggleTarea(nota.id, tarea.id)} />
                          <input 
                            type="text" 
                            className={`tarea-texto-input ${tarea.completada ? 'completada' : ''}`} 
                            value={tarea.texto} 
                            placeholder="Escribe una tarea..." 
                            onChange={(e) => updateTareaTextoLocal(nota.id, tarea.id, e.target.value)} 
                            onBlur={(e) => saveTareaTexto(nota.id, tarea.id, e.target.value)}
                          />
                        </label>
                      </li>
                    ))}
                  </ul>
                  <button className="btn-add-tarea" onClick={() => agregarTarea(nota.id)}>+ Añadir Tarea</button>
                </div>

                <div className="enlaces-container" style={{ marginTop: '0.5rem' }}>
                  {(nota.enlaces || []).map(enlace => (
                    !enlace.guardado ? (
                      <div key={enlace.id} className="link-editor-container">
                        <div className="link-inputs-row">
                          <input 
                            type="text" 
                            className="link-input-modern" 
                            placeholder="Título del enlace..." 
                            value={enlace.titulo} 
                            onChange={(e) => updateEnlaceLocal(nota.id, enlace.id, 'titulo', e.target.value)}
                          />
                          <input 
                            type="url" 
                            className="link-input-modern" 
                            placeholder="https://..." 
                            value={enlace.url} 
                            onChange={(e) => updateEnlaceLocal(nota.id, enlace.id, 'url', e.target.value)}
                          />
                        </div>
                        <div className="link-actions" style={{ justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                          <button className="btn-delete-link" onClick={() => eliminarEnlace(nota.id, enlace.id)}>Cancelar</button>
                          <button className="btn-save-link" onClick={() => {
                              if(enlace.url && enlace.titulo) updateEnlace(nota.id, enlace.id, 'guardado', true);
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
                          <button className="btn-edit-link" onClick={() => updateEnlace(nota.id, enlace.id, 'guardado', false)}>Editar</button>
                          <button className="btn-delete-link" onClick={() => eliminarEnlace(nota.id, enlace.id)}>Eliminar</button>
                        </div>
                      </div>
                    )
                  ))}
                  <button className="btn-add-link" onClick={() => agregarEnlace(nota.id)}>+ Añadir Enlace</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Historial de Notas Archivadas */}
      {notasArchivadas.length > 0 && (
        <div className="archived-notes-section" style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px dashed rgba(255, 255, 255, 0.1)' }}>
          <div className="proyectos-header">
            <h2 className="page-title" style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>Notas Archivadas</h2>
          </div>
          <div className="archived-table-wrapper">
            <table className="archived-table">
              <thead>
                <tr>
                  <th>Título de la Nota</th>
                  <th>Fecha</th>
                  <th>Tareas</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {notasArchivadas.map(nota => {
                  const totalTareas = nota.tareas.length;
                  const tareasCompletadas = nota.tareas.filter(t => t.completada).length;
                  return (
                    <tr key={nota.id}>
                      <td className="archived-title">{nota.titulo}</td>
                      <td>📅 {nota.fecha}</td>
                      <td>{tareasCompletadas} / {totalTareas} completadas</td>
                      <td>
                        <div className="archived-actions">
                          <button className="btn-icon-action" title="Desarchivar" onClick={() => toggleArchivarNota(nota.id)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                          </button>
                          <button className="btn-icon-action delete-icon" title="Eliminar Permanentemente" onClick={() => eliminarNota(nota.id)}>
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

      {/* Ventana Modal para Nueva Nota */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Crear Nueva Nota</h2>
            <div className="modal-form">
              <div className="input-group">
                <label>Título de la nota</label>
                <input type="text" value={newNotaForm.titulo} onChange={e => setNewNotaForm({...newNotaForm, titulo: e.target.value})} placeholder="Ej. Lista de compras, Ideas para el proyecto..." />
              </div>
              <div className="input-group">
                <label>Apunte rápido (Opcional)</label>
                <textarea className="sub-categoria-textarea" style={{ minHeight: '100px' }} value={newNotaForm.descripcion} onChange={e => setNewNotaForm({...newNotaForm, descripcion: e.target.value})} placeholder="Escribe un contexto inicial para tu nota..." />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleCreateNota}>Guardar Nota</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notas;