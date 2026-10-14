// نخ بده — the boards the game can be played on. Each one is a tall picture with 60 cells
// (coords are % of the picture), grouped into 5 areas. `free` boards are always available; the
// others are bought in the shop («نقشه»). Pictures are only fetched when a board is in use.
const MAPS = [
  {
    id: 'iran', name: 'سفر به تهران', blurb: 'از بندرعباس تا برج آزادی',
    cities: ['بندرعباس','شیراز','اصفهان','رشت','تهران'],
    finish: 'برج آزادی', goalText: 'به تهران رسیدی! برج آزادی منتظرته',
    image: 'assets/map-60j.webp', lite: 'assets/map-60j-lite.webp', ratio: 2160 / 11880,
    coords: CELL_COORDS, cellCity: CELL_CITY, fx: true, price: 0, free: true
  }
];
