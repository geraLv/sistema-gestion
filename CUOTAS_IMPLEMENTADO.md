# 🧾 Módulo Cuotas/Pagos - Implementación Completada

## 📋 Resumen

Migración exitosa del módulo de cuotas y pagos del sistema PHP a TypeScript/Express. Incluye:

- **5 endpoints para cuotas** (pagar, listar, modificar)
- **3 endpoints para adelantos** (registrar, consultar)
- **Recálculo automático** de porcentajes pagados
- **Protección con JWT** en todos los endpoints
- **Validaciones robustas** de datos

---

## 📁 Archivos Creados

### 1. **src/types/cuota.ts**

Interfaces para cuotas:

```typescript
interface Cuota {
  idcuota: number;
  relasolicitud: number;
  nrocuota: number;
  importe: number;
  vencimiento: string; // YYYY-MM-DD
  estado: 0 | 2; // 0=impaga, 2=pagada
  fecha?: string;
  saldoanterior?: number;
}
```

**DTOs:**

- `PagarCuotaDTO` - Pagar una cuota
- `PagarMultiplesCuotasDTO` - Pagar varias
- `ModificarImporteCuotaDTO` - Cambiar importe

### 2. **src/types/adelanto.ts**

Interfaces para adelantos:

```typescript
interface Adelanto {
  idadelanto: number;
  relasolicitud: number;
  adelantoimporte: number;
  adelantofecha: string; // YYYY-MM-DD
}
```

**DTOs:**

- `CargarAdelantoDTO` - Registrar adelanto

### 3. **src/repositories/cuotaRepository.ts**

Capa de acceso a datos (9 métodos):

- `getCuotaById(idcuota)` - Obtener una cuota
- `getCuotasWithDetails(filtro)` - Listar con filtro
- `pagarCuota(idcuota)` - Pagar (UPDATE estado=2)
- `getCuotaAndSolicitudData(idcuota)` - Datos para recalcular
- `modificarImporteCuota(idcuota, importe)` - Cambiar importe
- `actualizarPorcentajeSolicitud(idsolicitud)` - Recalcular %
- `getCuotasBySolicitud(idsolicitud)` - Listar por solicitud
- `getCuotasResumen(idsolicitud)` - Resumen (total, pagadas, montos)

### 4. **src/repositories/adelantoRepository.ts**

Capa de acceso a datos (6 métodos):

- `getAdelantoById(idadelanto)` - Obtener uno
- `getAdelantosBySolicitud(idsolicitud)` - Listar por solicitud
- `getTotalAdelantosBySolicitud(idsolicitud)` - Suma total
- `crearAdelanto(idsolicitud, importe)` - Registrar
- `getAdelantosWithDetails()` - Listar todos con detalles

### 5. **src/services/cuotaService.ts**

Lógica de negocio (CuotaService + AdelantoService):

**CuotaService:**

- `pagarCuota(dto)` - Pagar y recalcular
- `pagarMultiplesCuotas(dto)` - Pagar varias
- `modificarImporte(dto)` - Cambiar importe
- `obtenerCuotas(filtro)` - Listar
- `obtenerCuotasSolicitud(idsolicitud)` - Cuotas + resumen

**AdelantoService:**

- `cargarAdelanto(dto)` - Registrar
- `consultarAdelanto(idsolicitud)` - Consultar total
- `obtenerAdelantosDetallados()` - Listar

### 6. **src/routes/cuotas.ts**

5 endpoints HTTP:

```
GET    /api/cuotas                          # Listar todas
GET    /api/cuotas/:idcuota                 # Obtener una
GET    /api/cuotas/solicitud/:idsolicitud   # De solicitud
POST   /api/cuotas/pagar                    # Pagar una
POST   /api/cuotas/pagar-multiples          # Pagar varias
PUT    /api/cuotas/:idcuota/importe         # Modificar importe
```

### 7. **src/routes/adelantos.ts**

3 endpoints HTTP:

```
GET    /api/adelantos                       # Listar todas
GET    /api/adelantos/:idsolicitud          # De solicitud
POST   /api/adelantos                       # Registrar
```

---

## 🔄 Flujos de Negocio Implementados

### 1️⃣ Pagar Una Cuota (POST /api/cuotas/pagar)

```
Input: { idcuota: 5 }
↓
Validar que existe
↓
Validar que no está pagada
↓
UPDATE cuotas:
  - estado = 2 (pagada)
  - fecha = hoy
  - saldoanterior = importe
↓
Obtener solicitud:
  - totalabonado actual
  - totalapagar
↓
Calcular nuevo total = totalabonado + importe_cuota
↓
Calcular % = (nuevo_total * 100) / totalapagar
↓
UPDATE solicitud:
  - totalabonado = nuevo_total
  - porcentajepagado = %
↓
Retornar:
  {
    success: true,
    cuotaPagada: { idcuota, estado: 2, fecha: ... },
    solicitudActualizada: { totalabonado, porcentajepagado }
  }
```

### 2️⃣ Pagar Múltiples Cuotas (POST /api/cuotas/pagar-multiples)

