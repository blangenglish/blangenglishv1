import { motion } from 'framer-motion';
import { Check, Banknote } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { IMAGES } from '@/assets/images';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { usePricingPlans, useSiteSettings } from '@/hooks/useSupabaseData';
import type { DBPricingPlan } from '@/lib/admin';
import type { AuthModal } from '@/lib/index';

interface PricingPageProps {
  isLoggedIn?: boolean;
  onOpenAuth?: (modal: AuthModal) => void;
  onLogout?: () => void;
  userName?: string;
}

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 30 } },
};

const PLAN_GRADIENTS: Record<string, string> = {
  prueba: 'from-green-50 to-emerald-50 border-green-200',
  mensual: 'from-primary/5 to-purple-50 border-primary/30',
  'clase-vivo': 'from-blue-50 to-indigo-50 border-blue-200',
};
const PLAN_BTN: Record<string, string> = {
  prueba: 'bg-green-500 hover:bg-green-600 text-white',
  mensual: 'bg-primary hover:bg-primary/90 text-primary-foreground',
  'clase-vivo': 'bg-blue-600 hover:bg-blue-700 text-white',
};

function PlanCard({ plan, onSelect }: { plan: DBPricingPlan; onSelect: () => void }) {
  const features: string[] = Array.isArray(plan.features) ? (plan.features as string[]) : [];
  const isFree = plan.price_usd === 0;
  const gradient = PLAN_GRADIENTS[plan.slug] ?? 'from-muted/30 to-muted/10 border-border/50';
  const btnClass = PLAN_BTN[plan.slug] ?? 'bg-primary hover:bg-primary/90 text-primary-foreground';

  return (
    <motion.div variants={fadeUp} className="h-full">
      <div
        className={`relative h-full flex flex-col rounded-3xl border-2 bg-gradient-to-br ${gradient} p-7 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}
      >
        {/* Popular badge */}
        {plan.is_popular && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2">
            <span className="bg-primary text-primary-foreground text-xs font-bold px-5 py-1.5 rounded-full shadow-lg shadow-primary/30">
              ⭐ Más Popular
            </span>
          </div>
        )}

        {/* Launch badge */}
        {plan.badge && (
          <div className="mb-3">
            <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full">
              {plan.badge}
            </span>
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <div className="text-4xl mb-3">{plan.emoji}</div>
          <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
          {plan.description && (
            <p className="text-sm text-muted-foreground">{plan.description}</p>
          )}

          {/* Price */}
          <div className="mt-4">
            {isFree ? (
              <span className="text-4xl font-extrabold text-green-600">GRATIS</span>
            ) : (
              <div className="space-y-1">
                <div className="flex items-end gap-1.5">
                  <span className="text-5xl font-extrabold">${plan.price_usd}</span>
                  <span className="text-muted-foreground mb-1.5 text-sm">USD/{plan.billing_period}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl font-bold text-foreground/70">
                    ${Number(plan.price_cop).toLocaleString('es-CO')}
                  </span>
                  <span className="text-muted-foreground text-sm">COP/{plan.billing_period}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Features */}
        <ul className="flex-1 space-y-3 mb-7">
          {features.map((f, i) => (
            <li key={i} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="w-3 h-3 text-primary" />
              </div>
              <span className="text-sm text-foreground/80 leading-snug">{f}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <Button
          className={`w-full rounded-xl py-6 font-bold text-sm ${btnClass}`}
          onClick={onSelect}
        >
          {plan.cta_text} →
        </Button>
      </div>
    </motion.div>
  );
}

const FAQ = [
  { q: '¿Cuánto cuesta después de los 7 días gratis?', a: 'Solo $15 USD ó $50,000 COP al mes. Si te inscribes durante nuestro lanzamiento, pagas el 50% el primer mes.' },
  { q: '¿Cómo puedo pagar?', a: 'Aceptamos PayPal (para cualquier país) y PSE (para residentes en Colombia). ¡Sin tarjeta de crédito!' },
  { q: '¿Puedo cancelar cuando quiera?', a: '¡Claro! No hay contratos ni compromisos. Cancelas cuando quieras desde tu perfil, sin cargos ocultos.' },
  { q: '¿Las sesiones en vivo son incluidas?', a: 'Las sesiones 1 a 1 son un complemento opcional por $10 USD ó $35,000 COP por sesión, independiente de tu suscripción mensual.' },
  { q: '¿Necesito tarjeta para la prueba gratis?', a: 'No. Los 7 días de prueba son completamente gratis y sin necesidad de tarjeta de crédito.' },
];

export default function PricingPage({ isLoggedIn = false, onOpenAuth, onLogout, userName }: PricingPageProps) {
  const { data: plans, loading } = usePricingPlans();
  const { data: settings } = useSiteSettings();

  const trialDays = settings?.trial_days ?? '7';
  const discountPct = settings?.launch_discount_pct ?? '50';
  const paypalEmail = settings?.paypal_email ?? '';
  // Bancolombia removed — only PayPal and PSE supported

  return (
    <Layout isLoggedIn={isLoggedIn} onOpenAuth={onOpenAuth} onLogout={onLogout} userName={userName}>

      {/* PAGE BACKGROUND */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-purple-50 via-violet-50/60 to-background pointer-events-none" />

      {/* HERO */}
      <section className="relative py-16 md:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900 via-purple-800 to-primary" />
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-pink-500/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-amber-400/10 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
            {/* LEFT — text */}
            <div>
              <motion.div variants={fadeUp} className="mb-5">
                <span className="inline-flex items-center gap-2 bg-white/10 text-white/90 text-sm font-semibold px-4 py-2 rounded-full border border-white/20 backdrop-blur">
                  💰 Precios claros, sin sorpresas
                </span>
              </motion.div>
              <motion.h1 variants={fadeUp} className="text-5xl md:text-6xl font-extrabold text-white mb-5 leading-tight">
                Elige tu plan y<br />
                <span className="text-amber-400">empieza hoy gratis</span> 🎉
              </motion.h1>
              <motion.p variants={fadeUp} className="text-lg text-white/80 max-w-xl mb-4">
                {trialDays} días de prueba gratis. Luego solo <strong className="text-white">$15 USD</strong> ó <strong className="text-white">$50,000 COP</strong> al mes.
              </motion.p>
              {/* Flags strip */}
              <motion.div variants={fadeUp} className="flex flex-wrap gap-1.5 mb-5">
                {['🇨🇴','🇲🇽','🇦🇷','🇻🇪','🇵🇪','🇨🇱','🇪🇨','🇧🇴','🇺🇾','🇵🇾','🇨🇷','🇩🇴','🇵🇦','🇭🇳','🇳🇮','🇬🇹','🇸🇻','🇨🇺'].map(f => (
                  <span key={f} className="text-xl select-none">{f}</span>
                ))}
              </motion.div>
              <motion.div variants={fadeUp}>
                <span className="inline-flex items-center gap-2 bg-amber-400/20 text-amber-300 text-sm font-bold px-5 py-2 rounded-full border border-amber-400/30">
                  🔥 Oferta lanzamiento: inscríbete ahora y paga solo el {discountPct}% el primer mes
                </span>
              </motion.div>
            </div>

            {/* RIGHT — instructor */}
            <motion.div variants={fadeUp} className="flex flex-col items-center gap-5">
              <div className="relative">
                <img
                  src={IMAGES.INSTRUCTOR_NOBG}
                  alt="Instructor BLANG"
                  className="w-56 h-56 md:w-72 md:h-72 object-contain"
                  style={{ filter: 'drop-shadow(0 0 40px rgba(251,191,36,0.3))' }}
                />
                <motion.div
                  animate={{ y: [-5, 5, -5] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute -top-2 -right-2 bg-white text-gray-900 rounded-2xl px-3 py-1.5 shadow-xl font-bold text-xs"
                >
                  💰 $7.50 USD primer mes
                </motion.div>
                <motion.div
                  animate={{ y: [5, -5, 5] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute -bottom-2 -left-2 bg-amber-400 text-black rounded-2xl px-3 py-1.5 shadow-xl font-extrabold text-xs"
                >
                  🎁 7 días GRATIS
                </motion.div>
              </div>
              <div className="grid grid-cols-3 gap-2 w-full max-w-xs">
                {[{e:'🎁',t:'Prueba Gratis'},{e:'🚀',t:'Plan Mensual'},{e:'🎥',t:'Clases Vivo'}].map(({e,t}) => (
                  <div key={t} className="bg-white/10 backdrop-blur border border-white/20 rounded-xl px-2 py-2.5 text-center">
                    <span className="text-xl block mb-0.5">{e}</span>
                    <p className="text-white/90 text-xs font-semibold leading-tight">{t}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* PRICING CARDS */}
      <section className="pb-20 -mt-4">
        <div className="container mx-auto px-4">
          {loading ? (
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-96 rounded-3xl bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : (
            <motion.div
              className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-start"
              initial="hidden"
              animate="visible"
              variants={stagger}
            >
              {(plans ?? []).filter(p => p.is_published).map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  onSelect={() => onOpenAuth?.('register')}
                />
              ))}
            </motion.div>
          )}

          <motion.p
            className="text-center text-sm text-muted-foreground mt-8"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          >
            ✅ {trialDays} días gratis &nbsp;·&nbsp; ✅ Sin tarjeta de crédito &nbsp;·&nbsp; ✅ PayPal · PSE
          </motion.p>
        </div>
      </section>

      {/* PAYMENT METHODS */}
      <section className="py-16 bg-purple-50/50">
        <div className="container mx-auto px-4">
          <motion.div
            className="max-w-3xl mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="text-center mb-10">
              <span className="inline-block bg-primary/10 text-primary text-sm font-semibold px-4 py-1.5 rounded-full mb-3">
                <Banknote className="w-4 h-4 inline mr-1" />
                Métodos de pago
              </span>
              <h2 className="text-3xl font-bold">Paga como más te quede fácil</h2>
              <p className="text-muted-foreground mt-2 text-sm">Sin tarjeta de crédito — PayPal o PSE</p>
            </motion.div>

            <motion.div variants={stagger} className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {/* PayPal */}
              <motion.div variants={fadeUp} className="bg-background rounded-2xl border-2 border-[#003087]/20 p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#003087] to-[#0070e0] flex items-center justify-center mb-4 shadow">
                  <svg viewBox="0 0 24 24" className="w-7 h-7 fill-white"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.59 3.025-2.566 6.082-8.558 6.082H9.928l-1.182 7.519H12c.46 0 .85-.334.922-.789l.038-.197.733-4.64.047-.257a.932.932 0 0 1 .921-.789h.58c3.76 0 6.701-1.528 7.559-5.95.36-1.85.176-3.395-.578-4.692z"/></svg>
                </div>
                <h3 className="font-bold text-lg mb-1">PayPal</h3>
                <p className="text-sm text-muted-foreground mb-4">🌎 Disponible para todos los países. Paga con tu cuenta PayPal de forma segura. Activación en 1–24h.</p>
                {paypalEmail ? (
                  <div className="bg-[#003087]/5 border border-[#003087]/20 rounded-xl p-3 mb-3">
                    <p className="text-xs text-muted-foreground mb-1">Envía tu pago a:</p>
                    <p className="text-sm font-mono font-semibold text-[#003087] break-all">{paypalEmail}</p>
                  </div>
                ) : null}
                <a href="https://www.paypal.com/paypalme/blangenglish" target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-[#003087] hover:bg-[#002070] text-white font-bold px-5 py-3 rounded-xl text-sm transition-colors w-full">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.59 3.025-2.566 6.082-8.558 6.082H9.928l-1.182 7.519H12c.46 0 .85-.334.922-.789l.038-.197.733-4.64.047-.257a.932.932 0 0 1 .921-.789h.58c3.76 0 6.701-1.528 7.559-5.95.36-1.85.176-3.395-.578-4.692z"/></svg>
                  Pagar con PayPal
                </a>
              </motion.div>

              {/* PSE */}
              <motion.div variants={fadeUp} className="bg-background rounded-2xl border-2 border-green-200 p-8 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mb-4 shadow">
                  <span className="text-3xl">🏦</span>
                </div>
                <h3 className="font-bold text-lg mb-1">PSE</h3>
                <p className="text-sm text-muted-foreground mb-4">🇨🇴 Solo Colombia. Débito bancario directo desde tu cuenta. Activación en 1–24h hábiles tras recibir el comprobante.</p>
                <a href={`mailto:blangenglishlearning@blangenglish.com?subject=Comprobante%20PSE%20BLANG%20Academy&body=Hola%2C%20adjunto%20mi%20comprobante%20de%20pago%20PSE.`}
                  className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-5 py-3 rounded-xl text-sm transition-colors w-full">
                  <Banknote className="w-4 h-4" /> Enviar comprobante PSE
                </a>
              </motion.div>
            </motion.div>

            <motion.div variants={fadeUp} className="mt-8 bg-muted/30 border border-border/40 rounded-2xl p-5 text-center">
              <p className="text-sm text-muted-foreground">
                📌 Después de pagar, envíanos el comprobante a <strong>blangenglishlearning@blangenglish.com</strong>.<br />
                Tu cuenta se habilitará en un plazo de <strong>1 a 24 horas hábiles</strong>.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section className="py-16 bg-white/60">
        <div className="container mx-auto px-4">
          <motion.div
            className="max-w-3xl mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="text-center mb-10">
              <h2 className="text-3xl font-bold">¿Qué incluye cada plan?</h2>
            </motion.div>

            <motion.div variants={fadeUp} className="overflow-x-auto rounded-2xl border border-border/50 shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-4 font-semibold">Función</th>
                    <th className="text-center p-4 font-semibold">🎁 Gratis</th>
                    <th className="text-center p-4 font-semibold bg-primary/5 text-primary">🚀 Mensual</th>
                    <th className="text-center p-4 font-semibold">🎥 Clase Vivo</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Acceso a lecciones', '5 básicas', 'Todos los cursos', '—'],
                    ['Gramática + Vocabulario', '✅', '✅', '—'],
                    ['Lectura + Escucha', '✅', '✅', '—'],
                    ['Práctica con IA', '✅', '✅', '—'],
                    ['Seguimiento de progreso', '✅', '✅', '—'],
                    ['Soporte prioritario', '—', '✅', '—'],
                    ['Sesión Google Meet con nativo', '—', 'Opcional', '✅ Incluida'],
                  ].map(([feature, free, monthly, live], i) => (
                    <tr key={i} className={`border-t border-border/30 ${i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}>
                      <td className="p-4 font-medium">{feature}</td>
                      <td className="p-4 text-center text-muted-foreground">{free}</td>
                      <td className="p-4 text-center font-semibold bg-primary/3">{monthly}</td>
                      <td className="p-4 text-center text-muted-foreground">{live}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-purple-50/50">
        <div className="container mx-auto px-4">
          <motion.div
            className="max-w-2xl mx-auto"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="text-center mb-10">
              <h2 className="text-3xl font-bold">Preguntas frecuentes</h2>
            </motion.div>
            <motion.div variants={fadeUp}>
              <Accordion type="single" collapsible className="space-y-3">
                {FAQ.map((item, i) => (
                  <AccordionItem
                    key={i}
                    value={`faq-${i}`}
                    className="bg-background border border-border/50 rounded-2xl px-6 shadow-sm"
                  >
                    <AccordionTrigger className="text-base font-semibold hover:no-underline py-5 text-left">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-purple-600 to-pink-500" />
        <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="max-w-2xl mx-auto"
          >
            <motion.p variants={fadeUp} className="text-5xl mb-4">🚀</motion.p>
            <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight">
              ¡Empieza gratis hoy!
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-white/80 mb-8">
              {trialDays} días gratis, sin tarjeta. Inscríbete ahora y paga el {discountPct}% el primer mes 🎊
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-white text-primary hover:bg-white/90 rounded-full font-bold px-10 py-6 text-lg"
                onClick={() => onOpenAuth?.('register')}
              >
                Registrarse gratis 🎉
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/40 text-white hover:bg-white/10 rounded-full px-10 py-6 text-lg"
                onClick={() => onOpenAuth?.('login')}
              >
                Ya tengo cuenta
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

    </Layout>
  );
}
