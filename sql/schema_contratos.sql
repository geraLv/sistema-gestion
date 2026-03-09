-- 1. Crear la tabla de contratos
CREATE TABLE IF NOT EXISTS contratos (
  idcontrato uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  relasolicitud integer REFERENCES solicitud(idsolicitud) ON DELETE CASCADE,
  token_acceso uuid DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  estado integer DEFAULT 1, -- 1: Pendiente de firma, 2: Firmado
  url_pdf_original varchar,
  url_pdf_firmado varchar,
  fecha_generacion timestamp with time zone DEFAULT now(),
  fecha_firma timestamp with time zone,
  ip_cliente_firma varchar
);

-- Habilitar RLS (opcional pero recomendado)
ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;

-- Crear políticas para la tabla contratos (permitir lectura con token y acceso admin)
CREATE POLICY "Public acceso a contratos por token" ON contratos 
FOR SELECT USING (true); -- o puedes restringirlo más

CREATE POLICY "Admin acceso total contratos" ON contratos 
FOR ALL USING (true);

-- 2. Crear y configurar el bucket 'contratos' en Supabase Storage
INSERT INTO storage.buckets (id, name, public) 
VALUES ('contratos', 'contratos', true)
ON CONFLICT (id) DO NOTHING;

-- Configuracion RLS para el bucket 'contratos'
CREATE POLICY "Public Access" 
  ON storage.objects FOR SELECT 
  USING ( bucket_id = 'contratos' );

CREATE POLICY "Allow All para Service Roles y usuarios"
  ON storage.objects FOR ALL
  USING ( bucket_id = 'contratos' );
