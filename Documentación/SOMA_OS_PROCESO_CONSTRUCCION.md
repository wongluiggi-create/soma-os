# Soma OS — Proceso de Construcción paso a paso

Este documento describe el proceso completo de construcción del proyecto: desde la decisión inicial hasta el deploy en producción.

---

## Fase 0 — Problema y decisión

**El problema:**
Demasiadas apps separadas para gestionar distintas áreas de la vida: Notion para notas y proyectos, una app de finanzas, otra para hábitos, otra para el gym. Ninguna se integraba entre sí, lo que hacía imposible tener una vista general del estado real de la vida en un solo lugar.

**La decisión:**
Construir un sistema propio, con las funcionalidades exactas que se necesitan, sin el peso de plataformas sobredimensionadas. Un sistema operativo personal: Soma OS.

**Criterios de diseño desde el inicio:**
- Un solo login para todo
- Datos en la nube (no locales), accesibles desde cualquier dispositivo
- Interfaz oscura y minimalista
- Sin dependencias de frameworks de UI — CSS propio para control total del diseño
- Deploy gratuito

---

## Fase 1 — Configuración del proyecto base

### 1.1 Inicialización con Vite + React

```bash
npm create vite@latest soma-os -- --template react
cd soma-os
npm install
```

Se eligió **Vite** sobre Create React App por su velocidad de compilación y hot reload. **React 19** es la versión más reciente y estable disponible al momento del desarrollo.

### 1.2 Instalación de dependencias clave

```bash
npm install react-router-dom firebase gh-pages
```

- `react-router-dom` v7: manejo de rutas client-side
- `firebase` v12: autenticación, base de datos y storage
- `gh-pages`: script para publicar en GitHub Pages

### 1.3 Configuración de Vite para GitHub Pages

En `vite.config.js` se configuró el `base` para que los assets usen la ruta correcta del subpath de GitHub Pages:

```js
// vite.config.js
export default defineConfig({
  base: '/soma-os/',
  plugins: [react()],
})
```

Y en `package.json`:

```json
"homepage": "https://wongluiggi-create.github.io/soma-os/",
"scripts": {
  "build": "vite build --base=/soma-os/",
  "predeploy": "npm run build",
  "deploy": "gh-pages -d dist"
}
```

### 1.4 Uso de HashRouter en lugar de BrowserRouter

GitHub Pages no soporta historial HTML5 (no procesa rutas del lado del servidor). La solución es usar **HashRouter**, que mantiene las rutas en el fragmento `#/ruta` de la URL. Esto garantiza que recargar la página o acceder directamente a una ruta funcione correctamente.

```jsx
// App.jsx
import { HashRouter } from 'react-router-dom';

return (
  <HashRouter>
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Home />} />
        <Route path="notas" element={<Notas />} />
        ...
      </Route>
    </Routes>
  </HashRouter>
);
```

---

## Fase 2 — Integración con Firebase

### 2.1 Crear proyecto en Firebase Console

1. Ir a console.firebase.google.com
2. Crear nuevo proyecto: `soma-os`
3. Habilitar los siguientes servicios:
   - **Authentication** (Email/Password)
   - **Cloud Firestore** (base de datos en tiempo real)
   - **Storage** (para imágenes de avatares y ejercicios)

### 2.2 Configurar firebase.js

```js
// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
```

### 2.3 Diseño de la estructura de datos en Firestore

Se decidió usar una arquitectura **por usuario** donde cada `uid` de Firebase Auth es la clave raíz:

```
/usuarios/{uid}/
  transacciones/{txId}
  metas/{metaId}
  deseos/{deseoId}
  notas/{notaId}
  proyectos/{proyectoId}
  areas/{areaId}
  cursos/{cursoId}
  habitos/{habitoId}
  rutinas/{rutinaId}
  comidas/{comidaId}
```

