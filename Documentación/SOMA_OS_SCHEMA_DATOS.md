# Soma OS — Schema de Datos (Firestore)

**Versión:** 1.0  
**Fecha:** 2026-05-23

---

## Estructura general

```
Firestore
└── usuarios/
    └── {uid}/                    ← documento raíz del usuario
        ├── [campos del perfil]   ← almacenados directamente en el documento raíz
        ├── transacciones/
        ├── metas/
        ├── deseos/
        ├── notas/
        ├── proyectos/
        ├── areas/
        ├── cursos/
        ├── habitos/
        ├── rutinas/
        └── comidas/
```

Todos los datos de un usuario viven dentro de `/usuarios/{uid}`. Las reglas de seguridad de Firestore garantizan que solo el usuario autenticado con ese UID puede leer y escribir sus datos.

---

## Documento raíz del usuario

**Path:** `/usuarios/{uid}`

| Campo | Tipo | Descripción |
|---|---|---|
| `nombre` | `string` | Nombre del usuario |
| `apellido` | `string` | Apellido |
| `correo` | `string` | Email de contacto |
| `telefono` | `string` | Teléfono |
| `rut` | `string` | RUT / documento de identidad |
| `ocupacion` | `string` | Ocupación profesional |
| `direccion` | `string` | Dirección |
| `avatarUrl` | `string` | URL de imagen en Firebase Storage |
| `peso` | `number` | Peso en kg |
| `estatura` | `number` | Estatura en cm |
| `tipoSangre` | `string` | Tipo de sangre (ej. "O+") |
| `alergias` | `string` | Texto libre de alergias |
| `condicionesMedicas` | `string` | Texto libre de condiciones |
| `categoriasIngreso` | `string[]` | Categorías de ingresos financieros |
| `categoriasEgreso` | `string[]` | Categorías de egresos financieros |
| `categoriasCursos` | `string[]` | Categorías de cursos de aprendizaje |
| `tarjetas` | `Tarjeta[]` | Tarjetas de crédito registradas |
| `activityGraph` | `number[]` | Array de 371 enteros (0–4), una celda por día del año |
| `notificaciones` | `object` | Mapa de módulo → boolean para alertas |

### Tipo: Tarjeta
```typescript
{
  id: string;          // UUID generado en el cliente
  banco: string;       // Nombre del banco
  tipo: string;        // "Visa" | "Mastercard" | "Amex" | etc.
  digitos: string;     // Últimos 4 dígitos
  cupoTotal: number;   // Cupo total en la moneda local
}
```

---

## Colección: transacciones

**Path:** `/usuarios/{uid}/transacciones/{txId}`

| Campo | Tipo | Descripción |
|---|---|---|
| `tipo` | `'ingreso' \| 'egreso'` | Tipo de movimiento |
| `monto` | `number` | Monto en moneda local |
| `descripcion` | `string` | Descripción del movimiento |
| `categoria` | `string` | Categoría (de categoriasIngreso o categoriasEgreso) |
| `tarjetaId` | `string \| null` | ID de tarjeta (solo egresos con tarjeta) |
| `fecha` | `string` | Fecha en formato `YYYY-MM-DD` |
| `creadoEn` | `Timestamp` | Timestamp de creación |

**Índices sugeridos:**
- `fecha` DESC para ordenar cronológicamente

---

## Colección: metas

**Path:** `/usuarios/{uid}/metas/{metaId}`

| Campo | Tipo | Descripción |
|---|---|---|
| `nombre` | `string` | Nombre de la meta de ahorro |
| `objetivo` | `number` | Monto objetivo a alcanzar |
| `abonos` | `Abono[]` | Historial de abonos realizados |
| `creadoEn` | `Timestamp` | Timestamp de creación |

### Tipo: Abono
```typescript
{
  monto: number;
  fecha: string;   // YYYY-MM-DD
  nota: string;
}
```

**Computed (cliente):**
- `totalAhorrado` = suma de `abonos[].monto`
- `progreso` = `totalAhorrado / objetivo * 100`

---

## Colección: deseos

**Path:** `/usuarios/{uid}/deseos/{deseoId}`

| Campo | Tipo | Descripción |
|---|---|---|
| `nombre` | `string` | Nombre del producto/experiencia |
| `modelo` | `string` | Modelo o versión específica |
| `url` | `string` | URL de la tienda |
| `precio` | `number` | Precio total |
| `cuotas` | `number` | Número de cuotas mensuales |
| `cuotasPagadas` | `boolean[]` | Array de longitud = `cuotas` |
| `creadoEn` | `Timestamp` | Timestamp de creación |

**Computed (cliente):**
- `cuotaMensual` = `precio / cuotas`
- `completado` = `cuotasPagadas.every(Boolean)`

---

## Colección: notas

**Path:** `/usuarios/{uid}/notas/{notaId}`

| Campo | Tipo | Descripción |
|---|---|---|
| `titulo` | `string` | Título de la nota |
| `descripcion` | `string` | Contenido de texto libre |
| `tareas` | `Tarea[]` | Lista de tareas con checkbox |
| `enlaces` | `Enlace[]` | Lista de URLs adjuntas |
| `archivada` | `boolean` | Si está en el historial |
| `creadoEn` | `Timestamp` | Timestamp de creación |

### Tipo: Tarea
```typescript
{
  id: string;
  texto: string;
  completada: boolean;
}
```

### Tipo: Enlace
```typescript
{
  titulo: string;
  url: string;
}
```

---

## Colección: proyectos

**Path:** `/usuarios/{uid}/proyectos/{proyectoId}`

