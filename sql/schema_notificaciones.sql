-- ============================================
-- Modulo de Notificaciones Automaticas
-- ============================================
-- Este esquema crea soporte para:
-- - Tipos de notificacion configurables
-- - Plantillas versionadas por canal
-- - Cola persistente de envios con idempotencia
-- - Historial de eventos por envio

CREATE TABLE IF NOT EXISTS notificacion_tipo (
  idtipo SERIAL PRIMARY KEY,
  codigo VARCHAR(40) NOT NULL UNIQUE,
  descripcion TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notificacion_plantilla (
  idplantilla SERIAL PRIMARY KEY,
  rel_tipo INTEGER NOT NULL REFERENCES notificacion_tipo(idtipo) ON DELETE CASCADE,
  canal VARCHAR(20) NOT NULL DEFAULT 'email',
  asunto_template TEXT NOT NULL,
  cuerpo_template TEXT NOT NULL,
  locale VARCHAR(10) NOT NULL DEFAULT 'es-AR',
  version INTEGER NOT NULL DEFAULT 1,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_notificacion_plantilla UNIQUE (rel_tipo, canal, locale, version)
);

CREATE TABLE IF NOT EXISTS notificacion_envio (
  idenvio BIGSERIAL PRIMARY KEY,
  rel_tipo INTEGER NOT NULL REFERENCES notificacion_tipo(idtipo),
  canal VARCHAR(20) NOT NULL DEFAULT 'email',
  rel_cuota INTEGER REFERENCES cuotas(idcuota) ON DELETE SET NULL,
  rel_cliente INTEGER NOT NULL REFERENCES cliente(idcliente) ON DELETE CASCADE,
  fecha_programada DATE NOT NULL,
  fecha_objetivo DATE,
  idempotency_key VARCHAR(255) NOT NULL UNIQUE,
  estado VARCHAR(20) NOT NULL DEFAULT 'pending',
  intentos INTEGER NOT NULL DEFAULT 0,
  max_intentos INTEGER NOT NULL DEFAULT 4,
  proximo_intento TIMESTAMPTZ,
  lock_token UUID,
  lock_at TIMESTAMPTZ,
  provider_message_id VARCHAR(120),
  ultimo_error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  CONSTRAINT chk_notificacion_estado CHECK (estado IN ('pending', 'processing', 'failed', 'sent', 'dead')),
  CONSTRAINT chk_notificacion_intentos CHECK (intentos >= 0 AND max_intentos > 0)
);

CREATE INDEX IF NOT EXISTS idx_notificacion_envio_estado_next
  ON notificacion_envio (estado, proximo_intento, created_at);

CREATE INDEX IF NOT EXISTS idx_notificacion_envio_cliente
  ON notificacion_envio (rel_cliente, created_at DESC);

CREATE TABLE IF NOT EXISTS notificacion_evento (
  idevento BIGSERIAL PRIMARY KEY,
  rel_envio BIGINT NOT NULL REFERENCES notificacion_envio(idenvio) ON DELETE CASCADE,
  tipo_evento VARCHAR(40) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notificacion_evento_envio
  ON notificacion_evento (rel_envio, created_at);

-- Seed de tipos base
INSERT INTO notificacion_tipo (codigo, descripcion, activo)
VALUES
  ('DUE_IN_3_DAYS', 'Aviso: la cuota vence en 3 dias', TRUE),
  ('DUE_TOMORROW', 'Aviso: la cuota vence manana', TRUE),
  ('OVERDUE', 'Aviso: la cuota esta vencida', TRUE),
  ('BIRTHDAY', 'Aviso opcional de cumpleanos', FALSE)
ON CONFLICT (codigo) DO NOTHING;

-- Seed de plantillas base por email
INSERT INTO notificacion_plantilla (rel_tipo, canal, asunto_template, cuerpo_template, locale, version, activo)
SELECT idtipo, 'email',
  'Recordatorio: tu cuota vence en 3 dias',
  'Hola {{clienteNombre}},\n\nTe recordamos que tu cuota #{{nroCuota}} de la solicitud {{nroSolicitud}} vence el {{fechaVencimiento}}.\n\nImporte: ${{importe}}\n\nSi ya abonaste, podes ignorar este mensaje.\n\nSaludos,\nEquipo de Cobranzas',
  'es-AR', 1, TRUE
FROM notificacion_tipo
WHERE codigo = 'DUE_IN_3_DAYS'
ON CONFLICT (rel_tipo, canal, locale, version) DO NOTHING;

INSERT INTO notificacion_plantilla (rel_tipo, canal, asunto_template, cuerpo_template, locale, version, activo)
SELECT idtipo, 'email',
  'Recordatorio: tu cuota vence manana',
  'Hola {{clienteNombre}},\n\nTu cuota #{{nroCuota}} de la solicitud {{nroSolicitud}} vence manana ({{fechaVencimiento}}).\n\nImporte: ${{importe}}\n\nSi ya abonaste, podes ignorar este mensaje.\n\nSaludos,\nEquipo de Cobranzas',
  'es-AR', 1, TRUE
FROM notificacion_tipo
WHERE codigo = 'DUE_TOMORROW'
ON CONFLICT (rel_tipo, canal, locale, version) DO NOTHING;

INSERT INTO notificacion_plantilla (rel_tipo, canal, asunto_template, cuerpo_template, locale, version, activo)
SELECT idtipo, 'email',
  'Aviso: cuota vencida',
  'Hola {{clienteNombre}},\n\nTu cuota #{{nroCuota}} de la solicitud {{nroSolicitud}} se encuentra vencida desde el {{fechaVencimiento}}.\n\nImporte adeudado: ${{importe}}\n\nTe pedimos regularizarla a la brevedad.\n\nSaludos,\nEquipo de Cobranzas',
  'es-AR', 1, TRUE
FROM notificacion_tipo
WHERE codigo = 'OVERDUE'
ON CONFLICT (rel_tipo, canal, locale, version) DO NOTHING;

INSERT INTO notificacion_plantilla (rel_tipo, canal, asunto_template, cuerpo_template, locale, version, activo)
SELECT idtipo, 'email',
  'Feliz cumpleanos de parte del equipo',
  'Hola {{clienteNombre}},\n\nTe deseamos un muy feliz cumpleanos.\n\nGracias por confiar en nosotros.\n\nSaludos,\nEquipo de Cobranzas',
  'es-AR', 1, TRUE
FROM notificacion_tipo
WHERE codigo = 'BIRTHDAY'
ON CONFLICT (rel_tipo, canal, locale, version) DO NOTHING;
