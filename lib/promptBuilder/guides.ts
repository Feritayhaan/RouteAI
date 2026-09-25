// Derlenmiş rehberler (data/prompt-guides.json, `npm run build:guides`).
// Edge'de fs yok: JSON import edilir, bir kez doğrulanır.

import guidesJson from '../../data/prompt-guides.json';
import { guidesFileSchema, type Guide } from './guideSchema';

let cached: Guide[] | null = null;

export function loadGuides(): Guide[] {
  if (!cached) cached = guidesFileSchema.parse(guidesJson);
  return cached;
}
