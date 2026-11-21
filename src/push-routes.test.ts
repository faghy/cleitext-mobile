import { describe, expect, it } from 'vitest';
import { routeForPush } from './App';

describe('notification taps', () => {
  it('open the matching screen', () => {
    expect(routeForPush({ type: 'comment.pending', id: 'c1' })).toEqual({ tab: 'comments' });
    expect(routeForPush({ type: 'form.message', id: 'm1' })).toEqual({
      tab: 'more',
      route: { name: 'message', id: 'm1' },
    });
    expect(routeForPush({ type: 'shop.order', id: 'o1' })).toEqual({
      tab: 'more',
      route: { name: 'order', id: 'o1' },
    });
    expect(routeForPush({ type: 'other', adminPath: '/cl-admin/x' })).toBeNull();
  });
});
