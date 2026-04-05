import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { AuthResponse, BadgePreferences, ProfileUpdatePayload, User, UserPreferences } from "@/lib/types";

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
  preferences: UserPreferences;
  setPreferences: (patch: Partial<UserPreferences>) => void;
  updateBadgePreferences: (patch: Partial<BadgePreferences>) => void;
  saveProfile: (payload: Partial<ProfileUpdatePayload>) => Promise<void>;
}

const STORAGE_KEY = "property-pal-auth";
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const defaultPreferences: UserPreferences = {
  themeMode: "default",
  badgePreferences: {
    all: true,
    properties: true,
    tasks: true,
    invoices: true,
  },
  avatarScale: 1,
  avatarX: 0,
  avatarY: 0,
};

function readStoredToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(STORAGE_KEY);
}

function normalizePreferences(preferences?: Partial<UserPreferences> | null): UserPreferences {
  return {
    ...defaultPreferences,
    ...preferences,
    badgePreferences: {
      ...defaultPreferences.badgePreferences,
      ...(preferences?.badgePreferences ?? {}),
    },
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(readStoredToken);
  const [user, setUser] = useState<User | null>(null);
  const [preferences, setPreferencesState] = useState<UserPreferences>(defaultPreferences);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = preferences.themeMode === "purple" ? "purple" : "default";
  }, [preferences.themeMode]);

  useEffect(() => {
    if (!token) {
      setReady(true);
      setUser(null);
      setPreferencesState(defaultPreferences);
      return;
    }

    let cancelled = false;

    api
      .get<{ user: User }>("/api/auth/me", token)
      .then((payload) => {
        if (!cancelled) {
          setUser(payload.user);
          setPreferencesState(normalizePreferences(payload.user.preferences));
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          window.localStorage.removeItem(STORAGE_KEY);
          setToken(null);
          setUser(null);
          setPreferencesState(defaultPreferences);
          setReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  const persistSession = useCallback((payload: AuthResponse) => {
    window.localStorage.setItem(STORAGE_KEY, payload.token);
    setToken(payload.token);
    setUser(payload.user);
    setPreferencesState(normalizePreferences(payload.user.preferences));
  }, []);

  const handleAuthError = useCallback((error: unknown, fallback: string) => {
    if (error instanceof ApiError) {
      toast.error(error.message, { description: error.details });
      return;
    }

    toast.error(fallback);
  }, []);

  const setPreferences = useCallback((patch: Partial<UserPreferences>) => {
    setPreferencesState((current) => normalizePreferences({ ...current, ...patch }));
  }, []);

  const updateBadgePreferences = useCallback((patch: Partial<BadgePreferences>) => {
    setPreferencesState((current) =>
      normalizePreferences({
        ...current,
        badgePreferences: {
          ...current.badgePreferences,
          ...patch,
        },
      }),
    );
  }, []);

  const saveProfile = useCallback(
    async (payload: Partial<ProfileUpdatePayload>) => {
      if (!token || !user) {
        return;
      }

      const nextPreferences = normalizePreferences(payload.preferences ?? preferences);
      const response = await api.put<{ user: User }>(
        "/api/profile",
        {
          full_name: payload.full_name ?? user.full_name,
          phone: payload.phone ?? user.phone ?? "",
          avatar: payload.avatar === undefined ? user.avatar ?? null : payload.avatar,
          preferences: nextPreferences,
        },
        token,
      );

      setUser(response.user);
      setPreferencesState(normalizePreferences(response.user.preferences));
      toast.success("Профіль оновлено");
    },
    [preferences, token, user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      token,
      user,
      preferences,
      setPreferences,
      updateBadgePreferences,
      saveProfile,
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
        setPreferencesState(defaultPreferences);
      },
    }),
    [handleAuthError, persistSession, preferences, ready, saveProfile, setPreferences, token, updateBadgePreferences, user],
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
