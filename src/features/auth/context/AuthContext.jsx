import {
  createContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { supabase } from "../../../services/supabase.js";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [membership, setMembership] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadMembership(currentUser) {
    if (!currentUser) {
      setMembership(null);
      return null;
    }

    const { data, error } = await supabase
      .from("business_members")
      .select("business_id, user_id, role")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (error) {
      console.error(
        "Error cargando business_members:",
        error,
      );

      setMembership(null);
      return null;
    }

    setMembership(data ?? null);

    return data ?? null;
  }

  useEffect(() => {
    let mounted = true;

    async function loadInitialSession() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        console.error(
          "Error obteniendo sesión:",
          error,
        );
      }

      const currentUser =
        session?.user ?? null;

      setSession(session ?? null);
      setUser(currentUser);

      if (currentUser) {
        await loadMembership(currentUser);
      } else {
        setMembership(null);
      }

      if (mounted) {
        setLoading(false);
      }
    }

    loadInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        if (!mounted) return;

        const currentUser =
          nextSession?.user ?? null;

        setSession(nextSession ?? null);
        setUser(currentUser);

        if (currentUser) {
          await loadMembership(currentUser);
        } else {
          setMembership(null);
        }

        if (mounted) {
          setLoading(false);
        }
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(email, password) {
    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      throw error;
    }

    const member =
      await loadMembership(data.user);

    if (!member) {
      await supabase.auth.signOut();

      throw new Error(
        "Tu cuenta no está asociada a ningún negocio.",
      );
    }

    return {
      user: data.user,
      membership: member,
    };
  }

  async function signOut() {
    const { error } =
      await supabase.auth.signOut();

    if (error) {
      throw error;
    }

    setSession(null);
    setUser(null);
    setMembership(null);
  }

  const value = useMemo(
    () => ({
      session,
      user,
      membership,
      loading,

      isAuthenticated:
        Boolean(user && membership),

      role:
        membership?.role ?? null,

      businessId:
        membership?.business_id ?? null,

      signIn,
      signOut,
    }),
    [
      session,
      user,
      membership,
      loading,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}