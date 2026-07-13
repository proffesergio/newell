import axios, { AxiosError } from "axios";

const ACCESS_TOKEN_KEY = "newell.access_token";
const REFRESH_TOKEN_KEY = "newell.refresh_token";
const ROLE_KEY = "newell.role";
const USER_ID_KEY = "newell.user_id";

export type Role = "guest" | "user";

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
  getRole(): Role | null {
    return localStorage.getItem(ROLE_KEY) as Role | null;
  },
  getUserId(): string | null {
    return localStorage.getItem(USER_ID_KEY);
  },
  setTokens(access: string, refresh: string, role: Role, userId: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, access);
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
    localStorage.setItem(ROLE_KEY, role);
    localStorage.setItem(USER_ID_KEY, userId);
  },
  clear(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    localStorage.removeItem(USER_ID_KEY);
  },
};

export interface OtpRequestResponse {
  message: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user_id: string;
  role: Role;
}

export type OtpVerifyResponse = TokenPair;
export type GuestLoginResponse = TokenPair;

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

/**
 * Thrown whenever the backend responds 403 with error.code "signup_required"
 * (a guest hitting a gated action, e.g. a 2nd plant or the plant list).
 * The UI catches this specifically to show <SignupGate /> instead of a
 * generic error message.
 */
export class SignupRequiredError extends ApiError {
  constructor(message: string) {
    super(message, "signup_required");
    this.name = "SignupRequiredError";
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
  // Let the browser set the multipart boundary itself for file uploads —
  // the instance-level default of application/json would otherwise stick.
  if (config.data instanceof FormData) {
    config.headers.delete("Content-Type");
  }
  return config;
});

function toApiError(err: unknown): ApiError {
  if (axios.isAxiosError(err)) {
    const axiosErr = err as AxiosError<BackendErrorEnvelope>;
    const envelope = axiosErr.response?.data?.error;
    if (envelope) {
      const message = envelope.message ?? "Something went wrong. Please try again.";
      const code = envelope.code ?? "unknown";
      if (axiosErr.response?.status === 403 && code === "signup_required") {
        return new SignupRequiredError(message);
      }
      return new ApiError(message, code);
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

export async function verifyOtp(
  phone: string,
  code: string,
  guestUserId?: string
): Promise<OtpVerifyResponse> {
  try {
    const { data } = await client.post<OtpVerifyResponse>("/auth/otp/verify", {
      phone,
      code,
      guest_user_id: guestUserId,
    });
    return data;
  } catch (err) {
    throw toApiError(err);
  }
}

/** Anonymous entry point: mints a guest identity with no phone/OTP needed. */
export async function guestLogin(): Promise<GuestLoginResponse> {
  try {
    const { data } = await client.post<GuestLoginResponse>("/auth/guest");
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

// --- Media -----------------------------------------------------------------

export interface UploadResponse {
  media_id: string;
  url: string;
  content_type: string;
}

export async function uploadPhoto(file: File): Promise<UploadResponse> {
  try {
    const form = new FormData();
    form.append("file", file);
    const { data } = await client.post<UploadResponse>("/media/upload", form);
    return data;
  } catch (err) {
    throw toApiError(err);
  }
}

// --- Plants ------------------------------------------------------------------

export interface Diagnosis {
  health: string;
  growth_stage: string;
  pests: string[];
  watering: string;
  care_steps: string[];
}

export interface Plant {
  plant_id: string;
  name: string | null;
  diagnosis: Diagnosis;
  created_at: string;
}

export interface PlantSummary {
  plant_id: string;
  name: string | null;
  created_at: string;
  latest_diagnosis: Diagnosis | null;
}

export interface PlantListResponse {
  plants: PlantSummary[];
}

export interface PlantLog {
  image_ref: string;
  diagnosis: Diagnosis;
  created_at: string;
}

export interface PlantDetail {
  plant_id: string;
  name: string | null;
  created_at: string;
  logs: PlantLog[];
}

export interface CreatePlantPayload {
  name?: string;
  image_ref: string;
}

export async function createPlant(payload: CreatePlantPayload): Promise<Plant> {
  try {
    const { data } = await client.post<Plant>("/plants", payload);
    return data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function listPlants(): Promise<PlantListResponse> {
  try {
    const { data } = await client.get<PlantListResponse>("/plants");
    return data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function getPlant(id: string): Promise<PlantDetail> {
  try {
    const { data } = await client.get<PlantDetail>(`/plants/${id}`);
    return data;
  } catch (err) {
    throw toApiError(err);
  }
}

// --- Rooms (Interior Design) -------------------------------------------------

export interface RoomDesign {
  style: string;
  palette: string[];
  layout_tips: string[];
  furniture: string[];
}

export interface Room {
  room_id: string;
  name: string | null;
  design: RoomDesign;
  created_at: string;
}

export interface RoomSummary {
  room_id: string;
  name: string | null;
  created_at: string;
  latest_design: RoomDesign | null;
}

export interface RoomListResponse {
  rooms: RoomSummary[];
}

export interface RoomLog {
  image_ref: string;
  design: RoomDesign;
  created_at: string;
}

export interface RoomDetail {
  room_id: string;
  name: string | null;
  created_at: string;
  logs: RoomLog[];
}

export interface CreateRoomPayload {
  name?: string;
  image_ref: string;
}

export async function createRoom(payload: CreateRoomPayload): Promise<Room> {
  try {
    const { data } = await client.post<Room>("/rooms", payload);
    return data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function listRooms(): Promise<RoomListResponse> {
  try {
    const { data } = await client.get<RoomListResponse>("/rooms");
    return data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function getRoom(id: string): Promise<RoomDetail> {
  try {
    const { data } = await client.get<RoomDetail>(`/rooms/${id}`);
    return data;
  } catch (err) {
    throw toApiError(err);
  }
}

export async function redesignRoom(id: string, imageRef: string): Promise<RoomLog> {
  try {
    const { data } = await client.post<RoomLog>(`/rooms/${id}/design`, { image_ref: imageRef });
    return data;
  } catch (err) {
    throw toApiError(err);
  }
}