Y campos directamente en el documento raíz del usuario (configuración global):
- `activityGraph` (array de 371 números)
- `nombre`, `avatarUrl`, `peso`, `estatura`
- `categoriasIngreso`, `categoriasEgreso`, `categoriasCursos` (arrays de strings)
- `tarjetas` (array de objetos)

**Decisión clave:** usar `onSnapshot` en lugar de `getDocs` para todos los listeners. Esto permite sincronización en tiempo real sin necesidad de recargar la página cuando se modifican datos.

---

## Fase 3 — Sistema de autenticación y carga inicial

### 3.1 Pantalla de Login

Se construyó un componente `Login.jsx` independiente. Firebase Auth maneja el proceso de autenticación; la app solo necesita llamar a `signInWithEmailAndPassword` o `createUserWithEmailAndPassword`.

### 3.2 Guard de autenticación en App.jsx

```jsx
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
    if (currentUser) {
      setUser(currentUser);
      // Cargar configuración global del usuario desde Firestore
      const docSnap = await getDoc(doc(db, 'usuarios', currentUser.uid));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserName(data.nombre || '');
        setCategoriasIngreso(data.categoriasIngreso || []);
        // ...
      }
    } else {
      setUser(null);
    }
    setLoadingAuth(false);
  });
  return () => unsubscribe();
}, []);
```

Si no hay usuario → `<Login />`. Si hay usuario → `<MainLayout />` con las rutas completas.

---

## Fase 4 — Layout principal y navegación

### 4.1 MainLayout con Outlet

Se usó el patrón de **layout compartido** de React Router: `MainLayout` renderiza la barra de navegación y un `<Outlet />` donde se inyectan los componentes de cada ruta.

```jsx
// MainLayout.jsx
<div className="layout-container">
  <header className="top-navbar">
    <nav>...</nav>
    <div className="pomodoro-widget">...</div>
  </header>
  <main>
    <Outlet />
  </main>
</div>
```

### 4.2 Timer Pomodoro integrado en el layout

El estado del Pomodoro (timeLeft, isActive, mode) vive en `MainLayout`. Esto garantiza que el timer no se reinicie al navegar entre páginas — el timer es persistente durante toda la sesión.

```jsx
// Alternancia automática al llegar a 0
} else if (isActive && timeLeft === 0) {
  setTimeout(() => {
    setIsActive(false);
    if (mode === 'work') {
      setMode('break');
      setTimeLeft(5 * 60);
    } else {
      setMode('work');
      setTimeLeft(25 * 60);
    }
  }, 0);
}
```

### 4.3 Menú responsive con overlay en mobile

En pantallas pequeñas, el navbar horizontal se transforma en un drawer vertical activado con un botón de hamburguesa. Se usa una capa de overlay semitransparente para cerrar el menú al hacer clic fuera de él.

---

## Fase 5 — Construcción módulo por módulo

El orden de construcción siguió la prioridad de uso diario:

### Orden de desarrollo:
1. **Home / Dashboard** — Punto de entrada, define el lenguaje visual de toda la app
2. **Proyectos** — Módulo más complejo. Establece el patrón de tarjetas con subtarjetas, tareas y enlaces que reutilizan otros módulos
3. **Notas** — Simplificación del patrón de Proyectos para notas rápidas
4. **Finanzas** — Módulo independiente con tres sub-secciones (transacciones, metas, deseos)
5. **Hábitos** — Lógica de calendario semanal + SVG chart nativo
6. **Áreas** — Clone del motor de Proyectos con contexto diferente
7. **Cursos** — Clone del motor de Proyectos con categorías adicionales
8. **Fitness** — El más extenso: rutinas, ejercicios, imágenes, alimentación, IMC
9. **Configuración** — Cierre del ciclo: ajustes que alimentan a los otros módulos

### Patrón de desarrollo por módulo:
Cada módulo siguió siempre el mismo flujo:
1. Definir la estructura de datos en Firestore
2. Conectar `onSnapshot` para lectura en tiempo real
3. Construir las funciones CRUD (add, update, delete)
4. Construir la UI: lista/grid de tarjetas + modal de creación
5. Añadir sección de archivados/historial al pie
6. CSS específico del módulo

