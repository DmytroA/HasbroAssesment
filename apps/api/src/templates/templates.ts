import type { GameTemplate } from '@tabletop/contracts';

// Add a definition here; event creation and rendering contain no game-specific branches.
export const GAME_TEMPLATES: readonly GameTemplate[] = [
  { id: 'magic', name: 'Magic: The Gathering', formats: ['Commander', 'Standard', 'Booster Draft'], defaultDurationMinutes: 180, defaultCapacity: 24 },
  { id: 'pokemon', name: 'Pokémon', formats: ['Standard', 'Expanded'], defaultDurationMinutes: 120, defaultCapacity: 16 },
  { id: 'yugioh', name: 'Yu-Gi-Oh!', formats: ['Advanced', 'Traditional'], defaultDurationMinutes: 150, defaultCapacity: 16 },
];
