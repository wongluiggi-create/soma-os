# Soma OS — Guía de Usuario y Resumen Ejecutivo

## ¿Qué es Soma OS?

Soma OS es un sistema operativo personal de gestión de vida completo, construido como aplicación web. Su nombre evoca la idea de un "OS" (sistema operativo) para el ser humano: un único lugar donde administrar proyectos, finanzas, hábitos, aprendizaje, notas, áreas de vida y estado físico. Todos los datos se sincronizan en tiempo real con Firebase, lo que significa que la información está disponible desde cualquier dispositivo con navegador.

**URL pública:** https://wongluiggi-create.github.io/soma-os/

---

## Resumen Ejecutivo

| Aspecto | Detalle |
|---|---|
| Tipo | Progressive Web App (SPA) |
| Autenticación | Firebase Auth (Google / Email) |
| Base de datos | Cloud Firestore (tiempo real) |
| Almacenamiento | Firebase Storage (imágenes) |
| Deploy | GitHub Pages (rama gh-pages) |
| Stack | React 19 + Vite 8 + React Router 7 |

Soma OS integra 8 módulos funcionales bajo un único login, con datos completamente aislados por usuario. No es una app de plantillas: cada registro se guarda en la nube y persiste entre sesiones y dispositivos.

---

## Cómo empezar

### 1. Acceder a la aplicación
Visita la URL pública o clona el repositorio y ejecuta `npm run dev` para el entorno local.

### 2. Crear una cuenta o iniciar sesión
La pantalla de Login es la puerta de entrada. Ingresa tus credenciales (email + contraseña). Firebase valida la sesión de forma automática; si ya iniciaste sesión antes, la aplicación te redirige directamente al Dashboard.

### 3. Configurar tu perfil (recomendado antes de usar los módulos)
Ve a **Configuración** (ícono de engranaje en la barra superior) y completa:
- **Perfil Personal**: nombre, apellido, correo, teléfono, RUT, ocupación, foto de avatar
- **Datos Bancarios**: registra tus tarjetas de crédito (banco, tipo, últimos dígitos, cupo total)
- **Salud y Físico**: ingresa peso y estatura para activar el cálculo de IMC
- **Categorías de Finanzas**: define tus propias etiquetas de ingresos y gastos
- **Notificaciones**: activa o desactiva alertas por módulo

---

## Módulos del sistema

### Dashboard (Home)
La pantalla principal concentra un resumen ejecutivo de todos los módulos:

- **Saludo dinámico** con el nombre del usuario y la fecha actual
- **Tareas Pendientes totales** (contador que suma todas las tareas incompletas de todos los módulos)
- **Actividad Anual**: calendario de contribución visual (estilo GitHub) de 53 semanas. Cada celda representa un día; puedes hacer clic para escalar el nivel de actividad (0–4). El día actual se resalta con un borde naranja. El porcentaje general refleja el promedio de actividad del año.
- **Resumen Financiero**: balance total, ingresos y egresos del mes actual, total ahorrado
- **Notas Recientes**: últimas 5 notas activas
- **Proyectos Activos**: barra de progreso por proyecto (máximo 5 en pantalla de escritorio)
- **Metas de Ahorro**: progreso de cada meta económica
- **Racha de Entrenamiento**: indicador visual con íconos (🧊 sin racha → 🏃 inicio → 🔥 media → ⚡ alta)
- **Hábitos de Hoy**: lista con checkbox para marcar hábitos completados del día
- **Balance de Áreas**: progreso de las áreas de vida activas

El Timer Pomodoro (🍅 25 min trabajo / ☕ 5 min descanso) está siempre visible en la barra de navegación superior y funciona en todas las páginas.

---

### Notas
Captura y organiza ideas, apuntes y listas de tareas.

**Funcionalidades:**
- Crear notas con título y apunte inicial
- Editar el título mediante botón de lápiz
- Área de texto libre que se guarda automáticamente al perder el foco (onBlur)
- Checklist de tareas dentro de cada nota (agregar, completar, editar texto)
- Adjuntar enlaces externos (título + URL)
- Archivar notas (se mueven a la tabla "Notas Archivadas" al pie de la página)
- Eliminar notas permanentemente
- Desarchivar notas desde la tabla histórica

