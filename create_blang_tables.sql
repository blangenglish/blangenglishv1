
-- ============================================================
-- BLANG ACADEMY - Database Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- COURSES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  level TEXT NOT NULL,         -- e.g. 'A1', 'A2', 'B1', 'B2', 'C1'
  level_label TEXT NOT NULL,   -- e.g. 'Principiante', 'Elemental'
  emoji TEXT NOT NULL DEFAULT '📚',
  description TEXT,
  color_from TEXT DEFAULT 'from-green-400/20',
  color_to TEXT DEFAULT 'to-emerald-400/20',
  badge_color TEXT DEFAULT 'bg-green-100 text-green-700',
  border_color TEXT DEFAULT 'border-green-200',
  total_units INT DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- UNITS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MATERIALS (per unit)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('grammar','vocabulary','reading','listening','ai_practice','video','pdf','link','text')),
  title TEXT NOT NULL,
  content TEXT,           -- text content or URL
  file_url TEXT,          -- storage URL for uploaded files
  sort_order INT DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRICING PLANS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pricing_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  price_usd NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_cop NUMERIC(12,0) NOT NULL DEFAULT 0,
  billing_period TEXT NOT NULL DEFAULT 'mes',
  emoji TEXT DEFAULT '🚀',
  description TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  is_popular BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT true,
  cta_text TEXT DEFAULT 'Comenzar',
  badge TEXT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SITE SETTINGS (key/value store for all site config)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.site_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  label TEXT,
  group_name TEXT DEFAULT 'general',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ADMIN USERS (simple table to mark which auth users are admins)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Courses: public read, admin write
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "courses_public_read" ON public.courses FOR SELECT USING (true);
CREATE POLICY "courses_admin_all" ON public.courses FOR ALL USING (
  auth.uid() IN (SELECT id FROM public.admin_users)
);

-- Units: public read, admin write
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "units_public_read" ON public.units FOR SELECT USING (true);
CREATE POLICY "units_admin_all" ON public.units FOR ALL USING (
  auth.uid() IN (SELECT id FROM public.admin_users)
);

-- Materials: public read, admin write
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "materials_public_read" ON public.materials FOR SELECT USING (true);
CREATE POLICY "materials_admin_all" ON public.materials FOR ALL USING (
  auth.uid() IN (SELECT id FROM public.admin_users)
);

-- Pricing: public read, admin write
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pricing_public_read" ON public.pricing_plans FOR SELECT USING (true);
CREATE POLICY "pricing_admin_all" ON public.pricing_plans FOR ALL USING (
  auth.uid() IN (SELECT id FROM public.admin_users)
);

-- Site settings: public read, admin write
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_public_read" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "settings_admin_all" ON public.site_settings FOR ALL USING (
  auth.uid() IN (SELECT id FROM public.admin_users)
);

-- Admin users: only admins can read
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_users_self_read" ON public.admin_users FOR SELECT USING (
  auth.uid() = id
);
CREATE POLICY "admin_users_admin_all" ON public.admin_users FOR ALL USING (
  auth.uid() IN (SELECT id FROM public.admin_users)
);

-- ============================================================
-- STORAGE BUCKET for materials
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('materials', 'materials', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "materials_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'materials');
CREATE POLICY "materials_admin_upload" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'materials' AND auth.uid() IN (SELECT id FROM public.admin_users)
);
CREATE POLICY "materials_admin_delete" ON storage.objects FOR DELETE USING (
  bucket_id = 'materials' AND auth.uid() IN (SELECT id FROM public.admin_users)
);

