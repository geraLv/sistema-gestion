# 🗺️ Roadmap y Próximos Pasos

## Estado Actual del Proyecto

✅ **Fase 1**: Análisis y Planificación - COMPLETADA
✅ **Fase 2**: Scaffold y Setup - COMPLETADA
✅ **Fase 3**: Implementación de Módulos Base - COMPLETADA

- Clientes (CRUD completo)
- Localidades (READ)
- Solicitudes (CRUD + Lógica compleja)

---

## 📋 Fase 4: Módulos Restantes (Próxima)

### 4.1 Módulo Cuotas/Pagos (PRIORIDAD ALTA)

**Dependencias:** Solicitudes ✅

**Archivos a crear:**

- `src/types/cuota.ts` - Interfaces
- `src/repositories/cuotaRepository.ts` - Data access
- `src/services/cuotaService.ts` - Lógica de negocio
- `src/routes/cuotas.ts` - Endpoints HTTP

**Funcionalidades:**

```
Operaciones:
├─ Pagar cuota individual
│  └─ UPDATE estado=2, fecha=hoy, recalcular solicitud
├─ Pagar múltiples cuotas
│  └─ Loop con update
├─ Modificar importe de cuota
│  └─ UPDATE importe, recalcular solicitud
├─ Consultar adelanto
│  └─ SELECT FROM adelanto
├─ Cargar adelanto
│  └─ INSERT adelanto, aplicar a cuota
├─ Listar cuotas vencidas
│  └─ SELECT WHERE vencimiento < HOY AND estado=0
└─ Listar cuotas pagadas
   └─ SELECT WHERE estado=2

Endpoints:
POST   /api/cuotas/pagar                    # Pagar una o múltiples
GET    /api/cuotas/vencidas                # Vencidas
GET    /api/cuotas/pagadas                 # Pagadas
POST   /api/adelantos                      # Registrar adelanto
GET    /api/adelantos/:idsolicitud         # Obtener adelantos
```

**Lógica clave:**

- Pagar cuota → actualizar solicitud.totalabonado
- Recalcular porcentaje_pagado
- Validar que cuota existe y no está pagada
- Manejar adelantos (descuento aplicable)

---

### 4.2 Módulo Vendedores (PRIORIDAD MEDIA)

**Dependencias:** Ninguna ✅

**Archivos a crear:**

- `src/types/vendedor.ts`
- `src/repositories/vendedorRepository.ts`
- `src/services/vendedorService.ts`
- `src/routes/vendedores.ts`

**Funcionalidades:**

```
Operaciones:
├─ Crear vendedor
├─ Actualizar vendedor
├─ Obtener vendedor por ID
├─ Listar todos
├─ Buscar por nombre
├─ Eliminar vendedor
└─ Obtener comisiones

Endpoints:
GET    /api/vendedores              # Listar
GET    /api/vendedores/search?q     # Buscar
GET    /api/vendedores/:id          # Por ID
POST   /api/vendedores              # Crear
PUT    /api/vendedores/:id          # Actualizar
DELETE /api/vendedores/:id          # Eliminar
```

---

### 4.3 Módulo Productos (PRIORIDAD MEDIA)

**Dependencias:** Ninguna ✅

**Archivos a crear:**

- `src/types/producto.ts`
- `src/repositories/productoRepository.ts`
- `src/services/productoService.ts`
- `src/routes/productos.ts`

**Funcionalidades:**

```
Operaciones:
├─ Crear producto
├─ Actualizar producto
├─ Obtener producto por ID
├─ Listar todos
├─ Buscar por descripción
├─ Eliminar producto
└─ Obtener productos por categoría

Endpoints:
GET    /api/productos              # Listar
GET    /api/productos/search?q     # Buscar
GET    /api/productos/:id          # Por ID
POST   /api/productos              # Crear
PUT    /api/productos/:id          # Actualizar
DELETE /api/productos/:id          # Eliminar
```

---

### 4.4 Módulo Adelantos (PRIORIDAD MEDIA)

**Dependencias:** Solicitudes ✅, Cuotas (en desarrollo)

**Archivos a crear:**

- `src/types/adelanto.ts`
- `src/repositories/adelantoRepository.ts`
- `src/services/adelantoService.ts`
- `src/routes/adelantos.ts`

**Funcionalidades:**

```
Operaciones:
├─ Registrar adelanto
├─ Obtener adelantos por solicitud
├─ Aplicar adelanto a cuota
├─ Listar adelantos
└─ Consultar saldo disponible

Endpoints:
POST   /api/adelantos                       # Registrar
GET    /api/adelantos/solicitud/:id         # Por solicitud
GET    /api/adelantos/:id/aplicar           # Aplicar
GET    /api/adelantos/saldo/:idsolicitud    # Saldo
```

---

## 🔧 Fase 5: Testing (DESPUÉS DE MÓDULOS)

### 5.1 Tests Unitarios (Jest)

```
Estructura:
├─ __tests__/
│  ├─ services/
│  │  ├─ clienteService.test.ts
│  │  ├─ localidadService.test.ts
│  │  ├─ solicitudService.test.ts
│  │  ├─ cuotaService.test.ts
│  │  └─ ...
│  ├─ repositories/
│  ├─ utils/
│  └─ validation.test.ts
```

**Cobertura objetivo:** 80%+

### 5.2 Tests de Integración

```
Pruebas E2E:
├─ Crear solicitud → generar cuotas → pagar
├─ Crear cliente → listar → actualizar
├─ Extender cuotas → verificar vencimientos
└─ Filtros y búsquedas
```

---

## 🚀 Fase 6: Infraestructura y DevOps

### 6.1 CI/CD (GitHub Actions)

