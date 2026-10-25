import type { TaskPlace } from '../../shared/simulation';
export interface Place { id: TaskPlace; name: string; icon: string; detail: string; x: number; z: number; color: string; }
export const PLACES: Place[] = [
  { id: 'coding', name: 'Build studio', icon: '⌘', detail: 'Coding, debugging & computer work', x: -7, z: -4, color: '#6d9488' },
  { id: 'cooking', name: 'Kitchen', icon: '♨', detail: 'Recipes, meal plans & food research', x: 0, z: -4, color: '#c18d6d' },
  { id: 'rest', name: 'Rest nook', icon: '☾', detail: 'A quiet place between tasks', x: 7, z: -4, color: '#9a95b4' },
  { id: 'writing', name: 'Library', icon: '¶', detail: 'Writing, reading & content work', x: -7, z: 3.6, color: '#b48b72' },
  { id: 'meeting', name: 'Common room', icon: '◎', detail: 'Coordination & collaboration', x: 0, z: 3.3, color: '#8a9a6f' },
  { id: 'travel', name: 'Atlas corner', icon: '◉', detail: 'Travel, itineraries & exploration', x: 7.4, z: 3.6, color: '#759cab' },
  { id: 'analysis', name: 'Planning board', icon: '▤', detail: 'Research, numbers & operations', x: 3.1, z: 1.7, color: '#ac9b6e' },
];
export const placeById = (id: TaskPlace) => PLACES.find(p => p.id === id);
// Clear circulation spine and entrances. Paths use these waypoints rather than walking through furniture.
export const AISLE_Z = -.25;
export const ENTRY = { x: 0, z: 7 };
