
-- Update Plan Mensual: remove "Certificado de finalización"
UPDATE public.pricing_plans
SET features = '[
  "Después de 7 días de prueba gratis",
  "Acceso completo a todos los cursos",
  "Lecciones de gramática, vocabulario, lectura y escucha",
  "Práctica con IA (escritura y conversación)",
  "Seguimiento de progreso semanal",
  "Soporte prioritario"
]'::jsonb
WHERE slug = 'mensual';

-- Update Clase en Vivo: Google Meet, remove recording
UPDATE public.pricing_plans
SET features = '[
  "Sesión 1 a 1 por Google Meet con profesor nativo",
  "Duración: 45-60 minutos",
  "Paga por sesión, sin suscripción",
  "Elige tu horario preferido",
  "Retroalimentación personalizada",
  "Enlace de Google Meet enviado por correo"
]'::jsonb
WHERE slug = 'clase-vivo';
