import type { GameTemplate } from '@tabletop/contracts';

// Add a definition here; event creation and rendering contain no game-specific branches.
export const GAME_TEMPLATES: readonly GameTemplate[] = [
  {
    id: 'magic',
    name: 'Magic: The Gathering',
    formats: ['Commander', 'Standard', 'Booster Draft'],
    defaultDurationMinutes: 180,
    defaultCapacity: 24,
  },
  {
    id: 'arena',
    name: 'Magic: The Gathering Arena',
    formats: ['Standard', 'Historic', 'Brawl'],
    defaultDurationMinutes: 120,
    defaultCapacity: 16,
  },
  {
    id: 'dnd',
    name: 'Dungeons & Dragons',
    formats: ['One-shot', 'Campaign session', 'Learn to Play'],
    defaultDurationMinutes: 240,
    defaultCapacity: 6,
  },
];
