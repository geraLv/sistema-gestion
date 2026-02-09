# Módulo Solicitudes - Implementación Completada

## 📋 Resumen de Implementación

El módulo de Solicitudes ha sido completamente implementado en TypeScript/Supabase, siguiendo la misma arquitectura de 3 capas que los módulos anteriores.

## 📁 Archivos Creados

### 1. **src/types/solicitud.ts**

Define todas las interfaces y DTOs:

- `Solicitud`: Estructura de solicitud en BD
- `Cuota`: Estructura de cuotas
- `SolicitudConDetalles`: Solicitud con JOINs
- `CreateSolicitudDTO`: DTO para crear
- `UpdateSolicitudDTO`: DTO para actualizar
- `SolicitudResponse` y `CuotaResponse`: Respuestas de API

### 2. **src/repositories/solicitudRepository.ts**

Capa de acceso a datos (14 métodos estáticos):

- `getAllSolicitudes()`: Lista con detalles
- `getSolicitudById()`: Por ID con JOINs
- `getSolicitudByNro()`: Por número único
- `nrosolicitudExists()`: Verifica duplicados
- `createSolicitud()`: Inserta solicitud
- `updateSolicitud()`: Actualiza solicitud
- `getCuotasBySolicitud()`: Obtiene cuotas
- `createCuotas()`: Genera N cuotas automáticas
- `updateCuotasImpagas()`: Actualiza cuotas pendientes
- `adicionarCuotas()`: Extiende cuotas
- `updateObservaciones()`: Actualiza notas
- `getSolicitudesConFiltro()`: Filtro por estado

**Características:**

- Generación automática de cuotas con vencimiento mensual (día 20)
- JOINs con cliente, producto, vendedor, localidad
- Recalculate de porcentaje pagado
- Manejo de errores con try-catch

### 3. **src/services/solicitudService.ts**

Lógica de negocio (8 métodos estáticos):

- `listarSolicitudes()`: Obtiene todas
- `obtenerSolicitud()`: Por ID
- `obtenerSolicitudPorNro()`: Por número con cuotas
- `crearSolicitud()`: Crea + genera cuotas automáticas
- `actualizarSolicitud()`: Actualiza y recalcula
- `adicionarCuotas()`: Extiende cuotas
- `actualizarObservaciones()`: Actualiza notas
- `obtenerCuotas()`: Obtiene cuotas

**Validaciones:**

- Cliente/Producto/Vendedor válidos
- Monto > 0
- Totalapagar > 0
- Cuotas > 0
- nroSolicitud único
- Campo observacion opcional

### 4. **src/routes/solicitudes.ts**

Endpoints HTTP (8 rutas):

- `GET /` - Lista todas las solicitudes
- `GET /nro/:nrosolicitud` - Por número
- `GET /:id` - Por ID
- `GET /:id/cuotas` - Cuotas de una solicitud
- `POST /` - Crear nueva
- `PUT /:id` - Actualizar
- `POST /:id/cuotas` - Agregar cuotas
- `PUT /:nro/observaciones` - Actualizar notas

### 5. **src/index.ts** (Actualizado)

- Importa router de solicitudes
- Registra rutas en `/api/solicitudes`
- Añade log en startup

### 6. **SOLICITUDES_API.md**

Documentación completa:

- Estructura de datos
- Descripción de todos los endpoints
- Ejemplos de request/response
- Validaciones
- Flujo de negocio
- Códigos de estado
- Fórmulas de cálculo

## 🔄 Flujo de Negocio Implementado

### 1️⃣ Crear Solicitud (POST)

```
Input: DTO con cliente, producto, vendedor, monto, cuotas, nrosolicitud
↓
Validar todos los campos
↓
Verificar nrosolicitud único
↓
Insertar solicitud (estado=1, totalabonado=0, porcentaje=0)
↓
Generar N cuotas automáticas:
  - nrocuota: 1..N
  - importe: = monto
  - vencimiento: mes 20, incrementando mensualmente
  - estado: 0 (impaga)
↓
Retornar solicitud con IDs
```

### 2️⃣ Actualizar Solicitud (PUT)

```
Input: DTO con cambios
↓
Validar campos
↓
Si cambió monto:
  ├─ Actualizar todas las cuotas impagas (estado=0)
  └─ con nuevo importe
↓
Recalcular porcentaje pagado:
  porcentaje = (totalabonado * 100) / totalapagar
↓
Actualizar solicitud
↓
Retornar solicitud actualizada
```

### 3️⃣ Listar Solicitudes (GET /)

```
Obtener todas las solicitudes con:
├─ JOIN cliente (appynom, dni, direccion, telefono)
├─ JOIN producto (descripcion)
├─ JOIN vendedor (apellidonombre)
└─ JOIN localidad (nombre)
↓
Ordenar por ID descendente
↓
Retornar array
```

### 4️⃣ Obtener Detalle (GET /nro/:nrosolicitud)

```
Obtener solicitud por número
↓
Obtener todas sus cuotas
↓
Contar cuotas pagadas (estado=2)
↓
Sumar total pagado
↓
Retornar solicitud + cuotas + agregados
```