-- ============================================================
-- SEED DATA - Courses
-- ============================================================
INSERT INTO public.courses (title, slug, level, level_label, emoji, description, color_from, color_to, badge_color, border_color, total_units, sort_order) VALUES
('Inglés desde Cero',    'ingles-desde-cero',    'A1', 'Principiante (A1)',        '🌱', 'Saludos, números, colores, familia y primeras conversaciones. El punto de partida perfecto.', 'from-green-400/20',  'to-emerald-400/20', 'bg-green-100 text-green-700',  'border-green-200',  27, 1),
('Inglés Elemental',     'ingles-elemental',     'A2', 'Elemental (A2)',            '📗', 'Amplía tu vocabulario y empieza a construir frases completas con confianza.',                  'from-teal-400/20',   'to-cyan-400/20',    'bg-teal-100 text-teal-700',    'border-teal-200',   5,  2),
('Inglés Intermedio',    'ingles-intermedio',    'B1', 'Intermedio (B1)',           '📘', 'Habla sobre el mundo, viajes y situaciones cotidianas. Gramática intermedia y mucha práctica.','from-blue-400/20',   'to-indigo-400/20',  'bg-blue-100 text-blue-700',    'border-blue-200',   10, 3),
('Intermedio Avanzado',  'intermedio-avanzado',  'B2', 'Intermedio Avanzado (B2)', '📙', 'Phrasal verbs, modismos y conversaciones fluidas. Lleva tu inglés al siguiente nivel.',        'from-purple-400/20', 'to-violet-400/20',  'bg-purple-100 text-purple-700','border-purple-200', 13, 4),
('Inglés Avanzado',      'ingles-avanzado',      'C1', 'Avanzado (C1)',             '🏆', 'Domina el inglés con fluidez y precisión. Debates, textos académicos y conversaciones complejas.','from-amber-400/20','to-yellow-400/20', 'bg-amber-100 text-amber-700',  'border-amber-200',  15, 5)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- SEED DATA - Pricing Plans
-- ============================================================
INSERT INTO public.pricing_plans (name, slug, price_usd, price_cop, billing_period, emoji, features, is_popular, cta_text, badge, sort_order) VALUES
('Prueba Gratis', 'prueba', 0, 0, '7 días', '🎁',
  '["7 días completamente gratis","Sin tarjeta de crédito","Acceso 5 lecciones de nivel básico","Una clase en vivo de muestra","Seguimiento de progreso","Soporte por correo"]'::jsonb,
  false, 'Empezar gratis ahora', NULL, 1),
('Plan Mensual', 'mensual', 15, 50000, 'mes', '🚀',
  '["Después de 7 días de prueba gratis","Acceso completo a todos los cursos","Lecciones de gramática, vocabulario, lectura y escucha","Práctica con IA (escritura y conversación)","Seguimiento de progreso semanal","Certificado de finalización","Soporte prioritario"]'::jsonb,
  true, '¡Inscribirte ya! 50% descuento', '🔥 Oferta de lanzamiento', 2),
('Clase en Vivo', 'clase-vivo', 10, 35000, 'sesión', '🎥',
  '["Sesión 1 a 1 online con profesor nativo","Duración: 45-60 minutos","Paga por sesión, sin suscripción","Elige tu horario preferido","Retroalimentación personalizada","Grabación de la sesión incluida"]'::jsonb,
  false, 'Reservar sesión', NULL, 3)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- SEED DATA - Site Settings
-- ============================================================
INSERT INTO public.site_settings (key, value, label, group_name) VALUES
('hero_title',          'Aprende inglés de verdad 😎',                           'Título del Hero',            'hero'),
('hero_subtitle',       'Diseñado especialmente para hispanohablantes. Metodología intuitiva por unidades, clases en vivo y práctica real con IA.', 'Subtítulo del Hero', 'hero'),
('hero_cta_primary',    '¡Empieza gratis ahora! 🚀',                             'Botón Principal Hero',       'hero'),
('trial_days',          '7',                                                      'Días de prueba gratis',      'pricing'),
('launch_discount_pct', '50',                                                     '% Descuento lanzamiento',    'pricing'),
('paypal_email',        '',                                                       'Email de PayPal',            'payments'),
('bancolombia_account', '',                                                       'Número cuenta Bancolombia',  'payments'),
('bancolombia_name',    '',                                                       'Nombre titular Bancolombia', 'payments'),
('bancolombia_type',    'Ahorros',                                               'Tipo cuenta Bancolombia',    'payments'),
('contact_email',       'hola@blangacademy.com',                                 'Email de contacto',          'general'),
('instagram_url',       '#',                                                      'URL Instagram',              'social'),
('facebook_url',        '#',                                                      'URL Facebook',               'social'),
('tiktok_url',          '#',                                                      'URL TikTok',                 'social'),
('youtube_url',         '#',                                                      'URL YouTube',                'social')
ON CONFLICT (key) DO NOTHING;
