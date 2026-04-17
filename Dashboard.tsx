import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { usePricingPlans } from '@/hooks/useSupabaseData';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { IMAGES } from '@/assets/images';
import { ROUTE_PATHS } from '@/lib/index';
import type { AuthModal } from '@/lib/index';
import { supabase } from '@/integrations/supabase/client';
import { UnitViewer } from '@/components/UnitViewer';
import { RenewalAlert } from '@/components/RenewalAlert';
import { OnboardingFlow } from '@/components/OnboardingFlow';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  User, CreditCard, TrendingUp, HelpCircle, LogOut,
  ChevronRight, BookOpen, Lock, Eye, EyeOff, Check,
  AlertCircle, Flame, Star, Award, ChevronDown, ChevronUp,
  FlaskConical, Calendar, GraduationCap, MapPin, Phone,
  Video, Plus, Trash2, Clock, Mail, History, CheckCircle2,
} from 'lucide-react';

interface DashboardProps {
  isLoggedIn?: boolean;
  onOpenAuth?: (modal: AuthModal) => void;
  onLogout?: () => void;
  userName?: string;
}

type TabId = 'cursos' | 'cuenta' | 'pagos' | 'progreso' | 'sesion' | 'ayuda';

const LEVEL_COLORS: Record<string, { color: string; badge: string }> = {
  A1: { color: 'from-green-400/20 to-emerald-400/20 border-green-200', badge: 'bg-green-100 text-green-700' },
  A2: { color: 'from-teal-400/20 to-cyan-400/20 border-teal-200', badge: 'bg-teal-100 text-teal-700' },
  B1: { color: 'from-blue-400/20 to-indigo-400/20 border-blue-200', badge: 'bg-blue-100 text-blue-700' },
  B2: { color: 'from-purple-400/20 to-violet-400/20 border-purple-200', badge: 'bg-purple-100 text-purple-700' },
  C1: { color: 'from-amber-400/20 to-yellow-400/20 border-amber-200', badge: 'bg-amber-100 text-amber-700' },
};

const FAQ_QUICK = [
  { q: '¿Cómo cancelo mi suscripción?', a: 'Ve a la pestaña "Pagos" en tu perfil y selecciona "Cancelar suscripción". Tu acceso continuará hasta el final del período pagado.' },
  { q: '¿Puedo cambiar mi correo?', a: 'Por seguridad el correo no se puede cambiar directamente. Escríbenos a blangenglishlearning@blangenglish.com con tu solicitud.' },
  { q: '¿Cómo reservo una sesión en vivo?', a: 'Desde la sección "Sesiones en Vivo" en el inicio podrás reservar. Recuerda que el costo es de $10 USD por hora.' },
  { q: '¿Cómo funciona la práctica con IA?', a: 'Al final de cada unidad encontrarás el paso 5 de práctica con IA, donde podrás conversar y escribir con inteligencia artificial para reforzar lo aprendido.' },
  { q: '¿Qué pasa si tengo un problema técnico?', a: 'Escríbenos usando el formulario de la sección de Preguntas Frecuentes o por nuestros canales de WhatsApp e Instagram.' },
];

interface DBCourseRow { id: string; emoji: string; title: string; level: string; total_units: number; is_published: boolean; sort_order: number; description: string; required_level?: string; }
interface DBUnitRow { id: string; course_id: string; title: string; description: string; sort_order: number; is_published: boolean; }

// ── PayPal Hosted Button (oficial SDK) ──
const PAYPAL_CLIENT_ID = 'BAA2srggiH3C_NZOPi5WgvxY9uAmQ5IdL4jsKRt4OdZ_xB6nE1vAWM6800tAFqwddu-eYQBLEEEuXhDNJg';
const PAYPAL_BUTTON_ID  = 'LSDLRPXB2WLJL';

function PayPalHostedButton() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError]   = useState(false);

  useEffect(() => {
    // Unique container id to avoid collisions
    const containerId = `paypal-container-${PAYPAL_BUTTON_ID}`;
    if (containerRef.current) containerRef.current.id = containerId;

    // If SDK already loaded, render immediately
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).paypal?.HostedButtons) {
      renderButton(containerId);
      return;
    }

    // Remove any previous duplicate script
    const existing = document.getElementById('paypal-sdk-script');
    if (existing) existing.remove();

    const script = document.createElement('script');
    script.id  = 'paypal-sdk-script';
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&components=hosted-buttons&disable-funding=venmo&currency=USD`;
    script.async = true;
    script.onload = () => renderButton(containerId);
    script.onerror = () => setError(true);
    document.body.appendChild(script);

    return () => {
      // Clean up rendered button on unmount
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function renderButton(containerId: string) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).paypal.HostedButtons({ hostedButtonId: PAYPAL_BUTTON_ID }).render(`#${containerId}`);
      setLoaded(true);
    } catch {
      setError(true);
    }
  }

  if (error) {
    return (
      <a
        href="https://www.paypal.com/paypalme/blangenglish"
        target="_blank" rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 bg-[#003087] hover:bg-[#002070] text-white font-bold px-5 py-3 rounded-xl text-sm transition-colors w-full"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.59 3.025-2.566 6.082-8.558 6.082H9.928l-1.182 7.519H12c.46 0 .85-.334.922-.789l.038-.197.733-4.64.047-.257a.932.932 0 0 1 .921-.789h.58c3.76 0 6.701-1.528 7.559-5.95.36-1.85.176-3.395-.578-4.692z"/></svg>
        Pagar con PayPal
      </a>
    );
  }

  return (
    <div className="w-full">
      {!loaded && (
        <div className="flex items-center justify-center gap-2 bg-[#FFC439]/10 border border-[#FFC439]/40 rounded-xl py-4 text-sm text-[#003087] font-medium">
          <div className="w-4 h-4 border-2 border-[#003087]/30 border-t-[#003087] rounded-full animate-spin" />
          Cargando PayPal...
        </div>
      )}
      <div ref={containerRef} className="w-full" />
    </div>
  );
}

