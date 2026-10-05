// Fonts are bundled locally (no network needed). Fraunces' latin-ext and
// vietnamese subsets cover the Yorùbá letters in the name: Ṣ, Ọ, and tone marks.
import '@fontsource/fraunces/400.css';
import '@fontsource/fraunces/500.css';
import '@fontsource/fraunces/600.css';
import '@fontsource/fraunces/400-italic.css';
import '@fontsource/fraunces/500-italic.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';

import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { HomeScene } from './scenes/HomeScene';
import { JournalScene } from './scenes/JournalScene';
import { ResultScene } from './scenes/ResultScene';
import { SettingsScene } from './scenes/SettingsScene';
import { SplashScene } from './scenes/SplashScene';
import { initServices } from './services';
import { devicePixelRatio } from './ui/layout';

/** Wait for the faces Phaser will draw with, but never longer than 3 s. */
async function loadFonts(): Promise<void> {
  const faces = [
    '600 64px Fraunces',
    '500 24px Fraunces',
    '400 24px Fraunces',
    'italic 400 18px Fraunces',
    'italic 500 18px Fraunces',
    '400 16px Inter',
    '600 14px Inter',
  ];
  const sample = 'AṢỌ aṣọ Ẹ̀ Abc 0123';
  await Promise.race([
    Promise.all(faces.map((f) => document.fonts.load(f, sample))).catch(() => undefined),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]);
}

/**
 * The canvas backing store is sized in device pixels and displayed at CSS
 * size via zoom = 1/dpr, so text and cloth stay crisp on high-density screens.
 */
function viewport() {
  const dpr = devicePixelRatio();
  return {
    w: Math.max(1, Math.round(window.innerWidth * dpr)),
    h: Math.max(1, Math.round(window.innerHeight * dpr)),
    dpr,
  };
}

/** A hidden iframe or webview can report a 0x0 window; WebGL cannot boot at that size. */
function whenVisible(): Promise<void> {
  if (window.innerWidth > 0 && window.innerHeight > 0) return Promise.resolve();
  return new Promise((resolve) => {
    const check = () => {
      if (window.innerWidth > 0 && window.innerHeight > 0) {
        window.removeEventListener('resize', check);
        resolve();
      }
    };
    window.addEventListener('resize', check);
  });
}

async function start(): Promise<void> {
  const services = initServices();
  await Promise.all([loadFonts(), whenVisible()]);
  const v = viewport();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'app',
    backgroundColor: '#F7F2E8',
    scale: { mode: Phaser.Scale.NONE, width: v.w, height: v.h, zoom: 1 / v.dpr },
    render: { antialias: true, mipmapFilter: 'LINEAR_MIPMAP_LINEAR' },
    // The game never uses the wheel: let it scroll the host page when embedded
    input: { activePointers: 2, mouse: { preventDefaultWheel: false } },
    disableContextMenu: true,
    banner: false,
    scene: [BootScene, SplashScene, HomeScene, GameScene, ResultScene, JournalScene, SettingsScene],
  });

  // Dev builds only: lets automated UI tests inspect scenes. Stripped from production.
  if (import.meta.env.DEV) Object.assign(window, { __ASO__: game, __ASO_SERVICES__: services });

  let frame = 0;
  const onResize = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      if (window.innerWidth === 0 || window.innerHeight === 0) return;
      const next = viewport();
      game.scale.setZoom(1 / next.dpr);
      game.scale.resize(next.w, next.h);
    });
  };
  window.addEventListener('resize', onResize);
  window.visualViewport?.addEventListener('resize', onResize);
}

void start();
