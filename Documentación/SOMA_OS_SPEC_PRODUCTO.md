# Soma OS — Especificación de Producto

**Versión:** 1.0  
**Fecha:** 2026-05-23  
**Estado:** Activo

---

## Visión del producto

Soma OS es un sistema operativo personal de gestión de vida construido como SPA (Single Page Application). Su propósito es centralizar en una sola interfaz todo lo que una persona necesita para gestionar su vida: proyectos, finanzas, hábitos, aprendizaje, notas, áreas de vida y estado físico. Los datos se sincronizan en tiempo real con Firebase y están aislados por usuario.

**Principios de diseño:**
- Un solo login para todo
- Datos en la nube, accesibles desde cualquier dispositivo
- Interfaz oscura y minimalista
- Sin frameworks de UI externos — CSS propio
- Deploy gratuito en GitHub Pages

---

## Stack y restricciones técnicas

| Elemento | Valor |
|---|---|
| Frontend | React 19 + Vite 8 |
| Enrutamiento | React Router v7 (HashRouter) |
| Auth | Firebase Authentication (Email/Password) |
| Base de datos | Cloud Firestore (listeners en tiempo real) |
| Storage | Firebase Storage (imágenes) |
| Deploy | GitHub Pages (`npm run deploy` → rama gh-pages) |
| URL pública | https://wongluiggi-create.github.io/soma-os/ |

**Restricción crítica — HashRouter:** GitHub Pages no soporta historial HTML5 del lado del servidor. Se usa HashRouter obligatoriamente. Las rutas tienen formato `/#/modulo`.

---

## Módulos del sistema

### 1. Autenticación (Login)

**Propósito:** Puerta de entrada al sistema. Control de acceso por usuario.

**Comportamiento esperado:**
- Si el usuario ya tiene sesión activa → redirige automáticamente al Dashboard
- Si no → muestra el formulario de Login
- Formulario: email + contraseña
- Acción principal: "Iniciar Sesión" (`signInWithEmailAndPassword`)
- Acción secundaria: "Crear Cuenta" (`createUserWithEmailAndPassword`)
- En error de credenciales → muestra mensaje de error inline
- Al autenticar exitosamente → se carga la configuración global del usuario desde Firestore y se redirige al Dashboard

**Criterios de aceptación:**
- [ ] El usuario puede iniciar sesión con email y contraseña existentes
- [ ] El usuario puede crear una cuenta nueva
- [ ] Si hay sesión activa al abrir la app, no se muestra el login
- [ ] Los errores de autenticación se muestran al usuario sin recargar la página

---

### 2. Layout principal (MainLayout)

**Propósito:** Envuelve todas las rutas protegidas. Proporciona navegación persistente y timer Pomodoro.

**Componentes del layout:**
- Barra superior (top-navbar) con:
  - Botón hamburguesa (mobile)
  - Logo "Soma OS"
  - Menú de navegación horizontal (desktop) / drawer (mobile)
  - Widget Pomodoro
  - Ícono de acceso a Configuración

**Timer Pomodoro — especificación:**
- Modo Trabajo: 25 min (configurable 1–90 min)
- Modo Descanso: 5 min (configurable 1–30 min)
- El estado del timer (timeLeft, isActive, mode) vive en MainLayout para persistir entre navegaciones
- Al llegar a 0 en modo Trabajo → sonido de fin + incrementa contador de sesiones + cambia a Descanso
- Al llegar a 0 en modo Descanso → sonido diferente + cambia a Trabajo
- Auto-inicio configurable: si está ON, el nuevo modo arranca automáticamente
- Atajo de teclado: Barra espaciadora = play/pausa (excepto cuando el foco está en un input/textarea)
- Contador de sesiones completadas hoy (persiste en localStorage por día con clave `pomodoro_sessions_YYYY-MM-DD`)
- El contador muestra hasta 8 puntos; si hay más → indicador "+N"
- Panel de configuración: se abre con botón de ajustes, se cierra al hacer clic fuera
- Configuración persiste en localStorage: `pomodoro_work_min`, `pomodoro_break_min`, `pomodoro_autostart`