// ── PlanSelector: 2 opciones (nuevo) o solo pago (reactivar) ──
function PlanSelector({ currentUserId, currentEmail, onPlanSaved, onOpenPaypal, mode = 'new' }: {
  currentUserId: string;
  currentEmail: string;
  onPlanSaved: () => void;
  onOpenPaypal: () => void;
  mode?: 'new' | 'reactivate';
}) {
  const [selectedPlan, setSelectedPlan] = useState<'trial' | 'discount' | null>(null);
  const [payMethod, setPayMethod] = useState<'pse' | 'paypal'>('pse');
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<'select' | 'pay'>('select');

  const handleConfirmPlan = async () => {
    if (!selectedPlan) return;
    setSaving(true);
    const { error } = await supabase.functions.invoke('save-onboarding-2026', {
      body: { action: 'save_subscription', student_id: currentUserId, plan: selectedPlan, method: payMethod },
    });
    if (error) {
      // Fallback directo
      const today = new Date();
      const trialEnd = new Date(today); trialEnd.setDate(today.getDate() + 7);
      const monthEnd = new Date(today); monthEnd.setMonth(today.getMonth() + 1);
      const isPaid = selectedPlan === 'discount';
      const subData = {
        student_id: currentUserId,
        plan_slug: isPaid ? 'monthly' : 'free_trial',
        plan_name: isPaid ? 'Plan Mensual (50% OFF)' : '7 días gratis',
        status: isPaid ? 'pending_approval' : 'trial',
        amount_usd: isPaid ? 7.50 : 0,
        payment_method: payMethod,
        approved_by_admin: !isPaid,
        account_enabled: !isPaid,
        current_period_end: isPaid ? monthEnd.toISOString() : trialEnd.toISOString(),
        trial_ends_at: !isPaid ? trialEnd.toISOString() : null,
      };
      const { error: e1 } = await supabase.from('subscriptions').insert(subData);
      if (e1) await supabase.from('subscriptions').update(subData).eq('student_id', currentUserId);
    }
    setSaving(false);
    onPlanSaved();
  };

  if (step === 'pay' && selectedPlan === 'discount') {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border-2 border-primary/20 p-5 bg-background">
          <button onClick={() => setStep('select')} className="text-xs text-muted-foreground hover:text-foreground mb-3 flex items-center gap-1">
            ← Volver
          </button>
          <h3 className="font-extrabold text-lg mb-1">Elige cómo pagar</h3>
          <p className="text-sm text-muted-foreground mb-5">Plan Mensual 50% OFF — <strong>$7.50 USD</strong> <span className="line-through text-muted-foreground">$15 USD</span></p>

          {/* PayPal → guarda y abre modal */}
          <button
            className="w-full rounded-2xl border-2 p-4 flex items-center gap-3 mb-3 border-[#003087]/30 bg-[#003087]/5 hover:border-[#003087]/60 transition-all"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              const { error } = await supabase.functions.invoke('save-onboarding-2026', {
                body: { action: 'save_subscription', student_id: currentUserId, plan: 'discount', method: 'paypal' },
              });
              if (error) {
                const today = new Date(); const monthEnd = new Date(today); monthEnd.setMonth(today.getMonth() + 1);
                const d = { student_id: currentUserId, plan_slug: 'monthly', plan_name: 'Plan Mensual (50% OFF)', status: 'pending_approval', amount_usd: 7.50, payment_method: 'paypal', approved_by_admin: false, account_enabled: false, current_period_end: monthEnd.toISOString() };
                const { error: e1 } = await supabase.from('subscriptions').insert(d);
                if (e1) await supabase.from('subscriptions').update(d).eq('student_id', currentUserId);
              }
              setSaving(false);
              onPlanSaved();
              onOpenPaypal();
            }}
          >
            <svg viewBox="0 0 24 24" className="w-7 h-7 fill-[#003087] shrink-0"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.59 3.025-2.566 6.082-8.558 6.082H9.928l-1.182 7.519H12c.46 0 .85-.334.922-.789l.038-.197.733-4.64.047-.257a.932.932 0 0 1 .921-.789h.58c3.76 0 6.701-1.528 7.559-5.95.36-1.85.176-3.395-.578-4.692z"/></svg>
            <div className="text-left">
              <p className="font-bold text-[#003087] text-sm">{saving ? 'Preparando...' : 'Pagar con PayPal 💳'}</p>
              <p className="text-xs text-muted-foreground">Activación automática al confirmar pago</p>
            </div>
          </button>

          {/* PSE — próximamente */}
          <button
            className="w-full rounded-2xl border-2 p-4 flex items-center gap-3 border-border/40 bg-muted/20 opacity-60 cursor-not-allowed"
            disabled
          >
            <span className="text-2xl">🏦</span>
            <div className="text-left">
              <p className="font-bold text-sm">PSE — Próximamente</p>
              <p className="text-xs text-muted-foreground">Disponible muy pronto</p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // ── Modo reactivar: solo PayPal + PSE, precio normal ──
  if (mode === 'reactivate') {
    return (
      <div className="rounded-2xl border-2 border-primary/20 p-5 bg-background space-y-4">
        <div>
          <h3 className="font-extrabold text-xl mb-1">Reactivar suscripción 🔄</h3>
          <p className="text-sm text-muted-foreground">Plan Mensual — <strong>$15 USD/mes</strong></p>
        </div>

        {/* PayPal */}
        <button
          className="w-full rounded-2xl border-2 p-4 flex items-center gap-3 border-[#003087]/30 bg-[#003087]/5 hover:border-[#003087]/60 transition-all"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            const today = new Date(); const monthEnd = new Date(today); monthEnd.setMonth(today.getMonth() + 1);
            const d = { student_id: currentUserId, plan_slug: 'monthly', plan_name: 'Plan Mensual', status: 'pending_approval', amount_usd: 15, payment_method: 'paypal', approved_by_admin: false, account_enabled: false, current_period_end: monthEnd.toISOString() };
            const { error: e1 } = await supabase.from('subscriptions').insert(d);
            if (e1) await supabase.from('subscriptions').update(d).eq('student_id', currentUserId);
            setSaving(false);
            onPlanSaved();
            onOpenPaypal();
          }}
        >
          <svg viewBox="0 0 24 24" className="w-7 h-7 fill-[#003087] shrink-0"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.59 3.025-2.566 6.082-8.558 6.082H9.928l-1.182 7.519H12c.46 0 .85-.334.922-.789l.038-.197.733-4.64.047-.257a.932.932 0 0 1 .921-.789h.58c3.76 0 6.701-1.528 7.559-5.95.36-1.85.176-3.395-.578-4.692z"/></svg>
          <div className="text-left">
            <p className="font-bold text-[#003087] text-sm">{saving ? 'Preparando...' : 'Pagar con PayPal'}</p>
            <p className="text-xs text-muted-foreground">Se abrirá el formulario de pago</p>
          </div>
        </button>

        {/* PSE — próximamente */}
        <button disabled className="w-full rounded-2xl border-2 p-4 flex items-center gap-3 border-border/40 bg-muted/20 opacity-50 cursor-not-allowed">
          <span className="text-2xl">🏦</span>
          <div className="text-left">
            <p className="font-bold text-sm">PSE — Próximamente</p>
            <p className="text-xs text-muted-foreground">Disponible muy pronto</p>
          </div>
        </button>
      </div>
    );
  }

  // ── Modo nuevo usuario: 7 días gratis + 50% OFF ──
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border-2 border-border/50 p-5 bg-background">
        <h3 className="font-extrabold text-xl mb-1">Elige tu plan 🎓</h3>
        <p className="text-sm text-muted-foreground mb-5">Selecciona una opción para habilitar tus cursos.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Opción 1: 7 días gratis */}
          <button
            onClick={() => setSelectedPlan('trial')}
            className={`rounded-2xl border-2 p-5 text-left flex flex-col gap-3 transition-all ${
              selectedPlan === 'trial'
                ? 'border-blue-400 bg-blue-50/50 shadow-md'
                : 'border-border/50 hover:border-blue-300 hover:bg-blue-50/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-3xl">🌱</span>
              {selectedPlan === 'trial' && <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">✓ Seleccionado</span>}
            </div>
            <div>
              <p className="font-extrabold text-base">7 días gratis</p>
              <p className="text-2xl font-black text-blue-600">$0</p>
            </div>
            <ul className="space-y-1">
              <li className="text-xs text-foreground/70 flex items-center gap-1.5"><Check className="w-3 h-3 text-blue-500" /> Acceso inmediato al módulo A1</li>
              <li className="text-xs text-foreground/70 flex items-center gap-1.5"><Check className="w-3 h-3 text-blue-500" /> Sin tarjeta de crédito</li>
              <li className="text-xs text-foreground/70 flex items-center gap-1.5"><Check className="w-3 h-3 text-blue-500" /> Prueba completa por 7 días</li>
            </ul>
          </button>

          {/* Opción 2: 50% descuento */}
          <button
            onClick={() => setSelectedPlan('discount')}
            className={`rounded-2xl border-2 p-5 text-left flex flex-col gap-3 transition-all relative ${
              selectedPlan === 'discount'
                ? 'border-primary bg-primary/5 shadow-md'
                : 'border-border/50 hover:border-primary/40 hover:bg-primary/5'
            }`}
          >
            <span className="absolute -top-3 left-4 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">⭐ Recomendado</span>
            <div className="flex items-center justify-between">
              <span className="text-3xl">🚀</span>
              {selectedPlan === 'discount' && <span className="text-xs font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-full">✓ Seleccionado</span>}
            </div>
            <div>
              <p className="font-extrabold text-base">Plan Mensual 50% OFF</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-black text-primary">$7.50 USD</p>
                <p className="text-sm line-through text-muted-foreground">$15 USD</p>
              </div>
            </div>
            <ul className="space-y-1">
              <li className="text-xs text-foreground/70 flex items-center gap-1.5"><Check className="w-3 h-3 text-primary" /> Acceso completo a TODOS los cursos</li>
              <li className="text-xs text-foreground/70 flex items-center gap-1.5"><Check className="w-3 h-3 text-primary" /> A1, A2, B1, B2, C1</li>
              <li className="text-xs text-foreground/70 flex items-center gap-1.5"><Check className="w-3 h-3 text-primary" /> Pago por PSE o PayPal</li>
            </ul>
          </button>
        </div>

        {selectedPlan && (
          <div className="mt-5">
            {selectedPlan === 'trial' ? (
              <Button className="w-full rounded-xl py-3 font-bold bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleConfirmPlan} disabled={saving}>
                {saving ? 'Activando...' : '🌱 Activar prueba gratis 7 días →'}
              </Button>
            ) : (
              <Button className="w-full rounded-xl py-3 font-bold"
                onClick={() => setStep('pay')}>
                Continuar con 50% OFF →
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── TrialPaymentBlock: terminar prueba gratis y pagar ──
function TrialPaymentBlock({
  fmtDate, trialEnd, onOpenPaypal
}: {
  fmtDate: (d: Date | null) => string;
  trialEnd: Date;
  onOpenPaypal: () => void;
}) {
  return (
    <div className="rounded-2xl bg-blue-50 border-2 border-blue-200 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">🌱</span>
        <p className="font-bold text-blue-900">Prueba gratis activa — acceso módulo A1</p>
      </div>
      <p className="text-sm text-blue-800 mb-4">
        Tu prueba termina el <strong>{fmtDate(trialEnd)}</strong>. Para desbloquear todos los cursos (A2, B1, B2, C1) suscríbete ahora con el <strong>50% de descuento</strong>.
      </p>
      <Button className="rounded-xl gap-2 bg-primary font-bold" onClick={onOpenPaypal}>
        Terminar prueba y pagar — $7.50 USD 💳
      </Button>
    </div>
  );
}

export default function Dashboard({ isLoggedIn = false, onOpenAuth, onLogout, userName }: DashboardProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('cursos');
  const [profileForm, setProfileForm] = useState({ name: userName || 'Estudiante', phone: '' });
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [pwSaved, setPwSaved] = useState(false);
  const [pwError, setPwError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({ open: false, title: '', message: '', onConfirm: () => {} });
  const [completedLevels, setCompletedLevels] = useState<string[]>([]);
  // unit progress map: unitId → number of completed stages
  const [unitProgressMap, setUnitProgressMap] = useState<Record<string, number>>({});

  // Session booking form state
  interface SessionSlot { date: string; topic: string; }
  const [sessionName, setSessionName] = useState('');
  const [sessionEmail, setSessionEmail] = useState('');
  const [sessionSlots, setSessionSlots] = useState<SessionSlot[]>([{ date: '', topic: '' }]);
  const [sessionWeekly, setSessionWeekly] = useState(false);
  const [sessionWeeklyHours, setSessionWeeklyHours] = useState('');
  const [sessionWeeklySchedule, setSessionWeeklySchedule] = useState('');
  const [sessionObjective, setSessionObjective] = useState('');
  const [sessionSent, setSessionSent] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);

  const [teacherForm, setTeacherForm] = useState({ name: '', email: '', message: '' });
  const [teacherSent, setTeacherSent] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [showPaypalModal, setShowPaypalModal] = useState(false);
  const [paypalModalAmount, setPaypalModalAmount] = useState(7.50);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [subscription, setSubscription] = useState<{ plan_name: string; plan_slug?: string; status: string; amount_usd: number; current_period_end: string; payment_method?: string; renewal_due_at?: string; approved_by_admin?: boolean; account_enabled?: boolean; created_at?: string; trial_ends_at?: string } | null>(null);
  // Payment history
  interface PaymentHistoryRow { id: string; event_type: string; amount_usd: number; payment_method: string; notes?: string; created_at: string; created_by?: string; }
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryRow[]>([]);
  // Progress from DB
  interface ProgressRow { course_id: string; completed_units: number; total_units: number; streak_days: number; total_points: number; last_activity_at?: string; }
  const [progressData, setProgressData] = useState<ProgressRow[]>([]);
  const [activityDays, setActivityDays] = useState<string[]>([]);
  const [totalUnitsCompleted, setTotalUnitsCompleted] = useState(0);
  const [currentEmail, setCurrentEmail] = useState('');
  const [studentProfile, setStudentProfile] = useState<{
    english_level?: string;
    onboarding_step?: string;
    is_admin_only?: boolean;
    birthday?: string;
    country?: string;
    city?: string;
    education_level?: string;
    education_other?: string;
  } | null>(null);
  // IDs de cursos/unidades con acceso explícito habilitado por admin
  const [grantedModuleIds, setGrantedModuleIds] = useState<string[]>([]);
  // IDs de cursos/unidades con acceso explícitamente revocado por admin
  const [revokedModuleIds, setRevokedModuleIds] = useState<string[]>([]);
  const [showRenewalAlert, setShowRenewalAlert] = useState(false);
  const [showLevelOnboarding, setShowLevelOnboarding] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');

  // Real courses & units from Supabase
  const [dbCourses, setDbCourses] = useState<DBCourseRow[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);
  const [courseUnits, setCourseUnits] = useState<Record<string, DBUnitRow[]>>({});
  const [loadingUnits, setLoadingUnits] = useState<string | null>(null);
  const [viewerUnit, setViewerUnit] = useState<{ id: string; title: string; description: string } | null>(null);

  useEffect(() => {
    // Load published courses from DB
    supabase.from('courses').select('*').eq('is_published', true).order('sort_order').then(({ data }) => {
      if (data) setDbCourses(data as DBCourseRow[]);
      setCoursesLoading(false);
    });
  }, []);

  const loadUnitsForCourse = async (courseId: string) => {
    if (courseUnits[courseId]) return; // already loaded
    setLoadingUnits(courseId);
    const { data } = await supabase.from('units').select('*').eq('course_id', courseId).eq('is_published', true).order('sort_order');
    const units = (data || []) as DBUnitRow[];
    setCourseUnits(prev => ({ ...prev, [courseId]: units }));
    setLoadingUnits(null);
    // Cargar progreso de cada unidad
    if (units.length > 0 && currentUserId) {
      const unitIds = units.map(u => u.id);
      const { data: progData } = await supabase.from('unit_progress')
        .select('unit_id')
        .in('unit_id', unitIds)
        .eq('student_id', currentUserId)
        .eq('completed', true);
      const newMap: Record<string, number> = {};
      (progData || []).forEach((p: { unit_id: string }) => {
        newMap[p.unit_id] = (newMap[p.unit_id] || 0) + 1;
      });
      setUnitProgressMap(prev => ({ ...prev, ...newMap }));
    }
  };

  const toggleCourse = (courseId: string) => {
    if (expandedCourse === courseId) { setExpandedCourse(null); return; }
    setExpandedCourse(courseId);
    loadUnitsForCourse(courseId);
  };

  // ── refreshProfile: carga perfil + suscripción + historial usando cliente directo ──
  const refreshProfile = async (userId: string) => {
    const [profRes, subRes, histRes, modRes] = await Promise.all([
      supabase
        .from('student_profiles')
        .select('full_name, phone, english_level, onboarding_step, is_admin_only, birthday, country, city, education_level, education_other, account_enabled')
        .eq('id', userId)
        .maybeSingle(),
      supabase
        .from('subscriptions')
        .select('*')
        .eq('student_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('payment_history')
        .select('*')
        .eq('student_id', userId)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('student_module_access')
        .select('course_id, unit_id, is_active')
        .eq('student_id', userId),
    ]);

    const prof = profRes.data;
    const sub  = subRes.data;
    const hist = histRes.data;
    const mods = modRes.data;

    if (prof) {
      setProfileForm({ name: (prof as { full_name?: string }).full_name || userName || '', phone: (prof as { phone?: string }).phone || '' });
      setStudentProfile(prof as typeof studentProfile);
      setTeacherForm((tf: typeof teacherForm) => ({ ...tf, name: (prof as { full_name?: string }).full_name || '' }));
      setSessionName((prof as { full_name?: string }).full_name || userName || '');
    }

    if (hist) setPaymentHistory(hist as PaymentHistoryRow[]);

    setSubscription(sub ? (sub as typeof subscription) : null);
    if (sub) {
      const method = (sub as { payment_method?: string }).payment_method;
      const dueAt  = (sub as { renewal_due_at?: string }).renewal_due_at;
      if ((method === 'pse' || method === 'paypal') && dueAt) {
        const ms = new Date(dueAt).getTime() - Date.now();
        if (ms > 0 && ms <= 24 * 60 * 60 * 1000) setShowRenewalAlert(true);
      }
    }

    const allMods = ((mods ?? []) as { course_id?: string; unit_id?: string; is_active?: boolean }[]);
    // granted: solo is_active === true EXPLÍCITAMENTE (admin concedió acceso)
    const grantedIds = allMods
      .filter(m => m.is_active === true)
      .map(m => m.unit_id || m.course_id || '')
      .filter(Boolean);
    // revoked: is_active === false EXPLÍCITAMENTE (admin revocó acceso)
    const revokedIds = allMods
      .filter(m => m.is_active === false)
      .map(m => m.unit_id || m.course_id || '')
      .filter(Boolean);
    setGrantedModuleIds(grantedIds);
    setRevokedModuleIds(revokedIds);
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    // Cargar sesión y perfil al montar — usando getSession para tener el token listo
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user;
      if (!user) return;
      setCurrentEmail(user.email || '');
      setCurrentUserId(user.id);
      setSessionEmail(user.email || '');
      refreshProfile(user.id);
      // Load real progress
      supabase.from('student_progress').select('*').eq('student_id', user.id)
        .then(({ data }) => {
          if (data) {
            setProgressData(data as ProgressRow[]);
            const totalDone = data.reduce((a, p) => a + (p.completed_units || 0), 0);
            setTotalUnitsCompleted(totalDone);
          }
        });
      supabase.from('unit_completions').select('student_id').eq('student_id', user.id)
        .then(({ data }) => { if (data) setTotalUnitsCompleted(data.length); });
      // Load activity for current week
      const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 6);
      supabase.from('daily_activity').select('activity_date').eq('student_id', user.id)
        .gte('activity_date', weekAgo.toISOString().split('T')[0])
        .then(({ data }) => {
          if (data) setActivityDays(data.map((d: { activity_date: string }) => d.activity_date));
        });
    });
  }, [isLoggedIn, userName]);

  // Realtime + polling para detectar cambios del admin (onboarding_step, plan, acceso módulos)
  useEffect(() => {
    if (!isLoggedIn || !currentUserId) return;

    const doRefresh = () => refreshProfile(currentUserId);

    // Canal único: escucha student_profiles + subscriptions + student_module_access
    const channel = supabase
      .channel(`admin-changes-${currentUserId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_profiles',      filter: `id=eq.${currentUserId}` },       doRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions',         filter: `student_id=eq.${currentUserId}` }, doRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'student_module_access', filter: `student_id=eq.${currentUserId}` }, doRefresh)
      .subscribe();

    // Polling de respaldo cada 8s para asegurar que cambios admin se reflejen
    const interval = setInterval(doRefresh, 8000);
    const onFocus = () => doRefresh();
    window.addEventListener('focus', onFocus);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, currentUserId]);

  // Level-based course visibility
  const studentLevel = studentProfile?.english_level;
  const LEVEL_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1'];
  const studentLevelIdx = studentLevel ? LEVEL_ORDER.indexOf(studentLevel) : -1;

  // Estados de suscripción
  const subStatus      = subscription?.status;
  const subEnabled     = subscription?.account_enabled;
  const subApproved    = subscription?.approved_by_admin;
  const subPlan        = subscription?.plan_slug;
  const isTrial7       = (subPlan === 'free_trial' || subStatus === 'trial') && subStatus !== 'cancelled';
  const isPendingPayment = subApproved === false && subEnabled === false && subStatus !== 'cancelled';

  /**
   * isCourseVisible — ÚNICA fuente de verdad para bloqueo/acceso de cursos.
   * Orden de prioridad (de mayor a menor):
   *  0. Sin suscripción activa => bloquear todo (excepto revokes/grants explícitos)
   *  1. Revocación explícita del admin => siempre bloqueado
   *  2. Concesión explícita del admin  => siempre visible
   *  3. Plan gratuito admin (free_admin, active) => acceso por nivel (sin nivel = todo)
   *  4. Cancelado => bloqueado
   *  5. Deshabilitado por admin (account_enabled=false) => bloqueado
   *  6. Trial (status=trial) => solo A1
   *  7. Pago pendiente de aprobación => bloqueado
   *  8. Plan activo + aprobado => acceso por nivel (sin nivel = A1 por defecto)
   */
  const isCourseVisible = (course: DBCourseRow): boolean => {
    // Prioridad 1: revocación explícita
    if (revokedModuleIds.includes(course.id)) return false;
    // Prioridad 2: concesión explícita
    if (grantedModuleIds.includes(course.id)) return true;

    // Sin suscripción => solo acceso si hay grant explícito (ya chequeado arriba)
    if (!subscription) return false;

    // Prioridad 3: plan free_admin activo => acceso completo
    if (subPlan === 'free_admin' && subStatus === 'active') {
      if (!studentLevel) return true;
      const req = course.required_level || course.level;
      const idx = LEVEL_ORDER.indexOf(req);
      if (idx <= studentLevelIdx) return true;
      if (idx === studentLevelIdx + 1) return completedLevels.includes(LEVEL_ORDER[studentLevelIdx]);
      return false;
    }

    // Prioridad 4: cancelado
    if (subStatus === 'cancelled') return false;

    // Prioridad 5: deshabilitado por admin
    if (subEnabled === false) return false;

    // Prioridad 6: trial activo => solo A1
    if (isTrial7) {
      const lvl = course.required_level || course.level;
      return lvl === 'A1';
    }

    // Prioridad 7: pendiente de aprobación
    if (isPendingPayment) return false;

    // Prioridad 8: plan activo y aprobado => acceso por nivel
    if (subStatus === 'active' && subApproved === true && subEnabled === true) {
      if (!studentLevel) {
        // Sin nivel asignado => mostrar A1 por defecto
        const lvl = course.required_level || course.level;
        return lvl === 'A1';
      }
      const req = course.required_level || course.level;
      const idx = LEVEL_ORDER.indexOf(req);
      if (idx <= studentLevelIdx) return true;
      if (idx === studentLevelIdx + 1) return completedLevels.includes(LEVEL_ORDER[studentLevelIdx]);
      return false;
    }

    // Por defecto bloquear
    return false;
  };

  const handleSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const filledSlots = sessionSlots.filter(s => s.date || s.topic);
    if (filledSlots.length === 0) return;
    setSessionLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // Save to DB
      await supabase.from('session_requests').insert({
        student_id: user?.id || null,
        student_name: sessionName,
        student_email: sessionEmail,
        sessions: filledSlots,
        weekly_plan: sessionWeekly,
        weekly_hours: sessionWeekly ? sessionWeeklyHours : null,
        weekly_schedule: sessionWeekly ? sessionWeeklySchedule : null,
        objective: sessionObjective || null,
      });
      // Send email notification to admin
      await supabase.functions.invoke('send-session-email', {
        body: {
          type: 'session_request',
          studentName: sessionName,
          studentEmail: sessionEmail,
          sessions: filledSlots,
          weekly: sessionWeekly,
          weeklyHours: sessionWeeklyHours,
          weeklySchedule: sessionWeeklySchedule,
          objective: sessionObjective,
        },
      });
    } catch (_) { /* ignore, still show success */ }
    setSessionLoading(false);
    setSessionSent(true);
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setLoading(true);
    const patch = {
      full_name: profileForm.name.trim() || null,
      phone: profileForm.phone.trim() || null,
      country: studentProfile?.country || null,
      city: studentProfile?.city || null,
      birthday: studentProfile?.birthday || null,
      education_level: studentProfile?.education_level || null,
      education_other: studentProfile?.education_other || null,
      updated_at: new Date().toISOString(),
    };
    // Try direct UPDATE first (works if row exists)
    const { error: updErr } = await supabase
      .from('student_profiles')
      .update(patch)
      .eq('id', user.id);
    if (updErr) {
      // Row might not exist yet → try INSERT
      const { error: insErr } = await supabase
        .from('student_profiles')
        .insert({ id: user.id, ...patch });
      if (insErr) {
        console.error('Profile save error:', insErr);
      }
    }
    setLoading(false);
    await refreshProfile(user.id);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
  };

  const handlePwSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    if (pwForm.newPw.length < 6) { setPwError('La nueva contraseña debe tener mínimo 6 caracteres'); return; }
    if (pwForm.newPw !== pwForm.confirm) { setPwError('Las contraseñas no coinciden'); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pwForm.newPw });
    setLoading(false);
    if (error) {
      if (error.message.includes('Auth session missing') || error.message.includes('session')) {
        setPwError('Tu sesión expiró. Por favor, cierra sesión e inicia de nuevo para cambiar la contraseña.');
      } else {
        setPwError(error.message);
      }
      return;
    }
    setPwSaved(true);
    setTimeout(() => setPwSaved(false), 2500);
    setPwForm({ current: '', newPw: '', confirm: '' });
  };

  const handleLogout = () => {
    onLogout?.();
    navigate(ROUTE_PATHS.HOME);
  };

  // Not logged in guard
  if (!isLoggedIn) {
    return (
      <Layout isLoggedIn={false} onOpenAuth={onOpenAuth} onLogout={onLogout}>
        <div className="min-h-[80vh] flex items-center justify-center px-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md">
            <p className="text-6xl mb-6">🔐</p>
            <h2 className="text-3xl font-bold mb-3">Accede a tu cuenta</h2>
            <p className="text-muted-foreground mb-8">Inicia sesión o regístrate para ver tu perfil de estudiante.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button className="rounded-full bg-primary text-primary-foreground px-8" onClick={() => onOpenAuth?.('register')}>Registrarse gratis 🎉</Button>
              <Button variant="outline" className="rounded-full px-8" onClick={() => onOpenAuth?.('login')}>Iniciar sesión</Button>
            </div>
          </motion.div>
        </div>
      </Layout>
    );
  }

  // Use profile name from DB (more up-to-date) or fall back to prop
  const displayName = profileForm.name || userName || 'Estudiante';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-violet-50/50 to-background flex flex-col">

      {/* ── MODAL PAYPAL EMERGENTE ── */}
      {showPaypalModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPaypalModal(false)} />
          <motion.div
            className="relative bg-background rounded-3xl shadow-2xl w-full max-w-sm p-6 z-10"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
          >
            <button
              onClick={() => setShowPaypalModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors text-lg"
            >
              ×
            </button>
            <h3 className="font-extrabold text-xl mb-1">Completar pago 💳</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Plan Mensual 50% OFF — <strong>${paypalModalAmount.toFixed(2)} USD</strong>
              <span className="ml-1 line-through text-xs">${(paypalModalAmount * 2).toFixed(0)} USD</span>
            </p>

            <div className="space-y-4">
              {/* ── PayPal oficial ── */}
              <div className="rounded-2xl border-2 border-[#FFC439]/60 bg-[#FFC439]/5 p-4">
                <p className="text-xs font-bold text-[#003087] mb-3 flex items-center gap-1.5">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-[#003087]"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.59 3.025-2.566 6.082-8.558 6.082H9.928l-1.182 7.519H12c.46 0 .85-.334.922-.789l.038-.197.733-4.64.047-.257a.932.932 0 0 1 .921-.789h.58c3.76 0 6.701-1.528 7.559-5.95.36-1.85.176-3.395-.578-4.692z"/></svg>
                  Pagar con PayPal
                </p>
                <PayPalHostedButton />
              </div>

              {/* ── PSE (próximamente) ── */}
              <div className="rounded-2xl border-2 border-border/40 bg-muted/30 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">🏦</span>
                  <p className="text-sm font-bold text-foreground">PSE</p>
                  <span className="ml-auto text-xs bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full">Próximamente</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  El pago por PSE estará disponible muy pronto. Por ahora usa PayPal o escríbenos a{' '}
                  <a href={`mailto:blangenglishlearning@blangenglish.com?subject=Pago%20PSE%20BLANG&body=Hola%2C%20quiero%20pagar%20por%20PSE.%20Mi%20correo%3A%20${encodeURIComponent(currentEmail)}`} className="font-bold text-primary underline">blangenglishlearning@blangenglish.com</a>
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-4 text-center">
              ✅ PayPal: activación automática al confirmar pago
            </p>
          </motion.div>
        </div>
      )}

      {/* ── TOP HEADER (logged-in only) ── */}
      <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur border-b border-border shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <button onClick={() => navigate(ROUTE_PATHS.HOME)} className="flex items-center">
              <img src={IMAGES.BLANG_LOGO} alt="BLANG" className="h-9 w-auto" />
            </button>
            {/* Profile trigger */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden sm:block">
                Hola, <span className="font-bold text-primary">{displayName}</span>
              </span>
              <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shadow-md">
                {displayName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 container mx-auto px-4 py-6 md:py-10">
        <div className="flex flex-col lg:flex-row gap-6 max-w-6xl mx-auto">

          {/* ── SIDEBAR ── */}
          <aside className="w-full lg:w-64 shrink-0">
            <div className="bg-background rounded-3xl border border-border/50 shadow-sm overflow-hidden">
              {/* Profile header */}
              <div className="bg-gradient-to-br from-primary to-purple-600 p-6 text-center">
                <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur mx-auto mb-3 flex items-center justify-center text-3xl font-extrabold text-white shadow-lg border-4 border-white/30">
                  {displayName.charAt(0).toUpperCase()}
                </div>
                <p className="font-bold text-white text-lg leading-tight">{displayName}</p>
                {/* Level badge */}
                {studentProfile?.english_level && (
                  <div className="flex items-center justify-center gap-1.5 mt-1.5">
                    <span className="bg-white/25 border border-white/30 text-white text-xs font-extrabold px-2.5 py-0.5 rounded-full">
                      Nivel {studentProfile.english_level}
                    </span>
                  </div>
                )}
                {!studentProfile?.english_level && (
                  <p className="text-white/60 text-xs mt-1">Estudiante BLANG</p>
                )}
                {(() => {
                  const totalStreak = progressData.reduce((a, p) => Math.max(a, p.streak_days || 0), 0);
                  return (
                    <div className="flex items-center justify-center gap-1 mt-3 bg-white/15 rounded-full px-3 py-1 w-fit mx-auto">
                      <Flame className="w-3.5 h-3.5 text-orange-300" />
                      <span className="text-white/90 text-xs font-bold">{totalStreak} {totalStreak === 1 ? 'día' : 'días'} de racha</span>
                    </div>
                  );
                })()}
              </div>

              {/* Nav items */}
              <nav className="p-2">
                {([
                  { id: 'cursos',   icon: BookOpen,    label: 'Mis Cursos' },
                  { id: 'sesion',   icon: Video,       label: 'Sesión con Profesor' },
                  { id: 'cuenta',   icon: User,        label: 'Cuenta' },
                  { id: 'pagos',    icon: CreditCard,  label: 'Pagos' },
                  { id: 'progreso', icon: TrendingUp,  label: 'Mi Progreso' },
                  { id: 'ayuda',    icon: HelpCircle,  label: 'Ayuda' },
                ] as { id: TabId; icon: React.ElementType; label: string }[]).map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all mb-0.5 ${
                      activeTab === id
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-foreground/70 hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {label}
                    {activeTab === id && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
                  </button>
                ))}

                <div className="border-t border-border/50 mt-2 pt-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-all"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    Cerrar sesión
                  </button>
                </div>
              </nav>
            </div>
          </aside>

          {/* ── MAIN CONTENT ── */}
          <main className="flex-1 min-w-0">
            <AnimatePresence mode="wait">

              {/* ─── CURSOS ─── */}
              {activeTab === 'cursos' && (
                <motion.div key="cursos" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

                  {/* Renewal alert */}
                  {showRenewalAlert && subscription?.payment_method && (subscription.payment_method === 'pse' || subscription.payment_method === 'paypal') && subscription.renewal_due_at && (
                    <div className="mb-4">
                      <RenewalAlert
                        paymentMethod={subscription.payment_method as 'pse' | 'paypal'}
                        dueDate={subscription.renewal_due_at}
                        onDismiss={() => setShowRenewalAlert(false)}
                      />
                    </div>
                  )}

                  <div className="mb-6">
                    <h1 className="text-2xl md:text-3xl font-extrabold mb-1">¡Empecemos con los cursos! 🚀</h1>
                    <p className="text-muted-foreground text-sm">Selecciona un nivel para comenzar o continuar tu aprendizaje.</p>
                  </div>

                  {/* ── Banner: sin suscripción o cancelada → ir a pagos ── */}
                  {(!subscription || subscription.status === 'cancelled') && (
                    <div className="bg-primary/5 border-2 border-primary/30 rounded-2xl p-5 mb-5">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                          <CreditCard className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-extrabold text-foreground">{subscription?.status === 'cancelled' ? '¡Tu suscripción fue cancelada! 🔒' : 'Elige un plan para habilitar tus cursos 🎓'}</p>
                          <p className="text-sm text-muted-foreground mt-1">Tu cuenta está deshabilitada. Ve a Pagos para reactivar tu acceso por $15 USD/mes.</p>
                          <Button size="sm" className="mt-3 rounded-xl gap-1.5" onClick={() => setActiveTab('pagos')}>
                            <CreditCard className="w-3.5 h-3.5" /> Ir a Pagos y elegir plan
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Payment pending warning — PSE/PayPal not yet approved */}
                  {subscription && (subscription.payment_method === 'pse' || subscription.payment_method === 'paypal') && subscription.approved_by_admin === false && (
                    <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-5 mb-5">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                          <Lock className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-extrabold text-amber-800">⏳ Pago pendiente de aprobación</p>
                          <p className="text-sm text-amber-700 mt-1">
                            Seleccionaste <strong>{subscription.payment_method === 'pse' ? 'PSE' : 'PayPal'}</strong>. Los cursos se habilitarán una vez que el administrador confirme tu pago (1–24h hábiles).
                          </p>
                          <Button
                            size="sm"
                            className="mt-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl gap-1.5"
                            onClick={() => setActiveTab('pagos')}
                          >
                            <CreditCard className="w-3.5 h-3.5" /> Ver instrucciones de pago
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Banner examen de inglés pendiente (asignado por admin) ── */}
                  {studentProfile?.onboarding_step === 'english_test' && (
                    <div className="rounded-2xl border-2 border-orange-300 bg-orange-50/60 p-5 shadow-sm mb-5 relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-orange-400" />
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-2xl shrink-0">🧪</div>
                        <div className="flex-1">
                          <p className="font-extrabold text-orange-900 text-base">¡Examen de nivel pendiente!</p>
                          <p className="text-sm text-orange-800 mt-1 mb-3">Para desbloquear tus cursos necesitas completar el examen de inglés. El sistema asignará tu nivel automáticamente al terminar.</p>
                          <Button
                            size="sm"
                            className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl gap-1.5 font-bold"
                            onClick={() => setShowLevelOnboarding(true)}
                          >
                            🎓 Tomar examen ahora
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Level not set warning — solo si NO tiene examen pendiente (ese tiene su propio banner) */}
                  {studentProfile && !studentProfile.english_level && !isTrial7 && subscription?.account_enabled === true && !isPendingPayment && studentProfile?.onboarding_step !== 'english_test' && (
                    <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-5 mb-5">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                          <Lock className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-extrabold text-amber-800">Cursos bloqueados</p>
                          <p className="text-sm text-amber-700 mt-1">Debes seleccionar tu nivel de inglés para desbloquear los cursos. Puedes hacer el <strong>examen de nivel</strong> o <strong>elegir directamente</strong>.</p>
                          <Button
                            size="sm"
                            className="mt-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl gap-1.5"
                            onClick={() => setShowLevelOnboarding(true)}
                          >
                            <FlaskConical className="w-3.5 h-3.5" /> Definir mi nivel ahora
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {dbCourses.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Los cursos se cargarán pronto.</p>
                    </div>
                  )}

                  {coursesLoading && (
                    <div className="text-center py-8 text-muted-foreground">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-sm">Cargando cursos...</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    {dbCourses.map((course) => {
                      const colors = LEVEL_COLORS[course.level] || LEVEL_COLORS['A1'];
                      const isOpen = expandedCourse === course.id;
                      const units = courseUnits[course.id] || [];
                      // isCourseVisible ya contiene TODA la lógica (grant, revoke, trial, plan, nivel)
                      const isVisible = isCourseVisible(course);
                      const isLocked = !isVisible;
                      const requiredLevel = course.required_level || course.level;
                      const courseIdx = LEVEL_ORDER.indexOf(requiredLevel);
                      const prevLevel = courseIdx > 0 ? LEVEL_ORDER[courseIdx - 1] : null;
                      return (
                        <div key={course.id} className={`rounded-2xl border-2 overflow-hidden bg-gradient-to-br ${colors.color} ${isLocked ? 'opacity-60' : ''}`}>
                          {/* Course header */}
                          <button
                            type="button"
                            onClick={() => !isLocked && toggleCourse(course.id)}
                            className={`w-full flex items-start gap-3 p-5 text-left transition-colors ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-black/5'}`}
                          >
                            <span className={`text-3xl ${isLocked ? 'grayscale opacity-50' : ''}`}>{course.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors.badge} inline-block`}>{course.level}</span>
                                {isLocked && prevLevel && (
                                  <span className="text-xs text-muted-foreground">🔒 Completa {prevLevel} primero</span>
                                )}
                              </div>
                              <h3 className="font-bold text-sm leading-snug">{course.title}</h3>
                              <p className="text-xs text-muted-foreground">{course.total_units} unidades</p>
                            </div>
                            {isLocked
                              ? <Lock className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                              : isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />}
                          </button>

                          {/* Units list */}
                          {isOpen && (
                            <div className="bg-background/80 border-t border-border/50 p-4 space-y-2">
                              {loadingUnits === course.id && (
                                <p className="text-xs text-center text-muted-foreground py-3">Cargando unidades...</p>
                              )}
                              {loadingUnits !== course.id && units.length === 0 && (
                                <p className="text-xs text-center text-muted-foreground py-3">No hay unidades publicadas aún en este curso</p>
                              )}
                              {units.map(unit => {
                                const unitProg = unitProgressMap[unit.id] || 0;
                                const totalStages = 5;
                                const progPct = Math.round((unitProg / totalStages) * 100);
                                return (
                                <button
                                  key={unit.id}
                                  type="button"
                                  onClick={() => setViewerUnit({ id: unit.id, title: unit.title, description: unit.description })}
                                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-primary/5 transition-all text-left group"
                                >
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                    unitProg >= totalStages ? 'bg-green-100' : 'bg-primary/10'
                                  }`}>
                                    {unitProg >= totalStages
                                      ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                                      : <BookOpen className="w-4 h-4 text-primary" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold truncate">{unit.title}</p>
                                    {unitProg > 0 ? (
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progPct}%` }} />
                                        </div>
                                        <span className="text-[10px] text-muted-foreground shrink-0">{unitProg}/{totalStages}</span>
                                      </div>
                                    ) : (
                                      unit.description && <p className="text-xs text-muted-foreground truncate">{unit.description}</p>
                                    )}
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0" />
                                </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* ─── SESIÓN CON PROFESOR ─── */}
              {activeTab === 'sesion' && (
                <motion.div key="sesion" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                  <div className="mb-2">
                    <h1 className="text-2xl md:text-3xl font-extrabold mb-1">Sesión con el Profesor 🎓</h1>
                    <p className="text-muted-foreground text-sm">Reserva una clase 1 a 1 personalizada con el profesor.</p>
                  </div>

                  {/* Info notice */}
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
                    <p className="font-bold mb-1">📌 Importante sobre las sesiones</p>
                    <p>Las sesiones con el profesor <strong>no reemplazan</strong> tu aprendizaje en la plataforma. Son un complemento para <strong>explicar un tema</strong> específico o <strong>practicar speaking</strong> en vivo. Sigue avanzando en tus cursos para sacar el mayor provecho.</p>
                  </div>

                  {/* Header banner */}
                  <div className="bg-background rounded-2xl border border-border/50 shadow-sm overflow-hidden">
                    <div className="relative bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-6 pt-6 pb-10">
                      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
                      <div className="relative flex items-center gap-4">
                        <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/30 overflow-hidden shrink-0 shadow-lg">
                          <img src={IMAGES.INSTRUCTOR_NOBG} alt="Profesor" className="w-full h-full object-contain" />
                        </div>
                        <div className="text-white">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold bg-white/20 border border-white/30 px-2.5 py-0.5 rounded-full">✨ Clases 1 a 1</span>
                          </div>
                          <h2 className="font-extrabold text-xl leading-tight">Sesión con el profesor</h2>
                          <p className="text-white/80 text-sm mt-0.5">Personalizada · $10 USD / hora</p>
                        </div>
                      </div>
                      <div className="relative flex flex-wrap gap-2 mt-4">
                        {['🎯 Conversación', '📝 Gramática', '🗣️ Pronunciación', '💼 Business English'].map(tag => (
                          <span key={tag} className="text-xs bg-white/15 border border-white/20 text-white px-2.5 py-1 rounded-full">{tag}</span>
                        ))}
                      </div>
                    </div>

                    {/* Form card */}
                    <div className="-mt-5 mx-4 mb-4 bg-background rounded-2xl border border-border/50 shadow-md p-5">
                      {sessionSent ? (
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
                          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Check className="w-8 h-8 text-green-600" />
                          </div>
                          <p className="font-bold text-green-700 text-xl">¡Solicitud enviada! 🎉</p>
                          <p className="text-sm text-muted-foreground mt-2 mb-5">Revisaremos tu solicitud y te contactaremos pronto para confirmar horario y método de pago.</p>
                          <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={() => {
                            setSessionSent(false);
                            setSessionSlots([{ date: '', topic: '' }]);
                            setSessionWeekly(false);
                            setSessionWeeklyHours('');
                            setSessionWeeklySchedule('');
                            setSessionObjective('');
                          }}>Enviar otra solicitud</Button>
                        </motion.div>
                      ) : (
                        <form onSubmit={handleSessionSubmit} className="space-y-5">
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Solicitar sesión</p>

                          {/* Contact info */}
                          <div className="grid sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium text-muted-foreground">Tu nombre</Label>
                              <Input value={sessionName} onChange={e => setSessionName(e.target.value)} placeholder="Nombre completo" className="rounded-xl h-9 text-sm" required />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-medium text-muted-foreground">Correo de contacto</Label>
                              <Input type="email" value={sessionEmail} onChange={e => setSessionEmail(e.target.value)} placeholder="tu@correo.com" className="rounded-xl h-9 text-sm" required />
                            </div>
                          </div>

                          {/* Dynamic session slots */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">📅 Fecha(s) que deseas reservar</Label>
                            </div>
                            {sessionSlots.map((slot, idx) => (
                              <div key={idx} className="flex gap-2 items-start bg-muted/30 rounded-xl p-3 border border-border/40">
                                <div className="flex-1 grid sm:grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Fecha preferida</Label>
                                    <Input
                                      type="date"
                                      value={slot.date}
                                      min={new Date().toISOString().split('T')[0]}
                                      onChange={e => {
                                        const updated = [...sessionSlots];
                                        updated[idx] = { ...updated[idx], date: e.target.value };
                                        setSessionSlots(updated);
                                      }}
                                      className="rounded-xl h-9 text-sm"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-muted-foreground">Tema o propósito</Label>
                                    <Input
                                      placeholder="Ej: Practicar speaking, revisar gramática..."
                                      value={slot.topic}
                                      onChange={e => {
                                        const updated = [...sessionSlots];
                                        updated[idx] = { ...updated[idx], topic: e.target.value };
                                        setSessionSlots(updated);
                                      }}
                                      className="rounded-xl h-9 text-sm"
                                    />
                                  </div>
                                </div>
                                {sessionSlots.length > 1 && (
                                  <button type="button" onClick={() => setSessionSlots(prev => prev.filter((_, i) => i !== idx))}
                                    className="mt-5 p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                            <button type="button"
                              onClick={() => setSessionSlots(prev => [...prev, { date: '', topic: '' }])}
                              className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-semibold transition-colors">
                              <Plus className="w-4 h-4" /> Agregar otra fecha
                            </button>
                          </div>

                          {/* Objective */}
                          <div className="space-y-1.5">
                            <Label className="text-xs font-medium text-muted-foreground">🎯 Tu objetivo con las sesiones <span className="text-muted-foreground/60">(opcional)</span></Label>
                            <textarea
                              value={sessionObjective}
                              onChange={e => setSessionObjective(e.target.value)}
                              rows={2}
                              placeholder="Ej: Mejorar mi fluidez para entrevistas de trabajo, preparar un examen, perder el miedo a hablar..."
                              className="w-full rounded-xl border border-input bg-muted/30 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                          </div>

                          {/* Weekly plan toggle */}
                          <div className={`rounded-2xl border-2 p-4 transition-all ${
                            sessionWeekly ? 'border-violet-300 bg-violet-50/60' : 'border-border/40 bg-muted/20'
                          }`}>
                            <button type="button"
                              onClick={() => setSessionWeekly(v => !v)}
                              className="w-full flex items-center justify-between gap-3 text-left"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                  sessionWeekly ? 'bg-violet-600 text-white' : 'bg-muted text-muted-foreground'
                                }`}>
                                  <Clock className="w-5 h-5" />
                                </div>
                                <div>
                                  <p className="font-bold text-sm">¿Quieres más de 1 clase a la semana?</p>
                                  <p className="text-xs text-muted-foreground">Servicio personalizado — cuéntanos tu disponibilidad</p>
                                </div>
                              </div>
                              <div className={`w-11 h-6 rounded-full transition-all relative shrink-0 ${
                                sessionWeekly ? 'bg-violet-600' : 'bg-muted-foreground/30'
                              }`}>
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${
                                  sessionWeekly ? 'left-6' : 'left-1'
                                }`} />
                              </div>
                            </button>

                            <AnimatePresence>
                              {sessionWeekly && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="mt-4 space-y-3 pt-4 border-t border-violet-200/60">
                                    <div className="space-y-1.5">
                                      <Label className="text-xs font-medium text-violet-700">¿Cuántas horas semanales deseas reservar?</Label>
                                      <Input
                                        placeholder="Ej: 2 horas por semana, 3 sesiones de 1 hora..."
                                        value={sessionWeeklyHours}
                                        onChange={e => setSessionWeeklyHours(e.target.value)}
                                        className="rounded-xl h-9 text-sm border-violet-200 focus-visible:ring-violet-400"
                                      />
                                    </div>
                                    <div className="space-y-1.5">
                                      <Label className="text-xs font-medium text-violet-700">¿Qué horas tienes disponibles durante la semana?</Label>
                                      <textarea
                                        value={sessionWeeklySchedule}
                                        onChange={e => setSessionWeeklySchedule(e.target.value)}
                                        rows={3}
                                        placeholder="Ej: Lunes y miércoles de 7-9pm, sábados por la mañana de 9am-12pm, viernes cualquier hora..."
                                        className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-400"
                                      />
                                    </div>
                                    <div className="bg-violet-100/60 rounded-xl p-3 text-xs text-violet-700">
                                      <p className="font-semibold mb-1">💡 Plan personalizado semanal</p>
                                      <p>Te contactaremos para armar un horario fijo que se adapte a tu rutina. Precio especial para paquetes semanales.</p>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          <Button
                            type="submit"
                            disabled={sessionLoading || sessionSlots.every(s => !s.date && !s.topic)}
                            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold shadow-md shadow-violet-200 py-6"
                          >
                            {sessionLoading ? (
                              <span className="flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Enviando...
                              </span>
                            ) : 'Solicitar sesión — $10 USD / hora 🎓'}
                          </Button>
                          <div className="flex items-center justify-center flex-wrap gap-3 text-xs text-muted-foreground">
                            <span>✅ Sin compromiso</span>
                            <span>📧 Respuesta en 24h</span>
                            <span>💳 Pago al confirmar</span>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ─── CUENTA ─── */}
              {activeTab === 'cuenta' && (
                <motion.div key="cuenta" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                  <div className="mb-2">
                    <h1 className="text-2xl md:text-3xl font-extrabold mb-1">Mi Cuenta 👤</h1>
                    <p className="text-muted-foreground text-sm">Tu información personal y configuración.</p>
                  </div>

                  {/* Profile summary card */}
                  <div className="bg-gradient-to-br from-primary/5 via-violet-50/50 to-background rounded-2xl border border-primary/20 p-5 shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-extrabold shadow-md shrink-0">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-extrabold text-lg leading-tight">{profileForm.name || displayName}</p>
                          {studentProfile?.english_level && (
                            <span className="text-xs font-extrabold bg-primary text-primary-foreground px-2.5 py-0.5 rounded-full">
                              Nivel {studentProfile.english_level}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{currentEmail}</p>
                        {/* Personal details row */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                          {studentProfile?.birthday && (() => {
                            const birth = new Date(studentProfile.birthday!);
                            const today = new Date();
                            let age = today.getFullYear() - birth.getFullYear();
                            const m = today.getMonth() - birth.getMonth();
                            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
                            return (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                {birth.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })} · {age} años
                              </span>
                            );
                          })()}
                          {(studentProfile?.country || studentProfile?.city) && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="w-3 h-3" />
                              {[studentProfile.city, studentProfile.country].filter(Boolean).join(', ')}
                            </span>
                          )}
                          {studentProfile?.education_level && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <GraduationCap className="w-3 h-3" />
                              {{ bachiller: 'Bachiller', universitario: 'Universitario', posgrado: 'Posgrado', trabajo: 'Laboral', otro: 'Otro' }[studentProfile.education_level] || studentProfile.education_level}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Personal info form (editable fields) */}
                  <div className="bg-background rounded-2xl border border-border/50 p-6 shadow-sm">
                    <h2 className="font-bold text-base mb-4 flex items-center gap-2"><User className="w-4 h-4 text-primary" /> Editar información</h2>
                    <form onSubmit={handleProfileSave} className="space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="p-name" className="text-sm font-medium">Nombre completo</Label>
                          <Input id="p-name" value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} className="rounded-xl" />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="p-phone" className="text-sm font-medium">Teléfono / WhatsApp</Label>
                          <Input id="p-phone" type="tel" placeholder="+57 300 000 0000" value={profileForm.phone} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} className="rounded-xl" />
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="p-country" className="text-sm font-medium">País</Label>
                          <Input id="p-country" placeholder="Ej: Colombia" value={studentProfile?.country || ''}
                            onChange={e => setStudentProfile(p => p ? { ...p, country: e.target.value } : p)}
                            className="rounded-xl" />
                        </div>
                        <div className="space-y-1.5">
                          <Label htmlFor="p-city" className="text-sm font-medium">Ciudad</Label>
                          <Input id="p-city" placeholder="Ej: Bogotá" value={studentProfile?.city || ''}
                            onChange={e => setStudentProfile(p => p ? { ...p, city: e.target.value } : p)}
                            className="rounded-xl" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="p-birthday" className="text-sm font-medium">Fecha de nacimiento</Label>
                        <Input id="p-birthday" type="date"
                          value={studentProfile?.birthday || ''}
                          onChange={e => setStudentProfile(p => p ? { ...p, birthday: e.target.value } : p)}
                          className="rounded-xl" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium text-muted-foreground">Correo electrónico</Label>
                        <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-4 py-2.5 text-sm text-muted-foreground border border-border/50">
                          <Lock className="w-4 h-4 shrink-0" />
                          <span>{currentEmail || 'No disponible'} — No se puede modificar por seguridad.</span>
                        </div>
                      </div>
                      <Button type="submit" className="rounded-xl bg-primary text-primary-foreground px-6 h-9 text-sm">
                        {profileSaved ? <span className="flex items-center gap-1.5"><Check className="w-4 h-4" /> ¡Guardado!</span> : 'Guardar cambios'}
                      </Button>
                    </form>
                  </div>

                  {/* Change password */}
                  <div className="bg-background rounded-2xl border border-border/50 p-6 shadow-sm">
                    <h2 className="font-bold text-base mb-4 flex items-center gap-2"><Lock className="w-4 h-4 text-primary" /> Cambiar contraseña</h2>
                    <form onSubmit={handlePwSave} className="space-y-4">
                      {/* Current password */}
                      <div className="space-y-1.5">
                        <Label htmlFor="pw-cur" className="text-sm font-medium">Contraseña actual</Label>
                        <div className="relative">
                          <Input
                            id="pw-cur"
                            type={showPw ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={pwForm.current}
                            onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))}
                            className="rounded-xl pr-10"
                            required
                          />
                          <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      {/* New password */}
                      <div className="space-y-1.5">
                        <Label htmlFor="pw-new" className="text-sm font-medium">Nueva contraseña</Label>
                        <div className="relative">
                          <Input
                            id="pw-new"
                            type={showNewPw ? 'text' : 'password'}
                            placeholder="Mínimo 6 caracteres"
                            value={pwForm.newPw}
                            onChange={e => setPwForm(p => ({ ...p, newPw: e.target.value }))}
                            className="rounded-xl pr-10"
                            required
                            minLength={6}
                          />
                          <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      {/* Confirm new password */}
                      <div className="space-y-1.5">
                        <Label htmlFor="pw-cfm" className="text-sm font-medium">Confirmar nueva contraseña</Label>
                        <div className="relative">
                          <Input
                            id="pw-cfm"
                            type={showConfirmPw ? 'text' : 'password'}
                            placeholder="Repite tu nueva contraseña"
                            value={pwForm.confirm}
                            onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                            className={`rounded-xl pr-10 ${
                              pwForm.confirm.length > 0
                                ? pwForm.confirm === pwForm.newPw
                                  ? 'border-green-400 focus-visible:ring-green-400'
                                  : 'border-destructive focus-visible:ring-destructive'
                                : ''
                            }`}
                            required
                          />
                          <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                            {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {/* Inline feedback */}
                        {pwForm.confirm.length > 0 && pwForm.confirm !== pwForm.newPw && (
                          <p className="flex items-center gap-1.5 text-xs text-destructive">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Las contraseñas no coinciden
                          </p>
                        )}
                        {pwForm.confirm.length > 0 && pwForm.confirm === pwForm.newPw && (
                          <p className="flex items-center gap-1.5 text-xs text-green-600">
                            <Check className="w-3.5 h-3.5 shrink-0" /> ¡Las contraseñas coinciden!
                          </p>
                        )}
                      </div>
                      {pwError && (
                        <div className="flex items-start gap-2 bg-destructive/10 text-destructive rounded-xl p-3 text-sm">
                          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                          <span>{pwError}</span>
                        </div>
                      )}
                      <Button
                        type="submit"
                        variant="outline"
                        className="rounded-xl px-6 h-9 text-sm"
                        disabled={loading || (pwForm.confirm.length > 0 && pwForm.confirm !== pwForm.newPw)}
                      >
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <span className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                            Actualizando...
                          </span>
                        ) : pwSaved ? (
                          <span className="flex items-center gap-1.5"><Check className="w-4 h-4" /> ¡Contraseña actualizada!</span>
                        ) : 'Actualizar contraseña'}
                      </Button>
                    </form>
                  </div>
                </motion.div>
              )}

              {/* ─── PAGOS ─── */}
              {activeTab === 'pagos' && (
                <motion.div key="pagos" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                  <div className="mb-2">
                    <h1 className="text-2xl md:text-3xl font-extrabold mb-1">Pagos y Suscripción 💳</h1>
                    <p className="text-muted-foreground text-sm">Gestiona tu plan y tus pagos.</p>
                  </div>

                  {/* ── BANNER EXAMEN DE INGLÉS (cuando admin asignó "Ninguna") ── */}
                  {studentProfile?.onboarding_step === 'english_test' && (
                    <div className="rounded-2xl border-2 border-orange-300 bg-orange-50/60 p-5 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-orange-400" />
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-2xl shrink-0">🧪</div>
                        <div className="flex-1">
                          <h3 className="font-extrabold text-orange-900 text-base mb-1">🎓 Examen de nivel pendiente</h3>
                          <p className="text-sm text-orange-800 mb-4">
                            Para activar tus cursos necesitas completar el examen de inglés. El sistema asignará tu nivel automáticamente al terminar.
                          </p>
                          <Button
                            className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl gap-1.5 font-bold w-full sm:w-auto"
                            onClick={() => setShowLevelOnboarding(true)}
                          >
                            🎓 Tomar examen ahora
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ════════════════════════════════════════════════════
                       BLOQUE ÚNICO DE PAGOS — un solo render, mutuamente excluyente
                  ═══════════════════════════════════════════════════════ */}
                  {(() => {
                    const sub = subscription;

                    // ── A: ACCESO GRATUITO (admin) ──
                    if (sub?.plan_slug === 'free_admin' && sub?.status === 'active') {
                      return (
                        <div className="rounded-2xl border-2 border-violet-200 bg-violet-50/40 p-8 flex flex-col items-center text-center gap-4">
                          <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center text-3xl">🎁</div>
                          <div>
                            <h2 className="font-extrabold text-xl text-violet-900 mb-1">Sin pagos pendientes</h2>
                            <p className="text-sm text-violet-700">El administrador ha habilitado tu acceso de forma gratuita. No tienes ningún cobro pendiente.</p>
                          </div>
                          <span className="inline-block bg-violet-100 text-violet-700 font-bold text-sm px-4 py-2 rounded-full">✨ Acceso completo sin costo</span>
                        </div>
                      );
                    }

                    // ── B: COBRAR activado por admin — cualquier suscripción pending_approval o account_enabled=false ──
                    // Solo precio normal $15, fecha inicio, fecha siguiente, PayPal activo, PSE deshabilitado
                    // Captura TODOS los casos donde el admin quiere cobrar (sin importar plan_slug)
                    if (sub && (sub.status === 'pending_approval' || (sub.approved_by_admin === false && sub.account_enabled === false))) {
                      const fmtDate = (d: Date) => d.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
                      const startDate = sub.created_at ? new Date(sub.created_at) : new Date();
                      const nextDate = new Date(startDate); nextDate.setMonth(nextDate.getMonth() + 1);
                      return (
                        <div className="space-y-4">
                          {/* Tarjeta de estado */}
                          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/40 p-5 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-400" />
                            <div className="flex items-start justify-between gap-3 mb-4">
                              <div className="flex-1">
                                <span className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-3 bg-amber-100 text-amber-700">⏳ Pago pendiente</span>
                                <h2 className="font-extrabold text-xl">Plan Mensual</h2>
                                <p className="text-sm text-muted-foreground mt-1">Activa tu cuenta realizando el pago para acceder a todos tus cursos.</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-extrabold text-3xl">$15</p>
                                <p className="text-sm text-muted-foreground">USD/mes</p>
                              </div>
                            </div>
                            {/* Fechas */}
                            <div className="grid grid-cols-3 gap-3">
                              <div className="bg-background/70 rounded-xl p-3 border border-border/40">
                                <p className="text-xs text-muted-foreground mb-0.5">📅 Inicio de cobro</p>
                                <p className="font-bold text-sm">{fmtDate(startDate)}</p>
                              </div>
                              <div className="bg-background/70 rounded-xl p-3 border border-border/40">
                                <p className="text-xs text-muted-foreground mb-0.5">💰 Monto a pagar</p>
                                <p className="font-bold text-sm">$15 USD</p>
                              </div>
                              <div className="bg-background/70 rounded-xl p-3 border border-border/40">
                                <p className="text-xs text-muted-foreground mb-0.5">📆 Fecha siguiente</p>
                                <p className="font-bold text-sm">{fmtDate(nextDate)}</p>
                              </div>
                            </div>
                          </div>
                          {/* Bloque de pago */}
                          <div className="rounded-2xl overflow-hidden border-2 border-amber-300 shadow-sm">
                            <div className="bg-amber-400 px-5 py-3">
                              <span className="text-white font-bold text-sm">💳 Completa tu pago para activar la cuenta</span>
                            </div>
                            <div className="bg-amber-50 p-5 space-y-3">
                              <Button
                                className="w-full rounded-xl font-bold bg-[#003087] hover:bg-[#002070] text-white gap-2"
                                onClick={() => { setPaypalModalAmount(15); setShowPaypalModal(true); }}
                              >
                                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.59 3.025-2.566 6.082-8.558 6.082H9.928l-1.182 7.519H12c.46 0 .85-.334.922-.789l.038-.197.733-4.64.047-.257a.932.932 0 0 1 .921-.789h.58c3.76 0 6.701-1.528 7.559-5.95.36-1.85.176-3.395-.578-4.692z"/></svg>
                                Pagar $15 USD con PayPal 💳
                              </Button>
                              <Button className="w-full rounded-xl font-bold bg-muted text-muted-foreground gap-2 cursor-not-allowed" disabled>
                                🏦 PSE — Próximamente
                              </Button>
                              <p className="text-xs text-amber-600">⏱ PayPal: activación automática al confirmar pago. ¿Dudas? <strong>blangenglishlearning@blangenglish.com</strong></p>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // ── C: sin suscripción o cancelada → precio normal $15 siempre ──
                    // El PlanSelector con 7 días / 50% OFF SOLO aplica durante el Onboarding (primer registro).
                    // Cualquier estudiante que llegue al Dashboard ya es usuario registrado → siempre $15.
                    if (!sub || sub.status === 'cancelled') {
                      if (true) { // siempre precio normal para usuarios en el Dashboard
                        const fmtDateR = (d: Date) => d.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
                        const startDateR = new Date();
                        const nextDateR = new Date(startDateR); nextDateR.setMonth(nextDateR.getMonth() + 1);
                        return (
                          <div className="space-y-4">
                            <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/40 p-5 shadow-sm relative overflow-hidden">
                              <div className="absolute top-0 left-0 right-0 h-1 bg-amber-400" />
                              <div className="flex items-start justify-between gap-3 mb-4">
                                <div className="flex-1">
                                  <span className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-3 bg-amber-100 text-amber-700">🔄 Renovar suscripción</span>
                                  <h2 className="font-extrabold text-xl">Plan Mensual</h2>
                                  <p className="text-sm text-muted-foreground mt-1">Reactiva tu cuenta para acceder a todos tus cursos.</p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="font-extrabold text-3xl">$15</p>
                                  <p className="text-sm text-muted-foreground">USD/mes</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-3">
                                <div className="bg-background/70 rounded-xl p-3 border border-border/40">
                                  <p className="text-xs text-muted-foreground mb-0.5">📅 Inicio de cobro</p>
                                  <p className="font-bold text-sm">{fmtDateR(startDateR)}</p>
                                </div>
                                <div className="bg-background/70 rounded-xl p-3 border border-border/40">
                                  <p className="text-xs text-muted-foreground mb-0.5">💰 Monto a pagar</p>
                                  <p className="font-bold text-sm">$15 USD</p>
                                </div>
                                <div className="bg-background/70 rounded-xl p-3 border border-border/40">
                                  <p className="text-xs text-muted-foreground mb-0.5">📆 Fecha siguiente</p>
                                  <p className="font-bold text-sm">{fmtDateR(nextDateR)}</p>
                                </div>
                              </div>
                            </div>
                            <div className="rounded-2xl overflow-hidden border-2 border-amber-300 shadow-sm">
                              <div className="bg-amber-400 px-5 py-3">
                                <span className="text-white font-bold text-sm">💳 Completa tu pago para activar la cuenta</span>
                              </div>
                              <div className="bg-amber-50 p-5 space-y-3">
                                <Button
                                  className="w-full rounded-xl font-bold bg-[#003087] hover:bg-[#002070] text-white gap-2"
                                  onClick={() => { setPaypalModalAmount(15); setShowPaypalModal(true); }}
                                >
                                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.59 3.025-2.566 6.082-8.558 6.082H9.928l-1.182 7.519H12c.46 0 .85-.334.922-.789l.038-.197.733-4.64.047-.257a.932.932 0 0 1 .921-.789h.58c3.76 0 6.701-1.528 7.559-5.95.36-1.85.176-3.395-.578-4.692z"/></svg>
                                  Pagar $15 USD con PayPal 💳
                                </Button>
                                <Button className="w-full rounded-xl font-bold bg-muted text-muted-foreground gap-2 cursor-not-allowed" disabled>
                                  🏦 PSE — Próximamente
                                </Button>
                                <p className="text-xs text-amber-600">⏱ PayPal: activación automática al confirmar pago. ¿Dudas? <strong>blangenglishlearning@blangenglish.com</strong></p>
                              </div>
                            </div>
                          </div>
                        );
                      }
                    }

                    // ── D: flujo normal (trial activo, plan activo aprobado, etc.) ──
                    const isTrial = (sub.plan_slug === 'free_trial' || sub.status === 'trial');
                    const isPending = sub.approved_by_admin === false && sub.account_enabled === false;
                    const isApproved = sub.approved_by_admin === true || sub.account_enabled === true;
                    const isDisabled = sub.account_enabled === false && sub.approved_by_admin !== false;
                    const fmtDate = (d: Date | null) => d ? d.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';
                    const regDate = sub.created_at ? new Date(sub.created_at) : new Date();
                    const trialEnd = sub.trial_ends_at ? new Date(sub.trial_ends_at) : new Date(regDate.getTime() + 7 * 24 * 60 * 60 * 1000);
                    const nextBilling = sub.current_period_end ? new Date(sub.current_period_end) : null;

                    return (
                      <div className="space-y-4">
                        <div className={`rounded-2xl border-2 p-5 shadow-sm relative overflow-hidden ${
                          isTrial ? 'border-blue-300 bg-blue-50/30' :
                          isPending ? 'border-amber-300 bg-amber-50/40' :
                          isDisabled ? 'border-red-300 bg-red-50/30' :
                          'border-green-300 bg-green-50/30'
                        }`}>
                          <div className={`absolute top-0 left-0 right-0 h-1 ${
                            isTrial ? 'bg-blue-400' : isPending ? 'bg-amber-400' : isDisabled ? 'bg-red-400' : 'bg-gradient-to-r from-green-400 to-emerald-400'
                          }`} />
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full mb-3 ${
                                isTrial ? 'bg-blue-100 text-blue-700' : isPending ? 'bg-amber-100 text-amber-700' : isDisabled ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                              }`}>
                                {isTrial ? '🌱 Prueba gratis — 7 días (módulo A1)' : isPending ? '⏳ Pago pendiente de confirmación' : isDisabled ? '🔒 Cuenta deshabilitada' : '✅ Suscripción activa'}
                              </span>
                              <h2 className="font-extrabold text-xl">{sub.plan_name}</h2>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-extrabold text-2xl">${sub.amount_usd} <span className="text-sm font-normal text-muted-foreground">USD/mes</span></p>
                            </div>
                          </div>
                          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <div className="bg-background/70 rounded-xl p-3 border border-border/40">
                              <p className="text-xs text-muted-foreground mb-0.5">📅 Fecha de inicio</p>
                              <p className="font-bold text-sm">{fmtDate(regDate)}</p>
                            </div>
                            {isTrial && (
                              <div className="bg-background/70 rounded-xl p-3 border border-border/40">
                                <p className="text-xs text-muted-foreground mb-0.5">⏰ Termina prueba</p>
                                <p className="font-bold text-sm">{fmtDate(trialEnd)}</p>
                              </div>
                            )}
                            {nextBilling && !isTrial && (
                              <div className="bg-background/70 rounded-xl p-3 border border-border/40">
                                <p className="text-xs text-muted-foreground mb-0.5">📆 Próximo cobro</p>
                                <p className="font-bold text-sm">{fmtDate(nextBilling)}</p>
                              </div>
                            )}
                            <div className="bg-background/70 rounded-xl p-3 border border-border/40">
                              <p className="text-xs text-muted-foreground mb-0.5">💰 Monto</p>
                              <p className="font-bold text-sm">${sub.amount_usd} USD</p>
                            </div>
                          </div>
                        </div>

                        {isTrial && (
                          <TrialPaymentBlock fmtDate={fmtDate} trialEnd={trialEnd}
                            onOpenPaypal={() => { setPaypalModalAmount(7.50); setShowPaypalModal(true); }} />
                        )}
                        {isPending && !isTrial && (
                          <div className="rounded-2xl overflow-hidden border-2 border-amber-300 shadow-sm">
                            <div className="bg-amber-400 px-5 py-3 flex items-center gap-2">
                              <AlertCircle className="w-5 h-5 text-white" />
                              <p className="font-bold text-white text-sm">💳 Completa tu pago para activar la cuenta</p>
                            </div>
                            <div className="bg-amber-50 p-5 space-y-3">
                              <Button className="w-full rounded-xl font-bold bg-[#003087] hover:bg-[#002070] text-white gap-2"
                                onClick={() => { setPaypalModalAmount(sub.amount_usd); setShowPaypalModal(true); }}>
                                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.59 3.025-2.566 6.082-8.558 6.082H9.928l-1.182 7.519H12c.46 0 .85-.334.922-.789l.038-.197.733-4.64.047-.257a.932.932 0 0 1 .921-.789h.58c3.76 0 6.701-1.528 7.559-5.95.36-1.85.176-3.395-.578-4.692z"/></svg>
                                Pagar con PayPal 💳
                              </Button>
                              <Button className="w-full rounded-xl font-bold bg-muted text-muted-foreground gap-2 cursor-not-allowed" disabled>🏦 PSE — Próximamente</Button>
                              <p className="text-xs text-amber-600">⏱ PayPal: activación automática. ¿Dudas? <strong>blangenglishlearning@blangenglish.com</strong></p>
                            </div>
                          </div>
                        )}
                        {isApproved && !isTrial && !isDisabled && (
                          <div className="rounded-2xl bg-green-50 border-2 border-green-200 p-5 shadow-sm">
                            <div className="flex items-center gap-2 mb-2"><Check className="w-5 h-5 text-green-600" />
                              <p className="font-bold text-green-900">✅ Pago confirmado — acceso completo habilitado</p>
                            </div>
                            <p className="text-sm text-green-800">Tienes acceso completo a todos tus cursos.</p>
                          </div>
                        )}
                        {isDisabled && (
                          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5">
                            <p className="font-bold text-red-800 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Cuenta deshabilitada</p>
                            <p className="text-sm text-red-700 mt-1">Para reactivarla, realiza tu pago:</p>
                            <div className="mt-4 flex flex-col gap-3">
                              <Button className="w-full rounded-xl font-bold bg-[#003087] hover:bg-[#002070] text-white gap-2"
                                onClick={() => { setPaypalModalAmount(sub.amount_usd || 15); setShowPaypalModal(true); }}>
                                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.59 3.025-2.566 6.082-8.558 6.082H9.928l-1.182 7.519H12c.46 0 .85-.334.922-.789l.038-.197.733-4.64.047-.257a.932.932 0 0 1 .921-.789h.58c3.76 0 6.701-1.528 7.559-5.95.36-1.85.176-3.395-.578-4.692z"/></svg>
                                Reactivar con PayPal — ${sub.amount_usd || 15} USD 💳
                              </Button>
                              <Button className="w-full rounded-xl font-bold bg-muted text-muted-foreground gap-2 cursor-not-allowed" disabled>🏦 PSE — Próximamente</Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

              {/* ── Payment History ── */}
              {activeTab === 'pagos' && paymentHistory.length > 0 && (
                <div className="bg-background rounded-2xl border border-border/50 p-5 shadow-sm mt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <History className="w-4 h-4 text-primary" />
                    <h2 className="font-bold text-base">Historial de pagos</h2>
                  </div>
                  <div className="space-y-2">
                    {paymentHistory.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/30">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            item.event_type === 'payment_approved' ? 'bg-green-100 text-green-600' :
                            item.event_type === 'payment_pending' ? 'bg-amber-100 text-amber-600' :
                            item.event_type === 'cancelled' ? 'bg-red-100 text-red-600' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {item.event_type === 'payment_approved' ? '✅' :
                             item.event_type === 'payment_pending' ? '⏳' :
                             item.event_type === 'cancelled' ? '❌' : '📋'}
                          </div>
                          <div>
                            <p className="text-sm font-semibold">
                              {item.event_type === 'payment_approved' ? 'Pago aprobado' :
                               item.event_type === 'payment_pending' ? 'Pago en revisión' :
                               item.event_type === 'cancelled' ? 'Suscripción cancelada' :
                               item.event_type === 'subscription_created' ? 'Suscripción creada' :
                               item.event_type.replace(/_/g, ' ')}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(item.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
                              {item.payment_method && item.payment_method !== 'none' && ` · ${item.payment_method.toUpperCase()}`}
                              {item.notes && ` · ${item.notes}`}
                            </p>
                          </div>
                        </div>
                        {item.amount_usd > 0 && (
                          <span className="text-sm font-bold text-green-600">${item.amount_usd} USD</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Cancelar suscripción ── */}
              {activeTab === 'pagos' && subscription && !['cancelled', 'pending_plan'].includes(subscription.status) && (
                <div className="bg-background rounded-2xl border border-destructive/20 p-6 shadow-sm mt-2">
                  <h2 className="font-bold text-base mb-2 text-destructive/80">⚠️ Cancelar suscripción</h2>
                  <p className="text-sm text-muted-foreground mb-4">Si cancelas, tu cuenta quedará <strong>deshabilitada inmediatamente</strong> hasta que realices un nuevo pago.</p>
                  {!cancelConfirm ? (
                    <Button variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10 rounded-xl text-sm" onClick={() => setCancelConfirm(true)}>
                      Cancelar suscripción
                    </Button>
                  ) : (
                    <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 space-y-3">
                      <p className="text-sm font-semibold text-destructive">¿Estás seguro/a de cancelar?</p>
                      <p className="text-xs text-muted-foreground">Tu cuenta se deshabilitará de inmediato. Para reactivarla deberás realizar un nuevo pago.</p>
                      <div className="flex gap-3">
                        <Button variant="destructive" size="sm" className="rounded-xl text-xs" onClick={async () => {
                          if (currentUserId) {
                            try {
                              // Llamar edge function con service_role para cancelar
                              const { error } = await supabase.functions.invoke('save-onboarding-2026', {
                                body: { action: 'cancel_subscription', student_id: currentUserId },
                              });
                              if (error) throw error;
                            } catch {
                              // Fallback: update directo
                              await supabase.from('subscriptions').update({
                                status: 'cancelled',
                                account_enabled: false,
                                approved_by_admin: false,
                              }).eq('student_id', currentUserId);
                              await supabase.from('student_profiles').update({
                                account_enabled: false,
                              }).eq('id', currentUserId);
                            }
                            // Actualizar estado local inmediatamente
                            setSubscription(s => s ? { ...s, status: 'cancelled', account_enabled: false } : null);
                            // Recargar desde BD para confirmar que se guardó
                            await refreshProfile(currentUserId);
                          }
                          setCancelConfirm(false);
                        }}>Sí, cancelar y deshabilitar</Button>
                        <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={() => setCancelConfirm(false)}>No, mantener</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
                </motion.div>
              )}

              {/* ─── PROGRESO ─── */}
              {activeTab === 'progreso' && (
                <motion.div key="progreso" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                  <div className="mb-2">
                    <h1 className="text-2xl md:text-3xl font-extrabold mb-1">Mi Progreso 📊</h1>
                    <p className="text-muted-foreground text-sm">Ve cómo vas avanzando en tu camino al inglés.</p>
                  </div>

                  {/* Stats row — real data from DB */}
                  {(() => {
                    const totalStreak = progressData.reduce((a, p) => Math.max(a, p.streak_days || 0), 0);
                    const totalPoints = progressData.reduce((a, p) => a + (p.total_points || 0), 0);
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { icon: <Flame className="w-5 h-5 text-orange-500" />, value: totalStreak === 0 ? '0' : String(totalStreak), label: 'Días de racha', bg: 'bg-orange-50 border-orange-100' },
                          { icon: <BookOpen className="w-5 h-5 text-primary" />, value: String(totalUnitsCompleted), label: 'Unidades completadas', bg: 'bg-primary/5 border-primary/10' },
                          { icon: <Star className="w-5 h-5 text-amber-500" />, value: totalPoints === 0 ? '0' : String(totalPoints), label: 'Puntos totales', bg: 'bg-amber-50 border-amber-100' },
                          { icon: <Award className="w-5 h-5 text-violet-500" />, value: studentProfile?.english_level || '—', label: 'Nivel actual', bg: 'bg-violet-50 border-violet-100' },
                        ].map((s, i) => (
                          <div key={i} className={`${s.bg} border rounded-2xl p-4 text-center`}>
                            <div className="flex justify-center mb-2">{s.icon}</div>
                            <p className="text-2xl font-extrabold">{s.value}</p>
                            <p className="text-xs text-muted-foreground leading-tight mt-0.5">{s.label}</p>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* Course progress — real data */}
                  <div className="bg-background rounded-2xl border border-border/50 p-6 shadow-sm">
                    <h2 className="font-bold text-base mb-5">Progreso por nivel</h2>
                    {dbCourses.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">Cargando cursos...</p>
                    ) : (
                      <div className="space-y-5">
                        {dbCourses.map((course) => {
                          const courseProgress = progressData.find(p => p.course_id === course.id);
                          const completed = courseProgress?.completed_units || 0;
                          const total = course.total_units || 1;
                          const pct = total ? Math.round((completed / total) * 100) : 0;
                          const isUnlocked = isCourseVisible(course);
                          return (
                            <div key={course.id} className={!isUnlocked ? 'opacity-40' : ''}>
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{course.emoji}</span>
                                  <div>
                                    <p className="text-sm font-semibold leading-tight">{course.title}</p>
                                    <p className="text-xs text-muted-foreground">{course.level} · {total} unidades</p>
                                  </div>
                                </div>
                                {!isUnlocked && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                                {isUnlocked && pct === 100 && <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">✅ Completado</span>}
                              </div>
                              <Progress value={pct} className="h-2" />
                              <p className="text-xs text-muted-foreground mt-1">
                                {completed} de {total} unidades completadas {!isUnlocked ? '🔒' : pct === 100 ? '🎉' : ''}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Weekly activity — real data */}
                  <div className="bg-background rounded-2xl border border-border/50 p-6 shadow-sm">
                    <h2 className="font-bold text-base mb-4">📆 Actividad esta semana</h2>
                    <div className="grid grid-cols-7 gap-1.5">
                      {(() => {
                        const days = ['L','M','X','J','V','S','D'];
                        const today = new Date();
                        return days.map((label, i) => {
                          const d = new Date(today);
                          d.setDate(today.getDate() - (6 - i));
                          const dateStr = d.toISOString().split('T')[0];
                          const isActive = activityDays.includes(dateStr);
                          const isToday = dateStr === today.toISOString().split('T')[0];
                          return (
                            <div key={label} className="text-center">
                              <p className={`text-xs mb-1 ${ isToday ? 'font-bold text-primary' : 'text-muted-foreground'}`}>{label}</p>
                              <div className={`h-8 rounded-lg transition-all ${
                                isActive ? 'bg-primary' : isToday ? 'bg-primary/20 border-2 border-primary/30' : 'bg-muted/50'
                              }`} />
                            </div>
                          );
                        });
                      })()}
                    </div>
                    <p className="text-xs text-muted-foreground mt-3 text-center">
                      {activityDays.length} de 7 días activos esta semana {activityDays.length >= 5 ? '🔥' : activityDays.length >= 3 ? '⚡' : '💪'}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* ─── AYUDA ─── */}
              {activeTab === 'ayuda' && (
                <motion.div key="ayuda" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
                  <div className="mb-2">
                    <h1 className="text-2xl md:text-3xl font-extrabold mb-1">Ayuda & Soporte 💬</h1>
                    <p className="text-muted-foreground text-sm">Preguntas frecuentes y canales de contacto.</p>
                  </div>

                  {/* Quick FAQs */}
                  <div className="bg-background rounded-2xl border border-border/50 p-6 shadow-sm">
                    <h2 className="font-bold text-base mb-4">❓ Preguntas frecuentes</h2>
                    <div className="space-y-2">
                      {FAQ_QUICK.map((faq, i) => (
                        <div key={i} className="border border-border/40 rounded-xl overflow-hidden">
                          <button
                            onClick={() => setOpenFaq(openFaq === i ? null : i)}
                            className="w-full flex items-center justify-between px-4 py-3.5 text-left text-sm font-semibold hover:bg-muted/30 transition-colors"
                          >
                            <span>{faq.q}</span>
                            {openFaq === i ? <ChevronUp className="w-4 h-4 text-primary shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                          </button>
                          <AnimatePresence>
                            {openFaq === i && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }} className="overflow-hidden"
                              >
                                <p className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed border-t border-border/30 pt-3">{faq.a}</p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                    <Button variant="outline" className="mt-4 w-full rounded-xl text-sm border-primary/30 text-primary" onClick={() => navigate(ROUTE_PATHS.FAQ)}>
                      Ver todas las preguntas frecuentes →
                    </Button>
                  </div>

                  {/* Contact channels */}
                  <div className="bg-background rounded-2xl border border-border/50 p-6 shadow-sm">
                    <h2 className="font-bold text-base mb-4">📞 Canales de contacto</h2>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {[
                        { emoji: '💬', title: 'WhatsApp', desc: 'Escríbenos para dudas rápidas', href: 'https://whatsapp.com/channel/0029VbCYgGe6WaKj1KPxei2F' },
                        { emoji: '📸', title: 'Instagram', desc: '@blangenglish', href: 'https://www.instagram.com/blangenglish/' },
                        { emoji: '🎵', title: 'TikTok', desc: '@blangenglish', href: 'https://www.tiktok.com/@blangenglish' },
                        { emoji: '📧', title: 'Email', desc: 'blangenglishlearning@blangenglish.com', href: `mailto:blangenglishlearning@blangenglish.com` },
                      ].map((ch, i) => (
                        <a key={i} href={ch.href} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-3 p-4 bg-muted/30 rounded-xl border border-border/30 hover:border-primary/30 hover:bg-primary/5 transition-all group"
                        >
                          <span className="text-2xl">{ch.emoji}</span>
                          <div>
                            <p className="font-semibold text-sm group-hover:text-primary transition-colors">{ch.title}</p>
                            <p className="text-xs text-muted-foreground">{ch.desc}</p>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* Logout shortcut */}
                  <div className="bg-background rounded-2xl border border-border/50 p-6 shadow-sm">
                    <h2 className="font-bold text-base mb-3">🚪 Cerrar sesión</h2>
                    <p className="text-sm text-muted-foreground mb-4">¿Quieres salir de tu cuenta? Puedes volver cuando quieras.</p>
                    <Button
                      variant="outline" className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10 text-sm gap-2"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-4 h-4" /> Cerrar sesión
                    </Button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* Unit viewer overlay */}
      {viewerUnit && (
        <UnitViewer
          unitId={viewerUnit.id}
          unitTitle={viewerUnit.title}
          unitDescription={viewerUnit.description}
          studentId={currentUserId}
          onClose={async () => {
            // Actualizar progreso de esta unidad en el mapa al cerrar
            if (currentUserId && viewerUnit.id) {
              const { data } = await supabase.from('unit_progress')
                .select('unit_id').eq('unit_id', viewerUnit.id)
                .eq('student_id', currentUserId).eq('completed', true);
              setUnitProgressMap(prev => ({ ...prev, [viewerUnit.id]: data?.length || 0 }));
            }
            setViewerUnit(null);
          }}
        />
      )}

      {/* Confirm dialog for data modifications */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog(c => ({ ...c, open: false }))}
      />

      {/* Level onboarding — salta directo al paso de nivel si ya tiene plan activo */}
      {showLevelOnboarding && currentUserId && (
        <OnboardingFlow
          open={showLevelOnboarding}
          userId={currentUserId}
          userName={userName || 'Estudiante'}
          userEmail={currentEmail}
          initialStep={studentProfile?.onboarding_step === 'english_test' ? 'level' : 'plan'}
          hasPaidPlan={
            // Plan activo y aprobado por admin (cuenta habilitada)
            !!(subscription?.account_enabled === true &&
              subscription?.approved_by_admin === true &&
              subscription?.status !== 'cancelled' &&
              subscription?.status !== 'trial' &&
              subscription?.plan_slug !== 'free_trial')
          }
          onComplete={() => {
            setShowLevelOnboarding(false);
            refreshProfile(currentUserId);
          }}
        />
      )}
    </div>
  );
}