# Endpoints del módulo Clientes (TypeScript/Supabase)

## 1. Listar todos los clientes

```
GET /api/clientes
```

**Respuesta (200):**

```json
[
  {
    "idcliente": 1,
    "appynom": "García, Juan",
    "dni": "12345678",
    "direccion": "Calle 1 123",
    "telefono": "3111234567",
    "relalocalidad": 1,
    "condicion": 1,
    "fechalta": "2025-01-15T10:30:00Z",
    "nombre": "Buenos Aires"
  }
]
```

## 2. Buscar clientes por nombre

```
GET /api/clientes/search?q=García
```

**Parámetros:**

- `q` (string): Parte del nombre a buscar

**Respuesta (200):**

```json
[
  {
    "idcliente": 1,
    "appynom": "García, Juan",
    ...
  }
]
```

## 3. Obtener un cliente por ID

```
GET /api/clientes/1
```

**Respuesta (200):**

```json
{
  "idcliente": 1,
  "appynom": "García, Juan",
  "dni": "12345678",
  "direccion": "Calle 1 123",
  "telefono": "3111234567",
  "relalocalidad": 1,
  "condicion": 1,
  "fechalta": "2025-01-15T10:30:00Z",
  "nombre": "Buenos Aires"
}
```

**Respuesta (404):** Si el cliente no existe

```json
{
  "error": "Cliente no encontrado"
}
```

## 4. Crear un nuevo cliente

```
POST /api/clientes
Content-Type: application/json

{
  "appynom": "Pérez, María",
  "dni": "87654321",
  "direccion": "Avenida 2 456",
  "telefono": "3118765432",
  "selectLocalidades": 2
}
```

**Respuesta (201):**

```json
{
  "success": true,
  "message": "Cliente creado exitosamente",
  "data": {
    "idcliente": 2,
    "appynom": "Pérez, María",
    "dni": "87654321",
    "direccion": "Avenida 2 456",
    "telefono": "3118765432",
    "relalocalidad": 2,
    "condicion": 1,
    "fechalta": "2025-02-03T14:25:00Z"
  }
}
```

**Respuesta (400):** Si hay error de validación

```json
{
  "success": false,
  "error": "El DNI ya existe en la base de datos"
}
```

## 5. Actualizar un cliente

```
POST /api/clientes
Content-Type: application/json

{
  "idcliente": 1,
  "appynom": "García López, Juan",
  "dni": "12345678",
  "direccion": "Calle 1 789",
  "telefono": "3119876543",
  "selectLocalidades": 3
}
```

**Respuesta (200):**

```json
{
  "success": true,
  "message": "Cliente actualizado exitosamente",
  "data": {
    "idcliente": 1,
    "appynom": "García López, Juan",
    "dni": "12345678",
    "direccion": "Calle 1 789",
    "telefono": "3119876543",
    "relalocalidad": 3,
    "condicion": 1,
    "fechalta": "2025-01-15T10:30:00Z"
  }
}
```

## Validaciones implementadas

1. **appynom**: Requerido, no vacío
2. **dni**: Requerido, no vacío, formato 7-8 dígitos, debe ser único
3. **direccion**: Requerido, no vacío
4. **telefono**: Requerido, no vacío
5. **selectLocalidades**: Requerido, ID de localidad válido (número positivo)

## Códigos de respuesta HTTP

- **200 OK**: Operación exitosa (GET, POST actualización)
- **201 Created**: Cliente creado exitosamente
- **400 Bad Request**: Validación fallida o datos inválidos
- **404 Not Found**: Cliente no encontrado
- **500 Internal Server Error**: Error del servidor

## Localidades (soporte)

```
GET /api/localidades
```

Retorna lista de localidades disponibles para asociar a clientes.
