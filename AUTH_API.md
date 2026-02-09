# API Autenticación - Documentación

## Descripción General

El módulo de Autenticación proporciona:

- Login con usuario y contraseña
- Generación de tokens JWT seguros
- Validación de tokens
- Cambio de contraseña
- Protección de endpoints

## Características

- **JWT Tokens**: Tokens seguros que expiran en 24 horas
- **Bcrypt Hashing**: Contraseñas hasheadas con bcrypt10
- **Middleware de Autenticación**: Protege endpoints automáticamente
- **Validación**: Verificación en cada solicitud

## Estructura de Datos

### User

```typescript
{
  iduser: number;
  usuario: string;           // Unique
  password: string;          // Hashed with bcrypt
  nombre?: string;
  email?: string;
  estado: number;            // 1=activo, 0=inactivo
  fechacreacion: string;
}
```

### UserPayload (Token)

```typescript
{
  iduser: number;
  usuario: string;
  nombre?: string;
}
```

### LoginDTO

```typescript
{
  usuario: string;
  password: string;
}
```

## Endpoints

### 1. Login

**POST** `/api/auth/login`

Autentica un usuario y retorna un token JWT.

**Request:**

```json
{
  "usuario": "admin",
  "password": "12345678"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "iduser": 1,
    "usuario": "admin",
    "nombre": "Administrador"
  },
  "message": "Login exitoso"
}
```

**Response (401 Unauthorized):**

```json
{
  "success": false,
  "error": "Usuario o contraseña inválidos"
}
```

**Códigos de Error:**

- `Usuario es requerido`
- `Contraseña es requerida`
- `Usuario o contraseña inválidos`
- `Usuario inactivo. Contacte al administrador`

---

### 2. Validar Token

**POST** `/api/auth/validate-token`

Valida un token JWT sin gastar credenciales.

**Request (Body):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**O con Header:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**

```json
{
  "success": true,
  "valid": true,
  "user": {
    "iduser": 1,
    "usuario": "admin",
    "nombre": "Administrador"
  }
}
```

**Response (401):**

```json
{
  "success": false,
  "valid": false,
  "error": "Token expirado"
}
```

---

### 3. Obtener Usuario Actual

**GET** `/api/auth/me`

Obtiene información del usuario autenticado.

**Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**

```json
{
  "success": true,
  "user": {
    "iduser": 1,
    "usuario": "admin",
    "nombre": "Administrador"
  }
}
```

---

### 4. Cambiar Contraseña

**POST** `/api/auth/change-password`

Cambia la contraseña de un usuario.

**Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Request Body:**

```json
{
  "usuario": "admin",
  "passwordActual": "12345678",
  "passwordNueva": "87654321"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Contraseña actualizada correctamente"
}
```

**Validaciones:**

- La contraseña actual debe ser correcta
- La nueva contraseña debe tener al menos 6 caracteres
- La nueva contraseña debe ser diferente a la actual

---

### 5. Logout

**POST** `/api/auth/logout`

Registra el logout del usuario (principalmente para auditoría).

**Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Logout exitoso. Por favor, elimina el token del cliente."
}
```

---

### 6. Refresh Token

**POST** `/api/auth/refresh-token`

Valida y obtiene datos actualizados del usuario.

**Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (200 OK):**

```json
{
  "success": true,
  "user": {
    "iduser": 1,
    "usuario": "admin",
    "nombre": "Administrador"
  },
  "message": "Usuario validado"
}
```

---

## Flujo de Autenticación

### 1. Login

```
POST /api/auth/login
  ↓
{usuario, password}
  ↓
Buscar usuario en BD
  ↓
Verificar contraseña con bcrypt
  ↓
Generar JWT token
  ↓
Retornar token + user info
```

### 2. Uso de Token en Endpoints Protegidos

```
GET /api/clientes
Headers: Authorization: Bearer {token}
  ↓
Middleware authenticateToken
  ↓
Verificar y decodificar token
  ↓
Si válido → continuar a handler
Si inválido → retornar 401
```

### 3. Cambiar Contraseña

```
POST /api/auth/change-password
Headers: Authorization: Bearer {token}
Body: {usuario, passwordActual, passwordNueva}
  ↓
