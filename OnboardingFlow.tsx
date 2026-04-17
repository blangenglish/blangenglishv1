/**
 * OnboardingFlow.tsx
 * Multi-step modal shown after registration:
 *  Step 1: Choose plan (discount or 7-day trial) — MANDATORY
 *  Step 2: Choose payment method (Card/PSE/PayPal) — MANDATORY (NO Bancolombia)
 *  Step 3: Choose level — uses LevelExam component
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Check, CreditCard, Wallet, ChevronRight,
  BookOpen, FlaskConical, AlertTriangle, Clock,
  ExternalLink, Copy, CheckCircle2, Building2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { LevelExam } from '@/components/LevelExam';

interface OnboardingFlowProps {
  open: boolean;
  userId: string;
  userName: string;
  userEmail: string;
  onComplete: () => void;
  initialStep?: Step;
  /** true si ya tiene un plan activo/aprobado pagado por el admin */
  hasPaidPlan?: boolean;
}

type Step = 'plan' | 'payment' | 'level' | 'done' | 'verify_email';
type PlanId = 'discount' | 'trial' | 'later';
type PayMethod = 'pse' | 'paypal';
type LevelChoice = 'exam' | 'self' | 'later';

const ENGLISH_LEVELS = [
  { id: 'A1', label: 'A1 – Principiante', desc: 'Nunca he aprendido inglés o sé muy poco', emoji: '🌱' },
  { id: 'A2', label: 'A2 – Elemental', desc: 'Entiendo frases simples y puedo presentarme', emoji: '📗' },
  { id: 'B1', label: 'B1 – Intermedio', desc: 'Puedo comunicarme en situaciones cotidianas', emoji: '📘' },
  { id: 'B2', label: 'B2 – Intermedio Alto', desc: 'Me expreso con fluidez sobre temas variados', emoji: '📙' },
  { id: 'C1', label: 'C1 – Avanzado', desc: 'Uso el inglés con soltura y precisión', emoji: '🏆' },
];

