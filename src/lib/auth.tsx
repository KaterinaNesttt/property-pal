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

interface BadgePreferences {
  all: boolean;
  properties: boolean;
  tasks: boolean;
  invoices: boolean;
}

export interface UserPreferences {
  full_name: string;
  phone: string;
  avatar: string | null;
  avatarScale: number;
  avatarX: number;
  avatarY: number;
  badgePreferences: BadgePreferences;
}

interface AuthContextValue {
  ready: boolean;
  token: string | null;
  user: User | null;
  login: (payload: Credentials) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  preferences: UserPreferences;
  updatePreferences: (patch: Partial<UserPreferences>) => void;
  updateBadgePreferences: (patch: Partial<BadgePreferences>) => void;
}

const STORAGE_KEY = "property-pal-auth";
const PREFERENCES_KEY = "property-pal-user-preferences";
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const defaultPreferences: UserPreferences = {
  full_name: "",
  phone: "",
  avatar: null,
  avatarScale: 1,
  avatarX: 0,
  avatarY: 0,
  badgePreferences: {
    all: true,
    properties: true,
    tasks: true,
    invoices: true,
  },
};

function readStoredToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(STORAGE_KEY);
}

function readPreferences() {
  if (typeof window === "undefined") {
    return defaultPreferences;
  }

  try {
    const raw = window.localStorage.getItem(PREFERENCES_KEY);
    if (!raw) {
      return defaultPreferences;
    }
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    return {
      ...defaultPreferences,
      ...parsed,
      badgePreferences: {
        ...defaultPreferences.badgePreferences,
        ...(parsed.badgePreferences ?? {}),
      },
    };
  } catch {
    return defaultPreferences;
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(readStoredToken);
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>(readPreferences);

  useEffect(() => {
    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
  }, [preferences]);

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

  const mergedUser = useMemo<User | null>(() => {
    if (!user) {
      return null;
    }

    return {
      ...user,
      full_name: preferences.full_name.trim() || user.full_name,
    };
  }, [preferences.full_name, user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      token,
      user: mergedUser,
      preferences,
      updatePreferences(patch) {
        setPreferences((current) => ({
          ...current,
          ...patch,
          badgePreferences: patch.badgePreferences
            ? { ...current.badgePreferences, ...patch.badgePreferences }
            : current.badgePreferences,
        }));
      },
      updateBadgePreferences(patch) {
        setPreferences((current) => ({
          ...current,
          badgePreferences: {
            ...current.badgePreferences,
            ...patch,
          },
        }));
      },
      async login(payload) {
        try {
          const response = await api.post<AuthResponse>("/api/auth/login", payload);
          persistSession(response);
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
    [mergedUser, preferences, ready, token],
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