Validar token
  ↓
Obtener usuario
  ↓
Verificar passwordActual
  ↓
Hash nueva password con bcrypt
  ↓
Guardar en BD
```

---

## Protección de Endpoints

### Endpoints Protegidos (Requieren token)

- GET `/api/clientes` ✅
- GET `/api/clientes/:id` ✅
- GET `/api/clientes/search` ✅
- POST `/api/clientes` ✅
- GET `/api/localidades` ✅
- GET `/api/localidades/:id` ✅
- GET `/api/localidades/search` ✅
- GET `/api/solicitudes` ✅
- GET `/api/solicitudes/:id` ✅
- GET `/api/solicitudes/nro/:nro` ✅
- POST `/api/solicitudes` ✅
- PUT `/api/solicitudes/:id` ✅
- Y todos los demás endpoints excepto `/health` y `/api/auth/login`

### Endpoints Públicos

- GET `/health` (sin autenticación)
- POST `/api/auth/login` (sin autenticación)
- POST `/api/auth/validate-token` (sin autenticación)

---

## Uso desde Frontend

### Ejemplo con JavaScript/TypeScript

```typescript
// 1. Login
const loginResponse = await fetch("http://localhost:4000/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ usuario: "admin", password: "12345678" }),
});

const { token, user } = await loginResponse.json();
localStorage.setItem("auth_token", token);

// 2. Usar token en solicitudes autenticadas
const clientesResponse = await fetch("http://localhost:4000/api/clientes", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

// 3. Obtener usuario actual
const meResponse = await fetch("http://localhost:4000/api/auth/me", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const currentUser = await meResponse.json();
console.log(currentUser.user);

// 4. Cambiar contraseña
const changeResponse = await fetch(
  "http://localhost:4000/api/auth/change-password",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      usuario: "admin",
      passwordActual: "12345678",
      passwordNueva: "87654321",
    }),
  },
);

// 5. Logout
const logoutResponse = await fetch("http://localhost:4000/api/auth/logout", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

localStorage.removeItem("auth_token");
```

---

## Seguridad

### Implementado

✅ Contraseñas hasheadas con bcrypt (10 rounds)
✅ JWT tokens con expiración (24h)
✅ Middleware de autenticación
✅ Validación de usuario activo
✅ Validación de contraseña anterior para cambios

### Recomendaciones Adicionales

- [ ] Rate limiting en endpoint de login (prevenir fuerza bruta)
- [ ] Implementar refresh tokens (renovación sin re-login)
- [ ] Auditoría de cambios de contraseña
- [ ] Encriptación de datos sensibles en tránsito (HTTPS)
- [ ] Implementar 2FA (two-factor authentication)
- [ ] Registrar intentos de login fallidos
- [ ] Expirar sesión por inactividad

---

## Códigos de Respuesta HTTP

| Código | Significado                          |
| ------ | ------------------------------------ |
| 200    | OK - Operación exitosa               |
| 201    | Created - Recurso creado             |
| 400    | Bad Request - Datos inválidos        |
| 401    | Unauthorized - Autenticación fallida |
| 403    | Forbidden - No autorizado            |
| 404    | Not Found - Recurso no encontrado    |
| 500    | Server Error - Error del servidor    |

---

## Configuración

### Variables de Entorno

```bash
JWT_SECRET=tu-clave-secreta-cambiar-en-produccion
JWT_EXPIRES_IN=24h
PORT=4000
SUPABASE_URL=...
SUPABASE_KEY=...
```

### En Producción

⚠️ **IMPORTANTE:**

- Cambiar `JWT_SECRET` a una cadena segura
- Usar HTTPS obligatoriamente
- Implementar rate limiting
- Usar tokens corta duración (1-2h)
- Implementar refresh tokens
- Habilitar CORS restrictivo

---

## Ejemplo de Error Handling

```json
{
  "success": false,
  "error": "Usuario o contraseña inválidos"
}
```

Todos los errores siguen este formato consistente.
