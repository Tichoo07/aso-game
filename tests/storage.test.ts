import { describe, expect, it } from 'vitest';
import {
  defaultSave,
  migrateSave,
  SaveStore,
  withDaily,
  withRunRecorded,
  withSettings,
  withWeave,
  type KeyValueStore,
} from '../src/storage/save';

function memory(initial: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v;
    },
  };
}

describe('persistence', () => {
  it('falls back to defaults for missing or corrupt saves', () => {
    expect(new SaveStore(memory()).data).toEqual(defaultSave());
    expect(new SaveStore(memory({ 'aso.save': '{not json' })).data).toEqual(defaultSave());
    expect(migrateSave(42)).toEqual(defaultSave());
  });

  it('repairs bad fields and keeps good ones', () => {
    const s = migrateSave({
      bestScore: -5,
      settings: { sound: false, language: 'xx', music: 'yes' },
      unlockedPatterns: ['a', 'a', 3, 'b'],
      daily: { '2026-10-05': { completed: true, bestScore: 900 }, nonsense: {} },
    });
    expect(s.bestScore).toBe(0);
    expect(s.settings.sound).toBe(false);
    expect(s.settings.music).toBe(true);
    expect(s.settings.language).toBe('en');
    expect(s.unlockedPatterns).toEqual(['a', 'b']);
    expect(Object.keys(s.daily)).toEqual(['2026-10-05']);
  });

  it('writes through to storage and reads back', () => {
    const store = memory();
    const a = new SaveStore(store);
    a.update((s) => withSettings(s, { haptics: false }));
    a.update((s) => withWeave(s, 'adire', 'adire.ring'));
    const b = new SaveStore(store);
    expect(b.data.settings.haptics).toBe(false);
    expect(b.data.unlockedPatterns).toEqual(['adire.ring']);
    expect(b.data.collections.adire.weaves).toBe(1);
  });

  it('survives storage that throws', () => {
    const broken: KeyValueStore = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('full');
      },
    };
    const store = new SaveStore(broken);
    expect(() => store.update((s) => withSettings(s, { sound: false }))).not.toThrow();
    expect(store.data.settings.sound).toBe(false);
  });

  it('tracks best score for classic runs only', () => {
    let save = defaultSave();
    let r = withRunRecorded(save, { mode: 'classic', score: 1200, lines: 8 });
    expect(r.isNewBest).toBe(true);
    save = r.save;
    r = withRunRecorded(save, { mode: 'classic', score: 800, lines: 3 });
    expect(r.isNewBest).toBe(false);
    expect(r.save.bestScore).toBe(1200);
    expect(r.save.lifetime).toMatchObject({ games: 2, lines: 11 });
    r = withRunRecorded(r.save, { mode: 'slow', score: 0, lines: 40 });
    expect(r.save.bestScore).toBe(1200);
  });

  it('tracks daily completion and best per date', () => {
    let save = withRunRecorded(defaultSave(), {
      mode: 'daily',
      score: 600,
      lines: 2,
      dailyKey: '2026-10-05',
      dailyCompleted: true,
    }).save;
    save = withRunRecorded(save, { mode: 'daily', score: 400, lines: 1, dailyKey: '2026-10-05' }).save;
    expect(save.daily['2026-10-05']).toEqual({ completed: true, bestScore: 600 });
    expect(save.bestScore).toBe(0);
  });

  it('keeps a bounded daily history', () => {
    let save = defaultSave();
    for (let d = 0; d < 100; d++) {
      const date = new Date(2026, 0, 1 + d);
      const key = date.toISOString().slice(0, 10);
      save = withDaily(save, key, { completed: true });
    }
    expect(Object.keys(save.daily).length).toBe(60);
  });
});
