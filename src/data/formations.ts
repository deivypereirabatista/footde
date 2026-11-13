import { FormationId, Position } from '../types/brasfoot';

export interface FormationSlot {
  index: number;
  roleLabel: string;
  reqPos: Position;
  x: number; // 0..100 (esquerda -> direita)
  y: number; // 0..100 (ataque no topo -> goleiro na base)
}

export const FORMATIONS: Record<FormationId, FormationSlot[]> = {
  '4-4-2': [
    { index: 0, roleLabel: 'GOL', reqPos: 'G', x: 50, y: 90 },
    { index: 1, roleLabel: 'LD', reqPos: 'L', x: 84, y: 72 },
    { index: 2, roleLabel: 'ZAG', reqPos: 'Z', x: 62, y: 75 },
    { index: 3, roleLabel: 'ZAG', reqPos: 'Z', x: 38, y: 75 },
    { index: 4, roleLabel: 'LE', reqPos: 'L', x: 16, y: 72 },
    { index: 5, roleLabel: 'VOL', reqPos: 'M', x: 62, y: 52 },
    { index: 6, roleLabel: 'VOL', reqPos: 'M', x: 38, y: 52 },
    { index: 7, roleLabel: 'MD', reqPos: 'M', x: 80, y: 38 },
    { index: 8, roleLabel: 'ME', reqPos: 'M', x: 20, y: 38 },
    { index: 9, roleLabel: 'ATA', reqPos: 'A', x: 64, y: 18 },
    { index: 10, roleLabel: 'ATA', reqPos: 'A', x: 36, y: 18 },
  ],
  '4-3-3': [
    { index: 0, roleLabel: 'GOL', reqPos: 'G', x: 50, y: 90 },
    { index: 1, roleLabel: 'LD', reqPos: 'L', x: 84, y: 72 },
    { index: 2, roleLabel: 'ZAG', reqPos: 'Z', x: 62, y: 75 },
    { index: 3, roleLabel: 'ZAG', reqPos: 'Z', x: 38, y: 75 },
    { index: 4, roleLabel: 'LE', reqPos: 'L', x: 16, y: 72 },
    { index: 5, roleLabel: 'VOL', reqPos: 'M', x: 50, y: 55 },
    { index: 6, roleLabel: 'MEI', reqPos: 'M', x: 70, y: 42 },
    { index: 7, roleLabel: 'MEI', reqPos: 'M', x: 30, y: 42 },
    { index: 8, roleLabel: 'PD', reqPos: 'A', x: 80, y: 22 },
    { index: 9, roleLabel: 'CA', reqPos: 'A', x: 50, y: 15 },
    { index: 10, roleLabel: 'PE', reqPos: 'A', x: 20, y: 22 },
  ],
  '4-2-3-1': [
    { index: 0, roleLabel: 'GOL', reqPos: 'G', x: 50, y: 90 },
    { index: 1, roleLabel: 'LD', reqPos: 'L', x: 84, y: 73 },
    { index: 2, roleLabel: 'ZAG', reqPos: 'Z', x: 62, y: 76 },
    { index: 3, roleLabel: 'ZAG', reqPos: 'Z', x: 38, y: 76 },
    { index: 4, roleLabel: 'LE', reqPos: 'L', x: 16, y: 73 },
    { index: 5, roleLabel: 'VOL', reqPos: 'M', x: 63, y: 56 },
    { index: 6, roleLabel: 'VOL', reqPos: 'M', x: 37, y: 56 },
    { index: 7, roleLabel: 'MAD', reqPos: 'M', x: 78, y: 35 },
    { index: 8, roleLabel: 'MEI', reqPos: 'M', x: 50, y: 34 },
    { index: 9, roleLabel: 'MAE', reqPos: 'M', x: 22, y: 35 },
    { index: 10, roleLabel: 'CA', reqPos: 'A', x: 50, y: 15 },
  ],
  '3-5-2': [
    { index: 0, roleLabel: 'GOL', reqPos: 'G', x: 50, y: 90 },
    { index: 1, roleLabel: 'ZAD', reqPos: 'Z', x: 72, y: 75 },
    { index: 2, roleLabel: 'ZAC', reqPos: 'Z', x: 50, y: 77 },
    { index: 3, roleLabel: 'ZAE', reqPos: 'Z', x: 28, y: 75 },
    { index: 4, roleLabel: 'ALD', reqPos: 'L', x: 85, y: 50 },
    { index: 5, roleLabel: 'VOL', reqPos: 'M', x: 62, y: 55 },
    { index: 6, roleLabel: 'VOL', reqPos: 'M', x: 38, y: 55 },
    { index: 7, roleLabel: 'ALE', reqPos: 'L', x: 15, y: 50 },
    { index: 8, roleLabel: 'MEI', reqPos: 'M', x: 50, y: 36 },
    { index: 9, roleLabel: 'ATA', reqPos: 'A', x: 64, y: 17 },
    { index: 10, roleLabel: 'ATA', reqPos: 'A', x: 36, y: 17 },
  ],
  '4-5-1': [
    { index: 0, roleLabel: 'GOL', reqPos: 'G', x: 50, y: 90 },
    { index: 1, roleLabel: 'LD', reqPos: 'L', x: 84, y: 73 },
    { index: 2, roleLabel: 'ZAG', reqPos: 'Z', x: 62, y: 76 },
    { index: 3, roleLabel: 'ZAG', reqPos: 'Z', x: 38, y: 76 },
    { index: 4, roleLabel: 'LE', reqPos: 'L', x: 16, y: 73 },
    { index: 5, roleLabel: 'VOL', reqPos: 'M', x: 50, y: 58 },
    { index: 6, roleLabel: 'MC', reqPos: 'M', x: 68, y: 46 },
    { index: 7, roleLabel: 'MC', reqPos: 'M', x: 32, y: 46 },
    { index: 8, roleLabel: 'MD', reqPos: 'M', x: 82, y: 34 },
    { index: 9, roleLabel: 'ME', reqPos: 'M', x: 18, y: 34 },
    { index: 10, roleLabel: 'CA', reqPos: 'A', x: 50, y: 16 },
  ],
  '3-4-3': [
    { index: 0, roleLabel: 'GOL', reqPos: 'G', x: 50, y: 90 },
    { index: 1, roleLabel: 'ZAD', reqPos: 'Z', x: 72, y: 75 },
    { index: 2, roleLabel: 'ZAC', reqPos: 'Z', x: 50, y: 77 },
    { index: 3, roleLabel: 'ZAE', reqPos: 'Z', x: 28, y: 75 },
    { index: 4, roleLabel: 'MD', reqPos: 'L', x: 84, y: 50 },
    { index: 5, roleLabel: 'MC', reqPos: 'M', x: 62, y: 50 },
    { index: 6, roleLabel: 'MC', reqPos: 'M', x: 38, y: 50 },
    { index: 7, roleLabel: 'ME', reqPos: 'L', x: 16, y: 50 },
    { index: 8, roleLabel: 'PD', reqPos: 'A', x: 78, y: 22 },
    { index: 9, roleLabel: 'CA', reqPos: 'A', x: 50, y: 15 },
    { index: 10, roleLabel: 'PE', reqPos: 'A', x: 22, y: 22 },
  ],
  '5-3-2': [
    { index: 0, roleLabel: 'GOL', reqPos: 'G', x: 50, y: 90 },
    { index: 1, roleLabel: 'LD', reqPos: 'L', x: 86, y: 68 },
    { index: 2, roleLabel: 'ZAD', reqPos: 'Z', x: 68, y: 75 },
    { index: 3, roleLabel: 'ZAC', reqPos: 'Z', x: 50, y: 78 },
    { index: 4, roleLabel: 'ZAE', reqPos: 'Z', x: 32, y: 75 },
    { index: 5, roleLabel: 'LE', reqPos: 'L', x: 14, y: 68 },
    { index: 6, roleLabel: 'VOL', reqPos: 'M', x: 66, y: 50 },
    { index: 7, roleLabel: 'MEI', reqPos: 'M', x: 50, y: 40 },
    { index: 8, roleLabel: 'VOL', reqPos: 'M', x: 34, y: 50 },
    { index: 9, roleLabel: 'ATA', reqPos: 'A', x: 63, y: 18 },
    { index: 10, roleLabel: 'ATA', reqPos: 'A', x: 37, y: 18 },
  ],
};

export function getCompatibilityMultiplier(playerPos: Position, slotReqPos: Position): number {
  if (playerPos === slotReqPos) return 1.0;
  // Goleiro na linha ou jogador de linha no gol sofre penalidade severa igual no Brasfoot
  if (playerPos === 'G' || slotReqPos === 'G') return 0.35;
  // Posições próximas (ex: L <-> M, Z <-> L, M <-> A) sofrem leve improviso
  if (
    (playerPos === 'L' && (slotReqPos === 'M' || slotReqPos === 'Z')) ||
    (playerPos === 'Z' && slotReqPos === 'L') ||
    (playerPos === 'M' && (slotReqPos === 'L' || slotReqPos === 'A')) ||
    (playerPos === 'A' && slotReqPos === 'M')
  ) {
    return 0.84;
  }
  return 0.68;
}
