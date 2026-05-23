# Soma OS — Roadmap y Deuda Técnica

**Versión:** 1.0  
**Fecha:** 2026-05-23

---

## Estado actual del producto

Soma OS v1 está completo y desplegado en producción. Los 8 módulos (Dashboard, Notas, Finanzas, Hábitos, Proyectos, Áreas, Cursos, Fitness) y Configuración están funcionales con sincronización en tiempo real con Firebase.

**URL:** https://wongluiggi-create.github.io/soma-os/

---

## Deuda técnica conocida

### Alta prioridad

| ID | Descripción | Módulo | Impacto |
|---|---|---|---|
| DT-01 | No hay Context API ni Zustand — el estado global en App.jsx se pasa como props a todos los módulos. Si el estado crece, se vuelve inmanejable. | Global | Escalabilidad |
| DT-02 | Todos los módulos son componentes monolíticos (500–1000+ líneas). No hay componentes reutilizables separados (ej. `<Modal>`, `<Tarjeta>`, `<Tarea>`). | Global | Mantenibilidad |
| DT-03 | Los arrays anidados (tareas, subCategorias, enlaces) se reescriben completos en cada update. Si un usuario tiene proyectos con cientos de tareas, esto genera writes innecesariamente grandes. | Proyectos, Áreas, Cursos | Rendimiento |
| DT-04 | No hay manejo de errores de red. Si Firestore no responde, el usuario no recibe feedback. | Global | UX |

### Media prioridad

| ID | Descripción | Módulo | Impacto |
|---|---|---|---|
| DT-05 | El Tablero kanban (`Tablero.jsx`) existe como componente separado pero no está integrado visualmente al flujo de Proyectos — requiere navegación adicional. | Proyectos | UX |
| DT-06 | El gráfico de Volumen Semanal en Fitness siempre muestra datos en cero — no conecta con los registros reales de entrenamiento. | Fitness | Funcionalidad |
| DT-07 | No hay validación de formularios (ej. monto vacío en Finanzas, nombre vacío en Hábitos). | Global | Robustez |
| DT-08 | `Proyectos.css` actúa como archivo de estilos compartidos pero no está estructurado como tal. Si Proyectos.jsx cambia su CSS, puede romper otros módulos. | Global | Mantenibilidad |
| DT-09 | Las imágenes subidas a Firebase Storage no tienen límite de tamaño en el cliente. | Fitness, Configuración | Costos |

### Baja prioridad

| ID | Descripción | Módulo | Impacto |
|---|---|---|---|
| DT-10 | No hay modo offline. Requiere conexión permanente. | Global | Disponibilidad |
| DT-11 | No hay tests (unitarios ni de integración). | Global | Confianza |
| DT-12 | El contador de tareas pendientes en el Dashboard requiere múltiples `onSnapshot` simultáneos abiertos. | Dashboard | Rendimiento |
| DT-13 | Las credenciales de Firebase están hardcodeadas en `firebase.js`. Para open-source, deberían moverse a variables de entorno. | Global | Seguridad |

---

## Features planificados

### Fase 2 — Mejoras de UX

| ID | Feature | Descripción | Módulo |
|---|---|---|---|
| F-01 | Búsqueda global | Input de búsqueda en la navbar que filtra notas, proyectos, hábitos y cursos por texto | Global |
| F-02 | Dark/Light mode toggle | Switch en Configuración para cambiar entre tema oscuro (actual) y claro | Global |
| F-03 | Drag & drop en Tablero | Mover tarjetas entre columnas del kanban con drag & drop | Proyectos |
| F-04 | Notificaciones push | Alertas del browser cuando un Pomodoro termina o una tarea tiene fecha vencida | Global |
| F-05 | Exportar a PDF/CSV | Exportar transacciones de Finanzas o el resumen de un proyecto | Finanzas, Proyectos |

### Fase 3 — Módulos nuevos

| ID | Feature | Descripción |
|---|---|---|
| M-01 | Módulo de Diario | Entrada diaria de texto con fecha, estado de ánimo y etiquetas |
| M-02 | Módulo de Lectura | Seguimiento de libros (leídos, en progreso, pendientes) con notas por capítulo |
| M-03 | Módulo de Mapa Mental | Editor de mapas mentales integrado (con @xyflow/react ya instalado) |
| M-04 | Módulo de Contactos | CRM personal: personas importantes con notas, fechas de cumpleaños y recordatorios |

### Fase 4 — Arquitectura

| ID | Feature | Descripción |
|---|---|---|
| A-01 | Refactorización a componentes | Extraer `<Modal>`, `<Tarjeta>`, `<ListaTareas>`, `<ListaEnlaces>` como componentes reutilizables en `src/components/` |
| A-02 | Context API o Zustand | Migrar el estado global de App.jsx a un store centralizado |
| A-03 | Tests con Vitest | Suite de tests unitarios para funciones de cálculo (progreso, IMC, heatmap) |
| A-04 | PWA | Agregar Service Worker para soporte offline básico y capacidad de instalar la app en el dispositivo |

---

## Bugs conocidos

| ID | Bug | Reproducción | Estado |
|---|---|---|---|
| B-01 | El gráfico de Volumen Semanal en Fitness muestra siempre 0 | Ir a Fitness → ver el gráfico inferior | Abierto |
| B-02 | Si el usuario no tiene hábitos creados, el gráfico de Hábitos muestra una línea en el fondo del SVG | Ir a Hábitos con lista vacía | Abierto |
| B-03 | En el Dashboard, el contador de tareas pendientes puede quedar desactualizado si se completan tareas en otro módulo mientras el Dashboard está abierto (depende del timing de `onSnapshot`) | Difícil de reproducir consistentemente | Abierto |

---

## Historial de decisiones técnicas

| Fecha | Decisión | Contexto |
|---|---|---|
| Inicio | Vite + React 19 sobre CRA | Vite ofrece HMR ultrarrápido y builds más pequeños |
| Inicio | HashRouter sobre BrowserRouter | GitHub Pages no soporta rutas del lado del servidor |
| Inicio | CSS puro sobre Tailwind/MUI | Control total del diseño, sin clases utilitarias en el JSX |
| Inicio | `onSnapshot` universal sobre `getDocs` | Sync en tiempo real sin polling manual |
| Inicio | Arrays anidados sobre subcolecciones | Simplicidad de consultas para volumen de uso personal |
| Inicio | Estado en App.jsx sobre Context/Zustand | Suficiente para la escala actual, más simple de mantener |
| v1 | SVG nativo para gráficos | Evitar dependencia de Chart.js o Recharts |
| v1 | @xyflow/react instalado | Preparación para Tablero y potencial módulo de Mapa Mental |

---

## Métricas de referencia

| Métrica | Valor |
|---|---|
| Bundle size (gzipped) | < 500 KB |
| Módulos funcionales | 8 + Configuración |
| Colecciones Firestore | 10 por usuario |
| Tiempo estimado de construcción | 3–5 semanas |
| Deploy | GitHub Pages (gratuito) |
| Costo de infraestructura | $0 (Spark plan de Firebase) |
