# Backend migrado a TypeScript + Supabase

Implementación del backend en TypeScript usando Express + Supabase como base de datos.

## Quick Start

```bash
cd sistema-migrado/backend
npm install
npm run dev
```

El servidor estará disponible en `http://localhost:4000`

## ⚙️ Configuración de Entorno

**IMPORTANTE:** Debes configurar las variables de entorno antes de ejecutar el servidor.

1. **Copiar el archivo de ejemplo:**
   ```bash
   cp .env.example .env
   ```

2. **Generar JWT secrets seguros:**
   ```bash
   # Genera un secret aleatorio de 64 bytes
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
   Copia el resultado y úsalo para `JWT_SECRET` y `JWT_REFRESH_SECRET` en tu `.env`

3. **Configurar Supabase:**
   - Obtén `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` desde tu dashboard de Supabase
   - Actualiza estos valores en tu `.env`

4. **Ajustar CORS (opcional):**
   - Para desarrollo local, el valor por defecto funciona
   - Para producción, actualiza `CORS_ORIGIN` con tu dominio frontend

**Variables requeridas en `.env`:**
- `SUPABASE_URL` - URL de tu proyecto Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key de Supabase
- `JWT_SECRET` - Secret para tokens JWT (mínimo 32 caracteres)
- `JWT_REFRESH_SECRET` - Secret para refresh tokens (mínimo 32 caracteres)
- `PORT` - Puerto del servidor (default: 4000)
- `CORS_ORIGIN` - Origen permitido para CORS


## Estructura del Proyecto

```
src/
├── index.ts              # Entrypoint principal
├── db.ts                 # Cliente Supabase
├── types/
│   └── cliente.ts        # Tipos/DTOs para Cliente
├── routes/
│   ├── auth.ts           # Rutas de autenticación
│   ├── clientes.ts       # Rutas CRUD de clientes
│   └── localidades.ts    # Rutas de localidades
├── services/
│   └── clienteService.ts # Lógica de negocio (clientes)
└── repositories/
    └── clienteRepository.ts # Acceso a datos (clientes)
```

## Módulos Implementados

### ✅ Módulo Clientes - COMPLETADO

**Endpoints disponibles:**

- `GET /api/clientes` - Listar todos los clientes
- `GET /api/clientes/search?q=<nombre>` - Buscar clientes
- `GET /api/clientes/:id` - Obtener un cliente por ID
- `POST /api/clientes` - Crear o actualizar cliente

**Validaciones incluidas:**

- appynom: obligatorio, no vacío
- dni: obligatorio, único, formato 7-8 dígitos
- direccion: obligatoria, no vacía
- telefono: obligatorio, no vacío
- selectLocalidades: obligatorio, ID válido

**Documentación:** [CLIENTES_API.md](CLIENTES_API.md)

**Ejemplos:** [CLIENTES_EJEMPLOS.ts](CLIENTES_EJEMPLOS.ts)

## Arquitectura

Patrón **3-layer**:

1. **Routes** → Manejo HTTP
2. **Services** → Lógica de negocio
3. **Repositories** → Acceso a datos (Supabase)

Beneficios:

- Testeable
- Mantenible
- Agnóstico a BD
- Reutilizable

## Scripts

```bash
npm run dev      # Desarrollo con hot reload
npm run build    # Compilar TypeScript
npm start        # Producción (compilado)
```

## Health Check

```bash
curl http://localhost:4000/health
```

## Configuración

`.env.example` contiene las credenciales de Supabase ya configuradas.

```env
SUPABASE_URL=https://proyecto.supabase.co
SUPABASE_KEY=tu_anon_key
PORT=4000
```

## Siguientes módulos a implementar

- [ ] Solicitudes
- [ ] Cuotas/Pagos
- [ ] Vendedores
- [ ] Impresiones/PDF
- [ ] Tests unitarios
- [ ] Autenticación mejorada (JWT)
- [ ] Manejo de errores global
- [ ] Rate limiting
# sistema-gestion
