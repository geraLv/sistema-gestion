# API Solicitudes - Documentación

## Descripción General

El módulo de Solicitudes gestiona:

- Creación de solicitudes con generación automática de cuotas
- Actualización de solicitudes y recálculo de porcentajes
- Gestión de cuotas (pago, extensión)
- Búsqueda y filtrado de solicitudes
- Observaciones

## Estructura de Datos

### Solicitud

```typescript
{
  idsolicitud: number;
  relacliente: number;
  relaproducto: number;
  relavendedor: number;
  monto: number;
  cantidadcuotas: number;
  totalabonado: number;
  nrosolicitud: string;
  totalapagar: number;
  porcentajepagado: number;
  observacion?: string;
  estado: number; // 0=activa, 1=baja
  fechalta?: string;
}
```

### Cuota

```typescript
{
  idcuota: number;
  relasolicitud: number;
  nrocuota: number;
  importe: number;
  fecha?: string; // fecha de pago
  vencimiento: string;
  saldoanterior?: number;
  estado: number; // 0=impaga, 2=pagada
}
```

## Endpoints

### 1. Obtener todas las Solicitudes

**GET** `/api/solicitudes`

**Respuesta:**

```json
[
  {
    "idsolicitud": 1,
    "relacliente": 5,
    "nrosolicitud": "SOL-001",
    "monto": 1000,
    "cantidadcuotas": 12,
    "totalapagar": 12000,
    "porcentajepagado": 25.5,
    "estado": 1,
    "cliente_appynom": "Juan Pérez",
    "producto_descripcion": "Electrodoméstico",
    "vendedor_apellidonombre": "Carlos López"
  }
]
```

---

### 2. Obtener Solicitud por Número

**GET** `/api/solicitudes/nro/:nrosolicitud`

**Parámetros:**

- `nrosolicitud` (string): Número de la solicitud ej: "SOL-001"

**Respuesta:**

```json
{
  "idsolicitud": 1,
  "relacliente": 5,
  "nrosolicitud": "SOL-001",
  "monto": 1000,
  "cantidadcuotas": 12,
  "totalabonado": 3000,
  "totalapagar": 12000,
  "porcentajepagado": 25.0,
  "cuotas": [
    {
      "idcuota": 1,
      "nrocuota": 1,
      "importe": 1000,
      "vencimiento": "2024-03-20",
      "estado": 2,
      "fecha": "2024-03-15"
    }
  ],
  "cuotas_pagadas": 3,
  "total_pagado": 3000
}
```

---

### 3. Obtener Solicitud por ID

**GET** `/api/solicitudes/:id`

**Parámetros:**

- `id` (number): ID de la solicitud

**Respuesta:** Similar al endpoint anterior

---

### 4. Obtener Cuotas de una Solicitud

**GET** `/api/solicitudes/:id/cuotas`

**Parámetros:**

- `id` (number): ID de la solicitud

**Respuesta:**

```json
[
  {
    "idcuota": 1,
    "relasolicitud": 1,
    "nrocuota": 1,
    "importe": 1000,
    "vencimiento": "2024-03-20",
    "estado": 2,
    "fecha": "2024-03-15"
  },
  {
    "idcuota": 2,
    "relasolicitud": 1,
    "nrocuota": 2,
    "importe": 1000,
    "vencimiento": "2024-04-20",
    "estado": 0,
    "fecha": null
  }
]
```

---

### 5. Crear Nueva Solicitud

**POST** `/api/solicitudes`

**Body:**

```json
{
  "selectCliente": 5,
  "idproducto": 3,
  "selectVendedor": 2,
  "monto": 1000,
  "totalapagar": 12000,
  "selectCuotas": 12,
  "nroSolicitud": "SOL-001",
  "observacion": "Cliente preferencial"
}
```

**Validaciones:**

