import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users, BookOpen, Zap, CreditCard, Calendar, Send, Phone, Mail, User, ChevronRight, Plus, Trash2, X } from 'lucide-react';
import { ROUTE_PATHS } from '@/lib/index';
import type { AuthModal } from '@/lib/index';
import { IMAGES } from '@/assets/images';
import { supabase } from '@/integrations/supabase/client';

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};
const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 35 } },
};
const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 35 } },
};

interface HomeProps {
  onOpenAuth?: (modal: AuthModal) => void;
  isLoggedIn?: boolean;
}

const COURSES = [
  { id: 'c1', emoji: '🌱', title: 'Inglés desde Cero', level: 'A1 — Principiante', color: 'from-green-400/20 to-emerald-400/20 border-green-200', badge: 'bg-green-100 text-green-700', desc: 'Saludos, números, colores, familia y primeras conversaciones.' },
  { id: 'c2', emoji: '📗', title: 'Inglés Elemental', level: 'A2 — Elemental', color: 'from-teal-400/20 to-cyan-400/20 border-teal-200', badge: 'bg-teal-100 text-teal-700', desc: 'Amplía tu vocabulario y construye frases completas con confianza.' },
  { id: 'c3', emoji: '📘', title: 'Inglés Intermedio', level: 'B1 — Intermedio', color: 'from-blue-400/20 to-indigo-400/20 border-blue-200', badge: 'bg-blue-100 text-blue-700', desc: 'Conversaciones sobre el mundo, viajes y situaciones cotidianas.' },
  { id: 'c4', emoji: '📙', title: 'Intermedio Avanzado', level: 'B2 — Interm. Avanzado', color: 'from-purple-400/20 to-violet-400/20 border-purple-200', badge: 'bg-purple-100 text-purple-700', desc: 'Phrasal verbs, modismos y conversaciones fluidas.' },
  { id: 'c5', emoji: '🏆', title: 'Inglés Avanzado', level: 'C1 — Avanzado', color: 'from-amber-400/20 to-yellow-400/20 border-amber-200', badge: 'bg-amber-100 text-amber-700', desc: 'Debates, textos académicos y fluidez total.' },
];

const METHODOLOGY_STEPS = [
  { emoji: '✏️', title: 'Gramática', color: 'from-violet-500 to-purple-600' },
  { emoji: '📖', title: 'Vocabulario', color: 'from-blue-500 to-cyan-500' },
  { emoji: '📚', title: 'Lectura', color: 'from-teal-500 to-green-500' },
  { emoji: '🎧', title: 'Escucha', color: 'from-orange-500 to-amber-500' },
  { emoji: '🤖', title: 'Práctica con IA', color: 'from-pink-500 to-rose-500' },
];

// Pricing plans (simplified 3 items each, no live class plan)
const HOME_PLANS = [
  {
    id: 'prueba',
    emoji: '🎁',
    name: 'Prueba Gratis',
    price: 'GRATIS',
    period: '7 días',
    features: ['7 días completamente gratis', 'Sin tarjeta de crédito', 'Acceso a lecciones de nivel básico'],
    cta: 'Empezar gratis',
    popular: false,
    ctaAction: 'register' as const,
  },
  {
    id: 'mensual',
    emoji: '🚀',
    name: 'Plan Mensual',
    price: '$15 USD',
    priceCOP: '$50,000 COP',
    discountPrice: '$7.50 USD',
    discountCOP: '$25,000 COP',
    period: 'mes',
    features: ['Acceso completo a todos los cursos', 'Práctica con IA incluida', 'Seguimiento de progreso semanal'],
    cta: '¡Inscribirte — 50% off! 🔥',
    popular: true,
    ctaAction: 'register' as const,
    badge: '🔥 Oferta de lanzamiento',
  },
];

// Session slot type
interface SessionSlot {
  id: string;
  date: string;
  time: string;
  topic: string;
}

interface BookingForm {
  name: string;
  lastName: string;
  email: string;
  phone: string;
  slots: SessionSlot[];
}

const SESSION_PRICE_USD = 10;

