import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { AuthResponse, User } from "@/lib/types";

interface Credentials {
  email: string;
  password: string;
}

interface RegisterPayload extends Credentials {
  full_name: string;
}

interface AuthContextValue {
  ready: boolean;
  token: string | null;
  user: User | null;
  login: (payload: Credentials) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
}

const STORAGE_KEY = "property-pal-auth";
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(STORAGE_KEY);
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(readStoredToken);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!token) {
      setReady(true);
      setUser(null);
      return;
    }

    let cancelled = false;

    api
      .get<{ user: User }>("/api/auth/me", token)
      .then((payload) => {
        if (!cancelled) {
          setUser(payload.user);
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          window.localStorage.removeItem(STORAGE_KEY);
          setToken(null);
          setUser(null);
          setReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const persistSession = (payload: AuthResponse) => {
    window.localStorage.setItem(STORAGE_KEY, payload.token);
    setToken(payload.token);
    setUser(payload.user);
  };

  const handleAuthError = (error: unknown, fallback: string) => {
    if (error instanceof ApiError) {
      toast.error(error.message, { description: error.details });
      return;
    }

    toast.error(fallback);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      token,
      user,
      async login(payload) {
        try {
          const response = await api.post<AuthResponse>("/api/auth/login", payload);
          persistSession(response);
          toast.success("Вхід виконано");
        } catch (error) {
          handleAuthError(error, "Не вдалося увійти");
          throw error;
        }
      },
      async register(payload) {
        try {
          const response = await api.post<AuthResponse>("/api/auth/register", payload);
          persistSession(response);
          toast.success("Обліковий запис створено");
        } catch (error) {
          handleAuthError(error, "Не вдалося створити обліковий запис");
          throw error;
        }
      },
      logout() {
        window.localStorage.removeItem(STORAGE_KEY);
        setToken(null);
        setUser(null);
      },
    }),
    [ready, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
};