export function OnboardingFlow({ open, userId, userName, userEmail, onComplete, initialStep, hasPaidPlan }: OnboardingFlowProps) {
  const [step, setStep] = useState<Step>(initialStep || 'plan');
  const [plan, setPlan] = useState<PlanId>('trial');
  const [payMethod, setPayMethod] = useState<PayMethod>('paypal');
  const [levelChoice, setLevelChoice] = useState<LevelChoice | null>(null);
  const [selfLevel, setSelfLevel] = useState('A1');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showLevelExam, setShowLevelExam] = useState(false);
  const [finalLevel, setFinalLevel] = useState('');
  // Card fields
  const _cardNum = ''; // unused, kept for reference
  const _cardExpiry = ''; // unused
  const _cardCvc = ''; // unused
  // Payment config from DB
  const [payConfig, setPayConfig] = useState<Record<string, string>>({});
  // Estado real de la suscripción consultado directamente al llegar al paso 'done'
  const [resolvedHasPaid, setResolvedHasPaid] = useState<boolean>(hasPaidPlan ?? false);

  const ADMIN_EMAIL = 'blangenglishlearning@blangenglish.com';

  useEffect(() => {
    // Load payment config
    supabase.from('payment_config').select('key, value').then(({ data }) => {
      if (data) {
        const map: Record<string, string> = {};
        data.forEach(r => { map[r.key] = r.value || ''; });
        setPayConfig(map);
      }
    });
  }, []);

  // Cuando llega al paso 'done', consulta la DB para saber el estado real de la suscripción
  useEffect(() => {
    if (step !== 'done') return;
    supabase
      .from('subscriptions')
      .select('status, approved_by_admin, account_enabled, plan_slug')
      .eq('student_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data: sub }) => {
        if (!sub) { setResolvedHasPaid(false); return; }
        // Tiene plan activo si: no es trial/free_trial, account_enabled no es false explícito
        // Ser generoso: si tiene cualquier suscripción activa o pending_approval la tratamos como pagado
        const isPaid =
          sub.plan_slug !== 'free_trial' &&
          sub.status !== 'cancelled' &&
          sub.status !== 'trial' &&
          sub.account_enabled !== false;
        setResolvedHasPaid(isPaid);
      });
  }, [step, userId]);

  const copyEmail = () => {
    navigator.clipboard.writeText(ADMIN_EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Usar edge function con service_role para guardar suscripción (evita problemas de RLS) ──
  const saveSubscription = async (method: PayMethod) => {
    const { error } = await supabase.functions.invoke('save-onboarding-2026', {
      body: { action: 'save_subscription', student_id: userId, plan, method },
    });
    if (error) {
      console.error('saveSubscription edge error:', error);
      // Fallback directo si la edge function falla
      const today = new Date();
      const trialEnd = new Date(today); trialEnd.setDate(today.getDate() + 7);
      const monthEnd = new Date(today); monthEnd.setMonth(today.getMonth() + 1);
      const isPaid = plan === 'discount';
      const needsApproval = isPaid && (method === 'pse' || method === 'paypal');
      const subData = {
        student_id: userId,
        plan_slug: isPaid ? 'monthly' : 'free_trial',
        plan_name: isPaid ? 'Plan Mensual (50% OFF)' : '7 días gratis',
        status: isPaid ? (needsApproval ? 'pending_approval' : 'active') : 'trial',
        amount_usd: isPaid ? 7.50 : 0,
        payment_method: method,
        approved_by_admin: !needsApproval,
        account_enabled: !needsApproval,
        current_period_end: isPaid ? monthEnd.toISOString() : trialEnd.toISOString(),
        trial_ends_at: !isPaid ? trialEnd.toISOString() : null,
        renewal_due_at: isPaid ? monthEnd.toISOString() : trialEnd.toISOString(),
      };
      const { error: e1 } = await supabase.from('subscriptions').insert(subData);
      if (e1) await supabase.from('subscriptions').update(subData).eq('student_id', userId);
      await supabase.from('student_profiles').update({ onboarding_step: 'pending_level' }).eq('id', userId);
    }
  };

  const saveLevel = async (level: string, source: 'exam' | 'self_selected') => {
    const { error } = await supabase.functions.invoke('save-onboarding-2026', {
      body: { action: 'save_level', student_id: userId, level, source },
    });
    if (error) {
      console.error('saveLevel edge error:', error);
      // Fallback directo — NO tocar account_enabled
      await supabase.from('student_profiles').update({
        english_level: level,
        level_source: source,
        level_set_at: new Date().toISOString(),
        onboarding_step: 'completed',
      }).eq('id', userId);
    }
  };

  const handlePlanContinue = () => {
    if (plan === 'later') {
      // Usar edge function para guardar
      supabase.functions.invoke('save-onboarding-2026', {
        body: { action: 'save_subscription', student_id: userId, plan: 'later', method: 'none' },
      });
      setStep('verify_email');
      return;
    }
    setStep('payment');
  };

  const handlePaymentContinue = async () => {
    setLoading(true);
    await saveSubscription(payMethod);
    setLoading(false);
    setStep('level');
  };

  const handleLevelLater = async () => {
    await supabase.functions.invoke('save-onboarding-2026', {
      body: { action: 'save_level', student_id: userId, level: 'A1', source: 'self_selected' },
    }).catch(() => {
      supabase.from('student_profiles').update({ onboarding_step: 'pending_level' }).eq('id', userId);
    });
    setStep('done');
  };

  const handleSelfLevel = async () => {
    setLoading(true);
    await saveLevel(selfLevel, 'self_selected');
    setLoading(false);
    setFinalLevel(selfLevel);
    setStep('done');
  };

  const progress = step === 'plan' ? 20 : step === 'payment' ? 50 : step === 'level' ? 80 : step === 'verify_email' ? 95 : 100;

  const paypalLink = payConfig['paypal_link'] || 'https://paypal.me/blangenglish';
  const pseBankName = payConfig['pse_bank_name'] || '';
  const pseAccountType = payConfig['pse_account_type'] || 'Ahorros';
  const pseAccountNumber = payConfig['pse_account_number'] || '';
  const pseOwnerName = payConfig['pse_owner_name'] || '';

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[120] flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div
              className="relative bg-background rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[92vh] overflow-y-auto"
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            >
              {/* Progress bar */}
              <div className="h-1.5 bg-muted">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary via-purple-400 to-pink-400"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>

              {/* ══════════ STEP: PLAN ══════════ */}
              {step === 'plan' && (
                <div className="p-7">
                  <div className="text-center mb-6">
                    <span className="inline-block bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full mb-2">Paso 1 de 3</span>
                    <h2 className="text-2xl font-extrabold mb-1">¡Bienvenido/a, {userName}! 🎉</h2>
                    <p className="text-sm text-muted-foreground">Elige cómo quieres empezar tu viaje en inglés</p>
                  </div>

                  <div className="grid gap-4 mb-6">
                    <button
                      onClick={() => setPlan('discount')}
                      className={`relative rounded-2xl p-5 text-left border-2 transition-all ${plan === 'discount' ? 'border-amber-400 bg-amber-50/80 shadow-md' : 'border-border/60 hover:border-amber-300'}`}
                    >
                      <span className="absolute -top-3 left-4 bg-amber-400 text-black text-xs font-extrabold px-3 py-0.5 rounded-full">🔥 50% OFF — Solo por tiempo limitado</span>
                      <div className="flex items-start justify-between mt-2">
                        <div>
                          <span className="text-3xl">🚀</span>
                          <h3 className="font-extrabold text-lg mt-1">Plan Mensual con Descuento</h3>
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-3xl font-black text-amber-600">$7.50 USD</span>
                            <span className="text-sm text-muted-foreground line-through">$15 USD</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">Primer mes · Luego $15 USD/mes</p>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 ${plan === 'discount' ? 'border-amber-400 bg-amber-400' : 'border-border'}`}>
                          {plan === 'discount' && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                      </div>
                      <ul className="mt-3 space-y-1">
                        {['Acceso completo a todos los cursos', 'Práctica con IA en cada unidad', 'Sin contratos anuales'].map(f => (
                          <li key={f} className="flex items-center gap-1.5 text-xs text-foreground/80">
                            <span className="text-amber-500 font-bold">✓</span>{f}
                          </li>
                        ))}
                      </ul>
                    </button>

                    <button
                      onClick={() => setPlan('trial')}
                      className={`rounded-2xl p-5 text-left border-2 transition-all ${plan === 'trial' ? 'border-primary bg-primary/5 shadow-md' : 'border-border/60 hover:border-primary/40'}`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-3xl">🌱</span>
                          <h3 className="font-extrabold text-lg mt-1">7 Días Gratis</h3>
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-3xl font-black text-green-600">GRATIS</span>
                            <span className="text-sm text-muted-foreground">7 días · Sin tarjeta</span>
                          </div>
                          <p className="text-xs text-amber-600 mt-1 font-semibold">⚠️ Al terminar pagarás $15 USD (precio completo)</p>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 ${plan === 'trial' ? 'border-primary bg-primary' : 'border-border'}`}>
                          {plan === 'trial' && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                      </div>
                      <ul className="mt-3 space-y-1">
                        {['Acceso completo por 7 días', 'Sin tarjeta de crédito', 'Cancela en cualquier momento'].map(f => (
                          <li key={f} className="flex items-center gap-1.5 text-xs text-foreground/80">
                            <span className="text-primary font-bold">✓</span>{f}
                          </li>
                        ))}
                      </ul>
                    </button>
                  </div>


                  {/* Decide later */}
                  <button
                    onClick={() => setPlan('later')}
                    className={`w-full rounded-2xl p-4 text-left border-2 transition-all flex items-center justify-between ${
                      plan === 'later' ? 'border-muted-foreground/50 bg-muted/30' : 'border-border/40 hover:border-muted-foreground/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🤔</span>
                      <div>
                        <h3 className="font-bold text-sm">Decidir después</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">Tu cuenta estará bloqueada hasta que elijas un plan.</p>
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      plan === 'later' ? 'border-foreground bg-foreground' : 'border-border'
                    }`}>
                      {plan === 'later' && <Check className="w-3 h-3 text-background" />}
                    </div>
                  </button>

                  <Button onClick={handlePlanContinue} className="w-full rounded-2xl py-6 font-extrabold text-base">
                    {plan === 'later' ? 'Continuar →' : plan === 'discount' ? 'Continuar con Plan 50% OFF' : 'Continuar con 7 Días Gratis'} <ChevronRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              )}

              {/* ══════════ STEP: PAYMENT ══════════ */}
              {step === 'payment' && (
                <div className="p-7">
                  <button onClick={() => setStep('plan')} className="text-muted-foreground hover:text-foreground text-sm mb-4 flex items-center gap-1">
                    ← Volver
                  </button>
                  <div className="text-center mb-5">
                    <span className="inline-block bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full mb-2">Paso 2 de 3</span>
                    <h2 className="text-2xl font-extrabold mb-1">Método de pago</h2>
                    <p className="text-sm text-muted-foreground">
                      {plan === 'discount' ? 'Pago de $7.50 USD · 50% OFF primer mes' : 'Prueba gratis · Sin cobro ahora'}
                    </p>
                  </div>

                  {/* Payment method tabs -- PayPal activo, PSE deshabilitado */}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    {/* PayPal — activo */}
                    <button
                      onClick={() => setPayMethod('paypal')}
                      className={`rounded-2xl p-3 border-2 text-center transition-all ${
                        payMethod === 'paypal' ? 'border-primary bg-primary/5' : 'border-border/60 hover:border-primary/40'
                      }`}
                    >
                      <Wallet className={`w-5 h-5 mx-auto mb-1 ${payMethod === 'paypal' ? 'text-primary' : 'text-muted-foreground'}`} />
                      <p className="text-sm font-bold">PayPal</p>
                      <p className="text-xs text-muted-foreground">Pago manual</p>
                    </button>

                    {/* PSE — deshabilitado (próximamente) */}
                    <div className="relative rounded-2xl p-3 border-2 border-border/30 text-center opacity-50 cursor-not-allowed select-none">
                      <Building2 className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-sm font-bold text-muted-foreground">PSE</p>
                      <p className="text-xs text-muted-foreground">Próximamente</p>
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-muted text-muted-foreground text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                        No disponible
                      </span>
                    </div>
                  </div>


                  {/* ── PSE INFO ── */}
                  {payMethod === 'pse' && (
                    <div className="space-y-3 mb-5">
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <div className="flex items-start gap-2 mb-3">
                          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-bold text-amber-800">Pago manual vía PSE / Transferencia bancaria</p>
                            <p className="text-xs text-amber-700 mt-1">Tu cuenta se activará en <strong>hasta 48 horas</strong> después de confirmar tu pago.</p>
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-3 space-y-2">
                          {pseBankName && (
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                              <span className="text-muted-foreground">Banco:</span>
                              <span className="font-semibold">{pseBankName}</span>
                              <span className="text-muted-foreground">Tipo de cuenta:</span>
                              <span className="font-semibold">{pseAccountType}</span>
                              {pseAccountNumber && (
                                <>
                                  <span className="text-muted-foreground">Número:</span>
                                  <span className="font-bold font-mono">{pseAccountNumber}</span>
                                </>
                              )}
                              {pseOwnerName && (
                                <>
                                  <span className="text-muted-foreground">Titular:</span>
                                  <span className="font-semibold">{pseOwnerName}</span>
                                </>
                              )}
                            </div>
                          )}
                          {!pseBankName && (
                            <p className="text-xs text-amber-700 font-medium">📌 Los datos de cuenta serán enviados a tu correo al confirmar.</p>
                          )}
                          <p className="text-xs font-bold text-foreground mt-2">Envía el comprobante a:</p>
                          <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                            <span className="text-xs font-mono text-foreground flex-1 truncate">{ADMIN_EMAIL}</span>
                            <button onClick={copyEmail} className="text-primary hover:text-primary/80 shrink-0">
                              {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                          <p className="text-xs text-amber-700 font-semibold mt-2">
                            ⚠️ <strong>Renueva con anticipación:</strong> Envía el soporte al menos <strong>1 día antes</strong> del vencimiento para evitar la desactivación.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── PAYPAL INFO ── */}
                  {payMethod === 'paypal' && (
                    <div className="space-y-3 mb-5">
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <div className="flex items-start gap-2 mb-3">
                          <Wallet className="w-4 h-4 text-blue-700 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-bold text-blue-800">Pago vía PayPal</p>
                            <p className="text-xs text-blue-700 mt-1">Tu cuenta se activará en <strong>hasta 48 horas</strong> después de recibir el soporte de pago.</p>
                          </div>
                        </div>
                        <div className="bg-white rounded-lg p-3 space-y-2">
                          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                            <li>Abre PayPal y envía el pago a la cuenta de BLANG</li>
                            <li>En el asunto escribe tu nombre y correo de registro</li>
                            <li>Envía el comprobante a:</li>
                          </ol>
                          <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                            <span className="text-xs font-mono text-foreground flex-1 truncate">{ADMIN_EMAIL}</span>
                            <button onClick={copyEmail} className="text-primary hover:text-primary/80 shrink-0">
                              {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                          </div>
                          <a
                            href={paypalLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline mt-1"
                          >
                            <ExternalLink className="w-3 h-3" /> Ir a PayPal → {paypalLink}
                          </a>
                          <p className="text-xs text-amber-700 font-semibold mt-2">
                            ⚠️ <strong>No es automático.</strong> Envía el soporte al menos <strong>1 día antes</strong> del vencimiento.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handlePaymentContinue}
                    disabled={loading}
                    className="w-full rounded-2xl py-6 font-extrabold text-base disabled:opacity-50"
                  >
                    {loading ? 'Guardando...' : 'Entendido, continuar →'}
                  </Button>
                </div>
              )}

              {/* ══════════ STEP: LEVEL CHOICE ══════════ */}
              {step === 'level' && levelChoice === null && !showLevelExam && (
                <div className="p-7">
                  <div className="text-center mb-5">
                    <span className="inline-block bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full mb-2">Paso 3 de 3</span>
                    <h2 className="text-2xl font-extrabold mb-1">¿Cuál es tu nivel de inglés? 📚</h2>
                    <p className="text-sm text-muted-foreground">Necesitamos esto para habilitarte los cursos correctos</p>
                  </div>

                  <div className="space-y-3 mb-5">
                    <button
                      onClick={() => setShowLevelExam(true)}
                      className="w-full flex items-center gap-4 rounded-2xl border-2 border-border/60 hover:border-primary hover:bg-primary/5 p-4 text-left transition-all"
                    >
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <FlaskConical className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-extrabold text-sm">Hacer el examen de nivel</p>
                        <p className="text-xs text-muted-foreground mt-0.5">15 preguntas rápidas · ~5 minutos · Te asignamos el nivel ideal</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                    </button>

                    <button
                      onClick={() => setLevelChoice('self')}
                      className="w-full flex items-center gap-4 rounded-2xl border-2 border-border/60 hover:border-emerald-400 hover:bg-emerald-50/50 p-4 text-left transition-all"
                    >
                      <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                        <BookOpen className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-extrabold text-sm">Ya sé mi nivel</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Selecciono el nivel donde quiero empezar</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                    </button>

                    <button
                      onClick={handleLevelLater}
                      className="w-full flex items-center gap-4 rounded-2xl border-2 border-border/40 hover:border-muted-foreground/30 p-4 text-left transition-all opacity-70"
                    >
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                        <Clock className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="font-extrabold text-sm">Escoger más tarde</p>
                        <p className="text-xs text-amber-600 mt-0.5 font-medium">⚠️ Los cursos permanecerán bloqueados hasta que elijas tu nivel</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                    </button>
                  </div>
                </div>
              )}

              {/* ══════════ LEVEL: SELF SELECT ══════════ */}
              {step === 'level' && levelChoice === 'self' && (
                <div className="p-7">
                  <button onClick={() => setLevelChoice(null)} className="text-muted-foreground hover:text-foreground text-sm mb-4 flex items-center gap-1">
                    ← Volver
                  </button>
                  <div className="text-center mb-5">
                    <h2 className="text-xl font-extrabold mb-1">Selecciona tu nivel 🎯</h2>
                    <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 mt-3 text-left">
                      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-700"><strong>Importante:</strong> Una vez que confirmes tu nivel, <strong>no podrás cambiarlo</strong>. Asegúrate de elegir correctamente.</p>
                    </div>
                  </div>
                  <div className="space-y-2 mb-5">
                    {ENGLISH_LEVELS.map(lvl => (
                      <button
                        key={lvl.id}
                        onClick={() => setSelfLevel(lvl.id)}
                        className={`w-full flex items-center gap-3 rounded-xl border-2 p-3.5 text-left transition-all ${selfLevel === lvl.id ? 'border-primary bg-primary/5' : 'border-border/60 hover:border-primary/40'}`}
                      >
                        <span className="text-2xl">{lvl.emoji}</span>
                        <div className="flex-1">
                          <p className="font-bold text-sm">{lvl.label}</p>
                          <p className="text-xs text-muted-foreground">{lvl.desc}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selfLevel === lvl.id ? 'border-primary bg-primary' : 'border-border'}`}>
                          {selfLevel === lvl.id && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </button>
                    ))}
                  </div>
                  <Button onClick={handleSelfLevel} disabled={loading} className="w-full rounded-2xl py-5 font-extrabold">
                    {loading ? 'Guardando...' : `Confirmar nivel ${selfLevel} y empezar 🚀`}
                  </Button>
                </div>
              )}

              {/* ══════════ DONE ══════════ */}
              {step === 'done' && (
                <div className="p-8 text-center">

                  {/* ── CASO A: Ya tiene plan pagado (habilitado por admin) ── */}
                  {resolvedHasPaid ? (
                    <>
                      <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-5 shadow-xl">
                        <span className="text-5xl">🌟</span>
                      </div>
                      <h2 className="text-2xl font-extrabold mb-1">¡Bienvenido/a a la experiencia Blang, {userName}!</h2>
                      <p className="text-muted-foreground text-sm mb-5 max-w-xs mx-auto">
                        Tu nivel ha sido asignado. Ahora tienes acceso completo a todos tus cursos. ¡Es hora de empezar a aprender!
                      </p>

                      {/* Nivel obtenido */}
                      {finalLevel && (
                        <div className="inline-flex items-center gap-3 bg-green-50 border-2 border-green-200 rounded-2xl px-6 py-3 mb-6">
                          <span className="text-3xl">{{ A1: '🌱', A2: '📗', B1: '📘', B2: '📙', C1: '🏆' }[finalLevel] || '🎓'}</span>
                          <div className="text-left">
                            <p className="text-xs text-green-700 font-medium">Tu nivel de inglés</p>
                            <p className="font-extrabold text-green-800 text-xl">{finalLevel}</p>
                          </div>
                        </div>
                      )}

                      <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-left">
                        <p className="text-sm font-bold text-green-800 mb-1">✅ Todo listo para comenzar</p>
                        <p className="text-xs text-green-700">
                          Tus cursos están desbloqueados según tu nivel. Dirígete a <strong>Mis Cursos</strong> para empezar tu primera lección.
                        </p>
                      </div>

                      <Button
                        onClick={onComplete}
                        className="w-full max-w-xs rounded-2xl py-6 font-extrabold text-base bg-green-600 hover:bg-green-700 text-white"
                      >
                        ¡Ir a mis cursos ahora! 🚀
                      </Button>
                    </>
                  ) : (
                    /* ── CASO B: Sin plan pagado todavía — debe pagar ── */
                    <>
                      <div className="w-20 h-20 bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center mx-auto mb-5 shadow-xl">
                        <span className="text-4xl">🎉</span>
                      </div>
                      <h2 className="text-2xl font-extrabold mb-2">¡Nivel guardado, {userName}!</h2>

                      {/* Nivel obtenido */}
                      {finalLevel && (
                        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-2xl px-5 py-2.5 mb-4">
                          <span className="text-2xl">{{ A1: '🌱', A2: '📗', B1: '📘', B2: '📙', C1: '🏆' }[finalLevel] || '🎓'}</span>
                          <div className="text-left">
                            <p className="text-xs text-muted-foreground font-medium">Tu nivel asignado</p>
                            <p className="font-extrabold text-primary text-lg">{finalLevel}</p>
                          </div>
                        </div>
                      )}

                      {/* Aviso de pago pendiente */}
                      {(payMethod === 'pse' || payMethod === 'paypal') ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-left">
                          <p className="text-sm font-bold text-amber-800 mb-1">⏳ Próximo paso: completa tu pago</p>
                          <p className="text-xs text-amber-700">
                            Tu nivel está guardado. Los cursos se habilitarán automáticamente una vez que el administrador confirme tu pago de <strong>{payMethod === 'pse' ? 'PSE / Transferencia' : 'PayPal'}</strong> (1–24h hábiles).
                          </p>
                        </div>
                      ) : (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-left">
                          <p className="text-sm font-bold text-amber-800 mb-1">💳 Activa tu plan para acceder</p>
                          <p className="text-xs text-amber-700">
                            Tu nivel está guardado, pero necesitas <strong>activar un plan</strong> para desbloquear los cursos. Ve a la sección de Pagos para completar tu inscripción.
                          </p>
                        </div>
                      )}

                      <Button onClick={onComplete} className="w-full max-w-xs rounded-2xl py-6 font-extrabold text-base">
                        {(payMethod === 'pse' || payMethod === 'paypal') ? 'Ver instrucciones de pago 💳' : 'Ir a Pagos 💳'}
                      </Button>
                    </>
                  )}
                </div>
              )}

              {/* ══════════ STEP: VERIFY EMAIL ══════════ */}
              {step === 'verify_email' && (
                <div className="p-8 text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-5 shadow-xl">
                    <span className="text-4xl">📧</span>
                  </div>
                  <h2 className="text-2xl font-extrabold mb-2">¡Cuenta creada, {userName}!</h2>
                  <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-5">
                    Tu cuenta está registrada. Cuando estés listo/a para elegir tu plan, entra al dashboard y selecciona una opción para activar tu acceso.
                  </p>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
                    <p className="text-sm font-bold text-amber-800 mb-1">⚠️ Acceso limitado</p>
                    <p className="text-xs text-amber-700">
                      Por ahora tu cuenta está <strong>bloqueada</strong>. Podrás acceder al contenido del curso cuando elijas un plan y el administrador apruebe tu solicitud.
                    </p>
                  </div>

                  <Button onClick={onComplete} className="w-full max-w-xs rounded-2xl py-6 font-extrabold text-base">
                    Ir a mi dashboard →
                  </Button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Level Exam overlay (shown on top of OnboardingFlow) */}
      {showLevelExam && (
        <LevelExam
          open={showLevelExam}
          userId={userId}
          onResult={(level, accepted) => {
            setShowLevelExam(false);
            if (accepted) {
              setFinalLevel(level);
              setStep('done');
            }
          }}
          onClose={() => setShowLevelExam(false)}
        />
      )}
    </>
  );
}