---

## Fase 6 — Reutilización de estilos CSS

Una decisión importante fue **no usar Tailwind ni ningún framework de UI**. Todos los estilos son CSS puro organizado en archivos por módulo.

### Estrategia de reutilización:
- `Proyectos.css`: contiene los estilos base de tarjetas, modales, botones, progress bars y tabla de archivados. **Todos los módulos importan este archivo** además del suyo propio.
- `Finanzas.css`: grid específico del layout de dos columnas
- `Home.css`: estilos del dashboard y el calendario anual
- `Fitness.css`: estilos de rutinas, ejercicios, IMC gauge y badges de racha
- `Habitos.css`: tabla de hábitos y gráfico SVG lineal

### Variables CSS globales (index.css):
```css
:root {
  --soma-purple: #A292C5;
  --soma-orange: #F07F12;
  --soma-yellow: #FDC815;
  --bg-main: #0D0D0D;
  --text-primary: #E8E8E8;
  --text-secondary: #888;
}
```

Esto permite cambiar el tema completo de la app modificando solo las variables.

---

## Fase 7 — Funcionalidades especiales

### 7.1 Calendario de actividad anual (Home.jsx)

El calendario "GitHub-style" fue una de las piezas más técnicas del proyecto.

**Problema:** El gráfico tiene 53 columnas × 7 filas. El índice 0 debe corresponder siempre al primer Lunes del año (o al Lunes anterior al 1 de enero si el año no empieza en Lunes). Y el día actual debe resaltarse con el índice correcto que además coincida con la fila correcta del eje Y (L=0, M=1, ..., D=6).

**Solución:**
```js
const startOfYear = new Date(todayObj.getFullYear(), 0, 1);
const dayOffset = startOfYear.getDay() === 0 ? 6 : startOfYear.getDay() - 1;
const graphStartDate = new Date(startOfYear);
graphStartDate.setDate(startOfYear.getDate() - dayOffset);

// UTC para evitar bugs de zona horaria
const utcToday = Date.UTC(todayObj.getFullYear(), todayObj.getMonth(), todayObj.getDate());
const utcGraphStart = Date.UTC(graphStartDate.getFullYear(), graphStartDate.getMonth(), graphStartDate.getDate());
const currentDayIndex = Math.floor((utcToday - utcGraphStart) / (1000 * 60 * 60 * 24));
```

El `dayOffset` convierte el día de la semana del formato Sunday=0 (JavaScript) a Monday=0 (formato europeo/español). Usar UTC en ambas fechas elimina cualquier desajuste por cambios de horario de verano.

### 7.2 Gráfico SVG nativo en Hábitos

En lugar de importar una librería de gráficos (Chart.js, Recharts), se construyó un SVG nativo con curvas Bézier cúbicas para suavizar la línea:

```js
smoothLinePath = `M ${coordinates[0].x},${coordinates[0].y}`;
for (let i = 0; i < coordinates.length - 1; i++) {
  const p0 = coordinates[i];
  const p1 = coordinates[i + 1];
  const cpX = (p0.x + p1.x) / 2;
  smoothLinePath += ` C ${cpX},${p0.y} ${cpX},${p1.y} ${p1.x},${p1.y}`;
}
```

El punto de control horizontal en el punto medio crea la curvatura natural. El área bajo la curva usa un gradiente lineal con `linearGradient` definido en `<defs>`.

### 7.3 Autoguardado con patrón local + remote

Para campos de texto editables inline (descripciones, tareas, títulos) se usa el patrón **optimistic UI**:
- `onChange` → actualiza el estado local de React de forma inmediata (sin latencia perceptible)
- `onBlur` → guarda en Firestore cuando el usuario termina de escribir

```jsx
<textarea
  value={nota.descripcion}
  onChange={(e) => updateNotaDescLocal(nota.id, e.target.value)}
  onBlur={(e) => saveNotaDesc(nota.id, e.target.value)}
/>
```