- Cliente: debe ser válido y > 0
- Producto: debe ser válido y > 0
- Vendedor: debe ser válido y > 0
- Monto: debe ser > 0
- Total a pagar: debe ser > 0
- Cuotas: debe ser > 0
- Número de solicitud: debe ser único

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "idsolicitud": 1,
    "relacliente": 5,
    "nrosolicitud": "SOL-001",
    "monto": 1000,
    "cantidadcuotas": 12,
    "totalabonado": 0,
    "totalapagar": 12000,
    "porcentajepagado": 0,
    "estado": 1,
    "fechalta": "2024-02-03T10:30:00.000Z"
  },
  "message": "Solicitud creada con 12 cuotas"
}
```

**Lógica:**

1. Valida todos los campos
2. Verifica que nrosolicitud sea único
3. Inserta la solicitud
4. Genera automáticamente N cuotas con:
   - nrocuota: 1 a N
   - importe: igual al monto de la solicitud
   - vencimiento: mes 20, incrementando cada mes
   - estado: 0 (impaga)

---

### 6. Actualizar Solicitud

**PUT** `/api/solicitudes/:id`

**Parámetros:**

- `id` (number): ID de la solicitud

**Body:**

```json
{
  "monto": 1100,
  "selectCuotas": 12,
  "nroSolicitud": "SOL-001",
  "totalapagar": 13200,
  "observacion": "Ajuste de monto",
  "selectEstado": 1
}
```

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "idsolicitud": 1,
    "monto": 1100,
    "totalapagar": 13200,
    "porcentajepagado": 22.73,
    "observacion": "Ajuste de monto"
  },
  "message": "Solicitud actualizada correctamente"
}
```

**Lógica:**

1. Valida que la solicitud existe
2. Si cambia el monto, actualiza todas las cuotas impagas
3. Recalcula porcentaje pagado: `(totalabonado * 100) / totalapagar`

---

### 7. Agregar Cuotas Adicionales

**POST** `/api/solicitudes/:id/cuotas`

**Parámetros:**

- `id` (number): ID de la solicitud

**Body:**

```json
{
  "cantidadNueva": 3
}
```

**Respuesta:**

```json
{
  "success": true,
  "message": "Se agregaron 3 cuotas a la solicitud"
}
```

**Lógica:**

1. Obtiene la última cuota para continuar numeración
2. Genera nuevas cuotas con nrocuota incremental
3. Vencimientos: próximos meses después de la última cuota
4. Actualiza cantidadcuotas en solicitud

---

### 8. Actualizar Observaciones

**PUT** `/api/solicitudes/:nro/observaciones`

**Parámetros:**

- `nro` (string): Número de la solicitud

**Body:**

```json
{
  "observacion": "Cliente retrasado en pagos"
}
```

**Respuesta:**

```json
{
  "success": true,
  "message": "Observaciones actualizadas"
}
```

---

## Flujo de Negocio

### 1. Crear Solicitud

- Valida datos de entrada
- Inserta solicitud con estado=1 (activa)
- Genera automáticamente N cuotas

### 2. Modificar Solicitud

- Actualiza campos
- Si cambia monto, recalcula cuotas impagas
- Recalcula porcentaje pagado

### 3. Listar Solicitudes

- Retorna todas con JOINs a cliente, producto, vendedor
- Información agregada de cuotas

### 4. Obtener Detalle

- Solicitud + cuotas completas
- Conteo de cuotas pagadas
- Total pagado

### 5. Extender Cuotas

- Agrega cuotas nuevas
- Continúa numeración y vencimientos

### 6. Observaciones

- Actualiza campo observacion
- Registro de notas sobre cliente

---

## Códigos de Estado (estado)

- **0**: Baja/Cancelada
- **1**: Activa

## Códigos de Cuota (cuotas.estado)

- **0**: Impaga
- **2**: Pagada

## Cálculos

### Porcentaje Pagado

```
porcentajepagado = (totalabonado * 100) / totalapagar
```

Ejemplo:

- totalabonado: 3000
- totalapagar: 12000
- porcentaje: (3000 \* 100) / 12000 = 25%

---

## Notas de Implementación

1. **Generación automática de cuotas**: Al crear una solicitud, se generan N cuotas con vencimiento mensual comenzando el día 20 del mes actual.

2. **Recalcular porcentaje**: Cada vez que se actualiza la solicitud o se pagan cuotas, se recalcula automáticamente.

3. **Cuotas impagas**: Al cambiar el monto, solo se actualizan las cuotas con estado=0.

4. **Validaciones**: Todas las validaciones se realizan en el Service layer antes de llegar a la BD.

5. **Errores**: Los errores se retornan con `success: false` y descripción en `error`.
