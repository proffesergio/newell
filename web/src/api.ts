import axios, { AxiosError } from "axios";

const ACCESS_TOKEN_KEY = "newell.access_token";
const REFRESH_TOKEN_KEY = "newell.refresh_token";

/**
 * Minimal localStorage-backed token store. Shared by the axios interceptor
 * below (to attach the Authorization header) and by auth.tsx (the React
 * context that owns login/logout).
 */
export const tokenStorage = {
  getAccess(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  getRefresh(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  setTokens(access: string, refresh: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  },
  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

export interface OtpRequestResponse {
  message: string;
}

export interface OtpVerifyResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user_id: string;
}

export type Locale = "en" | "bn";

export interface Profile {
  user_id: string;
  display_name: string;
  locale: Locale;
}

export interface ProfilePatch {
  display_name?: string;
  locale?: Locale;
}

interface BackendErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
  };
}

/** Error surfaced to the UI, carrying the backend's error.code when present. */
export class ApiError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

const client = axios.create({
  baseURL: import.meta.env.VITE_GATEWAY_URL ?? "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

client.interceptors.request.use((config) => {
  const access = tokenStorage.getAccess();
  if (access) {
    config.headers.set("Authorization", `Bearer ${access}`);
  }
  return config;
});

function toApiError(err: unknown): ApiError {
  if (axios.isAxiosError(err)) {
    const axiosErr = err as AxiosError<BackendErrorEnvelope>;
    const envelope = axiosErr.response?.data?.error;
    if (envelope) {
      return new ApiError(
        envelope.message ?? "Something went wrong. Please try again.",
        envelope.code ?? "unknown"
      );
    }
    if (axiosErr.request && !axiosErr.response) {
      return new ApiError(
        "Couldn't reach the server. Is the gateway running?",
        "network.unreachable"
      );
    }
  }
  return new ApiError("Something went wrong. Please try again.", "unknown");
}

export async function requestOtp(phone: string): Promise<OtpRequestResponse> {
  try {
    const { data } = await client.post<OtpRequestResponse>("/auth/otp/request", { phone });
    return data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function verifyOtp(phone: string, code: string): Promise<OtpVerifyResponse> {
  try {
    const { data } = await client.post<OtpVerifyResponse>("/auth/otp/verify", { phone, code });
    return data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function getProfile(): Promise<Profile> {
  try {
    const { data } = await client.get<Profile>("/profile/me");
    return data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function updateProfile(patch: ProfilePatch): Promise<Profile> {
  try {
    const { data } = await client.patch<Profile>("/profile/me", patch);
    return data;
  } catch (err) {
    throw toApiError(err);
  }
}