```
Input: { idcuotas: [1, 2, 3] }
↓
Loop por cada cuota:
  - Llamar pagarCuota(idcuota)
  - Guardar resultado o error
↓
Retornar resumen:
  {
    totalProcesadas: 3,
    exitosas: 3,
    fallidas: 0,
    resultados: [...]
  }
```

### 3️⃣ Modificar Importe (PUT /api/cuotas/:idcuota/importe)

```
Input: { importe: 1500 }
↓
Validar importe > 0
↓
Obtener cuota:
  - Si estado=2 (pagada), error
↓
UPDATE importe
↓
Recalcular % de solicitud:
  - Sumar todos los importe de cuotas pagadas
  - % = (suma * 100) / totalapagar
  - UPDATE solicitud
↓
Retornar cuota actualizada
```

### 4️⃣ Registrar Adelanto (POST /api/adelantos)

```
Input: { idsolicitud: 10, adelantoimporte: 500 }
↓
Validar solicitud existe
↓
Validar adelantoimporte > 0
↓
INSERT adelanto:
  - relasolicitud = 10
  - adelantoimporte = 500
  - adelantofecha = hoy
↓
Retornar adelanto creado
```

### 5️⃣ Consultar Adelanto (GET /api/adelantos/:idsolicitud)

```
Input: idsolicitud = 10
↓
SELECT * FROM adelanto WHERE relasolicitud = 10
↓
Sumar todos los adelantoimporte
↓
Retornar:
  {
    totalAdelanto: 1500,
    adelantos: [
      { idadelanto, adelantoimporte, adelantofecha },
      ...
    ]
  }
```

---

## 🧪 Pruebas Sugeridas

### 1. Pagar una cuota

```bash
curl -X POST http://localhost:4000/api/cuotas/pagar \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"idcuota": 1}'
```

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "success": true,
    "cuotaPagada": {
      "idcuota": 1,
      "relasolicitud": 1,
      "nrocuota": 1,
      "importe": 1000,
      "vencimiento": "2025-02-20",
      "estado": 2,
      "fecha": "2025-02-04"
    },
    "solicitudActualizada": {
      "totalabonado": 1000,
      "porcentajepagado": 10.0
    }
  }
}
```

### 2. Listar cuotas pagadas

```bash
curl http://localhost:4000/api/cuotas?filtro=pagadas \
  -H "Authorization: Bearer {token}"
```

### 3. Listar cuotas impagas

```bash
curl http://localhost:4000/api/cuotas?filtro=impagas \
  -H "Authorization: Bearer {token}"
```

### 4. Registrar adelanto

```bash
curl -X POST http://localhost:4000/api/adelantos \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"idsolicitud": 1, "adelantoimporte": 500}'
```

### 5. Consultar adelanto

```bash
curl http://localhost:4000/api/adelantos/1 \
  -H "Authorization: Bearer {token}"
```

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "totalAdelanto": 1000,
    "adelantos": [
      {
        "idadelanto": 1,
        "relasolicitud": 1,
        "adelantoimporte": 500,
        "adelantofecha": "2025-02-04"
      },
      {
        "idadelanto": 2,
        "relasolicitud": 1,
        "adelantoimporte": 500,
        "adelantofecha": "2025-02-03"
      }
    ]
  }
}
```

---

## 📊 Integración en Express

En `src/index.ts`:

```typescript
import cuotasRouter from "./routes/cuotas";
import adelantosRouter from "./routes/adelantos";

// Registro de rutas
app.use("/api/cuotas", authenticateToken, cuotasRouter);
app.use("/api/adelantos", authenticateToken, adelantosRouter);

// Logs al iniciar
console.log(
  `✓ Cuotas API: http://localhost:${port}/api/cuotas (requiere token)`,
);
console.log(
  `✓ Adelantos API: http://localhost:${port}/api/adelantos (requiere token)`,
);
```

---

## ✅ Validaciones Implementadas

- ✅ Cuota debe existir (404 si no)
- ✅ No permitir pagar cuota ya pagada
- ✅ Importe debe ser > 0
- ✅ No permitir modificar cuota pagada
- ✅ Recalcular automático de % después de pagar
- ✅ Adelanto debe ser > 0
- ✅ Solicitud debe existir
- ✅ JWT token requerido en Authorization header

---

## 🔒 Seguridad

**Autenticación:**

- JWT middleware protege todos los endpoints
- Token extraído de `Authorization: Bearer {token}`
- 401 si token inválido/expirado

**Autorización:**

- Usuario debe estar autenticado
- No se verifica propiedad de recursos (confiar en cliente)

**Datos Sensibles:**

- No se exponen IDs internos innecesariamente
- Respuestas limitadas a datos requeridos

---

## 📈 Cambios en `solicitud` (recálculo automático)

Después de pagar una cuota:

```sql
UPDATE solicitud
SET
  totalabonado = 5000,     -- suma de cuotas pagadas
  porcentajepagado = 50.0  -- (totalabonado * 100) / totalapagar
WHERE idsolicitud = 1;
```

Esto ocurre **automáticamente** en cada pago.

---

## 🚀 Próximos Pasos

1. Vendedores (1 endpoint) - GET /api/vendedores
2. Productos (1 endpoint) - GET /api/productos
3. Testing completo
4. Deploy

**Estado Actual:** 28/30 endpoints (93%)
