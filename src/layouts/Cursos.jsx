import { useState } from 'react';
import './Proyectos.css'; // Reutilizamos los estilos visuales

const Cursos = () => {
  const [filtro, setFiltro] = useState('todos');
  const [expandedSubcats, setExpandedSubcats] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCursoForm, setNewCursoForm] = useState({ titulo: '', estado: 'en progreso', fechaInicio: '', fechaFin: '' });

  const [cursos, setCursos] = useState([
    { 
      id: 1, titulo: 'Master en React Frontend', estado: 'en progreso', fechaInicio: '2023-09-01', fechaFin: '2023-12-15',
      archivada: false,
      subCategorias: [
        { 
          id: 'sc1', titulo: 'Módulo 1: Hooks y Estado', descripcion: 'Aprender useState, useEffect y Context API.', fechaInicio: '2023-09-01', fechaFin: '2023-09-15', enlaces: [],
          tareas: [
            { id: 101, texto: 'Ver videos de Hooks', completada: true },
            { id: 102, texto: 'Construir proyecto To-Do', completada: true },
          ]
        },
        { 
          id: 'sc2', titulo: 'Módulo 2: React Router', descripcion: 'Navegación dinámica entre páginas.', fechaInicio: '2023-09-16', fechaFin: '2023-09-30', enlaces: [],
          tareas: [
            { id: 201, texto: 'Implementar rutas anidadas', completada: false },
          ]
        }
      ]
    },
    { 
      id: 2, titulo: 'Curso de UI/UX Figma', estado: 'pausado', fechaInicio: '2023-11-01', fechaFin: '2024-01-30',
      archivada: false,
      subCategorias: [
        { 
          id: 'sc3', titulo: 'Conceptos de Diseño', descripcion: 'Teoría del color, tipografía y espacios.', fechaInicio: '2023-11-01', fechaFin: '2023-11-15', enlaces: [],
          tareas: [
            { id: 301, texto: 'Leer principios de Gestalt', completada: false },
          ]
        }
      ]
    },
  ]);

  const cursosFiltrados = cursos.filter(c => !c.archivada && (filtro === 'todos' || c.estado === filtro));
  const cursosArchivadas = cursos.filter(c => c.archivada);

  const toggleTarea = (cursoId, subCategoriaId, tareaId) => {
    setCursos(prevCursos => 
      prevCursos.map(curso => {
        if (curso.id === cursoId) {
          const nuevasSubCategorias = curso.subCategorias.map(sc => {
            if (sc.id === subCategoriaId) {
              const nuevasTareas = sc.tareas.map(tarea => 
                tarea.id === tareaId ? { ...tarea, completada: !tarea.completada } : tarea
              );
              return { ...sc, tareas: nuevasTareas };
            }
            return sc;
          });
          return { ...curso, subCategorias: nuevasSubCategorias };
        }
        return curso;
      })
    );
  };

  const toggleExpand = (subCatId) => {
    setExpandedSubcats(prev => ({ ...prev, [subCatId]: !prev[subCatId] }));
  };

  const handleCreateCurso = () => {
    if(!newCursoForm.titulo) return alert("El título es obligatorio");
    
    const nuevoCurso = {
      id: Date.now(),
      titulo: newCursoForm.titulo,
      estado: newCursoForm.estado,
      fechaInicio: newCursoForm.fechaInicio,
      fechaFin: newCursoForm.fechaFin,
      archivada: false,
      subCategorias: []
    };
    setCursos([nuevoCurso, ...cursos]);
    setIsModalOpen(false);
    setNewCursoForm({ titulo: '', estado: 'en progreso', fechaInicio: '', fechaFin: '' });
  };

  const agregarSubCategoria = (cursoId) => {
    setCursos(prev => prev.map(c => c.id === cursoId ? {
      ...c,
      subCategorias: [...c.subCategorias, {
        id: `sc-${Date.now()}`,
        titulo: 'Nuevo Módulo',
        descripcion: '',
        fechaInicio: '',
        fechaFin: '',
        enlaces: [],
        tareas: []
      }]
    } : c));
  };

  const toggleArchivarCurso = (cursoId) => {
    setCursos(prev => prev.map(c => c.id === cursoId ? { ...c, archivada: !c.archivada } : c));
  };

  const eliminarCurso = (cursoId) => {
    setCursos(prev => prev.filter(c => c.id !== cursoId));
  };

  const updateCursoEstado = (cursoId, nuevoEstado) => {
    setCursos(prev => prev.map(c => c.id === cursoId ? { ...c, estado: nuevoEstado } : c));
  };

  const updateCursoDate = (cursoId, field, value) => {
    setCursos(prev => prev.map(c => c.id === cursoId ? { ...c, [field]: value } : c));
  };

  const updateSubcatField = (cursoId, subCatId, field, value) => {
    setCursos(prev => prev.map(c => c.id === cursoId ? { ...c, subCategorias: c.subCategorias.map(sc => 
      sc.id === subCatId ? { ...sc, [field]: value } : sc
    )} : c));
  };

  const agregarEnlace = (cursoId, subCatId) => {
    setCursos(prev => prev.map(c => c.id === cursoId ? { ...c, subCategorias: c.subCategorias.map(sc => 
      sc.id === subCatId ? { ...sc, enlaces: [...(sc.enlaces || []), { id: Date.now(), titulo: '', url: '', guardado: false }] } : sc
    )} : c));
  };

  const updateEnlace = (cursoId, subCatId, enlaceId, field, value) => {
    setCursos(prev => prev.map(c => c.id === cursoId ? { ...c, subCategorias: c.subCategorias.map(sc => 
      sc.id === subCatId ? { ...sc, enlaces: sc.enlaces.map(e => e.id === enlaceId ? { ...e, [field]: value } : e) } : sc
    )} : c));
  };

  const eliminarEnlace = (cursoId, subCatId, enlaceId) => {
    setCursos(prev => prev.map(c => c.id === cursoId ? { ...c, subCategorias: c.subCategorias.map(sc => 
      sc.id === subCatId ? { ...sc, enlaces: sc.enlaces.filter(e => e.id !== enlaceId) } : sc
    )} : c));
  };

  const agregarTarea = (cursoId, subCatId) => {
    setCursos(prev => prev.map(c => c.id === cursoId ? {
      ...c,
      subCategorias: c.subCategorias.map(sc => sc.id === subCatId ? {
        ...sc,
        tareas: [...sc.tareas, { id: Date.now(), texto: '', completada: false }]
      } : sc)
    } : c));
  };

  const updateTareaTexto = (cursoId, subCatId, tareaId, nuevoTexto) => {
    setCursos(prev => prev.map(c => c.id === cursoId ? { ...c, subCategorias: c.subCategorias.map(sc => 
      sc.id === subCatId ? { ...sc, tareas: sc.tareas.map(t => t.id === tareaId ? { ...t, texto: nuevoTexto } : t) } : sc
    )} : c));
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
                          <h4 className="sub-categoria-titulo">{subCategoria.titulo}</h4>
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
                            defaultValue={subCategoria.descripcion}
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
                                      onChange={(e) => updateEnlace(curso.id, subCategoria.id, enlace.id, 'titulo', e.target.value)}
                                    />
                                    <input 
                                      type="url" 
                                      className="link-input-modern" 
                                      placeholder="https://..." 
                                      value={enlace.url} 
                                      onChange={(e) => updateEnlace(curso.id, subCategoria.id, enlace.id, 'url', e.target.value)}
                                    />
                                  </div>
                                  <div className="link-actions" style={{ justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                                    <button className="btn-delete-link" onClick={() => eliminarEnlace(curso.id, subCategoria.id, enlace.id)}>Cancelar</button>
                                    <button className="btn-save-link" onClick={() => {
                                        if(enlace.url && enlace.titulo) updateEnlace(curso.id, subCategoria.id, enlace.id, 'guardado', true);
                                        else alert('Por favor, ingresa tanto el título como la URL del enlace.');
                                    }}>Guardar</button>
                                  </div>
                                </div>
                              ) : (
                                <div key={enlace.id} className="link-saved-display">
                                  <a href={enlace.url} target="_blank" rel="noopener noreferrer">📎 {enlace.titulo}</a>
                                  <div className="link-actions">
                                    <button className="btn-edit-link" onClick={() => updateEnlace(curso.id, subCategoria.id, enlace.id, 'guardado', false)}>Editar</button>
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
                                    <input type="text" className={`tarea-texto-input ${tarea.completada ? 'completada' : ''}`} value={tarea.texto} placeholder="Escribe una tarea..." onChange={(e) => updateTareaTexto(curso.id, subCategoria.id, tarea.id, e.target.value)} />
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
                                <input type="date" className="date-picker-modern small" value={subCategoria.fechaInicio || ''} onChange={(e) => updateSubcatField(curso.id, subCategoria.id, 'fechaInicio', e.target.value)} />
                              </div>
                              <span className="fecha-separator">→</span>
                              <div className="date-badge subcat-badge">
                                <span className="date-label">Fin</span>
                                <input type="date" className="date-picker-modern small" value={subCategoria.fechaFin || ''} onChange={(e) => updateSubcatField(curso.id, subCategoria.id, 'fechaFin', e.target.value)} />
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