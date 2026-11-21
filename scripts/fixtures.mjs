// Demo data for the store screenshots: a made-up site with plausible content.
// No real customer data.

export const ORIGIN = 'https://demo.cleitext.com';
const now = Date.now();
const ago = (minutes) => new Date(now - minutes * 60_000).toISOString();

const T = {
  it: {
    site: 'Bottega del Mare',
    user: 'Giulia Ferri',
    role: 'Amministratore',
    drafts: [
      'Le ricette di novembre: zuppa di pesce',
      'Orari di apertura per le feste',
      'Nuovi arrivi in cantina',
    ],
    entries: ['Il pesce del giorno', 'La nostra storia', 'Pranzo della domenica'],
    comments: [
      [
        'Marco Bellini',
        'Siamo stati da voi sabato sera: frittura leggerissima e servizio gentilissimo. Torneremo presto!',
      ],
      [
        'Elena Rossi',
        'Avete anche opzioni senza glutine? Vorrei prenotare per una cena di compleanno.',
      ],
      [
        'Paolo Greco',
        'La ricetta del brodetto è fantastica, l’ho rifatta a casa con i miei figli.',
      ],
    ],
    messages: [
      [
        'Chiara Martini',
        'chiara.martini@example.com',
        '+39 333 123 4567',
        'Buongiorno, vorrei prenotare un tavolo per 6 persone venerdì sera alle 20:30. È possibile avere un tavolo in terrazza?',
        'Prenotazioni',
      ],
      [
        'Luca Fontana',
        'luca.fontana@example.com',
        null,
        'Organizzate anche pranzi aziendali? Saremmo circa 25 persone a metà dicembre.',
        'Contatti',
      ],
      [
        'Sara Colombo',
        'sara.colombo@example.com',
        '+39 347 555 0101',
        'Vendete anche le vostre conserve di pomodoro? Mi piacerebbe regalarle a Natale.',
        'Contatti',
      ],
      [
        'Davide Russo',
        'davide.russo@example.com',
        null,
        'Complimenti per il nuovo sito, è bellissimo!',
        'Contatti',
      ],
    ],
    products: [
      ['Conserva di pomodoro 500 g', 3, '6.50'],
      ['Olio extravergine 0,75 l', 1, '14.90'],
      ['Colatura di alici 100 ml', 2, '9.80'],
    ],
    note: 'Se possibile, consegna dopo le 15. Grazie!',
    orderNote: 'Pagamento con bonifico ricevuto.',
    shipping: 'Corriere espresso',
    payment: 'Bonifico bancario',
    city: 'Genova',
    draftTitle: 'Il pescato di stamattina',
    draftText:
      'Oggi al mercato abbiamo trovato **gamberi rossi** e *pesce spada* freschissimi.\n\nA pranzo li trovate così:\n- tartare di gamberi\n- spada alla griglia con capperi\n\nVi aspettiamo!',
    alt: 'Il banco del pesce al mercato',
  },
  en: {
    site: 'Seaside Kitchen',
    user: 'Giulia Ferri',
    role: 'Administrator',
    drafts: ['November recipes: fish soup', 'Holiday opening hours', 'New arrivals in the cellar'],
    entries: ['Catch of the day', 'Our story', 'Sunday lunch'],
    comments: [
      [
        'Mark Bell',
        'We came on Saturday night: the lightest fried fish and the kindest service. We will be back soon!',
      ],
      ['Ellen Ross', 'Do you have gluten-free options? I would like to book a birthday dinner.'],
      ['Paul Green', 'The fish stew recipe is amazing, I made it at home with my kids.'],
    ],
    messages: [
      [
        'Claire Martin',
        'claire.martin@example.com',
        '+44 7700 900123',
        'Hello, I would like to book a table for 6 on Friday at 8:30 pm. Could we sit on the terrace?',
        'Bookings',
      ],
      [
        'Luke Fountain',
        'luke.fountain@example.com',
        null,
        'Do you host company lunches? We would be about 25 people in mid December.',
        'Contact',
      ],
      [
        'Sarah Collins',
        'sarah.collins@example.com',
        '+44 7700 900456',
        'Do you also sell your tomato preserves? I would love to give them as Christmas gifts.',
        'Contact',
      ],
      [
        'David Russell',
        'david.russell@example.com',
        null,
        'Congratulations on the new website, it looks great!',
        'Contact',
      ],
    ],
    products: [
      ['Tomato preserve 500 g', 3, '6.50'],
      ['Extra virgin olive oil 0.75 l', 1, '14.90'],
      ['Anchovy sauce 100 ml', 2, '9.80'],
    ],
    note: 'If possible, deliver after 3 pm. Thanks!',
    orderNote: 'Bank transfer received.',
    shipping: 'Express courier',
    payment: 'Bank transfer',
    city: 'Bristol',
    draftTitle: 'This morning’s catch',
    draftText:
      'At the market today we found very fresh **red prawns** and *swordfish*.\n\nFor lunch you will find them as:\n- prawn tartare\n- grilled swordfish with capers\n\nSee you soon!',
    alt: 'The fish counter at the market',
  },
};

export function texts(lang) {
  return T[lang];
}

