# Soma OS — Guía de Desarrollo

**Versión:** 1.0  
**Fecha:** 2026-05-23

---

## Entorno de desarrollo

### Requisitos previos
- Node.js 18+
- npm 9+
- Cuenta de Firebase con proyecto `soma-os` configurado

### Setup inicial

```bash
# Clonar el repositorio
git clone https://github.com/wongluiggi-create/soma-os.git
cd soma-os

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

La app queda disponible en `http://localhost:5173`.

### Scripts disponibles

| Script | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | Compilación de producción en `dist/` |
| `npm run deploy` | `build` + publicar en GitHub Pages (rama gh-pages) |
| `npm run lint` | Validación con ESLint |

### Variables de entorno

No se usan variables de entorno (`.env`). Las credenciales de Firebase están directamente en `src/firebase.js`. Esta es una decisión válida para proyectos personales donde el proyecto Firebase tiene reglas de seguridad por UID.

---

## Estructura del proyecto

```
soma-os/
├── index.html
├── vite.config.js          ← base: '/soma-os/' para GitHub Pages
├── package.json
├── eslint.config.js
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── Documentación/          ← docs del proyecto (no se compilan)
└── src/
    ├── main.jsx            ← monta <App /> en el DOM
    ├── App.jsx             ← auth guard + router + estado global
    ├── firebase.js         ← init Firebase: auth, db, storage
    ├── index.css           ← variables CSS globales + reset
    └── layouts/
        ├── MainLayout.jsx  ← navbar + pomodoro + <Outlet />
        ├── MainLayout.css
        ├── Login.jsx
        ├── Login.css
        ├── Home.jsx
        ├── Home.css
        ├── Notas.jsx
        ├── Finanzas.jsx
        ├── Finanzas.css
        ├── Habitos.jsx
        ├── Habitos.css
        ├── Proyectos.jsx
        ├── Proyectos.css   ← estilos base compartidos entre módulos
        ├── Areas.jsx
        ├── Cursos.jsx
        ├── Fitness.jsx
        ├── Fitness.css
        ├── Configuracion.jsx
        ├── Configuracion.css
        └── Tablero.jsx     ← componente kanban (usado en Proyectos/Cursos)
```

---

## Arquitectura

### Flujo de autenticación

```
App.jsx
  └── onAuthStateChanged
        ├── No autenticado → <Login />
        └── Autenticado →
              getDoc(usuarios/{uid})  ← carga config global
              <MainLayout />
                └── <Outlet /> ← cada ruta
```

### Estado global

El estado que comparten múltiples módulos vive en `App.jsx` y se pasa como props:

```jsx
// App.jsx pasa a todos los módulos:
<Route element={<Home
  user={user}
  userName={userName}
  categoriasIngreso={categoriasIngreso}
  categoriasEgreso={categoriasEgreso}
  tarjetas={tarjetas}
  peso={peso}
  estatura={estatura}
/>} />
```

No se usa Context API ni Zustand. Si el estado global crece significativamente, considerar migrar a Context.

### Listeners en tiempo real

Cada módulo abre su propio `onSnapshot` al montarse y lo cierra al desmontarse:

```javascript
useEffect(() => {
  const ref = collection(db, 'usuarios', user.uid, 'notas');
  const unsubscribe = onSnapshot(ref, (snap) => {
    setNotas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
  return () => unsubscribe(); // cleanup al desmontar
}, [user.uid]);
```

---

## Convenciones de código

### Nomenclatura

| Elemento | Convención | Ejemplo |
|---|---|---|
| Componentes | PascalCase | `MainLayout`, `Home` |
| Archivos de componentes | PascalCase.jsx | `Finanzas.jsx` |
| Archivos CSS | PascalCase.css | `Finanzas.css` |
| Funciones de estado | camelCase verbos | `handleAddNota`, `deleteProyecto` |
| Variables de estado | camelCase sustantivos | `notas`, `showModal`, `isActive` |
| IDs de Firestore | auto-generados por `addDoc` | — |

### Manejo de errores

Los bloques `try/catch` alrededor de localStorage no capturan el error (`catch { }` sin parámetro):

```javascript
// Correcto — catch sin parámetro cuando el error no se usa
try {
  localStorage.setItem('clave', valor);
} catch { /* localStorage unavailable */ }

// Incorrecto — ESLint reporta '_e' como unused
try {
  localStorage.setItem('clave', valor);
} catch (_e) { }
```

### Autoguardado de texto

Siempre usar el patrón local + remote para evitar llamadas a Firestore por cada tecla:

```jsx
// Estado local = actualización inmediata
<textarea
  value={itemLocal.descripcion}
  onChange={(e) => setItemLocal(prev => ({ ...prev, descripcion: e.target.value }))}
  onBlur={(e) => updateDoc(ref, { descripcion: e.target.value })}
/>
```

### Actualización de arrays anidados

Los sub-arrays se reescriben completos en cada operación:

```javascript
// Para agregar una tarea a una nota:
const nuevasTareas = [...nota.tareas, { id: Date.now().toString(), texto, completada: false }];
await updateDoc(notaRef, { tareas: nuevasTareas });

// Para marcar una tarea:
const nuevasTareas = nota.tareas.map(t => t.id === tareaId ? { ...t, completada: !t.completada } : t);
await updateDoc(notaRef, { tareas: nuevasTareas });
```

