import {
  createContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  supabase,
} from "../../../services/supabase.js";


export const AuthContext =
  createContext(null);


export function AuthProvider({
  children,
}) {
  const [
    session,
    setSession,
  ] = useState(null);

  const [
    user,
    setUser,
  ] = useState(null);

  const [
    membership,
    setMembership,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);


  // =========================================================
  // CARGAR MEMBRESÍA
  // =========================================================

  async function loadMembership(
    currentUser,
  ) {
    if (!currentUser) {
      setMembership(
        null,
      );

      return null;
    }


    const {
      data,
      error,
    } =
      await supabase
        .from(
          "business_members",
        )
        .select(
          `
          business_id,
          user_id,
          role,
          onboarding_completed
          `,
        )
        .eq(
          "user_id",
          currentUser.id,
        )
        .maybeSingle();


    if (error) {
      console.error(
        "Error cargando business_members:",
        error,
      );


      setMembership(
        null,
      );

      return null;
    }


    setMembership(
      data ?? null,
    );


    return (
      data ?? null
    );
  }


  // =========================================================
  // RECARGAR MEMBRESÍA MANUALMENTE
  // =========================================================

  async function refreshMembership() {
    if (!user) {
      setMembership(
        null,
      );

      return null;
    }


    return await loadMembership(
      user,
    );
  }


  // =========================================================
  // SESIÓN INICIAL + CAMBIOS DE AUTH
  // =========================================================

  useEffect(() => {
    let mounted =
      true;


    async function loadInitialSession() {
      const {
        data: {
          session,
        },
        error,
      } =
        await supabase.auth
          .getSession();


      if (!mounted) {
        return;
      }


      if (error) {
        console.error(
          "Error obteniendo sesión:",
          error,
        );
      }


      const currentUser =
        session?.user ??
        null;


      setSession(
        session ?? null,
      );


      setUser(
        currentUser,
      );


      if (
        currentUser
      ) {
        await loadMembership(
          currentUser,
        );
      } else {
        setMembership(
          null,
        );
      }


      if (
        mounted
      ) {
        setLoading(
          false,
        );
      }
    }


    loadInitialSession();


    const {
      data: {
        subscription,
      },
    } =
      supabase.auth
        .onAuthStateChange(
          async (
            _event,
            nextSession,
          ) => {
            if (
              !mounted
            ) {
              return;
            }


            const currentUser =
              nextSession
                ?.user ??
              null;


            setSession(
              nextSession ??
                null,
            );


            setUser(
              currentUser,
            );


            if (
              currentUser
            ) {
              await loadMembership(
                currentUser,
              );
            } else {
              setMembership(
                null,
              );
            }


            if (
              mounted
            ) {
              setLoading(
                false,
              );
            }
          },
        );


    return () => {
      mounted =
        false;


      subscription
        .unsubscribe();
    };
  }, []);


  // =========================================================
  // INICIAR SESIÓN
  // =========================================================

  async function signIn(
    email,
    password,
  ) {
    const {
      data,
      error,
    } =
      await supabase.auth
        .signInWithPassword({
          email,
          password,
        });


    if (error) {
      throw error;
    }


    const member =
      await loadMembership(
        data.user,
      );


    if (!member) {
      await supabase.auth
        .signOut();


      throw new Error(
        "Tu cuenta no está asociada a ningún negocio.",
      );
    }


    return {
      user:
        data.user,

      membership:
        member,
    };
  }


  // =========================================================
  // CERRAR SESIÓN
  // =========================================================

  async function signOut() {
    const {
      error,
    } =
      await supabase.auth
        .signOut();


    if (error) {
      throw error;
    }


    setSession(
      null,
    );


    setUser(
      null,
    );


    setMembership(
      null,
    );
  }


  // =========================================================
  // VALORES DERIVADOS
  // =========================================================

  const role =
    membership?.role ??
    null;


  const businessId =
    membership
      ?.business_id ??
    null;


  const isOwner =
    role ===
    "owner";


  const isStaff =
    role ===
    "staff";


  const onboardingCompleted =
    Boolean(
      membership
        ?.onboarding_completed,
    );


  const needsOnboarding =
    Boolean(
      isStaff &&
      !onboardingCompleted,
    );


  const isAuthenticated =
    Boolean(
      user &&
      membership,
    );


  // =========================================================
  // CONTEXTO
  // =========================================================

  const value =
    useMemo(
      () => ({
        session,

        user,

        membership,

        loading,

        isAuthenticated,

        role,

        isOwner,

        isStaff,

        onboardingCompleted,

        needsOnboarding,

        businessId,

        signIn,

        signOut,

        refreshMembership,
      }),
      [
        session,
        user,
        membership,
        loading,
        isAuthenticated,
        role,
        isOwner,
        isStaff,
        onboardingCompleted,
        needsOnboarding,
        businessId,
      ],
    );


  return (
    <AuthContext.Provider
      value={
        value
      }
    >
      {children}
    </AuthContext.Provider>
  );
}