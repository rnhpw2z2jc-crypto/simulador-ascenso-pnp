const DEVICE_ID_KEY = 'simulador_device_id';

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function getDeviceId(): Promise<string> {
  const stored = localStorage.getItem(DEVICE_ID_KEY);
  if (stored) return stored;

  const components: string[] = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth.toString(),
    new Date().getTimezoneOffset().toString(),
    navigator.hardwareConcurrency?.toString() || '0',
    navigator.platform,
    navigator.maxTouchPoints?.toString() || '0',
    navigator.cookieEnabled.toString(),
    (typeof window.indexedDB !== 'undefined').toString(),
  ];

  const raw = components.join('|');
  const hash = await sha256(raw);
  const deviceId = 'dev_' + hash.slice(0, 24);

  localStorage.setItem(DEVICE_ID_KEY, deviceId);
  return deviceId;
}

export function getDeviceIdSync(): string | null {
  return localStorage.getItem(DEVICE_ID_KEY);
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
