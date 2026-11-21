import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon, type IconName } from './components/icons';
import { Loading, ToastProvider } from './components/ui';
import { t, type MessageKey } from './i18n';
import { registry } from './lib/app';
import { adminUrl, onAppUrl, openInBrowser, prepareChrome } from './lib/native';
import { initPush } from './lib/push';
import { signIn } from './lib/signin';
import type { PushData } from './lib/types';
import { NavContext, ShopContext, useSites, type Nav, type Route, type Tab } from './nav';
import { Comments } from './screens/Comments';
import { Home } from './screens/Home';
import { MediaScreen } from './screens/Media';
import { MessageDetail, Messages } from './screens/Messages';
import { Licenses, More, Settings } from './screens/More';
import { Notifications } from './screens/Notifications';
import { OrderDetail, Orders } from './screens/Orders';
import { AccountScreen, ProductScreen, RegisterScreen, ShopScreen } from './screens/Shop';
import { AddSite, SitesScreen, Welcome } from './screens/Sites';
import { Write } from './screens/Write';
import { DEFAULT_CONFIG, loadShopConfig, type ShopConfig } from './shop/catalog';

const TABS: { id: Tab; icon: IconName; label: MessageKey; needsSite: boolean }[] = [
  { id: 'home', icon: 'home', label: 'tab.home', needsSite: false },
  { id: 'write', icon: 'write', label: 'tab.write', needsSite: true },
  { id: 'comments', icon: 'comments', label: 'tab.comments', needsSite: true },
  { id: 'shop', icon: 'shop', label: 'tab.shop', needsSite: false },
  { id: 'more', icon: 'more', label: 'tab.more', needsSite: false },
];

const ROOT: Route = { name: 'root' };
const emptyStacks = (): Record<Tab, Route[]> => ({
  home: [ROOT],
  write: [ROOT],
  comments: [ROOT],
  shop: [ROOT],
  more: [ROOT],
});

/** The tab and route a notification leads to (data.type / id), else null. */
export function routeForPush(data: PushData): { tab: Tab; route?: Route } | null {
  switch (data.type) {
    case 'comment.pending':
      return { tab: 'comments' };
    case 'form.message':
      return data.id
        ? { tab: 'more', route: { name: 'message', id: data.id } }
        : { tab: 'more', route: { name: 'messages' } };
    case 'shop.order':
      return data.id
        ? { tab: 'more', route: { name: 'order', id: data.id } }
        : { tab: 'more', route: { name: 'orders' } };
    default:
      return null;
  }
}

export function App() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>('home');
  const [stacks, setStacks] = useState(emptyStacks);
  const [shop, setShop] = useState<ShopConfig>(DEFAULT_CONFIG);
  const { current, sites } = useSites();

  const nav = useMemo<Nav>(
    () => ({
      tab,
      setTab: (next) => {
        // Tapping the current tab goes back to its first screen.
        if (next === tab) setStacks((s) => ({ ...s, [next]: [ROOT] }));
        setTab(next);
      },
      push: (route) => setStacks((s) => ({ ...s, [tab]: [...s[tab], route] })),
      pop: () =>
        setStacks((s) => ({ ...s, [tab]: s[tab].length > 1 ? s[tab].slice(0, -1) : s[tab] })),
      open: (target, route) => {
        setStacks((s) => ({ ...s, [target]: route ? [ROOT, route] : [ROOT] }));
        setTab(target);
      },
    }),
    [tab],
  );

  const openPush = useCallback(
    (data: PushData) => {
      const site = registry.findByUrl(data.siteUrl);
      if (!site) return;
      void registry.select(site.id).then(() => {
        const target = routeForPush(data);
        if (target) nav.open(target.tab, target.route);
        else if (data.adminPath) void openInBrowser(adminUrl(site, data.adminPath));
      });
    },
    [nav],
  );

  useEffect(() => {
    void registry.load().then(() => setReady(true));
    void loadShopConfig().then(setShop);
    const dark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    void prepareChrome(dark);
    onAppUrl((url) => {
      void signIn.handleUrl(url).then((site) => {
        if (site) {
          setStacks(emptyStacks());
          setTab('home');
        }
      });
    });
  }, []);

  useEffect(() => {
    initPush((data) => openPush(data));
    // Registered once; later notifications use the latest handler through the registry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready) return <Loading />;

  const stack = stacks[tab];
  const route = stack[stack.length - 1]!;
  const back = stack.length > 1 ? nav.pop : undefined;
  const site = current && !current.signedOut ? current : null;

  const screen = (() => {
    switch (route.name) {
      case 'addSite':
        return <AddSite onBack={back} />;
      case 'sites':
        return <SitesScreen onBack={back} />;
      case 'settings':
        return <Settings onBack={nav.pop} />;
      case 'licenses':
        return <Licenses onBack={nav.pop} />;
      case 'notifications':
        return <Notifications onBack={nav.pop} />;
      case 'product':
        return <ProductScreen slug={route.slug} onBack={nav.pop} />;
      case 'account':
        return <AccountScreen onBack={nav.pop} />;
      case 'register':
        return <RegisterScreen onBack={nav.pop} />;
      default:
        break;
    }
    if (route.name === 'root') {
      if (tab === 'shop') return <ShopScreen />;
      if (tab === 'more') return <More />;
      if (!site) {
        if (current?.signedOut) return <AddSite initial={current.origin} siteId={current.id} />;
        return <Welcome />;
      }
      if (tab === 'write') return <Write key={site.id} site={site} />;
      if (tab === 'comments') return <Comments key={site.id} site={site} />;
      return <Home key={site.id} site={site} />;
    }
    if (!site) return <Welcome />;
    switch (route.name) {
      case 'messages':
        return <Messages site={site} onBack={nav.pop} />;
      case 'message':
        return <MessageDetail site={site} id={route.id} onBack={nav.pop} />;
      case 'orders':
        return <Orders site={site} onBack={nav.pop} />;
      case 'order':
        return <OrderDetail site={site} id={route.id} onBack={nav.pop} />;
      case 'media':
        return <MediaScreen site={site} onBack={nav.pop} />;
      default:
        return null;
    }
  })();

  const tabs = TABS.filter((item) => !item.needsSite || sites.length > 0);
  return (
    <ShopContext.Provider value={shop}>
      <NavContext.Provider value={nav}>
        <ToastProvider>
          <div className="app">
            <main className="app__main" key={`${tab}:${stack.length}`}>
              {screen}
            </main>
            <nav className="tabbar" aria-label="Cleitext">
              {tabs.map((item) => (
                <button
                  key={item.id}
                  className={`tabbar__item${item.id === tab ? ' tabbar__item--on' : ''}`}
                  aria-current={item.id === tab ? 'page' : undefined}
                  onClick={() => nav.setTab(item.id)}
                >
                  <Icon name={item.icon} size={25} strokeWidth={item.id === tab ? 2.2 : 1.8} />
                  <span>{t(item.label)}</span>
                </button>
              ))}
            </nav>
          </div>
        </ToastProvider>
      </NavContext.Provider>
    </ShopContext.Provider>
  );
}
