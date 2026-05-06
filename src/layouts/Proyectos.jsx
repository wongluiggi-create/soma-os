import { useState } from 'react';
import './Proyectos.css';

const Proyectos = () => {
  const [filtro, setFiltro] = useState('todos');
  const [expandedSubcats, setExpandedSubcats] = useState({}); // Estado para manejar subtarjetas expandidas
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectForm, setNewProjectForm] = useState({ titulo: '', estado: 'en progreso', fechaInicio: '', fechaFin: '' });

  // Nueva estructura de datos anidada con sub-categorías
  const [proyectos, setProyectos] = useState([
    { 
      id: 1, titulo: 'Rediseño de Soma OS', estado: 'en progreso', fechaInicio: '2023-10-15', fechaFin: '2023-11-20',
      archivada: false,
      subCategorias: [
        { 
          id: 'sc1', titulo: 'Interfaz de Usuario (UI)', descripcion: 'Creación de todos los componentes visuales y layouts.', fechaInicio: '2023-10-15', fechaFin: '2023-10-18', enlaces: [],
          tareas: [
            { id: 101, texto: 'Crear Layout Principal', completada: true },
            { id: 102, texto: 'Diseñar página de Proyectos', completada: true },
            { id: 103, texto: 'Maquetar Dashboard Home', completada: false },
          ]
        },
        { 
          id: 'sc2', titulo: 'Lógica y Estado', descripcion: 'Manejo del estado de la aplicación con React Hooks.', fechaInicio: '2023-10-19', fechaFin: '2023-10-25', enlaces: [],
          tareas: [
            { id: 201, texto: 'Implementar estado de Proyectos', completada: true },
            { id: 202, texto: 'Crear contexto de autenticación', completada: false },
          ]
        }
      ]
    },
    { 
      id: 2, titulo: 'Aplicación Móvil', estado: 'pausado', fechaInicio: '2023-11-01', fechaFin: '2023-12-15',
      archivada: false,
      subCategorias: [
        { 
          id: 'sc3', titulo: 'Análisis y Diseño', descripcion: 'Definición de requerimientos y prototipos.', fechaInicio: '2023-11-01', fechaFin: '2023-11-15', enlaces: [],
          tareas: [
            { id: 301, texto: 'Prototipo en Figma', completada: true },
            { id: 302, texto: 'Definir arquitectura', completada: false },
          ]
        }
      ]
    },
  ]);

  const proyectosFiltrados = proyectos.filter(p => !p.archivada && (filtro === 'todos' || p.estado === filtro));
  const proyectosArchivados = proyectos.filter(p => p.archivada);

  // Función para alternar el estado de una tarea, ahora con subcategoría
  const toggleTarea = (proyectoId, subCategoriaId, tareaId) => {
    setProyectos(prevProyectos => 
      prevProyectos.map(proyecto => {
        if (proyecto.id === proyectoId) {
          const nuevasSubCategorias = proyecto.subCategorias.map(sc => {
            if (sc.id === subCategoriaId) {
              const nuevasTareas = sc.tareas.map(tarea => 
                tarea.id === tareaId ? { ...tarea, completada: !tarea.completada } : tarea
              );
              return { ...sc, tareas: nuevasTareas };
            }
            return sc;
          });
          return { ...proyecto, subCategorias: nuevasSubCategorias };
        }
        return proyecto;
      })
    );
  };

  // Función para expandir/contraer subtarjeta
  const toggleExpand = (subCatId) => {
    setExpandedSubcats(prev => ({ ...prev, [subCatId]: !prev[subCatId] }));
  };

  // Funciones del modal y creación de proyecto
  const handleCreateProject = () => {
    if(!newProjectForm.titulo) return alert("El título es obligatorio");
    
    const nuevoProyecto = {
      id: Date.now(),
      titulo: newProjectForm.titulo,
      estado: newProjectForm.estado,
      fechaInicio: newProjectForm.fechaInicio,
      fechaFin: newProjectForm.fechaFin,
      archivada: false,
      subCategorias: []
    };
    setProyectos([nuevoProyecto, ...proyectos]);
    setIsModalOpen(false);
    setNewProjectForm({ titulo: '', estado: 'en progreso', fechaInicio: '', fechaFin: '' });
  };

  // Función para agregar una nueva subtarjeta
  const agregarSubCategoria = (proyectoId) => {
    setProyectos(prev => prev.map(p => p.id === proyectoId ? {
      ...p,
      subCategorias: [...p.subCategorias, {
        id: `sc-${Date.now()}`,
        titulo: 'Nueva Fase / Subtarjeta',
        descripcion: '',
        fechaInicio: '',
        fechaFin: '',
        enlaces: [],
        tareas: []
      }]
    } : p));
  };

  const toggleArchivarProyecto = (proyectoId) => {
    setProyectos(prev => prev.map(p => p.id === proyectoId ? { ...p, archivada: !p.archivada } : p));
  };

  const eliminarProyecto = (proyectoId) => {
    setProyectos(prev => prev.filter(p => p.id !== proyectoId));
  };

  const updateProyectoEstado = (proyectoId, nuevoEstado) => {
    setProyectos(prev => prev.map(p => p.id === proyectoId ? { ...p, estado: nuevoEstado } : p));
  };

  const updateProyectoDate = (proyectoId, field, value) => {
    setProyectos(prev => prev.map(p => p.id === proyectoId ? { ...p, [field]: value } : p));
  };

  const updateSubcatField = (proyectoId, subCatId, field, value) => {
    setProyectos(prev => prev.map(p => p.id === proyectoId ? { ...p, subCategorias: p.subCategorias.map(sc => 
      sc.id === subCatId ? { ...sc, [field]: value } : sc
    )} : p));
  };

  const agregarEnlace = (proyectoId, subCatId) => {
    setProyectos(prev => prev.map(p => p.id === proyectoId ? { ...p, subCategorias: p.subCategorias.map(sc => 
      sc.id === subCatId ? { ...sc, enlaces: [...(sc.enlaces || []), { id: Date.now(), titulo: '', url: '', guardado: false }] } : sc
    )} : p));
  };

  const updateEnlace = (proyectoId, subCatId, enlaceId, field, value) => {
    setProyectos(prev => prev.map(p => p.id === proyectoId ? { ...p, subCategorias: p.subCategorias.map(sc => 
      sc.id === subCatId ? { ...sc, enlaces: sc.enlaces.map(e => e.id === enlaceId ? { ...e, [field]: value } : e) } : sc
    )} : p));
  };

  const eliminarEnlace = (proyectoId, subCatId, enlaceId) => {
    setProyectos(prev => prev.map(p => p.id === proyectoId ? { ...p, subCategorias: p.subCategorias.map(sc => 
      sc.id === subCatId ? { ...sc, enlaces: sc.enlaces.filter(e => e.id !== enlaceId) } : sc
    )} : p));
  };

  // Función para agregar una tarea vacía a una subtarjeta
  const agregarTarea = (proyectoId, subCatId) => {
    setProyectos(prev => prev.map(p => p.id === proyectoId ? {
      ...p,
      subCategorias: p.subCategorias.map(sc => sc.id === subCatId ? {
        ...sc,
        tareas: [...sc.tareas, { id: Date.now(), texto: '', completada: false }]
      } : sc)
    } : p));
  };

  // Función para actualizar el texto de una tarea
  const updateTareaTexto = (proyectoId, subCatId, tareaId, nuevoTexto) => {
    setProyectos(prev => prev.map(p => p.id === proyectoId ? { ...p, subCategorias: p.subCategorias.map(sc => 
      sc.id === subCatId ? { ...sc, tareas: sc.tareas.map(t => t.id === tareaId ? { ...t, texto: nuevoTexto } : t) } : sc
    )} : p));
  };

  return (
    <div className="proyectos-container">
      <header className="proyectos-header">
        <div>
          <h1 className="page-title">Proyectos</h1>
          <p className="page-subtitle">Gestiona y haz seguimiento de tus iniciativas en curso.</p>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>+ Nuevo Proyecto</button>
      </header>

      <div className="proyectos-filters">
        <button className={`filter-btn ${filtro === 'todos' ? 'active' : ''}`} onClick={() => setFiltro('todos')}>Todos</button>
        <button className={`filter-btn ${filtro === 'en progreso' ? 'active' : ''}`} onClick={() => setFiltro('en progreso')}>En Progreso</button>
        <button className={`filter-btn ${filtro === 'completado' ? 'active' : ''}`} onClick={() => setFiltro('completado')}>Completados</button>
        <button className={`filter-btn ${filtro === 'pausado' ? 'active' : ''}`} onClick={() => setFiltro('pausado')}>Pausados</button>
      </div>

      <div className="proyectos-grid">
        {proyectosFiltrados.map(proyecto => {
          // Calculamos el progreso general del proyecto como el promedio del progreso de sus sub-categorías
          const progresosSubCategorias = proyecto.subCategorias.map(sc => {
            const totalTareas = sc.tareas.length;
            const tareasCompletadas = sc.tareas.filter(t => t.completada).length;
            return totalTareas > 0 ? (tareasCompletadas / totalTareas) * 100 : 0;
          });
          const progresoGeneral = progresosSubCategorias.length > 0 
            ? Math.round(progresosSubCategorias.reduce((a, b) => a + b, 0) / progresosSubCategorias.length)
            : 0;

          return (
            <div key={proyecto.id} className="proyecto-card">
              {/* Información de la Tarjeta Principal */}
              <div className="proyecto-card-main-info">
                <div className="proyecto-card-header">
                  <h3>{proyecto.titulo}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <select 
                      className={`status-badge ${proyecto.estado.replace(' ', '-')}`}
                      value={proyecto.estado}
                      onChange={(e) => updateProyectoEstado(proyecto.id, e.target.value)}
                    >
                      <option value="en progreso">EN PROGRESO</option>
                      <option value="pausado">PAUSADO</option>
                      <option value="completado">COMPLETADO</option>
                    </select>
                    <button className="btn-icon-action" title="Archivar Proyecto" onClick={() => toggleArchivarProyecto(proyecto.id)}>
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
                      value={proyecto.fechaInicio || ''} 
                      onChange={(e) => updateProyectoDate(proyecto.id, 'fechaInicio', e.target.value)} />
                  </div>
                  <span className="fecha-separator">→</span>
                  <div className="date-badge">
                    <span className="date-label">Fin</span>
                    <input type="date" className="date-picker-modern" 
                      value={proyecto.fechaFin || ''} 
                      onChange={(e) => updateProyectoDate(proyecto.id, 'fechaFin', e.target.value)} />
                  </div>
                </div>
              </div>
              
              {/* Contenedor para las tarjetas de detalle (sub-categorías) */}
              <div className="sub-categorias-container">
                {proyecto.subCategorias.map(subCategoria => {
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

                      {/* Contenido expandible */}
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
                                      onChange={(e) => updateEnlace(proyecto.id, subCategoria.id, enlace.id, 'titulo', e.target.value)}
                                    />
                                    <input 
                                      type="url" 
                                      className="link-input-modern" 
                                      placeholder="https://..." 
                                      value={enlace.url} 
                                      onChange={(e) => updateEnlace(proyecto.id, subCategoria.id, enlace.id, 'url', e.target.value)}
                                    />
                                  </div>
                                  <div className="link-actions" style={{ justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                                    <button className="btn-delete-link" onClick={() => eliminarEnlace(proyecto.id, subCategoria.id, enlace.id)}>Cancelar</button>
                                    <button className="btn-save-link" onClick={() => {
                                        if(enlace.url && enlace.titulo) updateEnlace(proyecto.id, subCategoria.id, enlace.id, 'guardado', true);
                                        else alert('Por favor, ingresa tanto el título como la URL del enlace.');
                                    }}>Guardar</button>
                                  </div>
                                </div>
                              ) : (
                                <div key={enlace.id} className="link-saved-display">
                                  <a href={enlace.url} target="_blank" rel="noopener noreferrer">📎 {enlace.titulo}</a>
                                  <div className="link-actions">
                                    <button className="btn-edit-link" onClick={() => updateEnlace(proyecto.id, subCategoria.id, enlace.id, 'guardado', false)}>Editar</button>
                                    <button className="btn-delete-link" onClick={() => eliminarEnlace(proyecto.id, subCategoria.id, enlace.id)}>Eliminar</button>
                                  </div>
                                </div>
                              )
                            ))}
                            <button className="btn-add-link" onClick={() => agregarEnlace(proyecto.id, subCategoria.id)}>+ Añadir Enlace</button>
                          </div>

                          <div className="tareas-list-container">
                            <h5 className="tareas-titulo">Tareas ({tareasCompletadasSC}/{totalTareasSC})</h5>
                            <ul className="tareas-list">
                              {subCategoria.tareas.map(tarea => (
                                <li key={tarea.id} className="tarea-item">
                                  <label className="tarea-label">
                                    <input 
                                      type="checkbox" 
                                      checked={tarea.completada}
                                      onChange={() => toggleTarea(proyecto.id, subCategoria.id, tarea.id)}
                                    />
                                    <input 
                                      type="text"
                                      className={`tarea-texto-input ${tarea.completada ? 'completada' : ''}`}
                                      value={tarea.texto}
                                      placeholder="Escribe una tarea..."
                                      onChange={(e) => updateTareaTexto(proyecto.id, subCategoria.id, tarea.id, e.target.value)}
                                    />
                                  </label>
                                </li>
                              ))}
                            </ul>
                            <button className="btn-add-tarea" onClick={() => agregarTarea(proyecto.id, subCategoria.id)}>
                              + Añadir Tarea
                            </button>
                          </div>
                          <div className="sub-categoria-footer">
                            <div className="proyecto-fechas-modern">
                              <div className="date-badge subcat-badge">
                                <span className="date-label">Inicia</span>
                                <input type="date" className="date-picker-modern small" 
                                  value={subCategoria.fechaInicio || ''} 
                                  onChange={(e) => updateSubcatField(proyecto.id, subCategoria.id, 'fechaInicio', e.target.value)} />
                              </div>
                              <span className="fecha-separator">→</span>
                              <div className="date-badge subcat-badge">
                                <span className="date-label">Fin</span>
                                <input type="date" className="date-picker-modern small" 
                                  value={subCategoria.fechaFin || ''} 
                                  onChange={(e) => updateSubcatField(proyecto.id, subCategoria.id, 'fechaFin', e.target.value)} />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                <button className="btn-add-subcat" onClick={() => agregarSubCategoria(proyecto.id)}>
                  + Agregar Subtarjeta
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Historial de Proyectos Archivados */}
      {proyectosArchivados.length > 0 && (
        <div className="archived-notes-section" style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px dashed rgba(255, 255, 255, 0.1)' }}>
          <div className="proyectos-header">
            <h2 className="page-title" style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>Historial de Proyectos</h2>
          </div>
          <div className="archived-table-wrapper">
            <table className="archived-table">
              <thead>
                <tr>
                  <th>Proyecto</th>
                  <th>Periodo</th>
                  <th>Progreso</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {proyectosArchivados.map(proyecto => {
                  const progresos = proyecto.subCategorias.map(sc => sc.tareas.length > 0 ? (sc.tareas.filter(t => t.completada).length / sc.tareas.length) * 100 : 0);
                  const progresoGen = progresos.length > 0 ? Math.round(progresos.reduce((a, b) => a + b, 0) / progresos.length) : 0;
                  return (
                    <tr key={proyecto.id}>
                      <td className="archived-title">{proyecto.titulo}</td>
                      <td>{proyecto.fechaInicio} → {proyecto.fechaFin}</td>
                      <td>{progresoGen}%</td>
                      <td><span className={`status-badge ${proyecto.estado.replace(' ', '-')}`}>{proyecto.estado}</span></td>
                      <td>
                        <div className="archived-actions">
                          <button className="btn-icon-action" title="Desarchivar" onClick={() => toggleArchivarProyecto(proyecto.id)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                          </button>
                          <button className="btn-icon-action delete-icon" title="Eliminar Permanentemente" onClick={() => eliminarProyecto(proyecto.id)}>
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

      {/* Ventana Modal para Nuevo Proyecto */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Crear Nuevo Proyecto</h2>
            <div className="modal-form">
              <div className="input-group">
                <label>Título del Proyecto</label>
                <input type="text" value={newProjectForm.titulo} onChange={e => setNewProjectForm({...newProjectForm, titulo: e.target.value})} placeholder="Ej. Lanzamiento web..." />
              </div>
              <div className="input-group">
                <label>Estado Inicial</label>
                <select value={newProjectForm.estado} onChange={e => setNewProjectForm({...newProjectForm, estado: e.target.value})} className="modal-select">
                  <option value="en progreso">En Progreso</option>
                  <option value="pausado">Pausado</option>
                  <option value="completado">Completado</option>
                </select>
              </div>
              <div className="fecha-inputs-row">
                <div className="input-group">
                  <label>Fecha de Inicio</label>
                  <div className="date-badge">
                    <input type="date" className="date-picker-modern full-width-date" value={newProjectForm.fechaInicio} onChange={e => setNewProjectForm({...newProjectForm, fechaInicio: e.target.value})} />
                  </div>
                </div>
                <div className="input-group">
                  <label>Fecha de Fin</label>
                  <div className="date-badge">
                    <input type="date" className="date-picker-modern full-width-date" value={newProjectForm.fechaFin} onChange={e => setNewProjectForm({...newProjectForm, fechaFin: e.target.value})} />
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleCreateProject}>Crear Proyecto</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Proyectos;