export function fixtures(lang) {
  const t = T[lang];
  const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
  const comments = t.comments.map(([name, content], i) => ({
    id: id(100 + i),
    entryId: id(200 + i),
    entryTitle: t.entries[i],
    parentId: null,
    type: 'comment',
    status: 'pending',
    userId: null,
    authorName: name,
    authorEmail: `${name.split(' ')[0].toLowerCase()}@example.com`,
    authorUrl: null,
    content,
    ip: null,
    createdAt: ago([18, 95, 300][i]),
  }));
  const submissions = t.messages.map(([name, email, phone, message, form], i) => ({
    id: id(300 + i),
    formName: form,
    pagePath: form === 'Prenotazioni' || form === 'Bookings' ? '/prenota' : '/contatti',
    name,
    email,
    phone,
    message,
    fields: null,
    createdAt: ago([12, 140, 1500, 3000][i]),
  }));
  const address = {
    firstName: 'Anna',
    lastName: 'Bianchi',
    company: '',
    address1: lang === 'it' ? 'Via del Porto 12' : '12 Harbour Street',
    address2: '',
    city: t.city,
    postcode: lang === 'it' ? '16128' : 'BS1 4RW',
    province: lang === 'it' ? 'GE' : '',
    country: lang === 'it' ? 'IT' : 'GB',
    phone: lang === 'it' ? '+39 340 111 2233' : '+44 7700 900789',
  };
  const orderList = [
    [1048, 'processing', '56.60', 'Anna Bianchi', 6, 25],
    [1047, 'processing', '29.80', 'Roberto Galli', 2, 190],
    [1046, 'on-hold', '74.20', 'Francesca Riva', 7, 600],
    [1045, 'completed', '19.50', 'Matteo Conti', 3, 1600],
    [1044, 'completed', '42.00', 'Laura Ferrari', 4, 2900],
    [1043, 'completed', '88.40', 'Giorgio Marino', 9, 4300],
  ].map(([number, status, total, name, items, minutes], i) => ({
    id: id(400 + i),
    number,
    status,
    total,
    currency: 'EUR',
    email: `${name.split(' ')[0].toLowerCase()}@example.com`,
    name,
    city: t.city,
    paymentTitle: t.payment,
    items,
    createdAt: ago(minutes),
  }));
  const orderDetail = {
    order: {
      id: id(400),
      number: 1048,
      status: 'processing',
      currency: 'EUR',
      subtotal: '53.70',
      shippingTotal: '7.90',
      discountTotal: '5.00',
      taxTotal: '0',
      total: '56.60',
      email: 'anna.bianchi@example.com',
      paymentTitle: t.payment,
      shippingMethod: t.shipping,
      billing: address,
      shipping: address,
      customerNote: t.note,
      createdAt: ago(25),
    },
    items: t.products.map(([name, quantity, price], i) => ({
      id: id(500 + i),
      kind: 'product',
      name,
      sku: '',
      quantity,
      total: (Number(price) * quantity).toFixed(2),
      attributes: [],
    })),
    notes: [
      { id: id(600), note: t.orderNote, customer: false, author: t.user, createdAt: ago(20) },
    ],
    refunds: [],
    refunded: '0.00',
    refundable: '56.60',
    documents: [],
  };
  const media = Array.from({ length: 12 }, (_, i) => ({
    id: id(700 + i),
    url: `/demo/photo-${(i % 6) + 1}.jpg`,
    filename: `foto-${i + 1}.jpg`,
    mime: 'image/jpeg',
    kind: 'image',
    sizeBytes: 120_000,
    width: 1200,
    height: 1200,
    alt: {},
    caption: {},
    title: {},
    description: {},
    uploadedBy: null,
    createdAt: ago(60 * i),
    variants: [],
    focalPoint: null,
  }));
  return {
    me: {
      user: {
        id: id(1),
        email: 'giulia@example.com',
        username: null,
        displayName: t.user,
        locale: lang,
        isSuperAdmin: false,
        avatarUrl: null,
        twoFactorEnabled: false,
      },
      site: {
        id: id(2),
        name: t.site,
        slug: 'demo',
        defaultLocale: lang,
        timezone: 'Europe/Rome',
        locales: [],
        defaultEditors: {},
      },
      role: { slug: 'administrator', name: t.role },
      capabilities: [
        'edit_entries',
        'publish_entries',
        'upload_media',
        'moderate_comments',
        'manage_forms',
      ],
      sites: [],
      version: '0.117.0',
    },
    drafts: {
      items: t.drafts.map((title, i) => ({
        id: id(800 + i),
        type: 'article',
        title,
        status: 'draft',
        updatedAt: ago([40, 300, 2000][i]),
        publishedAt: null,
        author: { id: id(1), displayName: t.user },
      })),
      nextCursor: null,
    },
    comments: {
      items: comments,
      total: comments.length,
      counts: { pending: 3, approved: 128, spam: 4, trash: 0, all: 135 },
    },
    submissions,
    orders: {
      items: orderList,
      total: orderList.length,
      statuses: { processing: 2, 'on-hold': 1, completed: 3 },
    },
    orderDetail,
    media: { items: media, nextCursor: null },
    pushStatus: { enabled: true, events: ['comment.pending', 'form.message', 'shop.order'] },
  };
}