| Campo | Tipo | Descripción |
|---|---|---|
| `titulo` | `string` | Título del proyecto |
| `estado` | `'En Progreso' \| 'Pausado' \| 'Completado'` | Estado actual |
| `fechaInicio` | `string` | Fecha de inicio `YYYY-MM-DD` |
| `fechaFin` | `string` | Fecha de fin `YYYY-MM-DD` |
| `archivado` | `boolean` | Si está en el historial |
| `subCategorias` | `SubCategoria[]` | Fases del proyecto |
| `creadoEn` | `Timestamp` | Timestamp de creación |

### Tipo: SubCategoria
```typescript
{
  id: string;
  titulo: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  tareas: Tarea[];
  enlaces: Enlace[];
  colapsada: boolean;
}
```

**Computed (cliente):**
- `progreso_subfase` = `tareas.filter(t => t.completada).length / tareas.length * 100`
- `progreso_proyecto` = promedio de `progreso_subfase` de todas las subfases

---

## Colección: areas

**Path:** `/usuarios/{uid}/areas/{areaId}`

Schema idéntico al de `proyectos`. La diferencia es semántica: las áreas representan dimensiones continuas de vida, no iniciativas con fecha de fin.

---

## Colección: cursos

**Path:** `/usuarios/{uid}/cursos/{cursoId}`

Schema idéntico al de `proyectos` con campo adicional:

| Campo | Tipo | Descripción |
|---|---|---|
| `categoria` | `string` | Categoría del curso (de `categoriasCursos`) |

---

## Colección: habitos

**Path:** `/usuarios/{uid}/habitos/{habitoId}`

| Campo | Tipo | Descripción |
|---|---|---|
| `nombre` | `string` | Nombre del hábito |
| `contexto` | `string` | Motivación o contexto del hábito |
| `registros` | `{ [fechaISO: string]: boolean }` | Mapa fecha → completado |
| `creadoEn` | `Timestamp` | Timestamp de creación |

**Formato de clave en `registros`:** `YYYY-MM-DD` (ISO 8601)

**Ejemplo:**
```json
{
  "nombre": "Meditar",
  "contexto": "Para reducir el estrés",
  "registros": {
    "2026-05-19": true,
    "2026-05-20": false,
    "2026-05-21": true
  }
}
```

---

## Colección: rutinas

**Path:** `/usuarios/{uid}/rutinas/{rutinaId}`

| Campo | Tipo | Descripción |
|---|---|---|
| `nombre` | `string` | Nombre de la rutina |
| `estado` | `'activo' \| 'descanso'` | Estado de la rutina |
| `dias` | `number[]` | Días asignados (0=Lunes … 6=Domingo) |
| `etiquetas` | `string[]` | Tags de la rutina (ej. "Gym", "Cardio") |
| `ejercicios` | `Ejercicio[]` | Lista de ejercicios |
| `enlaces` | `Enlace[]` | Videos o guías de referencia |
| `archivada` | `boolean` | Si está archivada |
| `historial` | `RegistroEntrenamiento[]` | Sesiones registradas |
| `creadoEn` | `Timestamp` | Timestamp de creación |

### Tipo: Ejercicio
```typescript
{
  id: string;
  nombre: string;
  series: number;
  repeticiones: number;
  peso: number;
  imagenes: string[];           // URLs de Firebase Storage (máx 2)
  seriesCompletadas: boolean[]; // array de longitud = series
}
```

### Tipo: RegistroEntrenamiento
```typescript
{
  id: string;
  fecha: string;           // YYYY-MM-DD
  rutinaNombre: string;
  seriesCompletadas: number;
  totalSeries: number;
}
```

**Nota sobre Storage:** Las imágenes de ejercicios se almacenan en Firebase Storage bajo el path `fitness/{timestamp}_{nombreArchivo}`. La URL de descarga se guarda en `ejercicio.imagenes[]`.

---

## Colección: comidas

**Path:** `/usuarios/{uid}/comidas/{comidaId}`

| Campo | Tipo | Descripción |
|---|---|---|
| `tipo` | `string` | Tipo de comida (ej. "Desayuno", "Almuerzo") |
| `hora` | `string` | Hora en formato `HH:MM` |
| `descripcion` | `string` | Descripción de la comida |
| `calorias` | `number` | Calorías totales |
| `proteinas` | `number` | Proteínas en gramos |
| `carbohidratos` | `number` | Carbohidratos en gramos |
| `grasas` | `number` | Grasas en gramos |
| `creadoEn` | `Timestamp` | Timestamp de creación |

---

## Firebase Storage — estructura de paths

```
Firebase Storage
├── avatares/
│   └── {uid}              ← foto de perfil del usuario
└── fitness/
    └── {timestamp}_{nombre_archivo}   ← imágenes de ejercicios
```

---

## Reglas de seguridad (modelo)

Las reglas de Firestore deben garantizar:

```javascript
// Solo el usuario autenticado puede leer/escribir sus propios datos
match /usuarios/{userId}/{document=**} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

---

## Consideraciones de rendimiento

| Situación | Impacto | Solución actual |
|---|---|---|
| Arrays anidados grandes (muchas tareas/subCategorias) | Reescritura completa en cada update | Aceptable para el volumen típico de uso personal |
| Múltiples `onSnapshot` en Home | Varios listeners simultáneos abiertos | Se cancelan al desmontar el componente |
| `activityGraph` array de 371 elementos | Se reescribe completo con cada clic | Escritura puntual, latencia no perceptible |

---

## Convenciones de naming

- IDs de documentos Firestore: generados automáticamente por `addDoc` (strings aleatorios)
- IDs de entidades dentro de arrays: `Date.now().toString()` o `crypto.randomUUID()` generado en cliente
- Fechas: siempre `string` en formato `YYYY-MM-DD` (nunca Timestamps para fechas de negocio)
- Timestamps de auditoría (`creadoEn`): `serverTimestamp()` de Firestore
