import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import './Proyectos.css'; // Reutilizamos los estilos visuales

const Cursos = ({ categoriasIngreso = [], categoriasEgreso = [] }) => {
  const [filtro, setFiltro] = useState('todos');
  const [expandedSubcats, setExpandedSubcats] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCursoForm, setNewCursoForm] = useState({ titulo: '', estado: 'en progreso', fechaInicio: '', fechaFin: '', categoria: '' });

  const [cursos, setCursos] = useState([]);

  // --- CONEXIÓN EN TIEMPO REAL CON FIREBASE ---
  useEffect(() => {
    if (!auth.currentUser) return;
    const uid = auth.currentUser.uid;
    const q = query(collection(db, 'usuarios', uid, 'cursos'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snap) => {
      setCursos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, []);

  const cursosFiltrados = cursos.filter(c => !c.archivada && (filtro === 'todos' || c.estado === filtro));
  const cursosArchivadas = cursos.filter(c => c.archivada);

  // --- HELPERS PARA GUARDAR EN FIRESTORE ---
  const saveSubcategorias = async (cursoId, nuevasSubCats) => {
    if (auth.currentUser) {
      await updateDoc(doc(db, 'usuarios', auth.currentUser.uid, 'cursos', cursoId), { subCategorias: nuevasSubCats });
    }
  };

  const toggleExpand = (subCatId) => {
    setExpandedSubcats(prev => ({ ...prev, [subCatId]: !prev[subCatId] }));
  };

  // --- ACCIONES PRINCIPALES ---
  const handleCreateCurso = async () => {
    if(!newCursoForm.titulo) return alert("El título es obligatorio");
    if(!auth.currentUser) return;
    
    const nuevoCurso = {
      titulo: newCursoForm.titulo,
      estado: newCursoForm.estado,
      fechaInicio: newCursoForm.fechaInicio,
      fechaFin: newCursoForm.fechaFin,
      archivada: false,
      categoria: newCursoForm.categoria,
      subCategorias: [],
      createdAt: new Date().toISOString()
    };
    await addDoc(collection(db, 'usuarios', auth.currentUser.uid, 'cursos'), nuevoCurso);
    setIsModalOpen(false);
    setNewCursoForm({ titulo: '', estado: 'en progreso', fechaInicio: '', fechaFin: '', categoria: '' });
  };

  const agregarSubCategoria = async (cursoId) => {
    const c = cursos.find(c => c.id === cursoId);
    if (c) {
      const newSubcats = [...c.subCategorias, {
        id: `sc-${Date.now()}`, titulo: 'Nuevo Módulo', descripcion: '', fechaInicio: '', fechaFin: '', enlaces: [], tareas: []
      }];
      await saveSubcategorias(cursoId, newSubcats);
    }
  };

  const toggleArchivarCurso = async (cursoId) => {
    const c = cursos.find(c => c.id === cursoId);
    if (c && auth.currentUser) await updateDoc(doc(db, 'usuarios', auth.currentUser.uid, 'cursos', cursoId), { archivada: !c.archivada });
  };

  const eliminarCurso = async (cursoId) => {
    if (auth.currentUser) await deleteDoc(doc(db, 'usuarios', auth.currentUser.uid, 'cursos', cursoId));
  };

  const updateCursoEstado = async (cursoId, nuevoEstado) => {
    if (auth.currentUser) await updateDoc(doc(db, 'usuarios', auth.currentUser.uid, 'cursos', cursoId), { estado: nuevoEstado });
  };

  const updateCursoDate = async (cursoId, field, value) => {
    if (auth.currentUser) await updateDoc(doc(db, 'usuarios', auth.currentUser.uid, 'cursos', cursoId), { [field]: value });
  };

  // --- ACCIONES EN SUBCATEGORÍAS ---
  const updateSubcatFieldLocal = (cursoId, subCatId, field, value) => {
    setCursos(prev => prev.map(c => c.id === cursoId ? { ...c, subCategorias: c.subCategorias.map(sc => 
      sc.id === subCatId ? { ...sc, [field]: value } : sc
    )} : c));
  };

  const saveSubcatField = async (cursoId, subCatId, field, value) => {
    const c = cursos.find(c => c.id === cursoId);
    if (c) {
      const newSubcats = c.subCategorias.map(sc => sc.id === subCatId ? { ...sc, [field]: value } : sc);
      await saveSubcategorias(cursoId, newSubcats);
    }
  };

  const agregarEnlace = async (cursoId, subCatId) => {
    const c = cursos.find(c => c.id === cursoId);
    if (c) {
      const newSubcats = c.subCategorias.map(sc => sc.id === subCatId ? { ...sc, enlaces: [...(sc.enlaces || []), { id: Date.now(), titulo: '', url: '', guardado: false }] } : sc);
      await saveSubcategorias(cursoId, newSubcats);
    }
  };

  const updateEnlaceLocal = (cursoId, subCatId, enlaceId, field, value) => {
    setCursos(prev => prev.map(c => c.id === cursoId ? { ...c, subCategorias: c.subCategorias.map(sc => 
      sc.id === subCatId ? { ...sc, enlaces: sc.enlaces.map(e => e.id === enlaceId ? { ...e, [field]: value } : e) } : sc
    )} : c));
  };

  const saveEnlace = async (cursoId, subCatId, enlaceId, field, value) => {
    const c = cursos.find(c => c.id === cursoId);
    if (c) {
      const newSubcats = c.subCategorias.map(sc => sc.id === subCatId ? { ...sc, enlaces: sc.enlaces.map(e => e.id === enlaceId ? { ...e, [field]: value } : e) } : sc);
      await saveSubcategorias(cursoId, newSubcats);
    }
  };

  const eliminarEnlace = async (cursoId, subCatId, enlaceId) => {
    const c = cursos.find(c => c.id === cursoId);
    if (c) {
      const newSubcats = c.subCategorias.map(sc => sc.id === subCatId ? { ...sc, enlaces: sc.enlaces.filter(e => e.id !== enlaceId) } : sc);
      await saveSubcategorias(cursoId, newSubcats);
    }
  };

  const agregarTarea = async (cursoId, subCatId) => {
    const c = cursos.find(c => c.id === cursoId);
    if (c) {
      const newSubcats = c.subCategorias.map(sc => sc.id === subCatId ? { ...sc, tareas: [...sc.tareas, { id: Date.now(), texto: '', completada: false }] } : sc);
      await saveSubcategorias(cursoId, newSubcats);
    }
  };

  const toggleTarea = async (cursoId, subCategoriaId, tareaId) => {
    const c = cursos.find(c => c.id === cursoId);
    if (c) {
      const newSubcats = c.subCategorias.map(sc => sc.id === subCategoriaId ? { ...sc, tareas: sc.tareas.map(t => t.id === tareaId ? { ...t, completada: !t.completada } : t) } : sc);
      await saveSubcategorias(cursoId, newSubcats);
    }
  };

  const updateTareaTextoLocal = (cursoId, subCatId, tareaId, nuevoTexto) => {
    setCursos(prev => prev.map(c => c.id === cursoId ? { ...c, subCategorias: c.subCategorias.map(sc => 
      sc.id === subCatId ? { ...sc, tareas: sc.tareas.map(t => t.id === tareaId ? { ...t, texto: nuevoTexto } : t) } : sc
    )} : c));
  };

  const saveTareaTexto = async (cursoId, subCatId, tareaId, nuevoTexto) => {
    const c = cursos.find(c => c.id === cursoId);
    if (c) {
      const newSubcats = c.subCategorias.map(sc => sc.id === subCatId ? { ...sc, tareas: sc.tareas.map(t => t.id === tareaId ? { ...t, texto: nuevoTexto } : t) } : sc);
      await saveSubcategorias(cursoId, newSubcats);
    }
  };

  return (
    <div className="proyectos-container">
      <header className="proyectos-header">
        <div>
          <h1 className="page-title">Cursos</h1>
          <p className="page-subtitle">Sigue tu progreso académico y certificaciones.</p>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>+ Nuevo Curso</button>
      </header>

      <div className="proyectos-filters">
        <button className={`filter-btn ${filtro === 'todos' ? 'active' : ''}`} onClick={() => setFiltro('todos')}>Todos</button>
        <button className={`filter-btn ${filtro === 'en progreso' ? 'active' : ''}`} onClick={() => setFiltro('en progreso')}>En Curso</button>
        <button className={`filter-btn ${filtro === 'completado' ? 'active' : ''}`} onClick={() => setFiltro('completado')}>Completados</button>
        <button className={`filter-btn ${filtro === 'pausado' ? 'active' : ''}`} onClick={() => setFiltro('pausado')}>Pausados</button>
      </div>

      <div className="proyectos-grid">
        {cursosFiltrados.map(curso => {
          const progresosSubCategorias = curso.subCategorias.map(sc => {
            const totalTareas = sc.tareas.length;
            const tareasCompletadas = sc.tareas.filter(t => t.completada).length;
            return totalTareas > 0 ? (tareasCompletadas / totalTareas) * 100 : 0;
          });
          const progresoGeneral = progresosSubCategorias.length > 0 
            ? Math.round(progresosSubCategorias.reduce((a, b) => a + b, 0) / progresosSubCategorias.length)
            : 0;

          return (
            <div key={curso.id} className="proyecto-card">
              <div className="proyecto-card-main-info">
                <div className="proyecto-card-header">
                  <h3>{curso.titulo}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {curso.categoria && (
                      <span className="status-badge" style={{ backgroundColor: 'rgba(162, 146, 197, 0.1)', color: 'var(--soma-purple)', border: '1px solid rgba(162, 146, 197, 0.2)' }}>
                        {curso.categoria}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <select 
                      className={`status-badge ${curso.estado.replace(' ', '-')}`}
                      value={curso.estado}
                      onChange={(e) => updateCursoEstado(curso.id, e.target.value)}
                    >
                      <option value="en progreso">EN CURSO</option>
                      <option value="pausado">PAUSADO</option>
                      <option value="completado">COMPLETADO</option>
                    </select>
                    <button className="btn-icon-action" title="Archivar Curso" onClick={() => toggleArchivarCurso(curso.id)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>
                    </button>
                  </div>
                </div>
                
                <div className="proyecto-progress">
                  <div className="progress-info">
                    <span>Progreso General</span>
                    <span>{progresoGeneral}%</span>
                  </div>
                  <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${progresoGeneral}%` }}></div>
                  </div>
                </div>

                <div className="proyecto-fechas-modern">
                  <div className="date-badge">
                    <span className="date-label">Inicia</span>
                    <input type="date" className="date-picker-modern" 
                      value={curso.fechaInicio || ''} 
                      onChange={(e) => updateCursoDate(curso.id, 'fechaInicio', e.target.value)} />
                  </div>
                  <span className="fecha-separator">→</span>
                  <div className="date-badge">
                    <span className="date-label">Fin</span>
                    <input type="date" className="date-picker-modern" 
                      value={curso.fechaFin || ''} 
                      onChange={(e) => updateCursoDate(curso.id, 'fechaFin', e.target.value)} />
                  </div>
                </div>
              </div>
              
              <div className="sub-categorias-container">
                {curso.subCategorias.map(subCategoria => {
                  const totalTareasSC = subCategoria.tareas.length;
                  const tareasCompletadasSC = subCategoria.tareas.filter(t => t.completada).length;

                  return (
                    <div key={subCategoria.id} className="sub-categoria-card">
                      <div className="sub-categoria-header" onClick={() => toggleExpand(subCategoria.id)}>
                        <div className="sub-categoria-header-title">
                          <input
                            type="text"
                            className="sub-categoria-titulo"
                            value={subCategoria.titulo}
                            onChange={(e) => updateSubcatFieldLocal(curso.id, subCategoria.id, 'titulo', e.target.value)}
                            onBlur={(e) => saveSubcatField(curso.id, subCategoria.id, 'titulo', e.target.value)}
                            style={{ background: 'transparent', border: 'none', outline: 'none', padding: 0, color: 'inherit', fontFamily: 'inherit', fontSize: 'inherit', fontWeight: 'inherit' }}
                            onClick={e => e.stopPropagation()} // Evita que se colapse al hacer clic en el input
                          />
                          {(subCategoria.enlaces || []).filter(e => e.guardado).map(enlace => (
                            <a key={enlace.id} href={enlace.url} target="_blank" rel="noopener noreferrer" className="header-link-icon" title={enlace.titulo} onClick={e => e.stopPropagation()}>
                              📎
                            </a>
                          ))}
                        </div>
                        <button className="btn-expand">{expandedSubcats[subCategoria.id] ? '-' : '+'}</button>
                      </div>

                      {expandedSubcats[subCategoria.id] && (
                        <div className="sub-categoria-content">
                          <textarea 
                            className="sub-categoria-textarea" 
                            value={subCategoria.descripcion}
                            onChange={(e) => updateSubcatFieldLocal(curso.id, subCategoria.id, 'descripcion', e.target.value)}
                            onBlur={(e) => saveSubcatField(curso.id, subCategoria.id, 'descripcion', e.target.value)}
                            placeholder="Añade notas o detalles aquí..."
                          ></textarea>
                          
                          <div className="enlaces-container">
                            {(subCategoria.enlaces || []).map(enlace => (
                              !enlace.guardado ? (
                                <div key={enlace.id} className="link-editor-container">
                                  <div className="link-inputs-row">
                                    <input 
                                      type="text" 
                                      className="link-input-modern" 
                                      placeholder="Título del enlace (Ej: Tablero de Figma...)" 
                                      value={enlace.titulo} 
                                      onChange={(e) => updateEnlaceLocal(curso.id, subCategoria.id, enlace.id, 'titulo', e.target.value)}
                                    />
                                    <input 
                                      type="url" 
                                      className="link-input-modern" 
                                      placeholder="https://..." 
                                      value={enlace.url} 
                                      onChange={(e) => updateEnlaceLocal(curso.id, subCategoria.id, enlace.id, 'url', e.target.value)}
                                    />
                                  </div>
                                  <div className="link-actions" style={{ justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                                    <button className="btn-delete-link" onClick={() => eliminarEnlace(curso.id, subCategoria.id, enlace.id)}>Cancelar</button>
                                    <button className="btn-save-link" onClick={() => {
                                        if(enlace.url && enlace.titulo) saveEnlace(curso.id, subCategoria.id, enlace.id, 'guardado', true);
                                        else alert('Por favor, ingresa tanto el título como la URL del enlace.');
                                    }}>Guardar</button>
                                  </div>
                                </div>
                              ) : (
                                <div key={enlace.id} className="link-saved-display">
                                  <a href={enlace.url} target="_blank" rel="noopener noreferrer">📎 {enlace.titulo}</a>
                                  <div className="link-actions">
                                    <button className="btn-edit-link" onClick={() => saveEnlace(curso.id, subCategoria.id, enlace.id, 'guardado', false)}>Editar</button>
                                    <button className="btn-delete-link" onClick={() => eliminarEnlace(curso.id, subCategoria.id, enlace.id)}>Eliminar</button>
                                  </div>
                                </div>
                              )
                            ))}
                            <button className="btn-add-link" onClick={() => agregarEnlace(curso.id, subCategoria.id)}>+ Añadir Enlace</button>
                          </div>

                          <div className="tareas-list-container">
                            <h5 className="tareas-titulo">Tareas ({tareasCompletadasSC}/{totalTareasSC})</h5>
                            <ul className="tareas-list">
                              {subCategoria.tareas.map(tarea => (
                                <li key={tarea.id} className="tarea-item">
                                  <label className="tarea-label">
                                    <input type="checkbox" checked={tarea.completada} onChange={() => toggleTarea(curso.id, subCategoria.id, tarea.id)} />
                                    <input type="text" className={`tarea-texto-input ${tarea.completada ? 'completada' : ''}`} value={tarea.texto} placeholder="Escribe una tarea..." onChange={(e) => updateTareaTextoLocal(curso.id, subCategoria.id, tarea.id, e.target.value)} onBlur={(e) => saveTareaTexto(curso.id, subCategoria.id, tarea.id, e.target.value)} />
                                  </label>
                                </li>
                              ))}
                            </ul>
                            <button className="btn-add-tarea" onClick={() => agregarTarea(curso.id, subCategoria.id)}>+ Añadir Tarea</button>
                          </div>
                          <div className="sub-categoria-footer">
                            <div className="proyecto-fechas-modern">
                              <div className="date-badge subcat-badge">
                                <span className="date-label">Inicia</span>
                                <input type="date" className="date-picker-modern small" value={subCategoria.fechaInicio || ''} onChange={(e) => saveSubcatField(curso.id, subCategoria.id, 'fechaInicio', e.target.value)} />
                              </div>
                              <span className="fecha-separator">→</span>
                              <div className="date-badge subcat-badge">
                                <span className="date-label">Fin</span>
                                <input type="date" className="date-picker-modern small" value={subCategoria.fechaFin || ''} onChange={(e) => saveSubcatField(curso.id, subCategoria.id, 'fechaFin', e.target.value)} />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                <button className="btn-add-subcat" onClick={() => agregarSubCategoria(curso.id)}>+ Agregar Módulo</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Historial de Cursos Archivados */}
      {cursosArchivadas.length > 0 && (
        <div className="archived-notes-section" style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px dashed rgba(255, 255, 255, 0.1)' }}>
          <div className="proyectos-header">
            <h2 className="page-title" style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>Historial de Cursos</h2>
          </div>
          <div className="archived-table-wrapper">
            <table className="archived-table">
              <thead>
                <tr>
                  <th>Curso</th>
                  <th>Periodo</th>
                  <th>Progreso</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cursosArchivadas.map(curso => {
                  const progresos = curso.subCategorias.map(sc => sc.tareas.length > 0 ? (sc.tareas.filter(t => t.completada).length / sc.tareas.length) * 100 : 0);
                  const progresoGen = progresos.length > 0 ? Math.round(progresos.reduce((a, b) => a + b, 0) / progresos.length) : 0;
                  return (
                    <tr key={curso.id}>
                      <td className="archived-title">{curso.titulo}</td>
                      <td>{curso.fechaInicio} → {curso.fechaFin}</td>
                      <td>{progresoGen}%</td>
                      <td><span className={`status-badge ${curso.estado.replace(' ', '-')}`}>{curso.estado}</span></td>
                      <td>
                        <div className="archived-actions">
                          <button className="btn-icon-action" title="Desarchivar" onClick={() => toggleArchivarCurso(curso.id)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                          </button>
                          <button className="btn-icon-action delete-icon" title="Eliminar Permanentemente" onClick={() => eliminarCurso(curso.id)}>
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

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Registrar Nuevo Curso</h2>
            <div className="modal-form">
              <div className="input-group">
                <label>Título del Curso</label>
                <input type="text" value={newCursoForm.titulo} onChange={e => setNewCursoForm(prev => ({ ...prev, titulo: e.target.value }))} placeholder="Ej. Bootcamp de Diseño..." />
              </div>
              <div className="input-group">
                <label>Estado Inicial</label>
                <select value={newCursoForm.estado} onChange={e => setNewCursoForm(prev => ({ ...prev, estado: e.target.value }))} className="modal-select">
                  <option value="en progreso">En Curso</option>
                  <option value="pausado">Pausado</option>
                  <option value="completado">Completado</option>
                </select>
              </div>
              <div className="fecha-inputs-row">
                <div className="input-group">
                  <label>Fecha de Inicio</label>
                  <div className="date-badge">
                    <input 
                      type="date" 
                      className="date-picker-modern full-width-date" 
                      value={newCursoForm.fechaInicio} 
                      onChange={e => setNewCursoForm(prev => ({ ...prev, fechaInicio: e.target.value }))} 
                    />
                  </div>
                </div>
                <div className="input-group">
                  <label>Fecha de Fin</label>
                  <div className="date-badge">
                    <input 
                      type="date" 
                      className="date-picker-modern full-width-date" 
                      value={newCursoForm.fechaFin} 
                      onChange={e => setNewCursoForm(prev => ({ ...prev, fechaFin: e.target.value }))} 
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleCreateCurso}>Añadir Curso</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cursos;