**Menú de navegación — rutas:**
| Ruta | Etiqueta |
|---|---|
| `/` | Home |
| `/notas` | Notas |
| `/finanzas` | Finanzas |
| `/habitos` | Hábitos |
| `/cursos` | Cursos |
| `/areas` | Áreas |
| `/proyectos` | Proyectos |
| `/fitness` | Fitness |

**Criterios de aceptación:**
- [ ] El timer no se reinicia al navegar entre páginas
- [ ] El título de la pestaña del navegador muestra el tiempo restante cuando el timer está activo
- [ ] En mobile, el menú se oculta detrás del botón hamburguesa
- [ ] El overlay del menú mobile cierra el drawer al hacer clic

---

### 3. Dashboard (Home)

**Propósito:** Vista ejecutiva que agrega información de todos los módulos en una sola pantalla.

**Secciones y comportamiento:**

**Saludo dinámico:**
- Texto: "Buenos días/tardes/noches, {nombre}" según hora del día
- Muestra fecha actual y contador de tareas pendientes totales (suma de todas las tareas incompletas de todos los módulos)

**Actividad Anual (GitHub-style heatmap):**
- Grilla de 53 columnas × 7 filas (371 celdas)
- Siempre empieza en el primer Lunes del año (o el Lunes anterior si el año no empieza en Lunes)
- Días: L=0, M=1, X=2, J=3, V=4, S=5, D=6
- El cálculo usa UTC para evitar bugs de zona horaria
- Niveles de actividad por celda: 0 (vacío) → 1 → 2 → 3 → 4 (máximo, color completo)
- Clic en una celda → incrementa el nivel; al llegar al máximo vuelve a 0
- El día actual tiene borde naranja distintivo
- El porcentaje general = promedio del nivel de actividad sobre el total de días con nivel > 0
- Los datos se guardan como array de 371 números en el documento raíz del usuario en Firestore

**Resumen Financiero:**
- Balance total acumulado (ingresos acumulados − gastos acumulados)
- Ingresos del mes actual
- Egresos del mes actual
- Total ahorrado (suma de abonos a metas de ahorro)

**Notas Recientes:**
- Últimas 5 notas no archivadas, ordenadas por fecha de creación descendente

**Proyectos Activos:**
- Hasta 5 proyectos con estado "En Progreso", con barra de progreso
- Progreso calculado como promedio del progreso de todas las subfases

**Metas de Ahorro:**
- Lista de metas con barra de progreso (ahorrado / objetivo)

**Racha de Entrenamiento:**
- Días consecutivos con al menos 1 entrenamiento registrado
- Íconos: 🧊 (0 días) → 🏃 (1–6 días) → 🔥 (7–29 días) → ⚡ (30+ días)

**Hábitos de Hoy:**
- Lista de hábitos con checkbox para el día actual
- Al marcar → guarda en Firestore
- Filtrado solo a los hábitos activos

**Balance de Áreas:**
- Lista de áreas activas con su barra de progreso

**Criterios de aceptación:**
- [ ] Todos los datos se actualizan en tiempo real sin recargar la página
- [ ] El saludo cambia según el rango horario (mañana/tarde/noche)
- [ ] La grilla de actividad anual muestra el día actual resaltado con borde naranja
- [ ] El heatmap persiste entre sesiones (datos en Firestore)

---

### 4. Notas

**Propósito:** Captura rápida de ideas, apuntes y listas de tareas con enlaces de referencia.

**Entidad: Nota**
```
{
  id: string (auto),
  titulo: string,
  descripcion: string,
  tareas: [{ id, texto, completada }],
  enlaces: [{ titulo, url }],
  archivada: boolean,
  creadaEn: timestamp
}
```

**Funcionalidades:**
- Crear nota con título inicial → se guarda en Firestore al confirmar
- Editar título inline con botón de lápiz → guardar con Enter o clic fuera
- Área de texto libre con autoguardado al perder foco (onBlur → updateDoc)
- Agregar tareas con texto → checkbox para marcar/desmarcar → editar texto inline
- Adjuntar enlaces (título + URL) → se muestran como lista debajo del área de texto
- Archivar nota → desaparece de la vista principal, aparece en tabla inferior
- Desarchivar desde la tabla → vuelve a la vista principal
- Eliminar nota permanentemente (pide confirmación)

