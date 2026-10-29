const DEVICE_ID_KEY = 'simulador_device_id';
const DEVICE_COOKIE = 'simulador_device_id';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 año

let cachedDeviceId: string | null = null;

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  try {
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    let out = '';
    for (let i = 0; i < bytes * 2; i++) out += Math.floor(Math.random() * 16).toString(16);
    return out;
  }
}

function readCookie(): string | null {
  try {
    const match = document.cookie.match(new RegExp('(?:^|; )' + DEVICE_COOKIE + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

function writeCookie(value: string): void {
  try {
    document.cookie = `${DEVICE_COOKIE}=${encodeURIComponent(value)}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
  } catch {}
}

function readStored(): string | null {
  try {
    return localStorage.getItem(DEVICE_ID_KEY);
  } catch {
    return null;
  }
}

function writeStored(value: string): void {
  try {
    localStorage.setItem(DEVICE_ID_KEY, value);
  } catch {}
}

export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;

  // 1) ID ya guardado en este navegador (estable de por vida)
  const stored = readStored();
  if (stored) {
    cachedDeviceId = stored;
    writeCookie(stored);
    return stored;
  }

  // 2) Si se borro localStorage, recuperarlo desde la cookie
  const fromCookie = readCookie();
  if (fromCookie) {
    cachedDeviceId = fromCookie;
    writeStored(fromCookie);
    return fromCookie;
  }

  // 3) Primera vez: generar un ID persistente y aleatorio (no depende de datos que cambian)
  const deviceId = 'dev_' + randomHex(16);
  cachedDeviceId = deviceId;
  writeStored(deviceId);
  writeCookie(deviceId);
  return deviceId;
}

export function getDeviceIdSync(): string | null {
  if (cachedDeviceId) return cachedDeviceId;
  const stored = readStored();
  if (stored) return stored;
  return readCookie();
}

export function getDeviceInfo(): { platform: string; browser: string } {
  const ua = navigator.userAgent;
  let platform = navigator.platform;
  if (ua.includes('Android')) platform = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) platform = 'iOS';
  else if (ua.includes('Windows')) platform = 'Windows';
  else if (ua.includes('Mac')) platform = 'macOS';
  else if (ua.includes('Linux')) platform = 'Linux';

  let browser = 'Unknown';
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';

  return { platform, browser };
}
