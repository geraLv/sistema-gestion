# Modulo de Notificaciones Automaticas

## 1) Crear tablas en Supabase

Ejecutar el script:

- `sql/schema_notificaciones.sql`

Este script crea:

- `notificacion_tipo`
- `notificacion_plantilla`
- `notificacion_envio`
- `notificacion_evento`

y carga tipos/plantillas iniciales para email.

## 2) Variables de entorno

Agregar en `.env`:

- `EMAIL_PROVIDER=resend`
- `RESEND_API_KEY=...`
- `EMAIL_FROM=Cobranzas <cobranzas@tu-dominio.com>`
- `NOTIFICATION_TIMEZONE=America/Argentina/Buenos_Aires`
- `NOTIFICATION_ENABLE_BIRTHDAY=false`
- `NOTIFICATION_MAX_DISPATCH_PER_RUN=300`

## 3) Ejecutar job manualmente

Desarrollo:

```bash
npm run notifications:daily:dev
```

Con fecha forzada:

```bash
npm run notifications:daily:dev -- --date=2026-03-17
```

Produccion (luego de build):

```bash
npm run build
npm run notifications:daily
```

## 4) Configurar Cron Job en Render

Comando recomendado:

```bash
npm run notifications:daily
```

Frecuencia diaria sugerida:

- `0 10 * * *` (10:00 UTC) o el horario que prefieras.

## 5) Comportamiento de idempotencia y reintentos

- No duplica envios: usa `idempotency_key` unica por evento.
- Reintentos automaticos con backoff: 5m, 30m, 2h, 12h.
- Si supera max intentos o error permanente: estado `dead`.

## 6) Archivos implementados

- `src/types/notificacion.ts`
- `src/repositories/notificacionRepository.ts`
- `src/services/notificacionTemplateService.ts`
- `src/services/emailService.ts`
- `src/services/notificacionService.ts`
- `src/scripts/runDailyNotifications.ts`