**Flujo típico:**
1. Clic en "Nueva Nota" → ingresar título → guardar
2. Escribir en el área de texto → salir del campo para guardar
3. Agregar tareas individuales con checkbox
4. Adjuntar links de referencia
5. Archivar cuando ya no es relevante en el día a día

---

### Finanzas
Control completo de ingresos, gastos, ahorros y deseos de compra.

**Funcionalidades:**

**Transacciones:**
- Registrar ingresos o gastos con monto, descripción, categoría y fecha
- Categorías personalizables desde Configuración
- Soporte de tarjetas de crédito: al seleccionar una tarjeta como categoría de un egreso, se descuenta del cupo disponible automáticamente
- Eliminar transacciones individuales
- Lista ordenada por fecha (más reciente primero)

**Metas de Ahorro:**
- Crear una meta con nombre y monto objetivo
- Abonar fondos en cualquier momento (cada abono queda registrado en el historial)
- Barra de progreso visual
- Historial de abonos desplegable por meta
- Eliminar metas

**Lista de Deseos:**
- Registrar productos/experiencias con nombre, modelo, URL de tienda y precio
- Dividir el precio en cuotas mensuales (calcula automáticamente la cuota mensual)
- Marcar cuotas pagadas (checkbox por cuota)
- La tarjeta se marca como "completada" cuando todas las cuotas están pagadas
- Enlace directo a la tienda online

**Panel de resumen:**
Balance total acumulado | Ingresos del período | Gastos del período | Total ahorrado

---

### Hábitos
Sistema de seguimiento semanal con visualización gráfica de rendimiento.

**Funcionalidades:**
- Crear hábito con nombre y contexto/motivación
- Vista de tabla semanal: columnas son los 7 días (L–D), filas son los hábitos
- Checkbox por cada combinación hábito × día
- Navegar semanas pasadas y futuras con botones ← → 
- Botón "Semana del X" para volver a la semana actual
- El día de hoy se resalta visualmente en la tabla
- Gráfico lineal con curva Bézier suavizada que muestra el % de hábitos completados por día en la semana visible
- Eliminar hábito (pide confirmación)

**Lectura del gráfico:**
El eje Y implícito va de 0% a 100%. Cada punto es el porcentaje de hábitos completados ese día. Un día con todos los hábitos marcados estará en la parte superior de la curva.

---

### Proyectos
Gestión visual de iniciativas con fases, tareas y seguimiento de fechas.

**Funcionalidades:**
- Crear proyecto con título, estado inicial y fechas de inicio/fin
- Estados: En Progreso / Pausado / Completado (cambiable con selector inline)
- Barra de progreso general calculada como promedio del progreso de todas las subfases
- Fechas editables inline directamente en la tarjeta
- **Subtarjetas (fases del proyecto):** cada proyecto puede tener múltiples subfases con:
  - Título editable inline
  - Área de descripción/notas con autoguardado
  - Lista de tareas con checkbox
  - Enlaces adjuntos (título + URL)
  - Fechas propias de inicio y fin
  - Collapse/expand con botón +/−
  - Los enlaces guardados se muestran como ícono 📎 en el encabezado colapsado
- Archivar proyecto (se mueve al historial)
- Eliminar proyecto permanentemente
- Historial de proyectos archivados en tabla con progreso y estado

**Flujo típico:**
1. Crear proyecto → asignar fechas
2. Agregar Subtarjeta para cada fase (ej. Investigación, Diseño, Desarrollo)
3. Expandir cada subfase → agregar tareas y links relevantes
4. El progreso se calcula solo

---

### Áreas
Idéntico en estructura a Proyectos, diseñado para gestionar áreas de vida (Salud, Familia, Carrera, Finanzas personales, etc.) en lugar de iniciativas puntuales.

Mismas funcionalidades: subfases con tareas, fechas, enlaces, progreso automático, archivo, historial.

---

### Cursos
Módulo de seguimiento de aprendizaje, con el mismo motor visual que Proyectos y Áreas. Agrega soporte de categorías de curso (definidas en Configuración → Categorías) para clasificar el contenido (ej. Diseño, Programación, Idiomas).

---

### Fitness
Seguimiento de entrenamiento físico y plan de alimentación.

**Funcionalidades:**

