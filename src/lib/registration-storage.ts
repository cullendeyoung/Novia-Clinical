// Storage key for registration data
const REGISTRATION_DATA_KEY = "novia_org_registration";

export type RegistrationData = {
  organizationName: string;
  domain: string;
  fullName: string;
  email: string;
  password: string;
  plan: string;
  teams: number;
  atsPerTeam: number;
  timestamp: number;
};

export function getStoredRegistrationData(): RegistrationData | null {
  try {
    const data = sessionStorage.getItem(REGISTRATION_DATA_KEY);
    if (!data) return null;

    const parsed = JSON.parse(data) as RegistrationData;

    // Check if data is still valid (expires after 1 hour)
    if (Date.now() - parsed.timestamp > 60 * 60 * 1000) {
      sessionStorage.removeItem(REGISTRATION_DATA_KEY);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function setStoredRegistrationData(data: RegistrationData): void {
  sessionStorage.setItem(REGISTRATION_DATA_KEY, JSON.stringify(data));
}

export function clearStoredRegistrationData(): void {
  sessionStorage.removeItem(REGISTRATION_DATA_KEY);
}