**Vista:**
- Tarjetas en grid (desktop: 3 columnas, mobile: 1)
- Tabla de "Notas Archivadas" al pie de la página

**Criterios de aceptación:**
- [ ] El texto se guarda automáticamente al salir del área (sin botón de guardar manual)
- [ ] Las tareas se pueden reordenar o eliminar individualmente
- [ ] Los enlaces se abren en pestaña nueva
- [ ] Archivar/desarchivar no elimina los datos

---

### 5. Finanzas

**Propósito:** Control completo de flujo de dinero, metas de ahorro y lista de deseos.

**Sub-sección A: Transacciones**

Entidad:
```
{
  id: string,
  tipo: 'ingreso' | 'egreso',
  monto: number,
  descripcion: string,
  categoria: string,
  tarjetaId: string | null,
  fecha: string (YYYY-MM-DD)
}
```

- Registrar ingreso o egreso con monto, descripción, categoría y fecha
- Si el tipo es egreso y se selecciona una tarjeta → descuenta del cupo disponible de esa tarjeta
- Las categorías se definen en Configuración (categoriasIngreso, categoriasEgreso)
- Lista ordenada por fecha descendente
- Eliminar transacción individual

**Sub-sección B: Metas de Ahorro**

Entidad:
```
{
  id: string,
  nombre: string,
  objetivo: number,
  abonos: [{ monto, fecha, nota }]
}
```

- Crear meta con nombre y monto objetivo
- Abonar monto a una meta → se acumula en el array de abonos
- Barra de progreso: (suma de abonos / objetivo) × 100%
- Historial de abonos desplegable por meta
- Eliminar meta

**Sub-sección C: Lista de Deseos**

Entidad:
```
{
  id: string,
  nombre: string,
  modelo: string,
  url: string,
  precio: number,
  cuotas: number,
  cuotasPagadas: [boolean] (array de longitud = cuotas)
}
```

- Crear deseo con nombre, modelo, URL de tienda, precio y número de cuotas
- Cuota mensual = precio / cuotas (calculada automáticamente)
- Cada cuota es un checkbox; al marcar todas → tarjeta marcada como completada
- Enlace directo a la URL de tienda

**Panel de resumen (siempre visible):**
- Balance total: ∑ ingresos − ∑ egresos
- Ingresos del mes actual
- Egresos del mes actual
- Total ahorrado: suma de todos los abonos

**Criterios de aceptación:**
- [ ] El balance se actualiza en tiempo real al agregar/eliminar transacciones
- [ ] Una tarjeta de crédito con cupo 0 no puede recibir más egresos asignados
- [ ] La barra de progreso de metas no excede el 100% visualmente aunque se supere el monto
- [ ] La cuota mensual se recalcula si el usuario cambia el precio o el número de cuotas

---

### 6. Hábitos

**Propósito:** Seguimiento semanal de hábitos con visualización gráfica de consistencia.

**Entidad: Hábito**
```
{
  id: string,
  nombre: string,
  contexto: string,
  registros: { [fechaISO]: boolean }
}
```

**Funcionalidades:**
- Crear hábito con nombre y contexto/motivación
- Vista de tabla: filas = hábitos, columnas = 7 días de la semana seleccionada (L–D)
- Checkbox por cada combinación hábito × día → guarda en `registros[fechaISO]`
- Navegar entre semanas con botones ← → (sin límite de semanas pasadas/futuras)
- Botón para volver a la semana actual
- El día de hoy se resalta visualmente en la columna correspondiente
- Eliminar hábito (requiere confirmación)

**Gráfico lineal semanal:**
- Curva Bézier cúbica suavizada en SVG nativo (sin librerías externas)
- Eje X: 7 días de la semana visible
- Eje Y: porcentaje de hábitos completados ese día (0%–100%)
- Área bajo la curva con gradiente lineal
- Punto en cada coordenada + etiqueta de porcentaje

**Criterios de aceptación:**
- [ ] Navegar a semanas pasadas muestra los registros históricos correctos
- [ ] El gráfico refleja exactamente el % de la semana visible
- [ ] El día actual se identifica visualmente aunque se esté viendo otra semana (no resaltado en otras semanas)

---

### 7. Proyectos

