/** English strings. This is the complete key set; other locales may be partial. */
export const en = {
  appName: 'AṢỌ',
  tagline: 'Make something beautiful.',
  splashLine: 'A textile puzzle',

  todaysWeave: "Today's Weave",
  dailyNotYet: 'Not yet woven · Tap to begin',
  dailyWoven: 'Woven today · Play again',
  play: 'PLAY',
  slowWeave: 'SLOW WEAVE',
  journal: 'Your Cloth Journal',
  bestLine: 'Best {score}',

  score: 'SCORE',
  best: 'BEST',
  today: 'TODAY',
  motif: 'MOTIF',
  todaysMotif: "TODAY'S MOTIF",
  weaveHint: 'Weave this shape anywhere',
  weaveHintTurn: 'Anywhere, any turn',
  resistHint: '○ stays empty',
  slowWeaveTitle: 'Slow Weave',
  slowWeaveHint: 'No score. No hurry.',
  weaveComplete: 'WEAVE COMPLETE',
  dailyComplete: "Today's weave is complete",
  combo: 'Combo ×{n}',
  loosen: 'The cloth loosens',
  noSpace: 'No space left for these threads',
  dragHint: 'Drag a piece onto the cloth',

  paused: 'Paused',
  resume: 'RESUME',
  restart: 'START OVER',
  home: 'HOME',

  scoreGained: 'SCORE GAINED',
  finalScore: 'FINAL SCORE',
  bestScore: 'BEST SCORE',
  newBest: 'New best',
  playAgain: 'PLAY AGAIN',
  linesPart: 'Lines {n}',
  motifsPart: 'Motifs {n}',
  combosPart: 'Combos {n}',
  dailyMotifWoven: "Today's motif woven",
  dailyMotifMissed: "Today's motif not woven",

  progress: '{n} of {total} motifs woven',
  woven: 'Woven',
  locked: 'Locked',
  comingSoon: 'Coming soon',
  collectionOf: '{n} / {total}',

  settings: 'Settings',
  sound: 'Sound',
  music: 'Music',
  haptics: 'Haptics',
  reduceMotion: 'Reduce motion',
  highContrast: 'High contrast',
  language: 'Language',
  about: 'About',
  on: 'On',
  off: 'Off',
  hapticsUnsupported: 'Not supported on this device',

  aboutTitle: 'About AṢỌ',
  aboutBody:
    'A calm puzzle about making cloth. Place threads on the loom, complete rows and columns, and weave the motif shown above the board.\n\n' +
    'The first collection draws on adire, Yorùbá indigo resist-dyed cloth. Motif names in the game describe their shapes only; they do not claim traditional meanings.\n\n' +
    'Version 0.1',
  close: 'CLOSE',
} as const;

export type StringKey = keyof typeof en;