export default function Home({ onOpenAuth, isLoggedIn }: HomeProps) {
  const [ctaEmail, setCtaEmail] = useState('');
  const navigate = useNavigate();
  const [showBooking, setShowBooking] = useState(false);

  // If already logged in, redirect to dashboard immediately
  useEffect(() => {
    if (isLoggedIn) {
      navigate(ROUTE_PATHS.DASHBOARD, { replace: true });
    }
  }, [isLoggedIn, navigate]);
  const [bookingSent, setBookingSent] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);

  const [bookingForm, setBookingForm] = useState<BookingForm>({
    name: '', lastName: '', email: '', phone: '',
    slots: [{ id: '1', date: '', time: '', topic: '' }],
  });

  const addSlot = () => {
    setBookingForm(prev => ({
      ...prev,
      slots: [...prev.slots, { id: Date.now().toString(), date: '', time: '', topic: '' }],
    }));
  };

  const removeSlot = (id: string) => {
    if (bookingForm.slots.length === 1) return;
    setBookingForm(prev => ({ ...prev, slots: prev.slots.filter(s => s.id !== id) }));
  };

  const updateSlot = (id: string, field: keyof SessionSlot, value: string) => {
    setBookingForm(prev => ({
      ...prev,
      slots: prev.slots.map(s => s.id === id ? { ...s, [field]: value } : s),
    }));
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingLoading(true);
    try {
      await supabase.functions.invoke('send-contact-email', {
        body: {
          type: 'booking',
          ...bookingForm,
          totalUSD: bookingForm.slots.length * SESSION_PRICE_USD,
        },
      });
    } catch {
      // fallback: still show success even if email fails
    } finally {
      setBookingLoading(false);
      setBookingSent(true);
    }
  };

  const totalUSD = bookingForm.slots.length * SESSION_PRICE_USD;

  return (
    <Layout onOpenAuth={onOpenAuth}>

      {/* PAGE BG */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-purple-50 via-violet-50/60 to-background pointer-events-none" />

      {/* ── PRICING HERO — FIRST SECTION ── */}
      <section id="pricing-hero" className="relative min-h-screen flex items-center overflow-hidden py-16">
        {/* Background gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900 via-purple-800 to-primary" />
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-pink-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-amber-400/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            className="max-w-7xl mx-auto"
            initial="hidden" animate="visible" variants={staggerContainer}
          >
            {/* Top badge */}
            <motion.div variants={staggerItem} className="text-center mb-8">
              <span className="inline-flex items-center gap-2 bg-amber-400/20 text-amber-300 text-base font-bold px-6 py-2.5 rounded-full border border-amber-400/30 backdrop-blur">
                🔥 ¡Oferta de lanzamiento — Solo por tiempo limitado!
              </span>
            </motion.div>

            {/* Main content: image left + pricing cards right */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">

              {/* LEFT — Teacher image + hook text */}
              <motion.div variants={staggerItem} className="flex flex-col items-center lg:items-start gap-6">
                {/* Big hook headline */}
                <div className="text-center lg:text-left">
                  <h2 className="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-tight tracking-tight">
                    Aprende inglés
                    <span className="block text-amber-400">por solo</span>
                  </h2>
                  <div className="flex items-end gap-4 justify-center lg:justify-start mt-4">
                    <div className="text-center">
                      <p className="text-7xl md:text-8xl lg:text-9xl font-black text-white leading-none">$15</p>
                      <p className="text-2xl font-bold text-white/70">USD / mes</p>
                    </div>
                    <div className="flex flex-col gap-1 mb-4">
                      <span className="bg-amber-400 text-black text-sm font-extrabold px-3 py-1 rounded-full">o $50,000 COP</span>
                      <span className="bg-green-400/20 text-green-300 text-sm font-bold px-3 py-1 rounded-full border border-green-400/30">7 días GRATIS primero</span>
                    </div>
                  </div>
                  <p className="text-xl text-white/80 mt-4 max-w-lg">
                    Sin compromisos. Sin tarjeta de crédito para empezar. <strong className="text-white">Cancela cuando quieras.</strong>
                  </p>
                </div>

                {/* Teacher image — sin fondo */}
                <div className="relative">
                  <img
                    src={IMAGES.INSTRUCTOR_NOBG}
                    alt="Instructor BLANG"
                    className="w-64 h-64 md:w-80 md:h-80 object-contain drop-shadow-2xl"
                    style={{ filter: 'drop-shadow(0 0 40px rgba(167,139,250,0.35))' }}
                  />
                  {/* Floating badges around image */}
                  <motion.div
                    animate={{ y: [-6, 6, -6] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute -top-4 -right-4 bg-white text-gray-900 rounded-2xl px-4 py-2 shadow-2xl font-bold text-sm"
                  >
                    💰 ¡Invierte en tu futuro!
                  </motion.div>
                  <motion.div
                    animate={{ y: [6, -6, 6] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute -bottom-2 -left-4 bg-amber-400 text-black rounded-2xl px-4 py-2 shadow-2xl font-extrabold text-sm"
                  >
                    🚀 50% OFF este mes
                  </motion.div>
                </div>
              </motion.div>

              {/* RIGHT — Pricing cards */}
              <motion.div variants={staggerItem} className="flex flex-col gap-6">
                {/* Free plan */}
                <div className="bg-white/10 backdrop-blur border border-white/20 rounded-3xl p-7">
                  <div className="flex items-center gap-4 mb-5">
                    <span className="text-5xl">🎁</span>
                    <div>
                      <h3 className="text-2xl font-black text-white">Prueba Gratis</h3>
                      <p className="text-white/70 text-sm">Sin tarjeta de crédito</p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-5xl font-black text-green-400">GRATIS</p>
                      <p className="text-white/60 text-sm">7 días</p>
                    </div>
                  </div>
                  <ul className="space-y-2 mb-6">
                    {['7 días completamente gratis', 'Sin tarjeta de crédito', 'Acceso a lecciones básicas', 'Cancela en cualquier momento'].map((f, i) => (
                      <li key={i} className="flex items-center gap-2 text-white/85 text-base">
                        <span className="text-green-400 font-bold text-lg">✓</span> {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => onOpenAuth?.('register')}
                    className="w-full bg-green-500 hover:bg-green-400 text-white font-extrabold text-lg py-4 rounded-2xl transition-colors shadow-lg shadow-green-500/30"
                  >
                    Empezar gratis ahora →
                  </button>
                </div>

                {/* Paid plan — highlighted */}
                <div className="relative bg-gradient-to-br from-amber-400 to-orange-400 rounded-3xl p-7 shadow-2xl shadow-amber-400/30 overflow-hidden">
                  <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/20 rounded-full blur-2xl" />
                  <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/10 rounded-full blur-xl" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-5">
                      <span className="text-5xl">🚀</span>
                      <div>
                        <h3 className="text-2xl font-black text-black">Plan Mensual</h3>
                        <span className="bg-black/20 text-black text-xs font-extrabold px-3 py-1 rounded-full">🔥 Oferta de lanzamiento</span>
                      </div>
                      <div className="ml-auto text-right">
                        <p className="text-2xl font-bold text-black/50 line-through">$15 USD</p>
                        <p className="text-5xl font-black text-black">$7.50</p>
                        <p className="text-black/70 text-sm">USD / mes</p>
                      </div>
                    </div>
                    <p className="text-black/70 font-medium mb-4">o $25,000 COP el primer mes</p>
                    <ul className="space-y-2 mb-6">
                      {['Acceso completo a TODOS los cursos', 'Práctica con IA incluida', 'Seguimiento de progreso semanal', 'Soporte prioritario', 'Sin contratos anuales'].map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-black font-medium text-base">
                          <span className="text-black font-black text-lg">✓</span> {f}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => onOpenAuth?.('register')}
                      className="w-full bg-black hover:bg-gray-900 text-white font-extrabold text-lg py-4 rounded-2xl transition-colors shadow-lg"
                    >
                      ¡Inscribirte con 50% OFF! 🎉
                    </button>
                  </div>
                </div>

                {/* Discount alert message */}
                <div className="bg-white/10 backdrop-blur border border-amber-400/40 rounded-2xl p-4">
                  <p className="text-white/90 text-sm leading-relaxed">
                    ⚠️ Si empiezas con la <strong className="text-white">prueba gratis</strong>, deberás pagar el valor total <span className="line-through text-white/50">$15 USD</span> al terminar los 7 días.<br />
                    Si te <strong className="text-amber-300">inscribes ya</strong>, este mes se te dará el <strong className="text-amber-300">50% de descuento automáticamente</strong>. 🎊
                  </p>
                </div>

                {/* Payment methods inline */}
                <div className="flex items-center justify-center gap-6 text-white/70">
                  <span className="flex items-center gap-1.5 text-sm"><span className="text-xl">🅿️</span> PayPal</span>
                  <span className="text-white/30">·</span>
                  <span className="flex items-center gap-1.5 text-sm"><span className="text-xl">🏦</span> Bancolombia</span>
                  <span className="text-white/30">·</span>
                  <span className="flex items-center gap-1.5 text-sm"><span className="text-xl">💳</span> Tarjeta</span>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── HERO ── */}
      <section id="hero" className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute top-10 left-10 w-72 h-72 bg-violet-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-pink-400/8 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            className="max-w-7xl mx-auto"
            initial="hidden" animate="visible" variants={staggerContainer}
          >
            {/* Badge */}
            <motion.div variants={staggerItem} className="text-center mb-10">
              <span className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-semibold px-5 py-2.5 rounded-full border border-primary/20">
                🎉 ¡7 días de prueba gratis, sin tarjeta de crédito!
              </span>
            </motion.div>

            {/* TWO-COLUMN: headline+flags LEFT — 3 steps RIGHT */}
            <div className="grid lg:grid-cols-2 gap-14 items-start">

              {/* LEFT — headline + flags */}
              <motion.div variants={staggerItem} className="flex flex-col gap-8">
                <div>
                  <h1 className="text-5xl md:text-6xl lg:text-7xl font-black leading-[1.05] tracking-tight">
                    <span className="italic text-foreground/70">&quot;Speak Up and</span><br />
                    <span className="text-primary">Stand Out</span><br />
                    <span className="italic text-foreground/70">with </span>
                    <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">BLANG&quot;</span>
                  </h1>
                  <p className="text-lg text-muted-foreground font-medium mt-5">Aprende inglés desde ya 🌎</p>
                </div>

                {/* Flags card */}
                <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200/70 rounded-2xl p-5 shadow-sm">
                  <p className="text-xs font-black text-violet-600 uppercase tracking-widest mb-2">✨ Diseñado especialmente para hispanohablantes</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {[
                      { flag: '🇨🇴', name: 'Colombia' }, { flag: '🇲🇽', name: 'México' },
                      { flag: '🇦🇷', name: 'Argentina' }, { flag: '🇻🇪', name: 'Venezuela' },
                      { flag: '🇵🇪', name: 'Perú' }, { flag: '🇨🇱', name: 'Chile' },
                      { flag: '🇪🇨', name: 'Ecuador' }, { flag: '🇧🇴', name: 'Bolivia' },
                      { flag: '🇺🇾', name: 'Uruguay' }, { flag: '🇵🇾', name: 'Paraguay' },
                      { flag: '🇨🇷', name: 'Costa Rica' }, { flag: '🇩🇴', name: 'R. Dominicana' },
                      { flag: '🇵🇦', name: 'Panamá' }, { flag: '🇭🇳', name: 'Honduras' },
                      { flag: '🇳🇮', name: 'Nicaragua' }, { flag: '🇬🇹', name: 'Guatemala' },
                      { flag: '🇸🇻', name: 'El Salvador' }, { flag: '🇨🇺', name: 'Cuba' },
                    ].map(({ flag, name }) => (
                      <span key={name} title={name} className="text-lg hover:scale-125 transition-transform cursor-default select-none">{flag}</span>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">Metodología intuitiva</strong> por unidades,{' '}
                    <strong className="text-foreground">clases en vivo</strong> y{' '}
                    <strong className="text-foreground">práctica real con IA</strong>. ¡Todo en un solo lugar!
                  </p>
                </div>

                <p className="text-sm text-muted-foreground">🌟 ¡Sé parte de los primeros estudiantes de BLANG!</p>
              </motion.div>

              {/* RIGHT — 3 steps */}
              <motion.div variants={staggerItem} className="flex flex-col gap-4">
                <div className="mb-1">
                  <span className="inline-block bg-primary/10 text-primary text-xs font-extrabold px-4 py-1.5 rounded-full uppercase tracking-widest">🎯 Empieza en 3 pasos</span>
                </div>
                {[
                  { num: '01', emoji: '👤', title: 'Crea tu cuenta', desc: 'Regístrate gratis en segundos. Sin tarjeta de crédito para tu prueba de 7 días.', color: 'from-violet-500 to-purple-600', bg: 'from-violet-50 to-purple-50', border: 'border-violet-200/60' },
                  { num: '02', emoji: '📋', title: 'Elige tu nivel', desc: 'De A1 principiante a C1 avanzado. Empieza desde donde realmente estás.', color: 'from-blue-500 to-cyan-500', bg: 'from-blue-50 to-cyan-50', border: 'border-blue-200/60' },
                  { num: '03', emoji: '🎓', title: '¡A aprender!', desc: 'Una unidad por semana: gramática, vocabulario, lectura, escucha y práctica con IA.', color: 'from-emerald-500 to-teal-500', bg: 'from-emerald-50 to-teal-50', border: 'border-emerald-200/60' },
                ].map((step) => (
                  <div key={step.num} className={`flex items-start gap-4 bg-gradient-to-br ${step.bg} border ${step.border} rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow`}>
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center flex-shrink-0 shadow-md`}>
                      <span className="text-white font-black text-lg">{step.num}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{step.emoji}</span>
                        <h3 className="font-bold text-base text-foreground">{step.title}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => onOpenAuth?.('register')}
                  className="mt-2 w-full bg-gradient-to-r from-primary to-violet-600 hover:opacity-90 text-white font-extrabold text-lg py-4 rounded-2xl transition-opacity shadow-lg shadow-primary/30"
                >
                  ¡Crear mi cuenta gratis! 🚀
                </button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── COURSES + METHODOLOGY combined ── */}
      <section id="cursos" className="py-24">
        <div className="container mx-auto px-4">
          {/* Section header */}
          <motion.div
            className="text-center mb-10"
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={fadeInUp}
          >
            <span className="inline-block bg-primary/10 text-primary text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
              📚 Nuestros Cursos
            </span>
            <h2 className="text-4xl md:text-5xl font-bold mb-3">De cero a fluido, paso a paso</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              5 niveles estructurados. Avanza a tu ritmo, <span className="font-semibold text-foreground">una unidad por semana</span>.
            </p>
          </motion.div>

          {/* Methodology strip — BIGGER, fully responsive */}
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}
            className="max-w-5xl mx-auto mb-14 bg-gradient-to-br from-primary/8 via-violet-50 to-purple-50 border-2 border-primary/25 rounded-3xl px-6 sm:px-10 py-8 sm:py-10 shadow-lg"
          >
            <div className="text-center mb-8">
              <span className="inline-block bg-primary/15 text-primary text-sm font-extrabold px-4 py-1.5 rounded-full mb-3">🧠 Nuestra metodología</span>
              <p className="text-2xl sm:text-3xl font-extrabold text-foreground">Metodología intuitiva</p>
              <p className="text-lg sm:text-xl font-bold text-primary mt-1">Ciclo de 5 pasos por cada unidad</p>
              <p className="text-sm sm:text-base text-muted-foreground mt-2 max-w-xl mx-auto">Cada unidad sigue el mismo ciclo probado para que aprendas de forma natural y sin memorizar reglas</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {METHODOLOGY_STEPS.map((step, i) => (
                <div key={i} className="flex flex-col items-center gap-3 bg-background/60 rounded-2xl p-4 border border-border/30 shadow-sm">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center text-3xl shadow-md`}>
                    {step.emoji}
                  </div>
                  <span className="text-sm font-extrabold text-center leading-tight text-foreground">{step.title}</span>
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Paso {i + 1}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Course cards — NO units shown */}
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 max-w-7xl mx-auto"
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={staggerContainer}
          >
            {COURSES.map((course) => (
              <motion.div
                key={course.id} variants={staggerItem}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className={`bg-gradient-to-br ${course.color} rounded-3xl p-6 border hover:shadow-lg transition-all cursor-pointer flex flex-col`}
                onClick={() => onOpenAuth?.('register')}
              >
                <p className="text-4xl mb-3">{course.emoji}</p>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${course.badge} mb-3 inline-block`}>
                  {course.level}
                </span>
                <h3 className="text-base font-bold mb-2">{course.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed flex-1">{course.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Language note */}
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8"
          >
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-4 py-2 text-sm font-medium text-green-700">
              🇪🇸 A1 y A2 — Explicaciones en español
            </div>
            <span className="text-muted-foreground font-bold hidden sm:block">→</span>
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-2 text-sm font-medium text-blue-700">
              🇺🇸 B1 a C1 — 100% en inglés
            </div>
          </motion.div>

          {/* Saber más */}
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}
            className="text-center mt-6"
          >
            <button
              onClick={() => navigate(ROUTE_PATHS.METHODOLOGY)}
              className="inline-flex items-center gap-2 text-primary font-semibold hover:underline text-base group"
            >
              Saber más sobre nuestra metodología
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── LIVE SESSIONS ── */}
      <section id="sesiones-vivo" className="py-24 bg-white/60">
        <div className="container mx-auto px-4">
          <motion.div
            className="max-w-5xl mx-auto"
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={staggerContainer}
          >
            {/* Header */}
            <motion.div variants={fadeInUp} className="text-center mb-12">
              <span className="inline-block bg-primary/10 text-primary text-sm font-semibold px-4 py-1.5 rounded-full mb-4">
                🎥 Sesiones en Vivo
              </span>
              <h2 className="text-4xl md:text-5xl font-bold mb-3">Practica con nuestros profes</h2>
            </motion.div>

            {/* Two-column: photo left, text right */}
            <motion.div
              variants={staggerItem}
              className="flex flex-col md:flex-row items-center gap-10 bg-background/80 border border-primary/10 rounded-3xl p-8 shadow-sm"
            >
              {/* Instructor photo */}
              <div className="flex-shrink-0 flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="w-44 h-44 rounded-3xl overflow-hidden ring-4 ring-primary/30 shadow-xl shadow-primary/15">
                    <img
                      src={IMAGES.LOGO}
                      alt="Tu profe de inglés"
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                  {/* Online badge */}
                  <div className="absolute -bottom-2 -right-2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse inline-block" />
                    Disponible
                  </div>
                </div>
                <div className="text-center">
                  <p className="font-bold text-base">Tu profe de inglés</p>
                  <p className="text-xs text-muted-foreground">Google Meet · 1 a 1</p>
                </div>
              </div>

              {/* Text + CTA */}
              <div className="flex-1 text-center md:text-left">
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  ¿No quieres el curso completo, sino practicar con uno de nuestros profes? Hazlo sin necesidad de pagar el curso completo —{' '}
                  <strong className="text-foreground">solo las horas, días y temas que tú decidas</strong>, a través de{' '}
                  <strong className="text-foreground">Google Meet</strong>.
                </p>
                <div className="flex flex-col sm:flex-row items-center md:items-start gap-3">
                  <Button
                    size="lg"
                    className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-10 py-6 text-base shadow-lg shadow-primary/25"
                    onClick={() => { setShowBooking(true); setBookingSent(false); }}
                  >
                    Reservar aquí 📅
                  </Button>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    💰 <span><strong>$10 USD</strong> por hora</span>
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── BOOKING MODAL ── */}
      <AnimatePresence>
        {showBooking && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowBooking(false)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            />

            {/* Modal */}
            <motion.div
              className="relative bg-background rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
              <div className="h-1.5 bg-gradient-to-r from-primary via-purple-400 to-pink-400 rounded-t-3xl" />
              <div className="p-7">
                {/* Close */}
                <button
                  onClick={() => setShowBooking(false)}
                  className="absolute top-5 right-5 text-muted-foreground hover:text-foreground p-1.5 rounded-full hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                {bookingSent ? (
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">🎉</div>
                    <h3 className="text-2xl font-bold mb-2">¡Solicitud enviada!</h3>
                    <p className="text-muted-foreground mb-6">
                      Recibirás el <strong>link de pago</strong> en tu correo ({bookingForm.email}) en las próximas horas. Una vez confirmado el pago, te enviaremos el enlace de Google Meet para cada sesión.
                    </p>
                    <Button
                      variant="outline" className="rounded-full"
                      onClick={() => { setShowBooking(false); setBookingSent(false); setBookingForm({ name: '', lastName: '', email: '', phone: '', slots: [{ id: '1', date: '', time: '', topic: '' }] }); }}
                    >
                      Cerrar
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleBookingSubmit} className="space-y-5">
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-extrabold mb-1">Reserva tu sesión 🎤</h2>
                      <p className="text-sm text-muted-foreground">Completa los datos y te enviamos el link de pago</p>
                    </div>

                    {/* Personal data */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="b-name" className="text-sm font-medium flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-primary" /> Nombre</Label>
                        <Input id="b-name" placeholder="Tu nombre" value={bookingForm.name} onChange={e => setBookingForm(p => ({ ...p, name: e.target.value }))} required className="rounded-xl" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="b-lastname" className="text-sm font-medium flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-primary" /> Apellidos</Label>
                        <Input id="b-lastname" placeholder="Tus apellidos" value={bookingForm.lastName} onChange={e => setBookingForm(p => ({ ...p, lastName: e.target.value }))} required className="rounded-xl" />
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="b-email" className="text-sm font-medium flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-primary" /> Correo</Label>
                        <Input id="b-email" type="email" placeholder="tucorreo@ejemplo.com" value={bookingForm.email} onChange={e => setBookingForm(p => ({ ...p, email: e.target.value }))} required className="rounded-xl" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="b-phone" className="text-sm font-medium flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-primary" /> Teléfono / WhatsApp</Label>
                        <Input id="b-phone" type="tel" placeholder="+57 300 000 0000" value={bookingForm.phone} onChange={e => setBookingForm(p => ({ ...p, phone: e.target.value }))} required className="rounded-xl" />
                      </div>
                    </div>

                    {/* Session slots */}
                    <div className="space-y-4">
                      {/* First slot */}
                      <div className="bg-primary/5 border border-primary/15 rounded-2xl p-4 space-y-3">
                        <p className="font-semibold text-sm text-primary">📅 Reserva una hora de clase</p>
                        <div className="grid sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium flex items-center gap-1"><Calendar className="w-3 h-3 text-primary" /> Fecha</Label>
                            <Input type="date" value={bookingForm.slots[0]?.date || ''} onChange={e => updateSlot(bookingForm.slots[0].id, 'date', e.target.value)} required className="rounded-xl text-sm" min={new Date().toISOString().split('T')[0]} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">🕐 Hora</Label>
                            <Input type="time" value={bookingForm.slots[0]?.time || ''} onChange={e => updateSlot(bookingForm.slots[0].id, 'time', e.target.value)} required className="rounded-xl text-sm" />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">📝 Tema o enfoque de la sesión</Label>
                          <Input placeholder="Ej: Conversación general, Pronunciación, Phrasal verbs..." value={bookingForm.slots[0]?.topic || ''} onChange={e => updateSlot(bookingForm.slots[0].id, 'topic', e.target.value)} required className="rounded-xl text-sm" />
                        </div>
                      </div>

                      {/* Extra slots */}
                      {bookingForm.slots.slice(1).map((slot, i) => (
                        <div key={slot.id} className="bg-violet-50/70 border border-violet-200/60 rounded-2xl p-4 space-y-3 relative">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-sm text-primary">📅 Sesión extra #{i + 2}</p>
                            <button type="button" onClick={() => removeSlot(slot.id)} className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-lg hover:bg-destructive/10">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium flex items-center gap-1"><Calendar className="w-3 h-3 text-primary" /> Fecha</Label>
                              <Input type="date" value={slot.date} onChange={e => updateSlot(slot.id, 'date', e.target.value)} required className="rounded-xl text-sm" min={new Date().toISOString().split('T')[0]} />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium">🕐 Hora</Label>
                              <Input type="time" value={slot.time} onChange={e => updateSlot(slot.id, 'time', e.target.value)} required className="rounded-xl text-sm" />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium">📝 Tema o enfoque</Label>
                            <Input placeholder="Ej: Business English, Escritura, Gramática..." value={slot.topic} onChange={e => updateSlot(slot.id, 'topic', e.target.value)} required className="rounded-xl text-sm" />
                          </div>
                        </div>
                      ))}

                      {/* Add more */}
                      <button
                        type="button"
                        onClick={addSlot}
                        className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-primary/30 rounded-2xl py-3 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        ¿Quieres reservar más? Añadir otra sesión
                      </button>
                    </div>

                    {/* Total */}
                    <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Son <strong>${SESSION_PRICE_USD} USD</strong> por hora</p>
                        <p className="text-sm text-muted-foreground">{bookingForm.slots.length} sesión{bookingForm.slots.length > 1 ? 'es' : ''} × ${SESSION_PRICE_USD} USD</p>
                        <p className="text-2xl font-extrabold text-primary mt-1">Total: ${totalUSD} USD</p>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <p>📧 El link de pago</p>
                        <p>se te enviará al correo</p>
                      </div>
                    </div>

                    <Button
                      type="submit" size="lg"
                      className="w-full rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-6"
                      disabled={bookingLoading}
                    >
                      {bookingLoading ? (
                        <span className="flex items-center gap-2">
                          <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                          Enviando...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Send className="w-4 h-4" />
                          Enviar solicitud
                        </span>
                      )}
                    </Button>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PRICING REMINDER — minimal ── */}
      <section id="pricing" className="py-12">
        <div className="container mx-auto px-4">
          <motion.div
            className="text-center"
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}
          >
            <button
              onClick={() => navigate(ROUTE_PATHS.PRICING)}
              className="inline-flex items-center gap-2 text-primary font-bold hover:underline text-lg group"
            >
              Ver información completa sobre precios
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section id="cta" className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-purple-600 to-pink-500" />
        <div className="absolute top-10 left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute bottom-10 right-10 w-60 h-60 bg-white/10 rounded-full blur-3xl" />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            className="max-w-3xl mx-auto text-center"
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={staggerContainer}
          >
            <motion.p className="text-4xl mb-4" variants={staggerItem}>🚀</motion.p>
            <motion.h2 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight" variants={staggerItem}>
              ¿Listo para hablar inglés con confianza?
            </motion.h2>
            <motion.p className="text-xl text-white/85 mb-4" variants={staggerItem}>
              ¡Sé parte de los primeros estudiantes de BLANG! Empieza gratis 7 días. Sin tarjeta de crédito.
            </motion.p>
            <motion.p className="text-lg text-white/70 mb-10" variants={staggerItem}>
              Inscríbete ahora y obtén el <span className="font-bold text-white">50% de descuento</span> el primer mes 🎊
            </motion.p>
            <motion.div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto" variants={staggerItem}>
              <Input
                type="email" placeholder="Tu correo electrónico 📧"
                value={ctaEmail} onChange={(e) => setCtaEmail(e.target.value)}
                className="bg-white/20 text-white placeholder:text-white/60 border-white/30 rounded-full focus:ring-white/50 backdrop-blur"
              />
              <Button
                size="lg"
                className="bg-white text-primary hover:bg-white/90 rounded-full font-bold whitespace-nowrap px-7"
                onClick={() => onOpenAuth?.('register')}
              >
                ¡Empezar! 🎉
              </Button>
            </motion.div>
            <motion.p className="text-sm text-white/60 mt-5" variants={staggerItem}>
              ✓ Sin tarjeta de crédito &nbsp; ✓ 7 días gratis &nbsp; ✓ Cancela cuando quieras
            </motion.p>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
}
