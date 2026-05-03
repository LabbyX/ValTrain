/**
 * Картинки карт: файлы кладите в папку `public/img/` и при необходимости поменяйте имя в `image`
 * (путь всегда от корня сайта, например `/img/ascent.webp`).
 */
export const RANKED_MAPS = [
  { id: 'abyss', name: 'Abyss', image: '/img/abyss.jpg' },
  { id: 'ascent', name: 'Ascent', image: '/img/ascent.jpg' },
  { id: 'bind', name: 'Bind', image: '/img/bind.jpeg' },
  { id: 'breeze', name: 'Breeze', image: '/img/breeze.png' },
  { id: 'fracture', name: 'Fracture', image: '/img/fracture.png' },
  { id: 'haven', name: 'Haven', image: '/img/haven.webp' },
  { id: 'icebox', name: 'Icebox', image: '/img/icebox.webp' },
  { id: 'lotus', name: 'Lotus', image: '/img/lotus.webp' },
  { id: 'pearl', name: 'Pearl', image: '/img/pearl.webp' },
  { id: 'split', name: 'Split', image: '/img/split.webp' },
  { id: 'sunset', name: 'Sunset', image: '/img/sunset.webp' },
] as const

export type RankedMapId = (typeof RANKED_MAPS)[number]['id']

/** Основное оружие для Deathmatch / покупки */
export const VALORANT_WEAPONS = [
  'Classic',
  'Shorty',
  'Frenzy',
  'Ghost',
  'Sheriff',
  'Stinger',
  'Spectre',
  'Bucky',
  'Judge',
  'Bulldog',
  'Guardian',
  'Phantom',
  'Vandal',
  'Marshal',
  'Operator',
  'Ares',
  'Odin',
  'Melee',
] as const

export type WeaponName = (typeof VALORANT_WEAPONS)[number]
