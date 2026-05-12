# Soma OS — Contenido para Redes Sociales

## Concepto de marca

**Tagline principal:** "Tu sistema operativo personal. Todo lo que eres, en un solo lugar."
**Tono:** Minimalista, reflexivo, orientado al crecimiento personal. No es una app de productividad genérica — es una herramienta para personas que toman en serio el diseño de su propia vida.
**Paleta de referencia:** Fondo oscuro · Púrpura (#A292C5) · Naranja (#F07F12) · Amarillo (#FDC815)

---

## POST 1 — Presentación general

**Formato:** Imagen única / Reel de 15s

**Copy:**

> Tenía 6 apps distintas para gestionar mi vida.
> Una para las finanzas, otra para los hábitos, otra para los proyectos...
> Ninguna se comunicaba entre sí.
>
> Así que construí una sola.
>
> Soma OS: proyectos, finanzas, hábitos, fitness, cursos, notas y áreas de vida — todo sincronizado en tiempo real, todo en un mismo lugar.
>
> Gratis. En el navegador. Sin descargas.
> 👉 [link en bio]
>
> #ProductividadPersonal #DesarrolloPersonal #SistemaDeVida #ReactJS #Firebase #SideProject

**Texto alternativo (versión corta para stories):**
> Dejé de usar 6 apps diferentes.
> Construí una sola que lo hace todo.
> Soma OS →

---

## POST 2 — El Dashboard

**Formato:** Carrusel (slide por módulo mostrado en el dashboard)

**Slide 1 — Portada:**
> "¿Qué tan consciente eres de cómo vives tu año?"

**Slide 2 — Actividad Anual:**
> 371 días. 53 semanas.
> Un solo gráfico que te muestra en qué días fuiste productivo y en cuáles no.
>
> Inspirado en el contribution graph de GitHub,
> pero aplicado a tu vida real.
> Cada clic = un nivel más de actividad.

**Slide 3 — Resumen Financiero:**
> Al abrir la app cada mañana ya sabes:
> — Tu balance acumulado
> — Lo que ingresó este mes
> — Lo que gastaste
> — Lo que vas ahorrando
>
> Sin abrir otra app. Sin exportar Excel.

**Slide 4 — Hábitos de Hoy:**
> Los hábitos de hoy, visibles desde el inicio.
> Sin ir a otra pantalla.
> Sin excusas para no marcarlos.

**Slide 5 — Proyectos Activos:**
> Cada proyecto con su barra de progreso.
> Calculado automáticamente desde las tareas completadas.
> De 0% a 100%, sin subjetividad.

**Slide 6 — CTA:**
> Soma OS es gratuito y corre en el navegador.
> No necesitas instalarlo.
> Solo iniciar sesión y empezar a construir tu sistema.
> 👉 [link en bio]

---

## POST 3 — Módulo Finanzas

**Formato:** Carrusel 4 slides

**Slide 1:**
> Tu dinero merece un sistema, no solo una lista.

**Slide 2:**
> En Finanzas puedes:
> ✅ Registrar ingresos y gastos con categorías propias
> ✅ Asignar gastos directamente a una tarjeta de crédito
> ✅ Ver el cupo disponible de cada tarjeta en tiempo real
> ✅ Crear metas de ahorro con historial de abonos
> ✅ Armar tu lista de deseos con cuotas y link a la tienda

**Slide 3:**
> La Lista de Deseos es mi funcionalidad favorita.
>
> Registras el producto, divides el precio en cuotas mensuales
> y marcas cada cuota conforme la pagas.
> Cuando todas están marcadas: completado.
>
> Es básicamente un plan de compra responsable integrado a tu sistema de vida.

**Slide 4:**
> Sin suscripciones. Sin limitaciones.
> Tus datos son tuyos — en Firestore, aislados por usuario.

---

## POST 4 — Módulo Hábitos

**Formato:** Reel 20–30s o carrusel 3 slides

**Copy principal:**
> El seguimiento de hábitos que realmente funciona
> no es el que tiene más funciones.
> Es el que ves todos los días.
>
> En Soma OS, la tabla semanal de hábitos está a un clic del dashboard.
> 7 días × N hábitos. Un checkbox por combinación.
>
> Y al final de la semana, un gráfico de curva suavizada
> te muestra cómo fue tu consistencia día a día.
>
> No para juzgarte. Para que puedas ajustar.

**Slides:**

Slide 1: "La consistencia no se siente, se mide."
Slide 2: Tabla de hábitos con checkboxes — descripción de la mecánica
Slide 3: Gráfico lineal de rendimiento semanal — qué representa cada punto
CTA: "Crea tu primer hábito en menos de 30 segundos."

---

## POST 5 — Módulo Fitness

**Formato:** Carrusel 5 slides

**Slide 1:**
> No necesitas una app de gym.
> Necesitas que tu app de vida también maneje el gym.

**Slide 2:**
> En Fitness encontrarás:
> — Rutinas de entrenamiento con tracker de series
> — Asignación de rutinas a días de la semana
> — Imágenes de referencia por ejercicio
> — Historial de cada entrenamiento registrado

**Slide 3:**
> El tracker de series es simple y efectivo:
> Cada serie es un checkbox numerado.
> Cuando terminas, presionas "Registrar Entrenamiento"
> y el sistema guarda el registro con fecha y % de completitud.

**Slide 4:**
> ¿Come lo que necesitas, no lo que calculas?
> El plan de alimentación registra macros: proteínas, carbohidratos y grasas.
> Visualizados en etiquetas de color para lectura inmediata.

**Slide 5:**
> Tu IMC actualizado automáticamente
> desde los datos de peso y estatura de tu perfil.
> Sin calcular nada manualmente.

---

## POST 6 — Stack tecnológico (post para dev community)

**Formato:** Imagen técnica / Tweet largo

**Copy:**
> Construí Soma OS con este stack:
>
> — React 19 + Vite 8 (SPA ultrarrápida)
> — React Router 7 con HashRouter (compatible con GitHub Pages)
> — Firebase Auth + Firestore + Storage
> — CSS puro (sin frameworks de UI)
> — Deploy automático con gh-pages a GitHub Pages
>
> Todo el estado de colecciones usa onSnapshot → sync en tiempo real.
> El build pesa menos de 500kb gzipped.
> Cero dependencias de UI externas.
>
> ¿La parte más interesante? El calendario de actividad anual:
> calcula el índice correcto del día actual respecto a una cuadrícula que siempre empieza el lunes,
> usando UTC para evitar bugs de zona horaria.
>
> #ReactJS #Firebase #WebDev #OpenSource #Vite

---

## CARRUSEL PRINCIPAL — "8 módulos para diseñar tu vida"

Este es el carrusel más completo, ideal para presentación formal del producto.

**Slide 1 — Portada:**
```
SOMA OS
Tu sistema operativo personal

8 módulos. Una sola app.
Todo sincronizado en la nube.
```

**Slide 2 — Dashboard:**
```
01 / HOME
El centro de mando.
Un vistazo a todo lo que importa:
actividad anual, finanzas, hábitos,
proyectos y más — en una sola pantalla.
```

**Slide 3 — Notas:**
```
02 / NOTAS
Captura sin fricción.
Texto libre + tareas + enlaces externos.
Archiva cuando ya no necesitas verla.
```

**Slide 4 — Finanzas:**
```
03 / FINANZAS
Balance real. Metas concretas. Lista de deseos.
Tus tarjetas de crédito integradas.
Control sin hojas de cálculo.
```

**Slide 5 — Hábitos:**
```
04 / HÁBITOS
La tabla semanal que se convierte
en un gráfico de rendimiento.
Lo que se mide, mejora.
```

**Slide 6 — Proyectos:**
```
05 / PROYECTOS
Fases, tareas, fechas y progreso automático.
Nada se pierde. Todo avanza.
```

**Slide 7 — Fitness:**
```
06 / FITNESS
Rutinas, series, macros e IMC.
Tu cuerpo también es parte del sistema.
```

**Slide 8 — Áreas + Cursos:**
```
07 / ÁREAS DE VIDA
Salud. Familia. Carrera. Finanzas. Ocio.
Cada dimensión con su propio seguimiento.

08 / CURSOS
Tu aprendizaje organizado por módulos,
tareas y progreso real.
```

**Slide 9 — CTA final:**
```
Soma OS es gratuito.
Corre en el navegador.
Tus datos, en la nube, solo tuyos.

Accede en:
wongluiggi-create.github.io/soma-os
```

---

## IDEAS DE REELS / VIDEOS CORTOS

**Idea 1 — "El primer día en Soma OS" (60s)**
- Pantalla: login → dashboard → crear primer hábito → registrar una transacción → crear un proyecto → registrar entrenamiento
- Narración: "Lo primero que hago al abrir Soma OS es revisar el dashboard. En 10 segundos sé cómo va mi mes, qué hábitos me faltan y cuántas tareas tengo pendientes."

**Idea 2 — "Por qué construí mi propio sistema" (30s)**
- Testimonial personal sobre el problema de tener información dispersa en múltiples apps
- "La solución no fue descargar otra app. Fue construir la que necesitaba."

**Idea 3 — "El gráfico de actividad anual" (15s)**
- Zoom al calendario heatmap
- Mostrar cómo se llena el año gradualmente
- "371 celdas. Cada una es un día. Cada clic es una decisión."

**Idea 4 — "Timer Pomodoro siempre visible" (10s)**
- Mostrar cómo el Pomodoro funciona mientras navegas entre módulos
- "El enfoque no se interrumpe cuando cambias de módulo."