---

## Sistema de estilos CSS

### Variables globales (`index.css`)

```css
:root {
  --soma-dark: #32373b;
  --soma-orange: #f07f12;
  --soma-purple: #a292c5;
  --soma-yellow: #fdc815;
  --bg-main: #222528;
  --text-primary: #ffffff;
  --text-secondary: #b0b3b8;
}
```

### Jerarquía de importación de CSS

Todos los módulos importan `Proyectos.css` como base compartida más su propio CSS:

```javascript
// En Areas.jsx:
import './Proyectos.css'; // estilos base de tarjetas, modales, botones
// Areas no tiene Areas.css propio, hereda todo de Proyectos.css

// En Cursos.jsx:
import './Proyectos.css'; // base compartida
// Cursos tampoco tiene CSS propio

// En Fitness.jsx:
import './Proyectos.css'; // base compartida
import './Fitness.css';   // estilos específicos de rutinas, IMC, etc.
```

### Fuente tipográfica

Grift (Latinotype) — cargada localmente desde `index.css` con múltiples pesos (100–900) e itálicas.

### Responsive

El breakpoint principal es `768px`. En mobile:
- El navbar horizontal se convierte en drawer vertical
- Los grids de tarjetas pasan de 3 columnas a 1 columna
- El widget Pomodoro se simplifica

---

## Cómo agregar un nuevo módulo

### 1. Crear el componente
```bash
# En src/layouts/:
NuevoModulo.jsx
NuevoModulo.css  # si necesita estilos propios
```

### 2. Agregar la ruta en App.jsx
```jsx
import NuevoModulo from './layouts/NuevoModulo';

// Dentro del Route de MainLayout:
<Route path="nuevo-modulo" element={<NuevoModulo user={user} />} />
```

### 3. Agregar el ítem al menú en MainLayout.jsx
```javascript
const menuItems = [
  // ... ítems existentes
  { path: '/nuevo-modulo', label: 'Nuevo Módulo' },
];
```

### 4. Definir la colección en Firestore
```javascript
// En NuevoModulo.jsx:
const colRef = collection(db, 'usuarios', user.uid, 'nuevo-modulo');

useEffect(() => {
  const unsubscribe = onSnapshot(colRef, (snap) => {
    setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
  return () => unsubscribe();
}, [user.uid]);
```

### 5. Importar estilos base
```javascript
import './Proyectos.css'; // hereda tarjetas, modales, botones
import './NuevoModulo.css'; // estilos específicos si son necesarios
```

---

## Deploy

### Flujo de actualización

```bash
# 1. Guardar cambios en el repositorio
git add src/layouts/NuevoModulo.jsx
git commit -m "feat: agregar módulo NuevoModulo"
git push origin main

# 2. Publicar en GitHub Pages
npm run deploy
```

`npm run deploy` ejecuta internamente:
1. `vite build --base=/soma-os/` → genera `dist/`
2. `gh-pages -d dist` → publica `dist/` en la rama `gh-pages`

GitHub Pages sirve automáticamente la rama `gh-pages`.

### Por qué HashRouter

GitHub Pages no tiene servidor que procese rutas HTML5. Si el usuario accede directamente a `https://...github.io/soma-os/#/finanzas` y recarga, GitHub Pages sirve el `index.html` raíz y el HashRouter de React maneja el fragmento `#/finanzas` en el cliente.

Con BrowserRouter, acceder directamente a `/finanzas` daría 404 en GitHub Pages.

---

## Debugging frecuente

### Los cambios no aparecen en el sitio publicado
`git push` solo actualiza el código fuente. Ejecutar `npm run deploy` para actualizar el sitio.

### El heatmap de actividad anual está desfasado
El índice se calcula con UTC para evitar bugs de zona horaria. Si hay desfase, verificar que ambos lados del cálculo usen `Date.UTC()`:
```javascript
const utcHoy = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
const utcInicio = Date.UTC(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
const indice = Math.floor((utcHoy - utcInicio) / 86400000);
```

### ESLint: 'variable' is defined but never used
En bloques `catch`, eliminar el parámetro de error si no se usa:
```javascript
// Antes:  catch (_e) { }
// Después: catch { }
```

### Firebase: Permission denied
Verificar que el usuario esté autenticado (`user` no es null) antes de hacer lecturas/escrituras. Todos los paths de Firestore deben incluir el UID del usuario autenticado.

---

## Decisiones de arquitectura (registro histórico)

| Decisión | Alternativa descartada | Razón |
|---|---|---|
| HashRouter | BrowserRouter | GitHub Pages no soporta rutas del lado del servidor |
| CSS puro | Tailwind / MUI | Control total del diseño, bundle más pequeño, cero clases utilitarias |
| `onSnapshot` universal | `getDocs` + polling | Sync en tiempo real sin recargar, UX más fluida |
| Arrays anidados en Firestore | Subcolecciones por tarea | Consultas más simples; el volumen es manejable para uso personal |
| Estado global en App.jsx | Context API / Zustand | Suficiente para la cantidad actual de estado compartido |
| SVG nativo para gráficos | Chart.js / Recharts | Cero dependencias adicionales, control total del render |
| No separar componentes reutilizables | Atomic Design | Velocidad de desarrollo; refactorizar cuando sea necesario |
