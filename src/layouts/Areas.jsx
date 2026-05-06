import { useState } from 'react';
import './Proyectos.css'; // Reutilizamos los estilos visuales

const Areas = () => {
  const [filtro, setFiltro] = useState('todos');
  const [expandedSubcats, setExpandedSubcats] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAreaForm, setNewAreaForm] = useState({ titulo: '', estado: 'en progreso', fechaInicio: '', fechaFin: '' });

  const [areas, setAreas] = useState([
    { 
      id: 1, titulo: 'Salud y Bienestar', estado: 'en progreso', fechaInicio: '2023-01-01', fechaFin: '2024-12-31',
      archivada: false,
      subCategorias: [
        { 
          id: 'sc1', titulo: 'Nutrición', descripcion: 'Plan de alimentación y suplementos.', fechaInicio: '2023-10-01', fechaFin: '2023-10-31', enlaces: [],
          tareas: [
            { id: 101, texto: 'Definir calorías diarias', completada: true },
            { id: 102, texto: 'Comprar meal prep', completada: false },
          ]
        },
        { 
          id: 'sc2', titulo: 'Ejercicio', descripcion: 'Rutina en el gimnasio y cardio.', fechaInicio: '2023-10-15', fechaFin: '2023-12-15', enlaces: [],
          tareas: [
            { id: 201, texto: 'Renovar suscripción del gym', completada: false },
          ]
        }
      ]
    },
    { 
      id: 2, titulo: 'Desarrollo Profesional', estado: 'en progreso', fechaInicio: '2023-06-01', fechaFin: '2024-06-01',
      archivada: false,
      subCategorias: [
        { 
          id: 'sc3', titulo: 'Networking', descripcion: 'Asistir a eventos y mejorar presencia online.', fechaInicio: '2023-11-01', fechaFin: '2023-11-30', enlaces: [],
          tareas: [
            { id: 301, texto: 'Actualizar perfil de LinkedIn', completada: true },
          ]
        }
      ]
    },
  ]);

  const areasFiltradas = areas.filter(a => !a.archivada && (filtro === 'todos' || a.estado === filtro));
  const areasArchivadas = areas.filter(a => a.archivada);

  const toggleTarea = (areaId, subCategoriaId, tareaId) => {
    setAreas(prevAreas => 
      prevAreas.map(area => {
        if (area.id === areaId) {
          const nuevasSubCategorias = area.subCategorias.map(sc => {
            if (sc.id === subCategoriaId) {
              const nuevasTareas = sc.tareas.map(tarea => 
                tarea.id === tareaId ? { ...tarea, completada: !tarea.completada } : tarea
              );
              return { ...sc, tareas: nuevasTareas };
            }
            return sc;
          });
          return { ...area, subCategorias: nuevasSubCategorias };
        }
        return area;
      })
    );
  };

  const toggleExpand = (subCatId) => {
    setExpandedSubcats(prev => ({ ...prev, [subCatId]: !prev[subCatId] }));
  };

  const handleCreateArea = () => {
    if(!newAreaForm.titulo) return alert("El título es obligatorio");
    
    const nuevaArea = {
      id: Date.now(),
      titulo: newAreaForm.titulo,
      estado: newAreaForm.estado,
      fechaInicio: newAreaForm.fechaInicio,
      fechaFin: newAreaForm.fechaFin,
      archivada: false,
      subCategorias: []
    };
    setAreas([nuevaArea, ...areas]);
    setIsModalOpen(false);
    setNewAreaForm({ titulo: '', estado: 'en progreso', fechaInicio: '', fechaFin: '' });
  };

  const agregarSubCategoria = (areaId) => {
    setAreas(prev => prev.map(a => a.id === areaId ? {
      ...a,
      subCategorias: [...a.subCategorias, {
        id: `sc-${Date.now()}`,
        titulo: 'Nueva Subcategoría',
        descripcion: '',
        fechaInicio: '',
        fechaFin: '',
        enlaces: [],
        tareas: []
      }]
    } : a));
  };

  const toggleArchivarArea = (areaId) => {
    setAreas(prev => prev.map(a => a.id === areaId ? { ...a, archivada: !a.archivada } : a));
  };

  const eliminarArea = (areaId) => {
    setAreas(prev => prev.filter(a => a.id !== areaId));
  };

  const updateAreaEstado = (areaId, nuevoEstado) => {
    setAreas(prev => prev.map(a => a.id === areaId ? { ...a, estado: nuevoEstado } : a));
  };

  const updateAreaDate = (areaId, field, value) => {
    setAreas(prev => prev.map(a => a.id === areaId ? { ...a, [field]: value } : a));
  };

  const updateSubcatField = (areaId, subCatId, field, value) => {
    setAreas(prev => prev.map(a => a.id === areaId ? { ...a, subCategorias: a.subCategorias.map(sc => 
      sc.id === subCatId ? { ...sc, [field]: value } : sc
    )} : a));
  };

  const agregarEnlace = (areaId, subCatId) => {
    setAreas(prev => prev.map(a => a.id === areaId ? { ...a, subCategorias: a.subCategorias.map(sc => 
      sc.id === subCatId ? { ...sc, enlaces: [...(sc.enlaces || []), { id: Date.now(), titulo: '', url: '', guardado: false }] } : sc
    )} : a));
  };

  const updateEnlace = (areaId, subCatId, enlaceId, field, value) => {
    setAreas(prev => prev.map(a => a.id === areaId ? { ...a, subCategorias: a.subCategorias.map(sc => 
      sc.id === subCatId ? { ...sc, enlaces: sc.enlaces.map(e => e.id === enlaceId ? { ...e, [field]: value } : e) } : sc
    )} : a));
  };

  const eliminarEnlace = (areaId, subCatId, enlaceId) => {
    setAreas(prev => prev.map(a => a.id === areaId ? { ...a, subCategorias: a.subCategorias.map(sc => 
      sc.id === subCatId ? { ...sc, enlaces: sc.enlaces.filter(e => e.id !== enlaceId) } : sc
    )} : a));
  };

  const agregarTarea = (areaId, subCatId) => {
    setAreas(prev => prev.map(a => a.id === areaId ? {
      ...a,
      subCategorias: a.subCategorias.map(sc => sc.id === subCatId ? {
        ...sc,
        tareas: [...sc.tareas, { id: Date.now(), texto: '', completada: false }]
      } : sc)
    } : a));
  };

  const updateTareaTexto = (areaId, subCatId, tareaId, nuevoTexto) => {
    setAreas(prev => prev.map(a => a.id === areaId ? { ...a, subCategorias: a.subCategorias.map(sc => 
      sc.id === subCatId ? { ...sc, tareas: sc.tareas.map(t => t.id === tareaId ? { ...t, texto: nuevoTexto } : t) } : sc
    )} : a));
  };

  return (
    <div className="proyectos-container">
      <header className="proyectos-header">
        <div>
          <h1 className="page-title">Áreas</h1>
          <p className="page-subtitle">Gestiona y equilibra los pilares principales de tu vida.</p>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>+ Nueva Área</button>
      </header>

      <div className="proyectos-filters">
        <button className={`filter-btn ${filtro === 'todos' ? 'active' : ''}`} onClick={() => setFiltro('todos')}>Todas</button>
        <button className={`filter-btn ${filtro === 'en progreso' ? 'active' : ''}`} onClick={() => setFiltro('en progreso')}>En Progreso</button>
        <button className={`filter-btn ${filtro === 'completado' ? 'active' : ''}`} onClick={() => setFiltro('completado')}>Completadas</button>
        <button className={`filter-btn ${filtro === 'pausado' ? 'active' : ''}`} onClick={() => setFiltro('pausado')}>Pausadas</button>
      </div>

      <div className="proyectos-grid">
        {areasFiltradas.map(area => {
          const progresosSubCategorias = area.subCategorias.map(sc => {
            const totalTareas = sc.tareas.length;
            const tareasCompletadas = sc.tareas.filter(t => t.completada).length;
            return totalTareas > 0 ? (tareasCompletadas / totalTareas) * 100 : 0;
          });
          const progresoGeneral = progresosSubCategorias.length > 0 
            ? Math.round(progresosSubCategorias.reduce((a, b) => a + b, 0) / progresosSubCategorias.length)
            : 0;

          return (
            <div key={area.id} className="proyecto-card">
              <div className="proyecto-card-main-info">
                <div className="proyecto-card-header">
                  <h3>{area.titulo}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <select 
                      className={`status-badge ${area.estado.replace(' ', '-')}`}
                      value={area.estado}
                      onChange={(e) => updateAreaEstado(area.id, e.target.value)}
                    >
                      <option value="en progreso">EN PROGRESO</option>
                      <option value="pausado">PAUSADAS</option>
                      <option value="completado">COMPLETADAS</option>
                    </select>
                    <button className="btn-icon-action" title="Archivar Área" onClick={() => toggleArchivarArea(area.id)}>
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
                      value={area.fechaInicio || ''} 
                      onChange={(e) => updateAreaDate(area.id, 'fechaInicio', e.target.value)} />
                  </div>
                  <span className="fecha-separator">→</span>
                  <div className="date-badge">
                    <span className="date-label">Fin</span>
                    <input type="date" className="date-picker-modern" 
                      value={area.fechaFin || ''} 
                      onChange={(e) => updateAreaDate(area.id, 'fechaFin', e.target.value)} />
                  </div>
                </div>
              </div>
              
              <div className="sub-categorias-container">
                {area.subCategorias.map(subCategoria => {
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
                                      onChange={(e) => updateEnlace(area.id, subCategoria.id, enlace.id, 'titulo', e.target.value)}
                                    />
                                    <input 
                                      type="url" 
                                      className="link-input-modern" 
                                      placeholder="https://..." 
                                      value={enlace.url} 
                                      onChange={(e) => updateEnlace(area.id, subCategoria.id, enlace.id, 'url', e.target.value)}
                                    />
                                  </div>
                                  <div className="link-actions" style={{ justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                                    <button className="btn-delete-link" onClick={() => eliminarEnlace(area.id, subCategoria.id, enlace.id)}>Cancelar</button>
                                    <button className="btn-save-link" onClick={() => {
                                        if(enlace.url && enlace.titulo) updateEnlace(area.id, subCategoria.id, enlace.id, 'guardado', true);
                                        else alert('Por favor, ingresa tanto el título como la URL del enlace.');
                                    }}>Guardar</button>
                                  </div>
                                </div>
                              ) : (
                                <div key={enlace.id} className="link-saved-display">
                                  <a href={enlace.url} target="_blank" rel="noopener noreferrer">📎 {enlace.titulo}</a>
                                  <div className="link-actions">
                                    <button className="btn-edit-link" onClick={() => updateEnlace(area.id, subCategoria.id, enlace.id, 'guardado', false)}>Editar</button>
                                    <button className="btn-delete-link" onClick={() => eliminarEnlace(area.id, subCategoria.id, enlace.id)}>Eliminar</button>
                                  </div>
                                </div>
                              )
                            ))}
                            <button className="btn-add-link" onClick={() => agregarEnlace(area.id, subCategoria.id)}>+ Añadir Enlace</button>
                          </div>

                          <div className="tareas-list-container">
                            <h5 className="tareas-titulo">Tareas ({tareasCompletadasSC}/{totalTareasSC})</h5>
                            <ul className="tareas-list">
                              {subCategoria.tareas.map(tarea => (
                                <li key={tarea.id} className="tarea-item">
                                  <label className="tarea-label">
                                    <input type="checkbox" checked={tarea.completada} onChange={() => toggleTarea(area.id, subCategoria.id, tarea.id)} />
                                    <input type="text" className={`tarea-texto-input ${tarea.completada ? 'completada' : ''}`} value={tarea.texto} placeholder="Escribe una tarea..." onChange={(e) => updateTareaTexto(area.id, subCategoria.id, tarea.id, e.target.value)} />
                                  </label>
                                </li>
                              ))}
                            </ul>
                            <button className="btn-add-tarea" onClick={() => agregarTarea(area.id, subCategoria.id)}>+ Añadir Tarea</button>
                          </div>
                          <div className="sub-categoria-footer">
                            <div className="proyecto-fechas-modern">
                              <div className="date-badge subcat-badge">
                                <span className="date-label">Inicia</span>
                                <input type="date" className="date-picker-modern small" value={subCategoria.fechaInicio || ''} onChange={(e) => updateSubcatField(area.id, subCategoria.id, 'fechaInicio', e.target.value)} />
                              </div>
                              <span className="fecha-separator">→</span>
                              <div className="date-badge subcat-badge">
                                <span className="date-label">Fin</span>
                                <input type="date" className="date-picker-modern small" value={subCategoria.fechaFin || ''} onChange={(e) => updateSubcatField(area.id, subCategoria.id, 'fechaFin', e.target.value)} />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                <button className="btn-add-subcat" onClick={() => agregarSubCategoria(area.id)}>+ Agregar Subtarjeta</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Historial de Áreas Archivadas */}
      {areasArchivadas.length > 0 && (
        <div className="archived-notes-section" style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px dashed rgba(255, 255, 255, 0.1)' }}>
          <div className="proyectos-header">
            <h2 className="page-title" style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>Historial de Áreas</h2>
          </div>
          <div className="archived-table-wrapper">
            <table className="archived-table">
              <thead>
                <tr>
                  <th>Área</th>
                  <th>Periodo</th>
                  <th>Progreso</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {areasArchivadas.map(area => {
                  const progresos = area.subCategorias.map(sc => sc.tareas.length > 0 ? (sc.tareas.filter(t => t.completada).length / sc.tareas.length) * 100 : 0);
                  const progresoGen = progresos.length > 0 ? Math.round(progresos.reduce((a, b) => a + b, 0) / progresos.length) : 0;
                  return (
                    <tr key={area.id}>
                      <td className="archived-title">{area.titulo}</td>
                      <td>{area.fechaInicio} → {area.fechaFin}</td>
                      <td>{progresoGen}%</td>
                      <td><span className={`status-badge ${area.estado.replace(' ', '-')}`}>{area.estado}</span></td>
                      <td>
                        <div className="archived-actions">
                          <button className="btn-icon-action" title="Desarchivar" onClick={() => toggleArchivarArea(area.id)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                          </button>
                          <button className="btn-icon-action delete-icon" title="Eliminar Permanentemente" onClick={() => eliminarArea(area.id)}>
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
            <h2>Crear Nueva Área</h2>
            <div className="modal-form">
              <div className="input-group">
                <label>Título del Área</label>
                <input type="text" value={newAreaForm.titulo} onChange={e => setNewAreaForm({...newAreaForm, titulo: e.target.value})} placeholder="Ej. Finanzas, Familia..." />
              </div>
              <div className="input-group">
                <label>Estado Inicial</label>
                <select value={newAreaForm.estado} onChange={e => setNewAreaForm({...newAreaForm, estado: e.target.value})} className="modal-select">
                  <option value="en progreso">En Progreso</option>
                  <option value="pausado">Pausado</option>
                  <option value="completado">Completado</option>
                </select>
              </div>
              <div className="fecha-inputs-row">
                <div className="input-group"><label>Fecha de Inicio</label><div className="date-badge"><input type="date" className="date-picker-modern full-width-date" value={newAreaForm.fechaInicio} onChange={e => setNewAreaForm({...newAreaForm, fechaInicio: e.target.value})} /></div></div>
                <div className="input-group"><label>Fecha de Fin</label><div className="date-badge"><input type="date" className="date-picker-modern full-width-date" value={newAreaForm.fechaFin} onChange={e => setNewAreaForm({...newAreaForm, fechaFin: e.target.value})} /></div></div>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setIsModalOpen(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleCreateArea}>Crear Área</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Areas;