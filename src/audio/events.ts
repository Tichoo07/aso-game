/** Every sound the game can ask for. Scenes only ever refer to these names. */
export type SoundEvent =
  | 'piece_place'
  | 'line_clear'
  | 'pattern_complete'
  | 'combo'
  | 'game_over'
  | 'button_press'
  | 'piece_pickup'
  | 'invalid';

export type AmbientMood = 'calm' | 'slow';
