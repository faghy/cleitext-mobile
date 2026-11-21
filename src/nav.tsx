import { createContext, useContext, useSyncExternalStore } from 'react';
import { registry } from './lib/app';
import type { ShopConfig } from './shop/catalog';

export type Tab = 'home' | 'write' | 'comments' | 'shop' | 'more';

export type Route =
  | { name: 'root' }
  | { name: 'orders' }
  | { name: 'order'; id: string }
  | { name: 'messages' }
  | { name: 'message'; id: string }
  | { name: 'media' }
  | { name: 'notifications' }
  | { name: 'sites' }
  | { name: 'addSite' }
  | { name: 'settings' }
  | { name: 'licenses' }
  | { name: 'product'; slug: string }
  | { name: 'account' }
  | { name: 'register' };

export interface Nav {
  tab: Tab;
  setTab: (tab: Tab) => void;
  push: (route: Route) => void;
  pop: () => void;
  /** Opens a route on a tab, from its root (notifications, shortcuts). */
  open: (tab: Tab, route?: Route) => void;
}

export const NavContext = createContext<Nav | null>(null);

export function useNav(): Nav {
  const nav = useContext(NavContext);
  if (!nav) throw new Error('NavContext missing');
  return nav;
}

export function useSites() {
  return useSyncExternalStore(registry.subscribe, registry.getSnapshot);
}

export const ShopContext = createContext<ShopConfig | null>(null);

export function useShop(): ShopConfig {
  const shop = useContext(ShopContext);
  if (!shop) throw new Error('ShopContext missing');
  return shop;
}
