import { describe, expect, it, vi } from 'vitest';
import { cartLink, DEFAULT_CONFIG, mergeRemote, register } from './catalog';

describe('shop catalog', () => {
  it('ships the paid products with plans and VAT-excluded prices', () => {
    const slugs = DEFAULT_CONFIG.products.map((p) => p.slug);
    expect(slugs).toContain('vitality');
    expect(slugs).toContain('campus');
    const campus = DEFAULT_CONFIG.products.find((p) => p.slug === 'campus')!;
    expect(campus.plans.map((p) => p.price)).toEqual([29, 99, 190]);
    expect(DEFAULT_CONFIG.vat).toBe(22);
  });

  it('builds the cart link of a plan', () => {
    const plan = DEFAULT_CONFIG.products[0]!.plans[0]!;
    expect(cartLink(plan, 'it')).toBe(
      `https://cleitext.com/it/cart/add?product=${plan.id}&quantity=1`,
    );
    expect(cartLink(plan, 'en')).toBe(
      `https://cleitext.com/cart/add?product=${plan.id}&quantity=1`,
    );
  });

  it('applies the remote switch per platform and ignores broken lists', () => {
    const merged = mergeRemote(DEFAULT_CONFIG, {
      purchase: { ios: false },
      products: [{ bad: true }],
    });
    expect(merged.purchase).toMatchObject({ ios: false, android: true });
    expect(merged.products).toBe(DEFAULT_CONFIG.products);
    expect(mergeRemote(DEFAULT_CONFIG, null)).toBe(DEFAULT_CONFIG);
  });
});

describe('registration', () => {
  const input = { name: 'Anna', email: 'anna@esempio.it', password: 'passwordlunga', terms: true };

  it('posts the form fields and reads the JSON answer', async () => {
    const post = vi.fn().mockResolvedValue({
      status: 200,
      data: { ok: true, redirect: '/it/account/register?sent=1' },
    });
    expect(await register(input, 'it', post)).toEqual({ kind: 'sent' });
    const [url, headers, body] = post.mock.calls[0]!;
    expect(url).toBe('https://cleitext.com/it/account/register');
    expect(headers.accept).toBe('application/json');
    expect(Object.fromEntries(new URLSearchParams(body))).toEqual({
      name: 'Anna',
      email: 'anna@esempio.it',
      password: 'passwordlunga',
      terms: '1',
    });
  });

  it('handles closed sign-ups, challenges and refusals', async () => {
    const answer = (status: number, data: unknown) => vi.fn().mockResolvedValue({ status, data });
    expect(
      await register(
        input,
        'it',
        answer(403, { ok: false, message: 'Le iscrizioni a questo sito sono chiuse.' }),
      ),
    ).toMatchObject({ kind: 'closed' });
    expect(
      await register(input, 'it', answer(400, { ok: false, message: 'x', challenge: true })),
    ).toEqual({
      kind: 'browser',
    });
    expect(await register(input, 'it', answer(403, null))).toEqual({ kind: 'browser' });
    expect(
      await register(
        input,
        'en',
        answer(400, { ok: false, message: 'This email address is not valid.' }),
      ),
    ).toEqual({
      kind: 'error',
      message: 'This email address is not valid.',
    });
  });
});