**Propósito:** Gestión de iniciativas con fases, tareas, fechas y seguimiento de progreso.

**Entidad: Proyecto**
```
{
  id: string,
  titulo: string,
  estado: 'En Progreso' | 'Pausado' | 'Completado',
  fechaInicio: string,
  fechaFin: string,
  archivado: boolean,
  subCategorias: [SubCategoria]
}
```

**Entidad: SubCategoria (fase del proyecto)**
```
{
  id: string,
  titulo: string,
  descripcion: string,
  fechaInicio: string,
  fechaFin: string,
  tareas: [{ id, texto, completada }],
  enlaces: [{ titulo, url }],
  colapsada: boolean
}
```

**Funcionalidades:**
- Crear proyecto con título, estado y fechas
- Cambiar estado inline con selector (En Progreso / Pausado / Completado)
- Editar fechas inline directamente en la tarjeta
- Barra de progreso del proyecto = promedio del progreso de todas sus subfases
- Progreso de subfase = tareas completadas / total de tareas × 100%
- Agregar subtarjetas (fases) con título, descripción, tareas, enlaces y fechas propias
- Collapse/expand de cada subfase con botón +/−
- Los enlaces se muestran como ícono 📎 en el encabezado colapsado
- Editar título de subfase inline
- Archivar proyecto → pasa al historial, no se elimina
- Historial de archivados: tabla con título, progreso, estado y fechas
- Eliminar proyecto permanentemente

**Criterios de aceptación:**
- [ ] La barra de progreso se actualiza automáticamente al marcar/desmarcar tareas
- [ ] Los cambios de estado se reflejan sin recargar la página
- [ ] Un proyecto archivado no aparece en la vista principal pero sus datos se conservan

---

### 8. Áreas

**Propósito:** Gestión de áreas de vida (Salud, Familia, Carrera, Finanzas, Ocio, etc.).

Motor idéntico al de Proyectos: misma estructura de datos, mismos componentes, mismo comportamiento. La diferencia es semántica: los Proyectos son iniciativas con fecha de fin; las Áreas son dimensiones continuas de la vida sin fecha de expiración.

---

### 9. Cursos

**Propósito:** Seguimiento de aprendizaje organizado por módulos y tareas.

Motor idéntico al de Proyectos + Áreas con la adición de **categorías de curso** (definidas en Configuración → Categorías → Cursos). Cada curso puede asignarse a una categoría (ej. Diseño, Programación, Idiomas, Finanzas).

---

### 10. Fitness

**Propósito:** Seguimiento de entrenamiento físico y plan de alimentación.

**Entidad: Rutina**
```
{
  id: string,
  nombre: string,
  estado: 'activo' | 'descanso',
  dias: [0..6] (índices de día de la semana, Lunes=0),
  etiquetas: [string],
  ejercicios: [Ejercicio],
  enlaces: [{ titulo, url }],
  archivada: boolean
}
```

**Entidad: Ejercicio**
```
{
  id: string,
  nombre: string,
  series: number,
  repeticiones: number,
  peso: number,
  imagenes: [string] (URLs de Firebase Storage, máx 2),
  seriesCompletadas: [boolean]
}
```

**Entidad: Registro de Entrenamiento**
```
{
  id: string,
  rutinaId: string,
  rutinaNombre: string,
  fecha: string,
  seriesCompletadas: number,
  totalSeries: number
}
```

**Entidad: Comida**
```
{
  id: string,
  tipo: string,
  hora: string,
  descripcion: string,
  calorias: number,
  proteinas: number,
  carbohidratos: number,
  grasas: number
}
```

**Funcionalidades:**

*Calendario semanal:*
- Vista de 7 días navegable semana a semana
- Días con rutina asignada muestran punto de color
- Indicador de racha de entrenamiento (🧊/🏃/🔥/⚡)

*Rutinas:*
- Crear rutina con nombre y estado
- Asignar a días de la semana (botones L/M/X/J/V/S/D toggle)
- Agregar etiquetas/categorías a la rutina
- Agregar ejercicios con nombre, series, repeticiones y peso
- Tracker de series: checkbox numerado por cada serie de cada ejercicio
- Subir hasta 2 imágenes de referencia por ejercicio (a Firebase Storage)
- Barra de progreso de la sesión: series completadas / total de series
- "Registrar Entrenamiento" → guarda registro en historial + resetea checkboxes
- Adjuntar enlaces de referencia (videos, guías)
- Archivar/desarchivar rutinas
- Historial de entrenamientos (tabla con fecha, rutina, series completadas)

