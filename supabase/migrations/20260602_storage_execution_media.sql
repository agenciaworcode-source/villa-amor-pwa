-- ══════════════════════════════════════════════════════════════════════════════
-- Storage: bucket execution-media + políticas RLS
-- Execute no Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Criar bucket (se não existir)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'execution-media',
  'execution-media',
  false,
  52428800, -- 50 MB
  ARRAY[
    'image/jpeg', 'image/png', 'image/webp',
    'video/webm', 'video/mp4', 'video/quicktime'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 2. Colaboradores autenticados podem fazer upload
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'execution_media_insert'
  ) THEN
    CREATE POLICY execution_media_insert ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'execution-media');
  END IF;
END $$;

-- 3. Colaboradores autenticados podem visualizar (para signed URLs)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'execution_media_select'
  ) THEN
    CREATE POLICY execution_media_select ON storage.objects
      FOR SELECT TO authenticated
      USING (bucket_id = 'execution-media');
  END IF;
END $$;