**Calendario Semanal:**
- Vista de 7 días navegable semana a semana
- Los días donde una rutina está asignada muestran un punto de color
- Indicador de racha de entrenamiento

**Rutinas de Entrenamiento:**
- Crear rutina con nombre y estado (activo / descanso)
- Asignar la rutina a días de la semana específicos (botones L/M/M/J/V/S/D que se activan/desactivan)
- Añadir etiquetas/categorías a la rutina (ej. Gym, Cardio, Casa)
- Agregar ejercicios con: nombre, series, repeticiones y peso
- Tracker de series por ejercicio (checkbox por serie numerada)
- Subir hasta 2 imágenes de referencia por ejercicio (se almacenan en Firebase Storage)
- Barra de progreso de la sesión actual (series completadas / total)
- Botón "Registrar Entrenamiento" que guarda el registro en el historial y resetea el tracker
- Adjuntar enlaces de referencia (videos, guías)
- Archivar/desarchivar rutinas
- Historial de entrenamientos en tabla (fecha, rutina, series completadas)

**Plan de Alimentación:**
- Registrar comidas con: tipo, hora, descripción, calorías, proteínas, carbohidratos y grasas
- Visualización de macros con etiquetas de color (Proteína azul / Carbohidratos amarillo / Grasas naranja)

**IMC (Índice de Masa Corporal):**
- Calculado automáticamente desde los datos de peso y estatura ingresados en Configuración
- Gauge visual con marcador de posición
- Clasificación: Bajo Peso / Peso Saludable / Sobrepeso / Obesidad
- Gráfico de relación estatura/peso (barras verticales)

**Gráfico Volumen Semanal:**
- Curva suavizada en naranja que proyecta el volumen de entrenamiento de los últimos 7 días (actualmente con datos base en cero, se activa con registros reales)

---

### Configuración
Panel de ajustes dividido en 5 secciones:

| Sección | Qué permite hacer |
|---|---|
| Perfil Personal | Nombre, apellido, correo, teléfono, RUT, ocupación, dirección, foto de avatar (sube a Firebase Storage) |
| Datos Bancarios | Registrar tarjetas de crédito (banco, tipo, dígitos, cupo) con barra de uso |
| Salud y Físico | Peso, estatura, tipo de sangre, alergias, condiciones médicas + gráfico IMC |
| Categorías de Finanzas | Crear y eliminar categorías de ingresos, gastos y cursos |
| Notificaciones | Toggles para alertas de cada módulo |

---

## Timer Pomodoro (barra de navegación)

Siempre visible en la esquina superior derecha:
- Modo Trabajo: 🍅 25 minutos
- Modo Descanso: ☕ 5 minutos
- Alterna automáticamente al terminar cada período
- Botón Play/Pausa y botón de Reset (cuadrado)
- Se ilumina cuando está activo

---

## Arquitectura de datos (Firebase)

Cada usuario tiene su propio nodo `/usuarios/{uid}` en Firestore con las siguientes colecciones:

```
/usuarios/{uid}
  ├── transacciones/
  ├── metas/
  ├── deseos/
  ├── notas/
  ├── proyectos/
  ├── areas/
  ├── cursos/
  ├── habitos/
  ├── rutinas/
  ├── comidas/
  └── [campos del documento raíz]
        activityGraph[]
        nombre, avatarUrl
        categoriasIngreso[], categoriasEgreso[], categoriasCursos[]
        tarjetas[]
        peso, estatura
```

Todos los listeners usan `onSnapshot` para sincronización en tiempo real: cualquier cambio en Firebase se refleja en la UI sin recargar la página.

---

## Preguntas frecuentes

**¿Por qué los cambios no aparecen en el sitio publicado?**
Debes ejecutar `npm run deploy` después de cada modificación al código. Esto reconstruye la app y actualiza el branch `gh-pages`.

**¿Los datos son privados?**
Sí. Firestore usa reglas de seguridad por UID; solo el usuario autenticado puede leer y escribir sus datos.

**¿Funciona en móvil?**
Sí. El layout es responsive. En pantallas pequeñas el menú de navegación se convierte en un drawer lateral accesible con el botón de hamburguesa.

**¿Puedo usar la app sin conexión?**
No actualmente. Requiere conexión a internet para sincronizar con Firebase.
