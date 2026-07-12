import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { tokenStorage } from "./api";

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface AuthContextValue {
  isAuthed: boolean;
  login: (tokens: AuthTokens) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthed, setIsAuthed] = useState<boolean>(() => tokenStorage.getAccess() !== null);

  const login = useCallback((tokens: AuthTokens) => {
    tokenStorage.setTokens(tokens.accessToken, tokens.refreshToken);
    setIsAuthed(true);
  }, []);

  const logout = useCallback(() => {
    tokenStorage.clear();
    setIsAuthed(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ isAuthed, login, logout }),
    [isAuthed, login, logout]
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
