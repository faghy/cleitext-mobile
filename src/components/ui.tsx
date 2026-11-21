import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { t } from '../i18n';
import { ApiError } from '../lib/api';
import { SignedOutError } from '../lib/session';
import { Icon, type IconName } from './icons';

// ---- Screens --------------------------------------------------------------

export function Screen({
  title,
  onBack,
  action,
  children,
  large = true,
  titleSlot,
}: {
  title: string;
  onBack?: () => void;
  action?: ReactNode;
  children: ReactNode;
  large?: boolean;
  /** Replaces the large title (e.g. the site switcher). */
  titleSlot?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  return (
    <section className="screen" aria-label={title}>
      <header className={`bar${scrolled || !large ? ' bar--solid' : ''}`}>
        <div className="bar__side">
          {onBack && (
            <button className="bar__back" onClick={onBack} aria-label={t('back')}>
              <Icon name="back" size={26} />
            </button>
          )}
        </div>
        <div
          className={`bar__title${scrolled || !large ? ' bar__title--shown' : ''}`}
          aria-hidden={large && !scrolled}
        >
          {title}
        </div>
        <div className="bar__side bar__side--end">{action}</div>
      </header>
      <div
        className="screen__body"
        ref={ref}
        onScroll={(e) => setScrolled((e.target as HTMLDivElement).scrollTop > 36)}
      >
        {large && (titleSlot ?? <h1 className="large-title">{title}</h1>)}
        {children}
      </div>
    </section>
  );
}

export function Section({
  title,
  children,
  footer,
}: {
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="section">
      {title && <h2 className="section__title">{title}</h2>}
      <div className="group">{children}</div>
      {footer && <p className="section__footer">{footer}</p>}
    </div>
  );
}

export function Cell({
  icon,
  iconColor,
  title,
  subtitle,
  detail,
  onClick,
  chevron = Boolean(onClick),
  badge,
  leading,
  danger,
}: {
  icon?: IconName;
  iconColor?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  detail?: ReactNode;
  onClick?: () => void;
  chevron?: boolean;
  badge?: number;
  leading?: ReactNode;
  danger?: boolean;
}) {
  const content = (
    <>
      {leading}
      {icon && (
        <span className="cell__icon" style={iconColor ? { background: iconColor } : undefined}>
          <Icon name={icon} size={19} />
        </span>
      )}
      <span className="cell__main">
        <span className={`cell__title${danger ? ' cell__title--danger' : ''}`}>{title}</span>
        {subtitle && <span className="cell__subtitle">{subtitle}</span>}
      </span>
      {detail !== undefined && <span className="cell__detail">{detail}</span>}
      {badge !== undefined && badge > 0 && <span className="badge">{badge}</span>}
      {chevron && <Icon name="chevron" size={18} className="cell__chevron" />}
    </>
  );
  return onClick ? (
    <button className="cell" onClick={onClick}>
      {content}
    </button>
  ) : (
    <div className="cell">{content}</div>
  );
}

export function Button({
  children,
  onClick,
  kind = 'primary',
  disabled,
  icon,
  busy,
  type = 'button',
  small,
}: {
  children: ReactNode;
  onClick?: () => void;
  kind?: 'primary' | 'secondary' | 'plain' | 'danger';
  disabled?: boolean;
  icon?: IconName;
  busy?: boolean;
  type?: 'button' | 'submit';
  small?: boolean;
}) {
  return (
    <button
      type={type}
      className={`btn btn--${kind}${small ? ' btn--small' : ''}`}
      onClick={onClick}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
    >
      {busy ? (
        <span className="spinner spinner--small" aria-hidden="true" />
      ) : (
        icon && <Icon name={icon} size={19} />
      )}
      <span>{children}</span>
    </button>
  );
}

export function Empty({
  icon,
  text,
  children,
}: {
  icon: IconName;
  text: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty__icon">
        <Icon name={icon} size={30} />
      </span>
      <p>{text}</p>
      {children}
    </div>
  );
}

export function Loading() {
  return (
    <div className="loading" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span className="sr-only">{t('loading')}</span>
    </div>
  );
}

export function errorText(error: unknown): string {
  if (error instanceof SignedOutError) return t('sites.signedOut');
  if (error instanceof ApiError) return error.message || t('error');
  if (error instanceof TypeError) return t('offline');
  return t('error');
}

export function ErrorBox({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="error-box" role="alert">
      <p>{errorText(error)}</p>
      {onRetry && (
        <Button kind="secondary" small onClick={onRetry}>
          {t('retry')}
        </Button>
      )}
    </div>
  );
}

export function Notice({
  children,
  tone = 'info',
}: {
  children: ReactNode;
  tone?: 'info' | 'success' | 'warning';
}) {
  return <div className={`notice notice--${tone}`}>{children}</div>;
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string; count?: number }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={o.value === value}
          className={o.value === value ? 'segmented__on' : undefined}
          onClick={() => onChange(o.value)}
        >
          {o.label}
          {o.count ? <span className="segmented__count">{o.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function Avatar({
  name,
  url,
  size = 40,
}: {
  name: string;
  url?: string | null;
  size?: number;
}) {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
  let hue = 0;
  for (const ch of name) hue = (hue * 31 + ch.charCodeAt(0)) % 360;
  return url ? (
    <img className="avatar" src={url} alt="" width={size} height={size} />
  ) : (
    <span
      className="avatar"
      style={{ width: size, height: size, background: `hsl(${hue} 55% 45%)` }}
      aria-hidden="true"
    >
      {letters || '?'}
    </span>
  );
}

// ---- Sheets ---------------------------------------------------------------

export function Sheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
      <button className="sheet__backdrop" aria-label={t('close')} onClick={onClose} />
      <div className="sheet__panel">
        <div className="sheet__grip" aria-hidden="true" />
        {title && <h2 className="sheet__title">{title}</h2>}
        {children}
      </div>
    </div>
  );
}

// ---- Toasts ---------------------------------------------------------------

const ToastContext = createContext<(message: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const show = useCallback((text: string) => {
    setMessage(text);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMessage(null), 2600);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-region" role="status" aria-live="polite">
        {message && <div className="toast">{message}</div>}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

// ---- Data -----------------------------------------------------------------

export interface Loaded<T> {
  data: T | undefined;
  error: unknown;
  loading: boolean;
  reload: () => void;
  setData: (data: T) => void;
}

/** Loads once per key; `reload` asks again. */
export function useLoad<T>(load: () => Promise<T>, key: string): Loaded<T> {
  const [state, setState] = useState<{ data?: T; error?: unknown; loading: boolean }>({
    loading: true,
  });
  const [round, setRound] = useState(0);
  const loader = useRef(load);
  loader.current = load;
  useEffect(() => {
    let alive = true;
    setState((s) => ({ data: s.data, loading: true }));
    loader.current().then(
      (data) => alive && setState({ data, loading: false }),
      (error: unknown) => alive && setState({ error, loading: false }),
    );
    return () => {
      alive = false;
    };
  }, [key, round]);
  return {
    data: state.data,
    error: state.error,
    loading: state.loading,
    reload: useCallback(() => setRound((r) => r + 1), []),
    setData: useCallback((data: T) => setState({ data, loading: false }), []),
  };
}
