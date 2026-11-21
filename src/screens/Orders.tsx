import { useState } from 'react';
import {
  Button,
  Cell,
  Empty,
  ErrorBox,
  Loading,
  Screen,
  Section,
  Sheet,
  useLoad,
  useToast,
} from '../components/ui';
import { t, type MessageKey } from '../i18n';
import { registry } from '../lib/app';
import { dateTime, money, relativeTime } from '../lib/format';
import { openExternal } from '../lib/native';
import type { Site } from '../lib/sites';
import { ORDER_STATUSES, type Address, type OrderStatus } from '../lib/types';
import { useNav } from '../nav';

const statusLabel = (status: OrderStatus) => t(`order.${status}` as MessageKey);

export function StatusPill({ status }: { status: OrderStatus }) {
  return <span className={`pill pill--${status}`}>{statusLabel(status)}</span>;
}

export function Orders({ site, onBack }: { site: Site; onBack: () => void }) {
  const api = registry.api(site);
  const nav = useNav();
  const list = useLoad(() => api.orders(), site.id);
  return (
    <Screen title={t('orders.title')} onBack={onBack}>
      {list.loading && !list.data && <Loading />}
      {list.error !== undefined && <ErrorBox error={list.error} onRetry={list.reload} />}
      {list.data && list.data.items.length === 0 && <Empty icon="bag" text={t('orders.empty')} />}
      {list.data && list.data.items.length > 0 && (
        <Section>
          {list.data.items.map((o) => (
            <Cell
              key={o.id}
              title={
                <span className="order-line">
                  <span>{t('orders.number', { n: o.number })}</span>
                  <strong>{money(o.total, o.currency)}</strong>
                </span>
              }
              subtitle={
                <span className="order-line">
                  <span>
                    {o.name || o.email} · {relativeTime(o.createdAt)}
                  </span>
                  <StatusPill status={o.status} />
                </span>
              }
              onClick={() => nav.push({ name: 'order', id: o.id })}
            />
          ))}
        </Section>
      )}
    </Screen>
  );
}

function addressLines(a: Address): string[] {
  return [
    `${a.firstName} ${a.lastName}`.trim(),
    a.company,
    a.address1,
    a.address2,
    `${a.postcode} ${a.city} ${a.province}`.trim(),
    a.country,
  ].filter(Boolean);
}

export function OrderDetail({ site, id, onBack }: { site: Site; id: string; onBack: () => void }) {
  const api = registry.api(site);
  const toast = useToast();
  const detail = useLoad(() => api.order(id), `${site.id}:${id}`);
  const [choosing, setChoosing] = useState(false);
  const [busy, setBusy] = useState(false);
  const change = async (status: OrderStatus) => {
    setChoosing(false);
    setBusy(true);
    try {
      detail.setData(await api.setOrderStatus(id, status));
      toast(t('orders.statusChanged'));
    } catch (error) {
      toast(error instanceof Error ? error.message : t('error'));
    } finally {
      setBusy(false);
    }
  };
  const data = detail.data;
  const order = data?.order;
  return (
    <Screen
      title={order ? t('orders.number', { n: order.number }) : t('orders.title')}
      onBack={onBack}
      large={false}
    >
      {detail.loading && !data && <Loading />}
      {detail.error !== undefined && <ErrorBox error={detail.error} onRetry={detail.reload} />}
      {data && order && (
        <>
          <div className="order-hero">
            <span className="order-hero__total">{money(order.total, order.currency)}</span>
            <StatusPill status={order.status} />
            <span className="order-hero__date">{dateTime(order.createdAt)}</span>
            <Button small kind="secondary" busy={busy} onClick={() => setChoosing(true)}>
              {t('orders.changeStatus')}
            </Button>
          </div>
          <Section title={t('orders.products')}>
            {data.items
              .filter((i) => i.kind === 'product')
              .map((i) => (
                <Cell
                  key={i.id}
                  title={`${i.quantity} × ${i.name}`}
                  subtitle={
                    i.attributes.map((a) => `${a.name}: ${a.value}`).join(' · ') ||
                    i.sku ||
                    undefined
                  }
                  detail={money(i.total, order.currency)}
                />
              ))}
            <Cell title={t('orders.subtotal')} detail={money(order.subtotal, order.currency)} />
            {Number(order.discountTotal) > 0 && (
              <Cell
                title={t('orders.discount')}
                detail={`− ${money(order.discountTotal, order.currency)}`}
              />
            )}
            {Number(order.shippingTotal) > 0 && (
              <Cell
                title={t('orders.shippingTotal')}
                detail={money(order.shippingTotal, order.currency)}
              />
            )}
            {Number(order.taxTotal) > 0 && (
              <Cell title={t('orders.tax')} detail={money(order.taxTotal, order.currency)} />
            )}
            <Cell
              title={<strong>{t('orders.total')}</strong>}
              detail={<strong>{money(order.total, order.currency)}</strong>}
            />
          </Section>
          <Section title={t('orders.customer')}>
            <Cell
              title={addressLines(order.billing)[0] ?? order.email}
              subtitle={addressLines(order.billing).slice(1).join(', ')}
            />
            <Cell
              icon="mail"
              title={order.email}
              onClick={() => openExternal(`mailto:${order.email}`)}
            />
            {order.billing.phone && (
              <Cell
                icon="phone"
                title={order.billing.phone}
                onClick={() => openExternal(`tel:${order.billing.phone}`)}
              />
            )}
          </Section>
          {addressLines(order.shipping).length > 0 && (
            <Section title={t('orders.shipping')}>
              <Cell
                title={addressLines(order.shipping).join(', ')}
                subtitle={order.shippingMethod || undefined}
              />
            </Section>
          )}
          <Section title={t('orders.payment')}>
            <Cell title={order.paymentTitle || '—'} />
          </Section>
          {order.customerNote && (
            <Section title={t('orders.note')}>
              <Cell title={order.customerNote} />
            </Section>
          )}
          {data.notes.length > 0 && (
            <Section title={t('orders.history')}>
              {data.notes.map((n) => (
                <Cell
                  key={n.id}
                  title={n.note}
                  subtitle={`${n.author ? `${n.author} · ` : ''}${dateTime(n.createdAt)}`}
                />
              ))}
            </Section>
          )}
          <Sheet
            open={choosing}
            title={t('orders.changeStatus')}
            onClose={() => setChoosing(false)}
          >
            <div className="group">
              {ORDER_STATUSES.map((s) => (
                <Cell
                  key={s}
                  title={statusLabel(s)}
                  detail={s === order.status ? '✓' : undefined}
                  chevron={false}
                  onClick={() => void change(s)}
                />
              ))}
            </div>
          </Sheet>
        </>
      )}
    </Screen>
  );
}
