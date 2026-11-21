/** The shapes of the Cleitext REST API the app reads (a subset of each). */

export interface Me {
  user: {
    id: string;
    email: string;
    displayName: string;
    locale: string;
    avatarUrl: string | null;
  };
  site: { id: string; name: string; defaultLocale: string; timezone: string };
  role: { slug: string; name: string } | null;
  capabilities: string[];
  version: string;
}

export type EntryStatus = 'draft' | 'pending' | 'scheduled' | 'published' | 'private' | 'trashed';

export interface EntrySummary {
  id: string;
  type: string;
  title: string;
  status: EntryStatus;
  updatedAt: string;
  publishedAt: string | null;
  author: { id: string; displayName: string } | null;
}

export interface EntryView extends EntrySummary {
  permissions?: { edit: boolean; publish: boolean; delete: boolean };
}

export type CommentStatus = 'pending' | 'approved' | 'spam' | 'trash';

export interface Comment {
  id: string;
  entryId: string;
  entryTitle: string;
  parentId: string | null;
  status: CommentStatus;
  authorName: string;
  authorEmail: string;
  authorUrl: string | null;
  content: string;
  createdAt: string;
}

export interface CommentList {
  items: Comment[];
  total: number;
  counts: Record<string, number>;
}

export interface MediaVariant {
  variant: string;
  format: string;
  url: string;
  width: number;
  height: number;
}

export interface Media {
  id: string;
  url: string;
  filename: string;
  mime: string;
  kind: 'image' | 'video' | 'audio' | 'document';
  width: number | null;
  height: number | null;
  createdAt: string;
  variants: MediaVariant[];
}

export interface SubmissionField {
  name: string;
  label: string;
  type: string;
  value: string;
}

export interface Submission {
  id: string;
  formName: string;
  pagePath: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  fields: SubmissionField[] | null;
  createdAt: string;
}

export const ORDER_STATUSES = [
  'pending',
  'processing',
  'on-hold',
  'completed',
  'cancelled',
  'refunded',
  'failed',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface OrderListItem {
  id: string;
  number: number;
  status: OrderStatus;
  total: string;
  currency: string;
  email: string;
  name: string;
  city: string;
  paymentTitle: string;
  items: number;
  createdAt: string;
}

export interface Address {
  firstName: string;
  lastName: string;
  company: string;
  address1: string;
  address2: string;
  city: string;
  postcode: string;
  province: string;
  country: string;
  phone: string;
}

export interface OrderDetail {
  order: {
    id: string;
    number: number;
    status: OrderStatus;
    currency: string;
    subtotal: string;
    shippingTotal: string;
    discountTotal: string;
    taxTotal: string;
    total: string;
    email: string;
    paymentTitle: string;
    shippingMethod: string;
    billing: Address;
    shipping: Address;
    customerNote: string;
    createdAt: string;
  };
  items: {
    id: string;
    kind: 'product' | 'shipping' | 'fee';
    name: string;
    sku: string;
    quantity: number;
    total: string;
    attributes: { name: string; value: string }[];
  }[];
  notes: { id: string; note: string; customer: boolean; author: string; createdAt: string }[];
}

export type PushEvent = 'comment.pending' | 'form.message' | 'shop.order';
export const PUSH_EVENTS: PushEvent[] = ['comment.pending', 'form.message', 'shop.order'];

export interface PushStatus {
  enabled: boolean;
  events: string[];
}

export interface PushDevice {
  id: string;
  platform: 'ios' | 'android';
  name?: string | null;
  events: string[];
}

/** The data of a notification sent by a site (core ↔ app contract). */
export interface PushData {
  type?: string;
  siteUrl?: string;
  adminPath?: string;
  id?: string;
}
