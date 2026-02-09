# Endpoints del módulo Localidades (TypeScript/Supabase)

## 1. Listar todas las localidades

```
GET /api/localidades
```

**Respuesta (200):**

```json
[
  {
    "idlocalidad": 1,
    "nombre": "Buenos Aires",
    "provincia": "Buenos Aires"
  },
  {
    "idlocalidad": 2,
    "nombre": "La Plata",
    "provincia": "Buenos Aires"
  },
  {
    "idlocalidad": 3,
    "nombre": "Mar del Plata",
    "provincia": "Buenos Aires"
  }
]
```

## 2. Buscar localidades por nombre

```
GET /api/localidades/search?q=La
```

**Parámetros:**

- `q` (string): Parte del nombre a buscar

**Respuesta (200):**

```json
[
  {
    "idlocalidad": 2,
    "nombre": "La Plata",
    "provincia": "Buenos Aires"
  }
]
```

## 3. Obtener una localidad por ID

```
GET /api/localidades/1
```

**Respuesta (200):**

```json
{
  "idlocalidad": 1,
  "nombre": "Buenos Aires",
  "provincia": "Buenos Aires"
}
```

**Respuesta (404):** Si la localidad no existe

```json
{
  "error": "Localidad no encontrada"
}
```

## Estructura de datos

| Campo         | Tipo   | Descripción            |
| ------------- | ------ | ---------------------- |
| `idlocalidad` | number | ID único (PK)          |
| `nombre`      | string | Nombre de la localidad |
| `provincia`   | string | Provincia (opcional)   |

## Códigos de respuesta HTTP

- **200 OK**: Operación exitosa
- **400 Bad Request**: Parámetro de búsqueda vacío o ID inválido
- **404 Not Found**: Localidad no encontrada
- **500 Internal Server Error**: Error del servidor

## Notas

- Las localidades se retornan **ordenadas alfabéticamente** por nombre
- Este módulo es principalmente de **lectura** (GET)
- Se usa para poblar selectores (`<select>`) en formularios de clientes
- Búsqueda: **case-insensitive** (insensible a mayúsculas/minúsculas)
