import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { tokenStorage, type Role } from "./api";

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  role: Role;
  userId: string;
}

interface AuthContextValue {
  isAuthed: boolean;
  isGuest: boolean;
  role: Role | null;
  userId: string | null;
  login: (tokens: AuthTokens) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthed, setIsAuthed] = useState<boolean>(() => tokenStorage.getAccess() !== null);
  const [role, setRole] = useState<Role | null>(() => tokenStorage.getRole());
  const [userId, setUserId] = useState<string | null>(() => tokenStorage.getUserId());

  const login = useCallback((tokens: AuthTokens) => {
    tokenStorage.setTokens(tokens.accessToken, tokens.refreshToken, tokens.role, tokens.userId);
    setIsAuthed(true);
    setRole(tokens.role);
    setUserId(tokens.userId);
  }, []);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setIsAuthed(false);
    setRole(null);
    setUserId(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ isAuthed, isGuest: role === "guest", role, userId, login, logout }),
    [isAuthed, role, userId, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
