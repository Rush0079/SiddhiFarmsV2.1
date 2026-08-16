// Central registry of every admin-customizable image slot.
// `def` is the built-in default; admin overrides are stored in the
// Supabase `settings` table under key 'site_images' as { slotKey: url }.

const DETAIL_PAGES = [
  ['master-bedroom', 'Master Bedroom', '/siddhi/page-06.jpg', ['/siddhi/page-06.jpg', '/siddhi/page-08.jpg', '/siddhi/page-21.jpg']],
  ['2-bhk-villa', '2 BHK Villa', '/siddhi/page-08.jpg', ['/siddhi/page-08.jpg', '/siddhi/page-06.jpg', '/siddhi/page-12.jpg']],
  ['4-bhk-villa', '4 BHK Villa', '/siddhi/page-12.jpg', ['/siddhi/page-12.jpg', '/siddhi/page-08.jpg', '/siddhi/page-22.jpg']],
  ['farm-stays', 'Farm Stays', '/siddhi/page-02.jpg', ['/siddhi/page-06.jpg', '/siddhi/page-08.jpg', '/siddhi/page-21.jpg']],
  ['one-day-tour', 'One Day Tour', '/siddhi/page-13.jpg', ['/siddhi/page-13.jpg', '/siddhi/page-21.jpg', '/siddhi/page-22.jpg']],
  ['mini-water-park', 'Mini Water Park', '/siddhi/page-14.jpg', ['/siddhi/page-14.jpg', '/siddhi/page-13.jpg', '/siddhi/page-22.jpg']],
]

export const IMAGE_SECTIONS = [
  {
    title: 'Home page',
    slots: [
      { key: 'homeHero', label: 'Hero banner', def: '/siddhi/page-02.jpg' },
      { key: 'stayMasterBedroom', label: 'Stay card · Master bedrooms', def: '/siddhi/page-06.jpg' },
      { key: 'stayVilla2BHK', label: 'Stay card · 2 BHK villa', def: '/siddhi/page-08.jpg' },
      { key: 'stayVilla4BHK', label: 'Stay card · 4 BHK villa', def: '/siddhi/page-12.jpg' },
      { key: 'adventureShape', label: 'Adventure teaser (coming soon)', def: '/siddhi/page-13.jpg' },
      { key: 'gallery1', label: 'Gallery · Farmhouse', def: '/siddhi/page-06.jpg' },
      { key: 'gallery2', label: 'Gallery · Villa bedroom', def: '/siddhi/page-08.jpg' },
      { key: 'gallery3', label: 'Gallery · Swimming pool', def: '/siddhi/page-14.jpg' },
      { key: 'gallery4', label: 'Gallery · Restaurant', def: '/siddhi/page-21.jpg' },
      { key: 'gallery5', label: 'Gallery · Party lawn', def: '/siddhi/page-22.jpg' },
      { key: 'gallery6', label: 'Gallery · Kids adventure', def: '/siddhi/page-13.jpg' },
    ],
  },
  {
    title: 'Login page',
    slots: [{ key: 'loginSide', label: 'Login side panel', def: '/siddhi/page-02.jpg' }],
  },
  ...DETAIL_PAGES.map(([slug, title, hero, gallery]) => ({
    title: `Details · ${title}`,
    slots: [
      { key: `detail:${slug}:hero`, label: `${title} · Hero`, def: hero },
      ...gallery.map((def, i) => ({ key: `detail:${slug}:gallery${i + 1}`, label: `${title} · Gallery ${i + 1}`, def })),
    ],
  })),
]

export const IMAGE_DEFAULTS = Object.fromEntries(
  IMAGE_SECTIONS.flatMap(section => section.slots.map(slot => [slot.key, slot.def]))
)

export function siteImage(overrides, key) {
  return (overrides && overrides[key]) || IMAGE_DEFAULTS[key] || ''
}
