import { describe, expect, it } from 'vitest';
import { detectLanguage, t } from './i18n';

describe('i18n', () => {
  it('follows the device language, Italian by default', () => {
    expect(detectLanguage(['en-US', 'it-IT'])).toBe('en');
    expect(detectLanguage(['it-CH'])).toBe('it');
    expect(detectLanguage(['de-DE', 'fr-FR'])).toBe('it');
    expect(detectLanguage([])).toBe('it');
  });

  it('fills placeholders', () => {
    expect(t('orders.number', { n: 42 }, 'it')).toBe('Ordine n. 42');
    expect(t('orders.number', { n: 42 }, 'en')).toBe('Order #42');
  });
});
