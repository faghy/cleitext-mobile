import { locale, t } from '../i18n';

export function relativeTime(iso: string, now = Date.now()): string {
  const date = new Date(iso);
  const diff = Math.max(0, now - date.getTime());
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return t('time.now');
  if (minutes < 60) return t('time.minutes', { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('time.hours', { n: hours });
  if (hours < 48) return t('time.yesterday');
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

export function dateTime(iso: string): string {
  return new Date(iso).toLocaleString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function money(amount: string, currency: string): string {
  const value = Number(amount);
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '?') + (parts[1]?.[0] ?? '')).toUpperCase();
}

/** The smallest variant at least this wide (for the grid), else the original. */
export function thumbnail(
  media: { url: string; variants: { url: string; width: number; format: string }[] },
  width: number,
): string {
  const fit = media.variants
    .filter((v) => v.width >= width && v.format !== 'avif')
    .sort((a, b) => a.width - b.width)[0];
  return fit?.url ?? media.url;
}
