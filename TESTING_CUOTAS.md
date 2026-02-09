# 🧪 GUÍA DE TESTING - Módulo Cuotas/Pagos

## Preparación

Asegúrate de tener:

1. Backend ejecutándose: `npm run dev`
2. Token JWT válido (obtenido de `/api/auth/login`)
3. Cliente activo con solicitudes y cuotas

---

## 1. Obtener Token

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "usuario": "admin",
    "password": "12345678"
  }'
```

**Respuesta:**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "iduser": 1,
    "usuario": "admin",
    "nombre": "Administrador"
  }
}
```

**Guardar token:** `TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

---

## 2. Verificar Solicitudes Existentes

```bash
curl http://localhost:4000/api/solicitudes \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta:**

```json
{
  "success": true,
  "data": [
    {
      "idsolicitud": 1,
      "nrosolicitud": "SOL-001",
      "idcliente": 1,
      "clienteNombre": "Juan Pérez",
      "monto": 10000,
      "totalapagar": 10000,
      "totalabonado": 0,
      "porcentajepagado": 0,
      "cantidadcuotas": 10,
      "estado": 1
    }
  ]
}
```

---

## 3. Obtener Cuotas de una Solicitud

```bash
SOLICITUD_ID=1

curl http://localhost:4000/api/cuotas/solicitud/$SOLICITUD_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "cuotas": [
      {
        "idcuota": 1,
        "relasolicitud": 1,
        "nrocuota": 1,
        "importe": 1000,
        "vencimiento": "2025-02-20",
        "estado": 0,
        "fecha": null
      },
      {
        "idcuota": 2,
        "relasolicitud": 1,
        "nrocuota": 2,
        "importe": 1000,
        "vencimiento": "2025-03-20",
        "estado": 0,
        "fecha": null
      }
    ],
    "resumen": {
      "total": 10,
      "pagadas": 0,
      "impagas": 10,
      "montoTotal": 10000,
      "montoPagado": 0,
      "montoImpago": 10000
    }
  }
}
```

---

## 4. Pagar una Cuota

```bash
CUOTA_ID=1

curl -X POST http://localhost:4000/api/cuotas/pagar \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"idcuota\": $CUOTA_ID}"
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
      "fecha": "2025-02-04",
      "saldoanterior": 1000
    },
    "solicitudActualizada": {
      "totalabonado": 1000,
      "porcentajepagado": 10
    }
  }
}
```

**Verificar:** Ahora `estado=2` y `porcentajepagado=10`

---

## 5. Verificar Cambios en Solicitud

```bash
SOLICITUD_ID=1

curl http://localhost:4000/api/solicitudes/$SOLICITUD_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Cambios esperados:**

- `totalabonado`: 0 → 1000
- `porcentajepagado`: 0 → 10.00

---

## 6. Listar Cuotas Impagas

```bash
curl "http://localhost:4000/api/cuotas?filtro=impagas" \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta:**

```json
{
  "success": true,
  "data": [
    {
      "idcuota": 2,
      "relasolicitud": 1,
      "nrocuota": 2,
      "importe": 1000,
      "vencimiento": "2025-03-20",
      "estado": 0,
      "fecha": null
    }
    // ... más cuotas impagas
  ]
}
```

---

## 7. Listar Cuotas Pagadas

```bash
curl "http://localhost:4000/api/cuotas?filtro=pagadas" \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta:**

```json
{
  "success": true,
  "data": [
    {
      "idcuota": 1,
      "relasolicitud": 1,
      "nrocuota": 1,
      "importe": 1000,
      "vencimiento": "2025-02-20",
      "estado": 2,
      "fecha": "2025-02-04"
    }
  ]
}
```

---

## 8. Pagar Múltiples Cuotas

```bash
curl -X POST http://localhost:4000/api/cuotas/pagar-multiples \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "idcuotas": [2, 3, 4]
  }'
```

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "totalProcesadas": 3,
    "exitosas": 3,
    "fallidas": 0,
    "resultados": [
      {
        "success": true,
        "cuotaPagada": { ... },
        "solicitudActualizada": { ... }
      },
      // ... más resultados
    ]
  }
}
```

---

## 9. Modificar Importe de Cuota

```bash
CUOTA_ID=5
NUEVO_IMPORTE=1500

curl -X PUT http://localhost:4000/api/cuotas/$CUOTA_ID/importe \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"importe\": $NUEVO_IMPORTE}"
```

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "idcuota": 5,
    "relasolicitud": 1,
    "nrocuota": 5,
    "importe": 1500,
    "vencimiento": "2025-06-20",
    "estado": 0,
    "fecha": null
  }
}
```

**Verificar:** El porcentaje de la solicitud se recalculó automáticamente

---

## 10. Registrar Adelanto

```bash
SOLICITUD_ID=1
ADELANTO_MONTO=500