### 5️⃣ Agregar Cuotas (POST /:id/cuotas)

```
Input: cantidadNueva
↓
Obtener última cuota para:
├─ Siguiente nrocuota
└─ Calcular próximo vencimiento
↓
Obtener monto de la solicitud
↓
Generar nuevas cuotas con:
├─ nrocuota: continuación
├─ vencimiento: próximos meses
├─ importe: monto solicitud
└─ estado: 0
↓
Insertar cuotas
↓
Actualizar cantidadcuotas en solicitud
```

### 6️⃣ Actualizar Observaciones (PUT /:nro/observaciones)

```
Input: nrosolicitud + observacion
↓
UPDATE observacion WHERE nrosolicitud
↓
Retornar éxito
```

## 📊 Integración en BD

Las tablas de Supabase utilizadas:

- `solicitud` (11 campos)
  - idsolicitud (PK)
  - relacliente (FK)
  - relaproducto (FK)
  - relavendedor (FK)
  - monto, cantidadcuotas, totalabonado, nrosolicitud (UNIQUE)
  - totalapagar, porcentajepagado, observacion, estado, fechalta

- `cuotas` (9 campos)
  - idcuota (PK)
  - relasolicitud (FK)
  - nrocuota, importe, fecha, vencimiento
  - saldoanterior, estado

- Joins: cliente, producto, vendedor, localidad

## 🔗 Endpoints Registrados

| Método | Ruta                                  | Descripción      |
| ------ | ------------------------------------- | ---------------- |
| GET    | `/api/solicitudes`                    | Listar todas     |
| GET    | `/api/solicitudes/nro/:nrosolicitud`  | Por número       |
| GET    | `/api/solicitudes/:id`                | Por ID           |
| GET    | `/api/solicitudes/:id/cuotas`         | Cuotas de una    |
| POST   | `/api/solicitudes`                    | Crear nueva      |
| PUT    | `/api/solicitudes/:id`                | Actualizar       |
| POST   | `/api/solicitudes/:id/cuotas`         | Agregar cuotas   |
| PUT    | `/api/solicitudes/:nro/observaciones` | Actualizar notas |

## ✅ Validaciones Implementadas

✓ Cliente válido (existe, > 0)
✓ Producto válido (existe, > 0)
✓ Vendedor válido (existe, > 0)
✓ Monto > 0
✓ Totalapagar > 0
✓ Cuotas > 0
✓ nroSolicitud único
✓ nroSolicitud no vacío
✓ ID solicitud válido
✓ Cantidad de cuotas positiva

## 📈 Cálculos Automáticos

### Porcentaje Pagado

```
porcentajepagado = (totalabonado * 100) / totalapagar
```

Ej: Si pagó $3000 de $12000 → 25%

### Vencimiento de Cuotas

```
- Base: día 20 del mes
- Si pasó el 20 → comienza próximo mes
- Cada cuota: mes anterior + 1 mes
- Formato: YYYY-MM-DD
```

## 🧪 Pruebas Sugeridas

```bash
# 1. Crear solicitud
curl -X POST http://localhost:4000/api/solicitudes \
  -H "Content-Type: application/json" \
  -d '{
    "selectCliente": 1,
    "idproducto": 1,
    "selectVendedor": 1,
    "monto": 1000,
    "totalapagar": 12000,
    "selectCuotas": 12,
    "nroSolicitud": "SOL-001",
    "observacion": "Test"
  }'

# 2. Listar
curl http://localhost:4000/api/solicitudes

# 3. Obtener por número
curl http://localhost:4000/api/solicitudes/nro/SOL-001

# 4. Obtener cuotas
curl http://localhost:4000/api/solicitudes/1/cuotas

# 5. Agregar cuotas
curl -X POST http://localhost:4000/api/solicitudes/1/cuotas \
  -H "Content-Type: application/json" \
  -d '{"cantidadNueva": 3}'

# 6. Actualizar
curl -X PUT http://localhost:4000/api/solicitudes/1 \
  -H "Content-Type: application/json" \
  -d '{
    "monto": 1100,
    "totalapagar": 13200,
    "selectCuotas": 12,
    "nroSolicitud": "SOL-001"
  }'
```

## 📝 Estado de Compilación

✅ **TypeScript compila sin errores**

## 🚀 Próximos Módulos

1. **Cuotas/Pagos** (depende de Solicitudes)
   - pagarCuota (pagar individual)
   - Adelantos
   - Modificar importes

2. **Vendedores** (independiente)
   - CRUD vendedores
   - Búsqueda

3. **Productos** (independiente)
   - CRUD productos
   - Búsqueda

4. **Adelantos** (depende de Solicitudes)
   - Registrar adelanto
   - Aplicar a cuota/solicitud

## 📌 Notas Importantes

- Las cuotas se generan automáticamente con vencimiento mensual (día 20)
- El porcentaje pagado se recalcula automáticamente
- Las cuotas impagas se actualizan si cambia el monto
- El nroSolicitud debe ser único en el sistema
- El campo observacion es opcional
- Los estados son: 0=baja, 1=activa (solicitud); 0=impaga, 2=pagada (cuota)
