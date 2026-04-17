import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

// Email del administrador principal
const ADMIN_EMAIL = 'blangenglishlearning@blangenglish.com';

interface UseAdminReturn {
  isAdmin: boolean;
  loading: boolean;
  user: User | null;
}

/**
 * useAdmin — verifica si el usuario actual es administrador.
 * Estrategia:
 *  1. Escucha onAuthStateChange para reaccionar a login/logout en tiempo real.
 *  2. Verifica por email (principal) o por tabla admin_users (secundario).
 *  3. No usa ran.current — puede re-ejecutarse correctamente.
 */
export function useAdmin(): UseAdminReturn {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  const checkUser = async (sessionUser: User | null) => {
    if (!sessionUser) {
      setIsAdmin(false);
      setUser(null);
      setLoading(false);
      return;
    }

    setUser(sessionUser);

    // Verificación 1: por email exacto
    const userEmail = sessionUser.email?.trim().toLowerCase() ?? '';
    if (userEmail === ADMIN_EMAIL.toLowerCase()) {
      setIsAdmin(true);
      setLoading(false);
      return;
    }

    // Verificación 2: por tabla admin_users
    try {
      const { data } = await supabase
        .from('admin_users')
        .select('id')
        .eq('id', sessionUser.id)
        .maybeSingle();
      setIsAdmin(!!data);
    } catch {
      setIsAdmin(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    let cancelled = false;

    // Leer sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!cancelled) checkUser(session?.user ?? null);
    });

    // Escuchar cambios de auth (login / logout / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) checkUser(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { isAdmin, loading, user };
}

interface UseAdminAuthReturn {
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  loading: boolean;
}

export function useAdminAuth(): UseAdminAuthReturn {
  const [loading, setLoading] = useState(false);

  const login = async (email: string, password: string): Promise<{ error: string | null }> => {
    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

      if (authError) {
        setLoading(false);
        return { error: 'Email o contraseña incorrectos. Verifica tus datos.' };
      }
      if (!data.session?.user) {
        setLoading(false);
        return { error: 'No se pudo iniciar sesión. Intenta de nuevo.' };
      }

      const confirmedEmail = data.session.user.email?.trim().toLowerCase() ?? '';
      const isAdminByEmail = confirmedEmail === ADMIN_EMAIL.toLowerCase();

      // Verificar también en admin_users si el email no coincide
      let isAdminByTable = false;
      if (!isAdminByEmail) {
        try {
          const { data: adminRow } = await supabase
            .from('admin_users')
            .select('id')
            .eq('id', data.session.user.id)
            .maybeSingle();
          isAdminByTable = !!adminRow;
        } catch {
          isAdminByTable = false;
        }
      }

      if (!isAdminByEmail && !isAdminByTable) {
        await supabase.auth.signOut();
        setLoading(false);
        return { error: 'Este usuario no tiene permisos de administrador.' };
      }

      setLoading(false);
      return { error: null };
    } catch (err: unknown) {
      setLoading(false);
      return { error: err instanceof Error ? err.message : 'Error desconocido' };
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  return { login, logout, loading };
}