*Plan de Alimentación:*
- Registrar comidas con tipo, hora, descripción y macros
- Macros con etiquetas de color: Proteína (azul) / Carbohidratos (amarillo) / Grasas (naranja)

*IMC:*
- Calculado automáticamente desde peso y estatura de Configuración
- Gauge visual con marcador de posición
- Clasificaciones: Bajo Peso (<18.5) / Peso Saludable (18.5–24.9) / Sobrepeso (25–29.9) / Obesidad (≥30)

**Criterios de aceptación:**
- [ ] Las imágenes de ejercicios se suben a Firebase Storage y la URL se guarda en Firestore
- [ ] "Registrar Entrenamiento" solo está activo si hay al menos una serie completada
- [ ] El historial muestra % de completitud de la sesión (series completadas / total)
- [ ] El IMC se actualiza si el usuario modifica peso o estatura en Configuración

---

### 11. Configuración

**Propósito:** Centraliza los ajustes personales que alimentan a los demás módulos.

**Secciones:**

| Sección | Campos |
|---|---|
| Perfil Personal | nombre, apellido, correo, teléfono, RUT, ocupación, dirección, foto de avatar |
| Datos Bancarios | tarjetas de crédito (banco, tipo, últimos 4 dígitos, cupo total) |
| Salud y Físico | peso, estatura, tipo de sangre, alergias, condiciones médicas |
| Categorías | categoriasIngreso[], categoriasEgreso[], categoriasCursos[] |
| Notificaciones | toggles por módulo |

**Avatar:**
- El usuario puede subir una imagen → se sube a Firebase Storage en `avatares/{uid}`
- La URL de descarga se guarda en el documento raíz del usuario en Firestore

**Tarjetas de crédito:**
- Se guardan como array en el documento raíz: `tarjetas: [{ id, banco, tipo, digitos, cupoTotal }]`
- La barra de uso = (egresosAsignadosATarjeta / cupoTotal) × 100%

**Criterios de aceptación:**
- [ ] Los cambios de categorías se reflejan inmediatamente en los selects de Finanzas y Cursos
- [ ] La foto de avatar se muestra en el perfil y en la barra de navegación
- [ ] Agregar/eliminar tarjetas actualiza la lista disponible en el módulo de Finanzas

---

## Estados de datos compartidos (App.jsx)

Los siguientes datos se cargan en `App.jsx` al autenticar y se pasan como props a los módulos:

```javascript
user              // objeto de Firebase Auth
userName          // string: nombre del usuario
avatarUrl         // string: URL de la imagen de avatar
categoriasIngreso // string[]
categoriasEgreso  // string[]
categoriasCursos  // string[]
tarjetas          // array de tarjetas de crédito
peso              // number
estatura          // number
```

Todos estos datos se sincronizan con `onSnapshot` en el documento raíz del usuario.

---

## Patrones de implementación

### Patrón CRUD estándar por módulo

1. `onSnapshot` para lectura en tiempo real (se monta al cargar el componente)
2. `addDoc` para crear entidades nuevas
3. `updateDoc` para modificar entidades existentes
4. `deleteDoc` para eliminaciones permanentes
5. Para archivado: `updateDoc` con `{ archivada: true }`

### Patrón optimistic UI para campos de texto

- `onChange` → actualiza estado local de React (inmediato, sin latencia)
- `onBlur` → persiste en Firestore (`updateDoc`)

### Patrón de modales

- Estado `showModal: boolean` local al componente
- El modal se renderiza inline en el JSX del componente con clase `modal-overlay`
- Cierre con clic en el overlay o botón X

### Patrón de arrays anidados en Firestore

Los sub-arrays (tareas, enlaces, subCategorias) se reescriben completos en cada update:
```javascript
await updateDoc(ref, { tareas: nuevasTodasLasTareas })
```
No se usan operaciones `arrayUnion` / `arrayRemove` para mantener consistencia de orden.