curl -X POST http://localhost:4000/api/adelantos \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"idsolicitud\": $SOLICITUD_ID,
    \"adelantoimporte\": $ADELANTO_MONTO
  }"
```

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "idadelanto": 1,
    "relasolicitud": 1,
    "adelantoimporte": 500,
    "adelantofecha": "2025-02-04"
  }
}
```

---

## 11. Consultar Adelantos de Solicitud

```bash
SOLICITUD_ID=1

curl http://localhost:4000/api/adelantos/$SOLICITUD_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "totalAdelanto": 500,
    "adelantos": [
      {
        "idadelanto": 1,
        "relasolicitud": 1,
        "adelantoimporte": 500,
        "adelantofecha": "2025-02-04"
      }
    ]
  }
}
```

---

## 12. Registrar otro Adelanto

```bash
SOLICITUD_ID=1
ADELANTO_MONTO=300

curl -X POST http://localhost:4000/api/adelantos \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"idsolicitud\": $SOLICITUD_ID,
    \"adelantoimporte\": $ADELANTO_MONTO
  }"
```

---

## 13. Verificar Total Adelanto (acumulado)

```bash
SOLICITUD_ID=1

curl http://localhost:4000/api/adelantos/$SOLICITUD_ID \
  -H "Authorization: Bearer $TOKEN"
```

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "totalAdelanto": 800,  // 500 + 300
    "adelantos": [
      { "idadelanto": 1, "adelantoimporte": 500, ... },
      { "idadelanto": 2, "adelantoimporte": 300, ... }
    ]
  }
}
```

---

## 14. Listar Todos los Adelantos

```bash
curl http://localhost:4000/api/adelantos \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🔴 Casos de Error

### Error 1: Sin Token

```bash
curl http://localhost:4000/api/cuotas
```

**Respuesta (401):**

```json
{
  "success": false,
  "error": "Token no proporcionado o inválido"
}
```

### Error 2: Pagar Cuota ya Pagada

```bash
curl -X POST http://localhost:4000/api/cuotas/pagar \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"idcuota": 1}'  # Ya pagada en paso 4
```

**Respuesta (400):**

```json
{
  "success": false,
  "error": "Esta cuota ya está pagada"
}
```

### Error 3: Modificar Cuota Pagada

```bash
curl -X PUT http://localhost:4000/api/cuotas/1/importe \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"importe": 2000}'
```

**Respuesta (400):**

```json
{
  "success": false,
  "error": "No se puede modificar el importe de una cuota pagada"
}
```

### Error 4: Importe Inválido

```bash
curl -X POST http://localhost:4000/api/adelantos \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"idsolicitud": 1, "adelantoimporte": -100}'
```

**Respuesta (400):**

```json
{
  "success": false,
  "error": "El adelanto debe ser mayor a 0"
}
```

---

## 📊 Flujo Completo de Testing

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"admin","password":"12345678"}' | \
  jq -r '.token')

# 2. Listar solicitudes
curl http://localhost:4000/api/solicitudes \
  -H "Authorization: Bearer $TOKEN" | jq '.data[0]'

# 3. Obtener cuotas
SOLICITUD_ID=1
curl http://localhost:4000/api/cuotas/solicitud/$SOLICITUD_ID \
  -H "Authorization: Bearer $TOKEN" | jq '.data.resumen'

# 4. Pagar cuota 1
curl -X POST http://localhost:4000/api/cuotas/pagar \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"idcuota": 1}' | jq '.data.solicitudActualizada'

# 5. Registrar adelanto
curl -X POST http://localhost:4000/api/adelantos \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"idsolicitud": 1, "adelantoimporte": 500}' | jq '.data'

# 6. Verificar adelantos
curl http://localhost:4000/api/adelantos/1 \
  -H "Authorization: Bearer $TOKEN" | jq '.data.totalAdelanto'
```

---

## ✅ Checklist de Testing

- [ ] Token obtenido correctamente
- [ ] Listar solicitudes funciona
- [ ] Obtener cuotas por solicitud funciona
- [ ] Resumen de cuotas correcto
- [ ] Pagar una cuota actualiza estado y %
- [ ] Porcentaje se recalcula correctamente
- [ ] Pagar múltiples cuotas funciona
- [ ] Modificar importe de cuota funciona
- [ ] No permitir modificar pagada
- [ ] Registrar adelanto funciona
- [ ] Consultar adelanto retorna total correcto
- [ ] Múltiples adelantos se acumulan
- [ ] Errores retornan código 400/401
- [ ] Todos los endpoints retornan JSON válido

---

## 🎯 Métricas Esperadas

**Después de los pagos en este testing:**

```json
{
  "totalCuotas": 10,
  "cuotasPagadas": 3, // 1, 2, 3
  "cuotasImpagas": 7,
  "montoTotal": 10000,
  "montoPagado": 3000, // 3 cuotas × 1000
  "montoImpago": 7000,
  "porcentajePagado": 30.0 // (3000 * 100) / 10000
}
```
