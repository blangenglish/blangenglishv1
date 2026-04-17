import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Search, Users, TrendingUp, CreditCard, Edit2,
  Check, X, Mail, Phone, Calendar, Award, Flame,
  ChevronDown, ChevronUp, BookOpen, AlertCircle, KeyRound, RefreshCw,
  Video, Clock, Target, ShieldCheck, ShieldX, Trash2, Lock, Unlock,
  ToggleLeft, ToggleRight, History, Gift,
} from 'lucide-react';

interface SessionRequestRow {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  sessions: Array<{ date: string; topic: string }>;
  weekly_plan: boolean;
  weekly_hours: string;
  weekly_schedule: string;
  objective: string;
  created_at: string;
}

interface StudentRow {
  id: string;
  full_name: string;
  phone: string;
  current_level: string;
  english_level?: string;
  created_at: string;
  email?: string;
  birthday?: string;
  education_level?: string;
  education_other?: string;
  country?: string;
  city?: string;
  bio?: string;
  onboarding_step?: string;
  is_admin_only?: boolean;
  account_enabled?: boolean;
  subscription?: {
    plan_slug?: string;
    plan_name: string;
    status: string;
    amount_usd: number;
    trial_ends_at: string;
    current_period_end: string;
    payment_method?: string;
    approved_by_admin?: boolean;
    renewal_due_at?: string;
    account_enabled?: boolean;
    created_at?: string;
  };
  progress?: Array<{
    course_slug: string;
    completed_units: number;
    total_units: number;
    streak_days: number;
    total_points: number;
  }>;
  unit_completions_count?: number;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  trial:     { label: 'Prueba', color: 'bg-blue-100 text-blue-700' },
  active:    { label: 'Activo', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700' },
  expired:   { label: 'Expirado', color: 'bg-gray-100 text-gray-700' },
};

export default function AdminStudents() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: '', phone: '', current_level: '', english_level: '',
    country: '', city: '', birthday: '', email: '',
  });
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailSaveMsg, setEmailSaveMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<Record<string, 'info' | 'progreso' | 'pagos' | 'cuenta' | 'modulos'>>({});
  const [coursesForAccess, setCoursesForAccess] = useState<Array<{id: string; title: string; emoji: string; level?: string; units?: Array<{id: string; title: string}>}>>([]);
  const [studentModuleAccess, setStudentModuleAccess] = useState<Record<string, string[]>>({});
  const [resetSent, setResetSent] = useState<string | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);
  const [sessionRequests, setSessionRequests] = useState<SessionRequestRow[]>([]);
  const [sessionReqExpanded, setSessionReqExpanded] = useState<string | null>(null);
  const [adminTab, setAdminTab] = useState<'students' | 'sessions'>('students');
  const [confirmAction, setConfirmAction] = useState<{ open: boolean; title: string; msg: string; fn: () => Promise<void> }>({
    open: false, title: '', msg: '', fn: async () => {}
  });
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const showMsg = (type: 'success' | 'error', text: string) => {
    setActionMsg({ type, text });
    setTimeout(() => setActionMsg(null), 5000);
  };

  // Payment history per student
  interface PayHistRow { id: string; event_type: string; amount_usd: number; payment_method: string; notes?: string; created_at: string; created_by?: string; }
  const [studentPayHistory, setStudentPayHistory] = useState<Record<string, PayHistRow[]>>({});

  // Estado del formulario de activación manual de plan
  const LEVEL_OPTIONS = ['A1', 'A2', 'B1', 'B2', 'C1', 'Todas', 'Ninguna'];
  const [activationForm, setActivationForm] = useState<Record<string, {
    activationDate: string;
    amount: string;
    method: string;
    level: string;
    notes: string;
  }>>({});
  const [activating, setActivating] = useState<string | null>(null);
  const getActivationForm = (studentId: string) => activationForm[studentId] || {
    activationDate: new Date().toISOString().split('T')[0],
    amount: '15',
    method: 'paypal',
    level: 'Todas',
    notes: '',
  };
  const setActivationField = (studentId: string, field: string, value: string) => {
    setActivationForm(prev => ({
      ...prev,
      [studentId]: { ...getActivationForm(studentId), [field]: value },
    }));
  };

  const loadPaymentHistory = async (studentId: string, forceReload = false) => {
    if (!forceReload && studentPayHistory[studentId]) return;
    const { data } = await supabase.from('payment_history').select('*').eq('student_id', studentId).order('created_at', { ascending: false }).limit(20);
    if (data) setStudentPayHistory(prev => ({ ...prev, [studentId]: data as PayHistRow[] }));
  };

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      // Pasar JWT token manualmente (verify_jwt: true en la edge)
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('admin-update-student', {
        body: { action: 'list_all_students' },
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      });

      if (error || !data?.students) {
        console.error('Edge error, usando fallback directo:', error);
        // Fallback directo con cliente Supabase (puede estar limitado por RLS)
        const { data: fallbackData } = await supabase
          .from('student_profiles')
          .select('*, subscriptions(*)')
          .neq('is_admin_only', true)
          .order('created_at', { ascending: false });
        if (fallbackData && fallbackData.length > 0) {
          type FallbackRow = StudentRow & { subscriptions?: StudentRow['subscription'] | StudentRow['subscription'][] };
          const rows: StudentRow[] = (fallbackData as FallbackRow[]).map(s => ({
            ...s,
            subscription: Array.isArray(s.subscriptions)
              ? (s.subscriptions as StudentRow['subscription'][])[0] ?? undefined
              : s.subscriptions ?? undefined,
            progress: [] as StudentRow['progress'],
          }));
          setStudents(rows);
        } else {
          setStudents([]);
        }
        return;
      }

      // Filtrar perfiles de admin (is_admin_only = true), mantener null/false
      const rows: StudentRow[] = (data.students as StudentRow[])
        .filter((s: StudentRow) => s.is_admin_only !== true)
        .map((s: StudentRow) => ({
          ...s,
          progress: s.progress || [],
        }));

      setStudents(rows);
    } catch (err) {
      console.error('loadStudents error:', err);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  const loadSessionRequests = useCallback(async () => {
    const { data } = await supabase
      .from('session_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setSessionRequests(data as SessionRequestRow[]);
  }, []);

  useEffect(() => { loadSessionRequests(); }, [loadSessionRequests]);

  const filtered = students.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (s.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const startEdit = (s: StudentRow) => {
    setEditingId(s.id);
    setExpandedId(s.id); // auto-expand the card
    setEmailSaveMsg(null);
    setEditForm({
      full_name: s.full_name, phone: s.phone || '',
      current_level: s.current_level || 'A1', english_level: s.english_level || '',
      country: s.country || '', city: s.city || '', birthday: s.birthday || '',
      email: s.email || '',
    });
  };

  const calcAge = (birthday?: string) => {
    if (!birthday) return null;
    const birth = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const EDUCATION_LABELS: Record<string, string> = {
    bachiller: 'Bachiller / Secundaria',
    universitario: 'Universitario / Técnico',
    posgrado: 'Posgrado / Maestría / PhD',
    trabajo: 'Trabajo (sin título universitario)',
    otro: 'Otro',
    high_school: 'Bachillerato',
    university: 'Universidad',
    postgraduate: 'Posgrado',
    work: 'Laboral',
    other: 'Otro',
  };

  const sendPasswordReset = async (email: string, studentId: string) => {
    if (!email) return;
    setResetting(studentId);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${window.location.pathname}#/reset-password`,
    });
    setResetting(null);
    setResetSent(studentId);
    setTimeout(() => setResetSent(null), 4000);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    const { error } = await adminInvoke({
      action: 'update_student',
      student_id: editingId,
      new_full_name: editForm.full_name,
      new_phone: editForm.phone,
      new_current_level: editForm.current_level,
      new_english_level: editForm.english_level || null,
      new_country: editForm.country,
      new_city: editForm.city,
      new_birthday: editForm.birthday || null,
    });
    if (error) {
      // Direct fallback via RLS
      await supabase.from('student_profiles').update({
        full_name: editForm.full_name,
        phone: editForm.phone,
        current_level: editForm.current_level,
        english_level: editForm.english_level || null,
        country: editForm.country,
        city: editForm.city,
        birthday: editForm.birthday || null,
        updated_at: new Date().toISOString(),
      }).eq('id', editingId);
    }
    setSaving(false);
    setEditingId(null);
    await loadStudents();
  };

  // Update email via edge function (also updates auth.users)
  const saveEmail = async (studentId: string) => {
    if (!editForm.email.trim()) return;
    setSavingEmail(true);
    setEmailSaveMsg(null);
    const { data, error } = await adminInvoke({ action: 'update_student', student_id: studentId, new_email: editForm.email.trim() });
    if (error || !data?.success) {
      const errMsg = (data?.results?.email_auth as string) || (error as Error)?.message || 'Error desconocido';
      setEmailSaveMsg(`❌ ${errMsg}`);
    } else {
      setEmailSaveMsg('✅ Correo actualizado (perfil y login del estudiante)');
      await loadStudents();
    }
    setSavingEmail(false);
    setTimeout(() => setEmailSaveMsg(null), 5000);
  };

  // ── Helper: call edge function with auto-fallback to direct Supabase ──
  const adminInvoke = async (payload: Record<string, unknown>) => {
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke('admin-update-student', {
      body: payload,
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
    });
    if (error) console.error('[admin-invoke] edge error:', error);
    return { data, error };
  };

  const setFreeAccount = async (studentId: string, free: boolean) => {
    // Intentar con edge function primero (tiene service_role)
    const { data, error } = await adminInvoke({ action: 'set_free_account', student_id: studentId, free });

    // Si se está cobrando (free=false), revocar todos los módulos
    if (!free) {
      await adminInvoke({ student_id: studentId, module_access: { action: 'revoke_all_courses' } });
      // Fallback directo también
      await supabase.from('student_module_access').update({ is_active: false }).eq('student_id', studentId);
    }

    // Fallback directo si la edge function falla o no devuelve success
    if (error || !data?.success) {
      const farFuture = new Date();
      farFuture.setFullYear(farFuture.getFullYear() + 50);
      if (free) {
        // Borrar todas las suscripciones e insertar free_admin
        await supabase.from('subscriptions').delete().eq('student_id', studentId);
        await supabase.from('subscriptions').insert({
          student_id: studentId, plan_slug: 'free_admin', plan_name: 'Acceso Gratuito (Admin)',
          status: 'active', amount_usd: 0, payment_method: 'none',
          approved_by_admin: true, account_enabled: true,
          current_period_end: farFuture.toISOString(),
        });
        await supabase.from('student_profiles').update({ account_enabled: true }).eq('id', studentId);
      } else {
        // Cobrar: borrar todas las suscripciones e insertar pendiente (no depender del WHERE plan_slug)
        await supabase.from('subscriptions').delete().eq('student_id', studentId);
        await supabase.from('subscriptions').insert({
          student_id: studentId, plan_slug: 'monthly', plan_name: 'Plan Mensual',
          status: 'pending_approval', amount_usd: 15, payment_method: 'paypal',
          approved_by_admin: false, account_enabled: false,
        });
        await supabase.from('student_profiles').update({ account_enabled: false }).eq('id', studentId);
      }
    }
    await loadStudents();
  };

  const toggleAccountEnabled = async (studentId: string, enabled: boolean) => {
    const { error } = await adminInvoke({ action: 'toggle_account_enabled', student_id: studentId, enabled });
    if (error) {
      // Direct fallback
      await supabase.from('subscriptions').update({ account_enabled: enabled, approved_by_admin: enabled }).eq('student_id', studentId);
      await supabase.from('student_profiles').update({ account_enabled: enabled }).eq('id', studentId);
    }
    await loadStudents();
  };

  // Activar plan manualmente — usa edge function con service_role para bypasear RLS
  const activatePlanManual = async (studentId: string) => {
    const form = getActivationForm(studentId);
    setActivating(studentId);
    try {
      const activationDate = form.activationDate ? new Date(form.activationDate + 'T12:00:00') : new Date();
      const nextPeriodEnd = new Date(activationDate);
      nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);
      const amount = parseFloat(form.amount) || 15;

      // Usar acción activate_plan de la edge function (service_role — bypasa RLS)
      const { data: result, error } = await supabase.functions.invoke('admin-update-student', {
        body: {
          action: 'activate_plan',
          student_id: studentId,
          activation_date: activationDate.toISOString(),
          amount_usd: amount,
          payment_method: form.method,
          level: form.level,
          notes: form.notes || '',
        },
      });

      if (error) {
        showMsg('error', `Error al activar: ${error.message || JSON.stringify(error)}`);
        return;
      }
      if (!result?.success) {
        showMsg('error', `Error: ${result?.error || 'Respuesta inesperada de la edge function'}`);
        return;
      }

      // Actualizar el estado local del estudiante INMEDIATAMENTE con la sub devuelta
      const updatedSub = result?.subscription;
      if (updatedSub) {
        setStudents(prev => prev.map(s => {
          if (s.id !== studentId) return s;
          return {
            ...s,
            account_enabled: true,
            subscription: updatedSub,
          };
        }));
      }

      // Mostrar mensaje de éxito
      showMsg('success', `✅ Plan activado correctamente para ${form.level === 'Ninguna' ? 'examen pendiente' : 'nivel ' + form.level}`);

      // Recargar lista completa en segundo plano
      loadStudents();

      // Forzar recarga del historial de pagos
      setStudentPayHistory(prev => { const n = { ...prev }; delete n[studentId]; return n; });
      loadPaymentHistory(studentId, true);

      // Actualizar formulario para el SIGUIENTE cobro
      const nextActivationDate = nextPeriodEnd.toISOString().split('T')[0];
      setActivationForm(prev => ({
        ...prev,
        [studentId]: {
          activationDate: nextActivationDate,
          amount: String(amount),
          method: form.method,
          level: form.level === 'Ninguna' ? 'Todas' : form.level,
          notes: '',
        },
      }));

    } finally {
      setActivating(null);
    }
  };

  const approvePayment = async (studentId: string, notes?: string) => {
    const { error } = await adminInvoke({ action: 'approve_payment', student_id: studentId });
    if (error) {
      await supabase.from('subscriptions').update({ approved_by_admin: true, account_enabled: true, status: 'active' }).eq('student_id', studentId);
      await supabase.from('student_profiles').update({ account_enabled: true }).eq('id', studentId);
    }
    const { data: subData } = await supabase.from('subscriptions').select('amount_usd, payment_method').eq('student_id', studentId).order('created_at', { ascending: false }).limit(1).single();
    await supabase.from('payment_history').insert({
      student_id: studentId,
      event_type: 'payment_approved',
      amount_usd: subData?.amount_usd || 15,
      payment_method: subData?.payment_method || 'paypal',
      notes: notes || 'Pago verificado y aprobado por administrador',
      created_by: 'admin',
    });
    await loadStudents();
    setStudentPayHistory(prev => { const n = { ...prev }; delete n[studentId]; return n; });
    loadPaymentHistory(studentId);
  };

  const cancelSubscription = async (studentId: string) => {
    const { error } = await adminInvoke({ action: 'update_student', student_id: studentId, new_status: 'cancelled', account_enabled: false });
    if (error) {
      await supabase.from('subscriptions').update({ status: 'cancelled', account_enabled: false }).eq('student_id', studentId);
    }
    await loadStudents();
  };

  const changeStatus = async (studentId: string, status: string) => {
    const { error } = await adminInvoke({ action: 'update_student', student_id: studentId, new_status: status });
    if (error) {
      await supabase.from('subscriptions').update({ status }).eq('student_id', studentId);
    }
    await loadStudents();
  };

  // Habilita o deshabilita el examen de inglés de un estudiante
  const toggleEnglishExam = async (studentId: string, enable: boolean) => {
    const { data, error } = await supabase.functions.invoke('admin-update-student', {
      body: {
        action: 'set_onboarding_step',
        student_id: studentId,
        onboarding_step: enable ? 'english_test' : 'completed',
        english_level: enable ? null : undefined,
      },
    });
    if (error || !data?.success) {
      // Fallback directo
      await supabase.from('student_profiles').update({
        onboarding_step: enable ? 'english_test' : 'completed',
        english_level: enable ? null : undefined,
        updated_at: new Date().toISOString(),
      }).eq('id', studentId);
    }
    showMsg('success', enable
      ? '🎓 Examen de inglés habilitado — el estudiante verá el examen en su panel'
      : '✅ Examen desactivado — el estudiante mantiene su nivel actual'
    );
    await loadStudents();
  };

  const deleteAccount = async (studentId: string) => {
    // Usar edge function con service_role para eliminar también de auth.users
    const { data, error } = await adminInvoke({ action: 'delete_account', student_id: studentId });
    if (error || !data?.success) {
      // Fallback: borrar tablas directamente (sin poder borrar auth.users)
      await supabase.from('payment_history').delete().eq('student_id', studentId);
      await supabase.from('unit_progress').delete().eq('student_id', studentId);
      await supabase.from('student_module_access').delete().eq('student_id', studentId);
      await supabase.from('session_requests').delete().eq('student_id', studentId);
      await supabase.from('subscriptions').delete().eq('student_id', studentId);
      await supabase.from('student_profiles').delete().eq('id', studentId);
    }
    setExpandedId(null);
    await loadStudents();
  };

  const getTab = (id: string) => activeTab[id] || 'info';
  const setTab = (id: string, tab: 'info' | 'progreso' | 'pagos' | 'cuenta' | 'modulos') =>
    setActiveTab(prev => ({ ...prev, [id]: tab }));

  // Load courses for module access management
  const loadCoursesForAccess = useCallback(async () => {
    const { data: courses } = await supabase.from('courses').select('id, title, emoji, level').order('sort_order');
    if (!courses) return;
    const coursesWithUnits = await Promise.all(courses.map(async (c) => {
      const { data: units } = await supabase.from('units').select('id, title').eq('course_id', c.id).order('sort_order');
      return { ...c, units: units || [] };
    }));
    setCoursesForAccess(coursesWithUnits);
  }, []);

  useEffect(() => { loadCoursesForAccess(); }, [loadCoursesForAccess]);

  const loadStudentModuleAccess = useCallback(async (studentId: string) => {
    const { data } = await supabase.from('student_module_access')
      .select('course_id, unit_id, is_active')
      .eq('student_id', studentId)
      .eq('is_active', true);
    if (data) {
      const granted = data.map((d: {course_id?: string; unit_id?: string}) => d.unit_id || d.course_id || '').filter(Boolean);
      setStudentModuleAccess(prev => ({ ...prev, [studentId]: granted }));
    }
  }, []);

  const toggleModuleAccess = async (studentId: string, courseId: string, unitId: string | null, currentlyGranted: boolean) => {
    const newState = !currentlyGranted;
    // Actualizar UI local inmediatamente
    setStudentModuleAccess(prev => {
      const current = prev[studentId] || [];
      const targetId = unitId || courseId;
      const updated = newState
        ? [...current, targetId]
        : current.filter(id => id !== targetId);
      return { ...prev, [studentId]: updated };
    });
    // Llamar edge function (tiene service_role)
    const { error } = await adminInvoke({
      student_id: studentId,
      module_access: { course_id: courseId, unit_id: unitId, action: currentlyGranted ? 'revoke' : 'grant' },
    });
    if (error) {
      // Fallback directo con cliente admin
      const target = unitId
        ? supabase.from('student_module_access').update({ is_active: newState }).eq('student_id', studentId).eq('course_id', courseId).eq('unit_id', unitId)
        : supabase.from('student_module_access').update({ is_active: newState }).eq('student_id', studentId).eq('course_id', courseId);
      const { error: fbErr } = await target;
      if (fbErr && newState) {
        // Si no existe el registro, insertarlo
        await supabase.from('student_module_access').insert(
          unitId
            ? { student_id: studentId, course_id: courseId, unit_id: unitId, is_active: true, granted_at: new Date().toISOString() }
            : { student_id: studentId, course_id: courseId, is_active: true, granted_at: new Date().toISOString() }
        );
      }
    }
    // Recargar desde DB para confirmar estado real
    await loadStudentModuleAccess(studentId);
  };

  const grantAllCourses = async (studentId: string) => {
    showMsg('success', '⏳ Habilitando todos los módulos...');
    const { error } = await adminInvoke({ student_id: studentId, module_access: { action: 'grant_all_courses' } });
    if (error) {
      // Fallback directo: obtener todos los cursos e insertarlos
      const { data: allCourses } = await supabase.from('courses').select('id').eq('is_published', true);
      if (allCourses) {
        for (const c of allCourses) {
          await supabase.from('student_module_access').upsert(
            { student_id: studentId, course_id: c.id, is_active: true, granted_at: new Date().toISOString() },
            { onConflict: 'student_id,course_id' }
          );
        }
      }
    }
    await loadStudentModuleAccess(studentId);
    showMsg('success', '✅ Todos los módulos habilitados');
  };

  const revokeAllCourses = async (studentId: string) => {
    showMsg('success', '⏳ Deshabilitando todos los módulos...');
    const { error } = await adminInvoke({ student_id: studentId, module_access: { action: 'revoke_all_courses' } });
    // Fallback directo siempre (para cubrir RLS)
    if (error) {
      await supabase.from('student_module_access').update({ is_active: false }).eq('student_id', studentId);
    }
    // Limpiar estado local inmediatamente
    setStudentModuleAccess(prev => ({ ...prev, [studentId]: [] }));
    await loadStudentModuleAccess(studentId);
    showMsg('success', '🔒 Todos los módulos deshabilitados');
  };

  const totalProgress = (s: StudentRow) => {
    const progs = s.progress || [];
    if (!progs.length) return 0;
    const total = progs.reduce((a, p) => a + (p.total_units || 0), 0);
    const done = progs.reduce((a, p) => a + (p.completed_units || 0), 0);
    return total ? Math.round((done / total) * 100) : 0;
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold flex items-center gap-2">
              <Users className="w-6 h-6 text-primary" /> Gestión de Estudiantes
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{students.length} estudiantes registrados</p>
          </div>
          {adminTab === 'students' && (
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Buscar por nombre o correo..." className="pl-10 rounded-xl"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          )}
        </div>

        {/* Admin top tabs */}
        <div className="flex gap-2 mb-6">
          {([
            { id: 'students', icon: <Users className="w-4 h-4" />, label: 'Estudiantes' },
            { id: 'sessions', icon: <Video className="w-4 h-4" />, label: `Sesiones (${sessionRequests.length})` },
          ] as { id: 'students' | 'sessions'; icon: React.ReactNode; label: string }[]).map(t => (
            <button key={t.id} onClick={() => setAdminTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                adminTab === t.id ? 'bg-primary text-primary-foreground shadow' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {adminTab === 'students' && (<>
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {[
            { icon: <Users className="w-5 h-5 text-primary" />, value: students.length, label: 'Total', bg: 'bg-primary/5 border-primary/10' },
            { icon: <TrendingUp className="w-5 h-5 text-green-600" />, value: students.filter(s => s.subscription?.status === 'active' && s.subscription?.plan_slug !== 'free_admin').length, label: 'Activos', bg: 'bg-green-50 border-green-100' },
            { icon: <Calendar className="w-5 h-5 text-blue-600" />, value: students.filter(s => s.subscription?.status === 'trial').length, label: 'En prueba', bg: 'bg-blue-50 border-blue-100' },
            { icon: <Clock className="w-5 h-5 text-red-500" />, value: students.filter(s => s.subscription?.approved_by_admin === false && s.subscription?.account_enabled === false && s.subscription?.status !== 'cancelled').length, label: 'Pendientes', bg: 'bg-red-50 border-red-100' },
            { icon: <Gift className="w-5 h-5 text-violet-600" />, value: students.filter(s => s.subscription?.plan_slug === 'free_admin' && s.subscription?.status === 'active').length, label: 'Gratuitos', bg: 'bg-violet-50 border-violet-100' },
            { icon: <CreditCard className="w-5 h-5 text-amber-600" />, value: `$${students.filter(s => s.subscription?.plan_slug !== 'free_admin').reduce((a, s) => a + (s.subscription?.amount_usd || 0), 0).toFixed(0)} USD`, label: 'Ingresos', bg: 'bg-amber-50 border-amber-100' },
          ].map((s, i) => (
            <div key={i} className={`${s.bg} border rounded-2xl p-4`}>
              <div className="flex justify-center mb-2">{s.icon}</div>
              <p className="text-xl font-extrabold text-center">{s.value}</p>
              <p className="text-xs text-muted-foreground text-center">{s.label}</p>
            </div>
          ))}
        </div>


        {/* Students list */}
        {loading ? (
          <div className="text-center py-20 text-muted-foreground">Cargando estudiantes...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>{search ? 'Sin resultados para esta búsqueda.' : 'Aún no hay estudiantes registrados.'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((student) => {
              const sub = student.subscription;
              const statusStyle = STATUS_LABELS[sub?.status || ''] || { label: 'Sin plan', color: 'bg-gray-100 text-gray-500' };
              const isExpanded = expandedId === student.id;
              const isEditing = editingId === student.id;
              const tab = getTab(student.id);
              const pct = totalProgress(student);
              const isEnabled = student.account_enabled !== false;

              return (
                <motion.div key={student.id} layout className="bg-background border border-border/50 rounded-2xl shadow-sm overflow-hidden">
                  {/* Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5">
                    {/* Avatar + name */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-extrabold text-lg shrink-0">
                        {student.full_name ? student.full_name.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold truncate">{student.full_name || 'Sin nombre'}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {student.email || 'Correo no disponible'}
                        </p>
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
                      <span className={`px-2.5 py-1 rounded-full font-bold ${statusStyle.color}`}>{statusStyle.label}</span>
                      {/* account_enabled badge */}
                      <span className={`px-2.5 py-1 rounded-full font-bold flex items-center gap-1 ${
                        isEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {isEnabled ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                        {isEnabled ? 'Habilitado' : 'Deshabilitado'}
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Award className="w-3.5 h-3.5" />{student.current_level || 'A1'}
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <BookOpen className="w-3.5 h-3.5" />{pct}% completado
                      </span>
                      <span className="text-muted-foreground">
                        {new Date(student.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      {sub && (sub.payment_method === 'pse' || sub.payment_method === 'paypal') && sub.approved_by_admin === false && (
                        <button title="Aprobar pago" onClick={() => setConfirmAction({ open: true, title: '¿Aprobar pago?', msg: `Activará la cuenta de ${student.full_name}.`, fn: async () => approvePayment(student.id) })}
                          className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 font-bold px-2 py-1 rounded-full hover:bg-amber-200 transition-colors">
                          <AlertCircle className="w-3 h-3" /> Aprobar
                        </button>
                      )}
                      <Button size="sm" variant="outline" className="rounded-xl text-xs h-8 gap-1.5" onClick={() => startEdit(student)}>
                        <Edit2 className="w-3.5 h-3.5" /> Editar
                      </Button>
                      {student.email && (
                        <Button size="sm" variant="outline"
                          className={`rounded-xl text-xs h-8 gap-1.5 ${ resetSent === student.id ? 'border-green-400 text-green-600' : 'border-amber-300 text-amber-600 hover:bg-amber-50'}`}
                          onClick={() => sendPasswordReset(student.email!, student.id)}
                          disabled={resetting === student.id || resetSent === student.id}
                          title="Enviar enlace de cambio de contraseña">
                          {resetSent === student.id ? <><Check className="w-3.5 h-3.5" /> Enviado</> : resetting === student.id ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Enviando...</> : <><KeyRound className="w-3.5 h-3.5" /> Reset pwd</>}
                        </Button>
                      )}
                      <button title={student.account_enabled !== false ? 'Deshabilitar cuenta' : 'Habilitar cuenta'}
                        onClick={() => setConfirmAction({ open: true, title: student.account_enabled !== false ? '¿Deshabilitar?' : '¿Habilitar?', msg: student.account_enabled !== false ? `Bloqueará a ${student.full_name}.` : `Restaurará a ${student.full_name}.`, fn: async () => toggleAccountEnabled(student.id, student.account_enabled === false) })}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                        {student.account_enabled !== false ? <Lock className="w-4 h-4 text-amber-500" /> : <Unlock className="w-4 h-4 text-green-500" />}
                      </button>
                      <button title="Eliminar cuenta"
                        onClick={() => setConfirmAction({ open: true, title: '¿Eliminar cuenta?', msg: `Eliminará permanentemente a ${student.full_name}. Acción irreversible.`, fn: async () => deleteAccount(student.id) })}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setExpandedId(isExpanded ? null : student.id)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded: Edit OR Details */}
                  {isExpanded && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="border-t border-border/30">
                      {isEditing ? (
                        /* ── EDIT FORM ── */
                        <div className="p-5 bg-muted/20 space-y-5">
                          {/* Header */}
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-sm flex items-center gap-2 text-primary">
                              <Edit2 className="w-4 h-4" /> Editar información del estudiante
                            </h3>
                            <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Section: Datos de acceso */}
                          <div className="space-y-3">
                            <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Correo electrónico (actualiza login)</p>
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                              <div className="flex gap-2">
                                <Input
                                  type="email"
                                  value={editForm.email}
                                  onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
                                  placeholder="correo@ejemplo.com"
                                  className="rounded-xl text-sm flex-1"
                                />
                                <Button size="sm" onClick={() => saveEmail(student.id)} disabled={savingEmail}
                                  className="rounded-xl text-xs gap-1 shrink-0 bg-amber-500 hover:bg-amber-600 text-white border-0">
                                  {savingEmail ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> : <Check className="w-3.5 h-3.5" />}
                                  Guardar correo
                                </Button>
                              </div>
                              {emailSaveMsg && <p className="text-xs font-semibold">{emailSaveMsg}</p>}
                            </div>
                          </div>

                          {/* Section: Datos personales */}
                          <div className="space-y-3">
                            <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Datos personales</p>
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Nombre completo</Label>
                                <Input value={editForm.full_name} onChange={e => setEditForm(p => ({ ...p, full_name: e.target.value }))} placeholder="Nombre completo" className="rounded-xl text-sm" />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium flex items-center gap-1"><Phone className="w-3 h-3" /> Teléfono / WhatsApp</Label>
                                <Input value={editForm.phone} onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))} placeholder="+57 300..." className="rounded-xl text-sm" />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium flex items-center gap-1"><Calendar className="w-3 h-3" /> Fecha de nacimiento</Label>
                                <Input type="date" value={editForm.birthday} onChange={e => setEditForm(p => ({ ...p, birthday: e.target.value }))} className="rounded-xl text-sm" />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">País</Label>
                                <Input value={editForm.country} onChange={e => setEditForm(p => ({ ...p, country: e.target.value }))} placeholder="Colombia" className="rounded-xl text-sm" />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Ciudad</Label>
                                <Input value={editForm.city} onChange={e => setEditForm(p => ({ ...p, city: e.target.value }))} placeholder="Bogotá" className="rounded-xl text-sm" />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs font-medium flex items-center gap-1"><Award className="w-3 h-3" /> Nivel inglés</Label>
                                <select value={editForm.english_level} onChange={e => setEditForm(p => ({ ...p, english_level: e.target.value }))}
                                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:ring-2 focus:ring-primary/30 outline-none">
                                  <option value="">— Sin asignar —</option>
                                  {['A1', 'A2', 'B1', 'B2', 'C1'].map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 pt-2 border-t border-border/30">
                            <Button size="sm" onClick={saveEdit} disabled={saving} className="rounded-xl text-xs gap-1.5 bg-primary text-primary-foreground">
                              <Check className="w-3.5 h-3.5" /> {saving ? 'Guardando...' : 'Guardar cambios'}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="rounded-xl text-xs gap-1.5">
                              <X className="w-3.5 h-3.5" /> Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* ── DETAIL TABS ── */
                        <div className="p-5">
                          {/* Tab bar */}
                          <div className="flex flex-wrap gap-2 mb-5 border-b border-border/30 pb-3">
                            {([
                              { id: 'info',     label: '👤 Información' },
                              { id: 'progreso', label: '📊 Progreso' },
                              { id: 'pagos',    label: '💳 Pagos' },
                              { id: 'cuenta',   label: '⚙️ Cuenta' },
                              { id: 'modulos',  label: '📚 Módulos' },
                            ] as { id: 'info'|'progreso'|'pagos'|'cuenta'|'modulos'; label: string }[]).map(t => (
                              <button key={t.id} onClick={() => {
                                setTab(student.id, t.id);
                                if (t.id === 'modulos') loadStudentModuleAccess(student.id);
                                if (t.id === 'pagos') loadPaymentHistory(student.id);
                              }}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                                  tab === t.id
                                    ? t.id === 'cuenta'
                                      ? 'bg-violet-600 text-white shadow border-violet-600'
                                      : t.id === 'modulos'
                                      ? 'bg-emerald-600 text-white shadow border-emerald-600'
                                      : 'bg-primary text-primary-foreground shadow border-primary'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-muted border-border/50'
                                }`}>
                                {t.label}
                              </button>
                            ))}
                          </div>

                          {/* TAB: INFO */}
                          {tab === 'info' && (
                            <div className="space-y-4">
                              <div className="grid sm:grid-cols-3 gap-3 text-sm">
                                {[
                                  { icon: <Mail className="w-4 h-4 text-primary" />, label: 'Correo', value: student.email || 'N/A' },
                                  { icon: <Phone className="w-4 h-4 text-primary" />, label: 'Teléfono', value: student.phone || 'No registrado' },
                                  { icon: <Award className="w-4 h-4 text-primary" />, label: 'Nivel inglés', value: student.english_level || student.current_level || '—' },
                                  { icon: <Calendar className="w-4 h-4 text-primary" />, label: 'Registrado', value: new Date(student.created_at).toLocaleDateString('es-CO') },
                                  { icon: <CreditCard className="w-4 h-4 text-primary" />, label: 'Plan', value: sub?.plan_name || 'Sin plan' },
                                  { icon: <TrendingUp className="w-4 h-4 text-primary" />, label: 'Estado', value: statusStyle.label },
                                ].map((item, i) => (
                                  <div key={i} className="bg-muted/30 rounded-xl p-3 border border-border/30">
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                                      {item.icon} {item.label}
                                    </div>
                                    <p className="font-semibold text-sm truncate">{item.value}</p>
                                  </div>
                                ))}
                              </div>

                              {/* Extended personal info */}
                              <div className="bg-blue-50/50 border border-blue-200/50 rounded-xl p-4">
                                <p className="text-xs font-bold text-blue-700 mb-3">📋 Información Personal Extendida</p>
                                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                                  <div>
                                    <p className="text-xs text-muted-foreground">Fecha de nacimiento</p>
                                    <p className="font-semibold">
                                      {student.birthday
                                        ? `${new Date(student.birthday).toLocaleDateString('es-CO')} (${calcAge(student.birthday)} años)`
                                        : '—'}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Nivel educativo</p>
                                    <p className="font-semibold">
                                      {student.education_level
                                        ? (EDUCATION_LABELS[student.education_level] || student.education_level)
                                        : '—'}
                                      {student.education_level === 'other' && student.education_other && ` (${student.education_other})`}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">País / Ciudad</p>
                                    <p className="font-semibold">
                                      {[student.country, student.city].filter(Boolean).join(', ') || '—'}
                                    </p>
                                  </div>
                                  {student.bio && (
                                    <div className="sm:col-span-2 lg:col-span-3">
                                      <p className="text-xs text-muted-foreground">Bio</p>
                                      <p className="text-sm">{student.bio}</p>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Statistics */}
                              <div className="bg-purple-50/50 border border-purple-200/50 rounded-xl p-4">
                                <p className="text-xs font-bold text-purple-700 mb-3">📊 Estadísticas del estudiante</p>
                                <div className="grid grid-cols-3 gap-3">
                                  <div className="text-center">
                                    <p className="text-2xl font-black text-purple-600">{student.unit_completions_count || 0}</p>
                                    <p className="text-xs text-muted-foreground">Unidades completadas</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-2xl font-black text-blue-600">{pct}%</p>
                                    <p className="text-xs text-muted-foreground">Progreso total</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-2xl font-black text-emerald-600">{student.english_level || '—'}</p>
                                    <p className="text-xs text-muted-foreground">Nivel asignado</p>
                                  </div>
                                </div>
                                {student.is_admin_only && (
                                  <div className="mt-2 text-center">
                                    <span className="text-xs bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">👑 Cuenta de administrador</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* TAB: PROGRESS */}
                          {tab === 'progreso' && (
                            <div>
                              {!student.progress?.length ? (
                                <div className="text-center py-8 text-muted-foreground text-sm">
                                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                  Este estudiante aún no ha registrado progreso.
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {student.progress.map((p, i) => {
                                    const prog = p.total_units ? Math.round((p.completed_units / p.total_units) * 100) : 0;
                                    return (
                                      <div key={i} className="bg-muted/20 rounded-xl p-4 border border-border/30">
                                        <div className="flex items-center justify-between mb-2">
                                          <p className="font-semibold text-sm capitalize">{p.course_slug.replace(/_/g, ' ')}</p>
                                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                            <span className="flex items-center gap-1"><Flame className="w-3.5 h-3.5 text-orange-500" />{p.streak_days} días</span>
                                            <span className="flex items-center gap-1"><Award className="w-3.5 h-3.5 text-amber-500" />{p.total_points} pts</span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <div className="flex-1 bg-muted rounded-full h-2">
                                            <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${prog}%` }} />
                                          </div>
                                          <span className="text-xs font-bold text-primary">{prog}%</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">{p.completed_units} de {p.total_units} unidades</p>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                          {/* TAB: PAYMENTS */}
                          {tab === 'pagos' && (() => {
                            const af = getActivationForm(student.id);
                            const activationDateObj = af.activationDate ? new Date(af.activationDate + 'T12:00:00') : new Date();
                            const nextMonth = new Date(activationDateObj);
                            nextMonth.setMonth(nextMonth.getMonth() + 1);
                            const fmtD = (d: Date) => d.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
                            return (
                            <div className="space-y-4">

                              {/* ══ 1. ESTADO ACTUAL ══ */}
                              {/* Banner verde si está activo y pagado */}
                              {sub && sub.status === 'active' && sub.approved_by_admin === true && (
                                <div className="rounded-2xl bg-green-50 border-2 border-green-400 px-5 py-4 flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                                    <ShieldCheck className="w-5 h-5 text-white" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-extrabold text-green-800 text-sm">✅ Plan activo</p>
                                    <p className="text-xs text-green-700 mt-0.5">
                                      ${sub.amount_usd} USD/mes · {sub.payment_method?.toUpperCase()} · Vence: <strong>{sub.current_period_end ? fmtD(new Date(sub.current_period_end)) : '—'}</strong>
                                    </p>
                                  </div>
                                  <span className="text-xs font-bold text-green-600 bg-green-100 px-3 py-1 rounded-full border border-green-300">ACTIVO</span>
                                </div>
                              )}
                              {/* Banner naranja si pendiente de verificación */}
                              {(!sub || sub.approved_by_admin === false) && (
                                <div className="rounded-2xl bg-amber-50 border-2 border-amber-300 px-5 py-4 flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center shrink-0 text-lg">⏳</div>
                                  <div className="flex-1">
                                    <p className="font-extrabold text-amber-800 text-sm">Pendiente de pago</p>
                                    <p className="text-xs text-amber-700 mt-0.5">Verifica el comprobante y usa el formulario de abajo para activar el plan.</p>
                                  </div>
                                  <span className="text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">PENDIENTE</span>
                                </div>
                              )}
                              {/* Tarjetas de datos */}
                              <div className="rounded-2xl border border-border/50 bg-muted/20 overflow-hidden">
                                <div className="bg-muted/40 px-4 py-2.5 border-b border-border/40 flex items-center gap-2">
                                  <CreditCard className="w-4 h-4 text-primary" />
                                  <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Detalle de la suscripción</p>
                                </div>
                                <div className="p-4 grid grid-cols-2 gap-3">
                                  {[
                                    { label: 'Estado', value: !sub ? <span className="text-muted-foreground text-xs">Sin suscripción</span> : <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${statusStyle.color}`}>{statusStyle.label}</span> },
                                    { label: 'Pago', value: (!sub || sub.approved_by_admin === false) ? <span className="text-amber-600 font-bold text-xs">⏳ Pendiente</span> : <span className="text-green-600 font-bold text-xs">✅ Verificado</span> },
                                    { label: 'Monto', value: sub ? `$${sub.amount_usd} USD/mes` : '—' },
                                    { label: 'Método', value: sub?.payment_method?.toUpperCase() || '—' },
                                    { label: 'Fecha de activación', value: sub?.created_at ? fmtD(new Date(sub.created_at)) : '—' },
                                    { label: 'Próximo cobro / vence', value: sub?.current_period_end ? fmtD(new Date(sub.current_period_end)) : '—' },
                                  ].map((item, i) => (
                                    <div key={i} className="bg-background rounded-xl p-3 border border-border/30">
                                      <p className="text-[11px] text-muted-foreground mb-0.5">{item.label}</p>
                                      <div className="font-semibold text-sm">{item.value}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* ══ 2. FORMULARIO ACTIVAR PLAN ══ */}
                              <div className="rounded-2xl border-2 border-primary/30 overflow-hidden">
                                <div className={`px-4 py-3 flex items-center gap-2 ${
                                  sub && sub.status === 'active' && sub.approved_by_admin === true
                                    ? 'bg-blue-600'
                                    : 'bg-primary'
                                }`}>
                                  <ShieldCheck className="w-4 h-4 text-white" />
                                  <p className="font-bold text-white text-sm">
                                    {sub && sub.status === 'active' && sub.approved_by_admin === true
                                      ? '🔄 Registrar siguiente pago mensual'
                                      : '✅ Habilitar plan (se confirmó el pago)'}
                                  </p>
                                </div>
                                <div className="p-5 space-y-4">

                                  {/* Fecha de activación y próximo cobro */}
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">📅 Fecha de activación del plan</Label>
                                      <Input
                                        type="date"
                                        value={af.activationDate}
                                        onChange={e => setActivationField(student.id, 'activationDate', e.target.value)}
                                        className="rounded-xl text-sm h-9"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">📆 Próximo cobro (+1 mes automático)</Label>
                                      <div className="h-9 rounded-xl border border-border/50 bg-muted/40 flex items-center px-3 text-sm font-semibold text-muted-foreground">
                                        {fmtD(nextMonth)}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Monto y método */}
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">💰 Monto cobrado (USD)</Label>
                                      <Input
                                        type="number"
                                        value={af.amount}
                                        onChange={e => setActivationField(student.id, 'amount', e.target.value)}
                                        className="rounded-xl text-sm h-9"
                                        min="0" step="0.01"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">💳 Método de pago</Label>
                                      <select
                                        value={af.method}
                                        onChange={e => setActivationField(student.id, 'method', e.target.value)}
                                        className="w-full h-9 rounded-xl border border-input bg-background px-3 text-sm"
                                      >
                                        <option value="paypal">PayPal</option>
                                        <option value="pse">PSE</option>
                                        <option value="transferencia">Transferencia</option>
                                        <option value="efectivo">Efectivo</option>
                                      </select>
                                    </div>
                                  </div>

                                  {/* Nivel de acceso */}
                                  <div>
                                    <Label className="text-xs font-semibold text-muted-foreground mb-2 block">📚 Unidades a habilitar</Label>
                                    <div className="flex flex-wrap gap-2">
                                      {LEVEL_OPTIONS.map(lvl => (
                                        <button
                                          key={lvl}
                                          type="button"
                                          onClick={() => setActivationField(student.id, 'level', lvl)}
                                          className={`px-4 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
                                            af.level === lvl
                                              ? lvl === 'Ninguna'
                                                ? 'bg-orange-500 text-white border-orange-500'
                                                : 'bg-primary text-white border-primary'
                                              : lvl === 'Ninguna'
                                                ? 'bg-background border-orange-300 text-orange-600 hover:border-orange-500'
                                                : 'bg-background border-border/50 text-muted-foreground hover:border-primary/50'
                                          }`}
                                        >
                                          {lvl === 'Todas' ? '🌟 Todas las unidades' : lvl === 'Ninguna' ? '🧪 Ninguna (Examen)' : `📖 Solo ${lvl}`}
                                        </button>
                                      ))}
                                    </div>
                                    <p className="text-[11px] mt-1.5 text-muted-foreground">
                                      {af.level === 'Todas'
                                        ? 'El estudiante tendrá acceso completo a todos los cursos.'
                                        : af.level === 'Ninguna'
                                          ? '⚠️ No se habilita ningún módulo. El estudiante verá aviso para tomar el examen de inglés; el admin asignará el nivel después.'
                                          : `Solo se habilitará el nivel ${af.level}. Los demás quedarán bloqueados.`}
                                    </p>
                                  </div>

                                  {/* Notas */}
                                  <div>
                                    <Label className="text-xs font-semibold text-muted-foreground mb-1.5 block">📝 Notas (opcional)</Label>
                                    <Input
                                      placeholder="Ej: Comprobante verificado vía email..."
                                      value={af.notes}
                                      onChange={e => setActivationField(student.id, 'notes', e.target.value)}
                                      className="rounded-xl text-sm h-9"
                                    />
                                  </div>

                                  {/* Resumen */}
                                  {(() => {
                                    const isRenewal = sub && sub.status === 'active' && sub.approved_by_admin === true;
                                    return (
                                      <div className={`border rounded-xl p-3 text-xs space-y-1 ${
                                        isRenewal ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'
                                      }`}>
                                        <p className={`font-bold mb-1 ${ isRenewal ? 'text-blue-800' : 'text-green-800'}`}>
                                          {isRenewal ? '🔄 Resumen del siguiente pago:' : '✅ Resumen de activación:'}
                                        </p>
                                        <p className={isRenewal ? 'text-blue-700' : 'text-green-700'}>
                                          • {isRenewal ? 'Fecha del pago' : 'Activación'}: <strong>{fmtD(activationDateObj)}</strong>
                                        </p>
                                        <p className={isRenewal ? 'text-blue-700' : 'text-green-700'}>
                                          • Monto: <strong>${af.amount} USD</strong> vía <strong>{af.method.toUpperCase()}</strong>
                                        </p>
                                        <p className={isRenewal ? 'text-blue-700' : 'text-green-700'}>
                                          • Siguiente cobro: <strong>{fmtD(nextMonth)}</strong>
                                        </p>
                                        <p className={isRenewal ? 'text-blue-700' : 'text-green-700'}>
                                          • Acceso: <strong>{af.level === 'Todas' ? 'Todos los cursos' : af.level === 'Ninguna' ? '🧪 Ninguna (requiere examen)' : `Solo nivel ${af.level}`}</strong>
                                        </p>
                                      </div>
                                    );
                                  })()}

                                  {(() => {
                                    const isRenewal = sub && sub.status === 'active' && sub.approved_by_admin === true;
                                    return (
                                      <Button
                                        className={`w-full rounded-xl font-bold text-white gap-2 h-11 text-sm ${
                                          isRenewal ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'
                                        }`}
                                        disabled={activating === student.id}
                                        onClick={() => setConfirmAction({
                                          open: true,
                                          title: isRenewal
                                            ? `¿Registrar pago de ${student.full_name}?`
                                            : `¿Activar plan de ${student.full_name}?`,
                                          msg: `${isRenewal ? 'Pago' : 'Plan desde'} ${fmtD(activationDateObj)} · $${af.amount} USD · ${af.method.toUpperCase()} · Acceso: ${af.level === 'Todas' ? 'todos los cursos' : af.level === 'Ninguna' ? 'ninguno (examen pendiente)' : 'nivel ' + af.level} · Siguiente cobro: ${fmtD(nextMonth)}`,
                                          fn: async () => activatePlanManual(student.id),
                                        })}
                                      >
                                        {activating === student.id
                                          ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando...</span>
                                          : isRenewal
                                            ? <><History className="w-4 h-4" /> Guardar pago del mes ✅</>
                                            : <><ShieldCheck className="w-4 h-4" /> Guardar y activar plan ✅</>
                                        }
                                      </Button>
                                    );
                                  })()}
                                </div>
                              </div>

                              {/* ══ 3. OTRAS ACCIONES ══ */}
                              <div className="bg-muted/20 rounded-xl p-4 border border-border/30 space-y-3">
                                <p className="text-xs font-semibold text-muted-foreground">Otras acciones:</p>
                                <div className="flex flex-wrap gap-2">
                                  {(['trial','active','cancelled','expired'] as const).map(status => (
                                    <Button key={status} size="sm" variant={sub?.status === status ? 'default' : 'outline'}
                                      className="rounded-xl text-xs h-7"
                                      onClick={() => changeStatus(student.id, status)}>
                                      {STATUS_LABELS[status]?.label || status}
                                    </Button>
                                  ))}
                                </div>
                                <div className="flex flex-wrap gap-2 pt-2 border-t border-border/30">
                                  {student.account_enabled !== false ? (
                                    <Button size="sm" variant="outline" className="rounded-xl text-xs h-7 border-amber-300 text-amber-600 hover:bg-amber-50 gap-1"
                                      onClick={() => setConfirmAction({ open: true, title: '¿Deshabilitar cuenta?', msg: `Bloqueará a ${student.full_name}.`, fn: () => toggleAccountEnabled(student.id, false) })}>
                                      <Lock className="w-3 h-3" /> Deshabilitar
                                    </Button>
                                  ) : (
                                    <Button size="sm" variant="outline" className="rounded-xl text-xs h-7 border-green-400 text-green-600 hover:bg-green-50 gap-1"
                                      onClick={() => setConfirmAction({ open: true, title: '¿Habilitar cuenta?', msg: `Restaurará a ${student.full_name}.`, fn: () => toggleAccountEnabled(student.id, true) })}>
                                      <Unlock className="w-3 h-3" /> Habilitar
                                    </Button>
                                  )}
                                  <Button size="sm" variant="outline" className="rounded-xl text-xs h-7 border-red-300 text-red-500 hover:bg-red-50 gap-1"
                                    onClick={() => setConfirmAction({ open: true, title: '¿Cancelar suscripción?', msg: `Marcará como cancelada la suscripción de ${student.full_name}.`, fn: () => cancelSubscription(student.id) })}>
                                    <ShieldX className="w-3 h-3" /> Cancelar suscripción
                                  </Button>
                                  <Button size="sm" variant="outline" className="rounded-xl text-xs h-7 border-red-400 text-red-600 hover:bg-red-50 gap-1"
                                    onClick={() => setConfirmAction({ open: true, title: '¿Eliminar cuenta?', msg: `Eliminará permanentemente a ${student.full_name}.`, fn: () => deleteAccount(student.id) })}>
                                    <Trash2 className="w-3 h-3" /> Eliminar cuenta
                                  </Button>
                                </div>
                              </div>

                              {/* ── Payment History ── */}
                              {(() => {
                                const hist = studentPayHistory[student.id] || [];
                                return (
                                  <div className="bg-muted/20 border border-border/40 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                      <History className="w-3.5 h-3.5 text-primary" />
                                      <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider">Historial de pagos</p>
                                    </div>
                                    {hist.length === 0 ? (
                                      <p className="text-xs text-muted-foreground text-center py-3">Sin historial disponible</p>
                                    ) : (
                                      <div className="space-y-1.5">
                                        {hist.map(item => (
                                          <div key={item.id} className="flex items-center justify-between p-2.5 rounded-lg bg-background border border-border/30">
                                            <div className="flex items-center gap-2">
                                              <span className="text-base">
                                                {item.event_type === 'payment_approved' ? '✅' :
                                                 item.event_type === 'payment_pending' ? '⏳' :
                                                 item.event_type === 'cancelled' ? '❌' :
                                                 item.event_type === 'subscription_created' ? '📋' : '📝'}
                                              </span>
                                              <div>
                                                <p className="text-xs font-semibold">
                                                  {item.event_type === 'payment_approved' ? 'Pago aprobado' :
                                                   item.event_type === 'payment_pending' ? 'Pago en revisión' :
                                                   item.event_type === 'cancelled' ? 'Cancelado' :
                                                   item.event_type === 'subscription_created' ? 'Suscripción creada' :
                                                   item.event_type.replace(/_/g, ' ')}
                                                </p>
                                                <p className="text-[11px] text-muted-foreground">
                                                  {new Date(item.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                  {item.payment_method && item.payment_method !== 'none' && ` · ${item.payment_method.toUpperCase()}`}
                                                  {item.notes && ` · ${item.notes}`}
                                                </p>
                                              </div>
                                            </div>
                                            {item.amount_usd > 0 && (
                                              <span className="text-xs font-bold text-green-600">${item.amount_usd} USD</span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                            );
                          })()}

                          {/* ─────────────────────────── TAB: CUENTA ─────────────────────────── */}
                          {tab === 'cuenta' && (
                            <div className="space-y-5">

                              {/* Mini header */}
                              <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-2xl p-5">
                                <div className="flex items-center gap-3 mb-3">
                                  <div className="w-10 h-10 rounded-full bg-violet-600 text-white flex items-center justify-center font-extrabold text-base shrink-0">
                                    {student.full_name?.charAt(0).toUpperCase() || '?'}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-extrabold text-base truncate">{student.full_name}</p>
                                    <p className="text-xs text-muted-foreground truncate">{student.email || '—'}</p>
                                  </div>
                                  <div className="flex flex-col items-end gap-1 shrink-0">
                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusStyle.color}`}>
                                      {statusStyle.label}
                                    </span>
                                    {student.account_enabled === false && (
                                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700">🔒 Bloqueado</span>
                                    )}
                                  </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                  <div className="bg-white/70 rounded-lg p-2">
                                    <p className="font-extrabold text-violet-700">{student.english_level || '—'}</p>
                                    <p className="text-muted-foreground">Nivel</p>
                                  </div>
                                  <div className="bg-white/70 rounded-lg p-2">
                                    <p className="font-extrabold text-violet-700 truncate">{sub?.plan_name || '—'}</p>
                                    <p className="text-muted-foreground">Plan</p>
                                  </div>
                                  <div className="bg-white/70 rounded-lg p-2">
                                    <p className="font-extrabold text-violet-700 uppercase">{sub?.payment_method || '—'}</p>
                                    <p className="text-muted-foreground">Pago</p>
                                  </div>
                                </div>
                              </div>

                              {/* Acciones */}
                              <div className="space-y-3">
                                <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider">Acciones de cuenta</p>

                                {/* ── NO COBRAR / COBRAR ── */}
                                {sub?.plan_slug === 'free_admin' && sub?.status === 'active' ? (
                                  <div className="flex items-start gap-3 bg-violet-50 border-2 border-violet-300 rounded-xl p-4">
                                    <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
                                      <Gift className="w-4 h-4 text-violet-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-bold text-sm text-violet-900">🎁 Acceso gratuito activo</p>
                                      <p className="text-xs text-violet-700 mt-0.5">Sin cobro hasta que decidas cambiarlo. El estudiante ve "Sin pagos pendientes" en su panel.</p>
                                    </div>
                                    <Button size="sm"
                                      className="rounded-xl text-xs shrink-0 bg-amber-500 hover:bg-amber-600 text-white border-0 gap-1"
                                      onClick={() => setConfirmAction({
                                        open: true,
                                        title: '💳 ¿Volver a cobrar?',
                                        msg: `${student.full_name} pasará a estado pendiente de pago. Deberá pagar para seguir accediendo.`,
                                        fn: () => setFreeAccount(student.id, false),
                                      })}>
                                      <CreditCard className="w-3 h-3" /> Cobrar
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-start gap-3 bg-violet-50 border border-violet-200 rounded-xl p-4">
                                    <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
                                      <Gift className="w-4 h-4 text-violet-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-bold text-sm text-violet-900">No cobrar / Habilitar gratis 🎁</p>
                                      <p className="text-xs text-violet-700 mt-0.5">Acceso permanente sin pago. Puedes revertirlo cuando quieras con el botón "Cobrar".</p>
                                    </div>
                                    <Button size="sm"
                                      className="rounded-xl text-xs shrink-0 bg-violet-600 hover:bg-violet-700 text-white border-0 gap-1"
                                      onClick={() => setConfirmAction({
                                        open: true,
                                        title: '🎁 ¿Activar acceso gratuito?',
                                        msg: `${student.full_name} tendrá acceso permanente sin cobrar. Puedes revertirlo en cualquier momento.`,
                                        fn: () => setFreeAccount(student.id, true),
                                      })}>
                                      <Gift className="w-3 h-3" /> No cobrar
                                    </Button>
                                  </div>
                                )}

                                {/* Habilitar acceso al curso */}

                                <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
                                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                                    <Unlock className="w-4 h-4 text-green-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm text-green-900">Habilitar acceso al curso</p>
                                    <p className="text-xs text-green-700 mt-0.5">Activa la cuenta y aprueba el pago. El estudiante podrá ingresar desde su dashboard.</p>
                                  </div>
                                  <Button size="sm"
                                    className="rounded-xl text-xs shrink-0 bg-green-600 hover:bg-green-700 text-white border-0 gap-1"
                                    onClick={() => setConfirmAction({
                                      open: true,
                                      title: '✅ ¿Habilitar acceso al curso?',
                                      msg: `Se activará la cuenta de ${student.full_name} con acceso completo al curso.`,
                                      fn: () => approvePayment(student.id),
                                    })}>
                                    <Unlock className="w-3 h-3" /> Habilitar
                                  </Button>
                                </div>

                                {/* Deshabilitar cuenta */}
                                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                                    <Lock className="w-4 h-4 text-amber-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm text-amber-900">Deshabilitar cuenta</p>
                                    <p className="text-xs text-amber-700 mt-0.5">Bloquea el acceso al curso sin eliminar datos. Útil si el estudiante no ha pagado o su pago venció.</p>
                                  </div>
                                  <Button size="sm" variant="outline"
                                    className="rounded-xl text-xs shrink-0 border-amber-400 text-amber-700 hover:bg-amber-100 gap-1"
                                    onClick={() => setConfirmAction({
                                      open: true,
                                      title: '🔒 ¿Deshabilitar cuenta?',
                                      msg: `${student.full_name} perderá acceso al curso. Sus datos se conservan.`,
                                      fn: () => toggleAccountEnabled(student.id, false),
                                    })}>
                                    <Lock className="w-3 h-3" /> Deshabilitar
                                  </Button>
                                </div>

                                {/* Cancelar plan */}
                                <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-xl p-4">
                                  <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center shrink-0 mt-0.5">
                                    <ShieldX className="w-4 h-4 text-orange-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm text-orange-900">Cancelar plan / suscripción</p>
                                    <p className="text-xs text-orange-700 mt-0.5">Marca la suscripción como cancelada y bloquea el acceso. El historial de pagos se conserva.</p>
                                  </div>
                                  <Button size="sm" variant="outline"
                                    className="rounded-xl text-xs shrink-0 border-orange-400 text-orange-700 hover:bg-orange-50 gap-1"
                                    onClick={() => setConfirmAction({
                                      open: true,
                                      title: '⚠️ ¿Cancelar suscripción?',
                                      msg: `La suscripción de ${student.full_name} se marcará como cancelada y perderá acceso.`,
                                      fn: () => cancelSubscription(student.id),
                                    })}>
                                    <ShieldX className="w-3 h-3" /> Cancelar plan
                                  </Button>
                                </div>

                                {/* ── EXAMEN DE INGLÉS ── */}
                                {(() => {
                                  const hasExamPending = student.onboarding_step === 'english_test';
                                  return (
                                    <div className={`flex items-start gap-3 rounded-xl p-4 border ${
                                      hasExamPending
                                        ? 'bg-orange-50 border-orange-300'
                                        : 'bg-sky-50 border-sky-200'
                                    }`}>
                                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                        hasExamPending ? 'bg-orange-100' : 'bg-sky-100'
                                      }`}>
                                        <span className="text-base">🎓</span>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className={`font-bold text-sm ${hasExamPending ? 'text-orange-900' : 'text-sky-900'}`}>
                                          Examen de inglés
                                          {hasExamPending && (
                                            <span className="ml-2 text-xs font-bold bg-orange-200 text-orange-800 px-2 py-0.5 rounded-full">⏳ Pendiente</span>
                                          )}
                                        </p>
                                        <p className={`text-xs mt-0.5 ${hasExamPending ? 'text-orange-700' : 'text-sky-700'}`}>
                                          {hasExamPending
                                            ? `${student.full_name} verá el examen en su panel. Al completarlo, el sistema le asigna el nivel y acceso automáticamente.`
                                            : `Habilita el examen para que ${student.full_name} lo tome y el sistema configure su nivel de acceso automáticamente.`
                                          }
                                        </p>
                                        {hasExamPending && student.english_level && (
                                          <p className="text-xs text-orange-600 mt-1 font-medium">Nivel actual: {student.english_level}</p>
                                        )}
                                      </div>
                                      <div className="shrink-0 flex flex-col gap-1.5">
                                        {hasExamPending ? (
                                          <Button size="sm" variant="outline"
                                            className="rounded-xl text-xs border-orange-400 text-orange-700 hover:bg-orange-100 gap-1 whitespace-nowrap"
                                            onClick={() => setConfirmAction({
                                              open: true,
                                              title: '¿Desactivar examen?',
                                              msg: `${student.full_name} mantendrá su nivel actual (${student.english_level || 'sin nivel'}) y no verá la pantalla del examen.`,
                                              fn: () => toggleEnglishExam(student.id, false),
                                            })}>
                                            ✖ Desactivar examen
                                          </Button>
                                        ) : (
                                          <Button size="sm"
                                            className="rounded-xl text-xs bg-sky-600 hover:bg-sky-700 text-white border-0 gap-1 whitespace-nowrap"
                                            onClick={() => setConfirmAction({
                                              open: true,
                                              title: '🎓 ¿Habilitar examen de inglés?',
                                              msg: `${student.full_name} verá una pantalla de examen en su Dashboard. Al completarlo, el sistema asignará su nivel y habilitará los cursos correspondientes automáticamente.`,
                                              fn: () => toggleEnglishExam(student.id, true),
                                            })}>
                                            🎓 Habilitar examen
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* Eliminar cuenta */}
                                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm text-red-900">Eliminar cuenta permanentemente</p>
                                    <p className="text-xs text-red-700 mt-0.5">Borra perfil, suscripción y solicitudes de sesión. <strong>Esta acción no se puede deshacer.</strong></p>
                                  </div>
                                  <Button size="sm" variant="outline"
                                    className="rounded-xl text-xs shrink-0 border-red-500 text-red-700 hover:bg-red-100 gap-1"
                                    onClick={() => setConfirmAction({
                                      open: true,
                                      title: '🗑️ ¿Eliminar cuenta?',
                                      msg: `IRREVERSIBLE. Se eliminarán todos los datos de ${student.full_name} incluyendo historial y suscripción.`,
                                      fn: async () => deleteAccount(student.id)
                                    })}>
                                    <Trash2 className="w-3 h-3" /> Eliminar
                                  </Button>
                                </div>
                              </div>

                              {/* Estado actual resumido */}
                              <div className="bg-muted/30 border border-border/40 rounded-xl p-4">
                                <p className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider mb-2">Estado actual</p>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <p className="text-xs text-muted-foreground">Acceso al curso</p>
                                    <p className="font-bold">
                                      {student.account_enabled === false
                                        ? <span className="text-red-600">🔒 Bloqueado</span>
                                        : <span className="text-green-600">✅ Activo</span>}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Suscripción</p>
                                    <p className={`font-bold ${sub?.plan_slug === 'free_admin' && sub?.status === 'active' ? 'text-violet-600' : statusStyle.color}`}>
                                      {sub?.plan_slug === 'free_admin' && sub?.status === 'active'
                                        ? '🎁 Gratuito (admin)'
                                        : statusStyle.label}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Cobro</p>
                                    <p className="font-bold">
                                      {sub?.plan_slug === 'free_admin' && sub?.status === 'active'
                                        ? <span className="text-violet-600">🎁 Sin cobrar</span>
                                        : sub?.approved_by_admin
                                        ? <span className="text-green-600">✅ Aprobado</span>
                                        : <span className="text-amber-600">⏳ Pendiente</span>}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Método de pago</p>
                                    <p className="font-bold uppercase">
                                      {sub?.plan_slug === 'free_admin' ? <span className="text-violet-600 normal-case">Gratuito 🎁</span> : (sub?.payment_method || '—')}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Examen de inglés</p>
                                    <p className="font-bold">
                                      {student.onboarding_step === 'english_test'
                                        ? <span className="text-orange-600">⏳ Pendiente</span>
                                        : student.english_level
                                        ? <span className="text-green-600">✅ {student.english_level}</span>
                                        : <span className="text-muted-foreground">— Sin asignar</span>}
                                    </p>
                                  </div>
                                </div>
                              </div>

                            </div>
                          )}

                          {/* ─────────────────────────── TAB: MÓDULOS ─────────────────────────── */}
                          {tab === 'modulos' && (
                            <div className="space-y-4">
              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-bold text-base">📚 Acceso a módulos y unidades</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">Habilita o deshabilita cursos específicos. Los cambios se guardan inmediatamente.</p>
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" className="rounded-xl text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => grantAllCourses(student.id)}>
                                    ✅ Habilitar todos
                                  </Button>
                                  <Button size="sm" className="rounded-xl text-xs gap-1.5 bg-rose-600 hover:bg-rose-700 text-white" onClick={() => setConfirmAction({
                                    open: true,
                                    title: '🔒 ¿Deshabilitar todos los módulos?',
                                    msg: `Se quitará el acceso a todos los cursos y unidades de ${student.full_name}. Puedes habilitarlos de nuevo individualmente.`,
                                    fn: () => revokeAllCourses(student.id),
                                  })}>
                                    🔒 Deshabilitar todos
                                  </Button>
                                </div>
                              </div>

                              {coursesForAccess.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-6">No hay cursos disponibles</p>
                              ) : (
                                <div className="space-y-3">
                                  {coursesForAccess.map(course => {
                                    const LEVEL_ORDER_ADMIN = ['A1','A2','B1','B2','C1'];
                                    const studentLvl = student.english_level || '';
                                    const studentLvlIdx = LEVEL_ORDER_ADMIN.indexOf(studentLvl);
                                    const courseLvlIdx = LEVEL_ORDER_ADMIN.indexOf(course.level || '');
                                    // Habilitado si: acceso explícito en student_module_access
                                    // O si el estudiante tiene cuenta activa y el curso está en su nivel
                                    const explicitGrant = (studentModuleAccess[student.id] || []).includes(course.id);
                                    const levelGrant = student.account_enabled !== false &&
                                      studentLvlIdx >= 0 &&
                                      courseLvlIdx >= 0 &&
                                      courseLvlIdx <= studentLvlIdx;
                                    const courseGranted = explicitGrant || levelGrant;
                                    return (
                                      <div key={course.id} className="border border-border/50 rounded-2xl overflow-hidden">
                                        {/* Course header */}
                                        <div className="flex items-center gap-3 p-4 bg-muted/20">
                                          <span className="text-xl">{course.emoji || '📖'}</span>
                                          <div className="flex-1">
                                            <p className="font-bold text-sm">{course.title}</p>
                                            <p className="text-xs text-muted-foreground">{course.units?.length || 0} unidades</p>
                                          </div>
                                          <button
                                            onClick={() => toggleModuleAccess(student.id, course.id, null, courseGranted)}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                                              courseGranted ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
                                            }`}>
                                            {courseGranted ? <><ToggleRight className="w-4 h-4" /> Habilitado</> : <><ToggleLeft className="w-4 h-4" /> Deshabilitado</>}
                                          </button>
                                        </div>
                                        {/* Units */}
                                        {course.units && course.units.length > 0 && (
                                          <div className="divide-y divide-border/30">
                                            {course.units.map(unit => {
                                              const unitGranted = (studentModuleAccess[student.id] || []).includes(unit.id);
                                              return (
                                                <div key={unit.id} className="flex items-center justify-between px-4 py-2.5 bg-background/50 pl-10">
                                                  <p className="text-xs text-muted-foreground">{unit.title}</p>
                                                  <button
                                                    onClick={() => toggleModuleAccess(student.id, course.id, unit.id, unitGranted)}
                                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                                                      unitGranted ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-muted text-muted-foreground hover:bg-primary/5 hover:text-primary'
                                                    }`}>
                                                    {unitGranted ? 'Activa' : 'Inactiva'}
                                                  </button>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
        </>)}

        {/* ── TOAST MENSAJE ── */}
        {actionMsg && (
          <div className={`fixed top-6 right-6 z-[300] px-5 py-3 rounded-2xl shadow-xl font-bold text-sm flex items-center gap-2 transition-all ${
            actionMsg.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          }`}>
            {actionMsg.type === 'success' ? '✅' : '❌'} {actionMsg.text}
          </div>
        )}

        {/* ── CONFIRM DIALOG ── */}
        {confirmAction.open && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setConfirmAction(c => ({ ...c, open: false }))}>
            <div className="bg-background rounded-2xl border border-border shadow-xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
              <p className="font-bold text-base mb-2">{confirmAction.title}</p>
              <p className="text-sm text-muted-foreground mb-5">{confirmAction.msg}</p>
              <div className="flex gap-3">
                <Button className="flex-1 rounded-xl" onClick={async () => { await confirmAction.fn(); setConfirmAction(c => ({ ...c, open: false })); }}>Confirmar</Button>
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setConfirmAction(c => ({ ...c, open: false }))}>Cancelar</Button>
              </div>
            </div>
          </div>
        )}

        {/* ── SESSION REQUESTS TAB ── */}
        {adminTab === 'sessions' && (
          <div className="space-y-4">
            {sessionRequests.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Video className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Aún no hay solicitudes de sesión.</p>
              </div>
            ) : (
              sessionRequests.map(req => (
                <motion.div key={req.id} layout className="bg-background border border-border/50 rounded-2xl shadow-sm overflow-hidden">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center font-extrabold text-base shrink-0">
                        {req.student_name ? req.student_name.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold truncate">{req.student_name || 'Sin nombre'}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {req.student_email || '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {req.weekly_plan && (
                        <span className="flex items-center gap-1 bg-violet-100 text-violet-700 font-bold px-2.5 py-1 rounded-full">
                          <Clock className="w-3 h-3" /> Plan semanal
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-3 h-3" /> {new Date(req.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="bg-primary/10 text-primary font-bold px-2.5 py-1 rounded-full">{req.sessions?.length || 0} sesión(es)</span>
                    </div>
                    <button onClick={() => setSessionReqExpanded(sessionReqExpanded === req.id ? null : req.id)}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors shrink-0">
                      {sessionReqExpanded === req.id
                        ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  </div>

                  {sessionReqExpanded === req.id && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="border-t border-border/30 p-5 space-y-4">
                      {/* Sessions list */}
                      {req.sessions && req.sessions.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">📅 Fechas solicitadas</p>
                          <div className="space-y-2">
                            {req.sessions.map((s, i) => (
                              <div key={i} className="flex items-center gap-3 bg-muted/30 rounded-xl p-3 border border-border/30 text-sm">
                                <Calendar className="w-4 h-4 text-primary shrink-0" />
                                <div>
                                  <p className="font-semibold">{s.date ? new Date(s.date + 'T12:00:00').toLocaleDateString('es-CO', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : 'Fecha por definir'}</p>
                                  {s.topic && <p className="text-xs text-muted-foreground">{s.topic}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Objective */}
                      {req.objective && (
                        <div>
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1"><Target className="w-3.5 h-3.5" /> Objetivo</p>
                          <p className="text-sm bg-muted/30 rounded-xl p-3 border border-border/30">{req.objective}</p>
                        </div>
                      )}
                      {/* Weekly plan */}
                      {req.weekly_plan && (
                        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 space-y-2">
                          <p className="text-xs font-bold text-violet-700 uppercase tracking-wide flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Plan semanal personalizado</p>
                          {req.weekly_hours && (
                            <div>
                              <p className="text-xs text-violet-600 font-medium">Horas semanales deseadas:</p>
                              <p className="text-sm">{req.weekly_hours}</p>
                            </div>
                          )}
                          {req.weekly_schedule && (
                            <div>
                              <p className="text-xs text-violet-600 font-medium">Disponibilidad horaria:</p>
                              <p className="text-sm whitespace-pre-line">{req.weekly_schedule}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}