Esto evita hacer una llamada a Firestore por cada tecla presionada.

### 7.4 Subida de imágenes a Firebase Storage

Para los ejercicios de fitness y el avatar del perfil:
1. Un `<input type="file" ref={fileInputRef} style={{display:'none'}} />` oculto
2. Un botón visible que llama a `fileInputRef.current.click()`
3. El handler sube el archivo a Storage, obtiene la URL de descarga y la guarda en Firestore

```js
const storageRef = ref(storage, `fitness/${Date.now()}_${file.name}`);
await uploadBytes(storageRef, file);
const url = await getDownloadURL(storageRef);
```

---

## Fase 8 — Deploy en GitHub Pages

### 8.1 Configuración del repositorio

1. Crear repositorio en GitHub: `soma-os`
2. Conectar el repositorio local: `git remote add origin https://github.com/wongluiggi-create/soma-os.git`

### 8.2 Deploy inicial

```bash
npm run deploy
```

Este comando ejecuta en secuencia:
1. `npm run build` → Vite compila y genera `dist/`
2. `gh-pages -d dist` → Publica el contenido de `dist/` en el branch `gh-pages`

GitHub detecta el branch `gh-pages` y sirve automáticamente su contenido en `https://wongluiggi-create.github.io/soma-os/`.

### 8.3 Actualizaciones posteriores

Cada vez que se modifica el código fuente:
```bash
git add .
git commit -m "descripción del cambio"
git push origin main          # guarda el código fuente
npm run deploy                # actualiza el sitio publicado
```

**Nota importante:** `git push` solo actualiza el repositorio de código fuente. El sitio publicado solo se actualiza con `npm run deploy`.

---

## Fase 9 — Decisiones de arquitectura en retrospectiva

| Decisión | Por qué fue buena | Qué mejoraría |
|---|---|---|
| HashRouter | Compatibilidad total con GitHub Pages sin configuración de servidor | Menos "limpio" que BrowserRouter en las URLs |
| CSS puro sin frameworks | Control total del diseño, cero clases utilitarias, bundle más pequeño | Más trabajo manual para responsive y estados hover |
| onSnapshot en todos los módulos | Sync en tiempo real, UI siempre actualizada | En páginas con muchos módulos (Home) se acumulan varios listeners simultáneos |
| Estructura de datos plana en Firestore | Consultas simples, sin joins | Los arrays anidados (subCategorias, tareas, enlaces) se reescriben completos en cada update |
| Estado global en App.jsx para configuración | Evita fetchs duplicados por módulo | Con más estado se volvería necesario Context API o Zustand |
| Vite 8 + React 19 | Builds ultrarrápidos, HMR instantáneo | Sin SSR, solo SPA |

---

## Resumen técnico final

```
soma-os/
├── index.html
├── vite.config.js
├── package.json
├── public/
│   ├── favicon.svg
│   └── icons.svg
└── src/
    ├── main.jsx          ← punto de entrada, monta <App />
    ├── App.jsx           ← auth guard + router principal
    ├── firebase.js       ← init Firebase (auth, db, storage)
    ├── index.css         ← variables globales + reset
    └── layouts/
        ├── MainLayout.jsx     ← navbar + pomodoro + outlet
        ├── MainLayout.css
        ├── Home.jsx           ← dashboard central
        ├── Home.css
        ├── Notas.jsx
        ├── Finanzas.jsx
        ├── Finanzas.css
        ├── Habitos.jsx
        ├── Habitos.css
        ├── Proyectos.jsx
        ├── Proyectos.css      ← estilos base compartidos
        ├── Areas.jsx
        ├── Cursos.jsx
        ├── Fitness.jsx
        ├── Fitness.css
        ├── Configuracion.jsx
        ├── Configuracion.css
        └── Login.jsx
            Login.css
```

**Tiempo total de construcción estimado:** 3–5 semanas de desarrollo iterativo, comenzando por el módulo de mayor complejidad (Proyectos) y expandiendo el sistema módulo a módulo.