```yaml
Workflows:
├─ Test on push
├─ Build on PR
├─ Deploy on merge main
├─ Lint y format check
└─ TypeScript strict check
```

### 6.2 Logging y Monitoring

- Winston para logs estructurados
- Sentry para error tracking
- Prometheus para métricas

### 6.3 Seguridad

```
Implementar:
├─ JWT authentication
├─ Role-based access control (RBAC)
├─ Rate limiting
├─ Input sanitization (helmet)
├─ CORS restrictivo
├─ API key validation
└─ Encriptación de passwords (bcrypt)
```

---

## 📚 Fase 7: Documentación Avanzada

### 7.1 Swagger/OpenAPI

```bash
npm install swagger-jsdoc swagger-ui-express
```

Generar documentación interactiva en `/api-docs`

### 7.2 Guías de Desarrollo

- CONTRIBUTING.md
- DEPLOYMENT.md
- ARCHITECTURE.md
- TROUBLESHOOTING.md

### 7.3 Ejemplos de Cliente

- Postman collection
- Curl examples
- JavaScript/TypeScript client SDK

---

## 📊 Orden de Implementación Recomendado

### **PRIORITARIO (Semana 1)**

1. ✅ Solicitudes - HECHO
2. ⏳ Cuotas/Pagos (AHORA)
   - Implementación: 2-3 horas
   - Testing: 1 hora

### **IMPORTANTE (Semana 2)**

3. ⏳ Vendedores
   - Implementación: 1-2 horas
   - Testing: 30 min

4. ⏳ Productos
   - Implementación: 1-2 horas
   - Testing: 30 min

### **COMPLEMENTARIO (Semana 3)**

5. ⏳ Adelantos
   - Implementación: 1-2 horas
   - Testing: 30 min

### **INFRAESTRUCTURA (Semana 4)**

6. ⏳ Tests automatizados
7. ⏳ CI/CD setup
8. ⏳ Documentación Swagger

---

## 🎯 Checklist para Siguiente Módulo (Cuotas)

- [ ] Analizar PHP: fetch/pagarCuota.php, update_cuota.php, cargarAdelanto.php
- [ ] Crear tipos/interfaces
- [ ] Crear repository con 8+ métodos
- [ ] Crear service con validaciones
- [ ] Crear endpoints HTTP
- [ ] Integrar en index.ts
- [ ] Documentar API
- [ ] Compilar sin errores
- [ ] Escribir ejemplos
- [ ] Pruebas en Postman

---

## 📈 Progreso General

```
Fase 1: Análisis           ████████░░ 100% ✅
Fase 2: Setup             ████████░░ 100% ✅
Fase 3: Módulos Base      ████████░░ 100% ✅
Fase 4: Módulos Restantes ██░░░░░░░ 20%  ⏳
Fase 5: Testing           ░░░░░░░░░░ 0%   📅
Fase 6: DevOps            ░░░░░░░░░░ 0%   📅
Fase 7: Docs              ░░░░░░░░░░ 0%   📅

Progreso Total: ~33% 🚀
```

---

## 💡 Optimizaciones Futuras

### Performance

- [ ] Índices en Supabase (nrosolicitud, vencimiento)
- [ ] Caché Redis para búsquedas
- [ ] Paginación en endpoints
- [ ] Query optimization

### UX/DX

- [ ] API response wrapper consistente
- [ ] Error codes numéricos
- [ ] Timestamps en respuestas
- [ ] Validación en cliente (frontend)

### Mantenibilidad

- [ ] Middleware de autenticación
- [ ] Middleware de logging
- [ ] Middleware de validación centralizada
- [ ] Utility functions reutilizables

---

## 🔗 Dependencias entre Módulos

```
Vendedores ◄─┐
             ├─ Solicitudes ◄─┬─ Clientes
             │                ├─ Localidades
             │                └─ Productos ◄─ Cuotas/Pagos
Productos  ◄─┘
             ├─ Adelantos ◄─ Cuotas/Pagos
             └─ Cuotas/Pagos
```

**Orden correcto de implementación:**

1. Clientes ✅
2. Localidades ✅
3. Solicitudes ✅
4. Cuotas/Pagos ⏳ (SIGUIENTE)
5. Vendedores
6. Productos
7. Adelantos

---

## 🚀 Cómo Continuar

### Para implementar Cuotas ahora:

```bash
# 1. Actualizar desde repositorio
git pull

# 2. Analizar PHP de cuotas
# cat sistema/fetch/pagarCuota.php
# cat sistema/fetch/update_cuota.php

# 3. Crear tipos
# vim src/types/cuota.ts

# 4. Crear repository
# vim src/repositories/cuotaRepository.ts

# 5. Crear service
# vim src/services/cuotaService.ts

# 6. Crear routes
# vim src/routes/cuotas.ts

# 7. Integrar en index.ts
# vim src/index.ts

# 8. Compilar y probar
npm run build
npm run dev
```

---

## 📞 Recursos Disponibles

**Archivos de Referencia:**

- `endpoints-inventory.md` - Todos los endpoints PHP
- `ESTADO_GENERAL.md` - Estado completo del proyecto
- `CLIENTES_API.md` - Patrón de implementación
- `SOLICITUDES_API.md` - Lógica compleja de referencia

**Código como Referencia:**

- `src/services/solicitudService.ts` - Validaciones complejas
- `src/repositories/solicitudRepository.ts` - Queries avanzadas
- `src/routes/solicitudes.ts` - Estructura de endpoints

---

## ✨ Próxima Acción

**Recomendación:** Implementar módulo **Cuotas/Pagos** usando el mismo patrón de 3 capas.

¿Deseas que continúe con la implementación del módulo Cuotas?

---

**Actualizado:** 3 de febrero de 2026
