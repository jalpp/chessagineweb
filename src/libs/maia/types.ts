import Maia from "./maia"

export type MaiaStatus =
  | 'loading'
  | 'no-cache'
  | 'downloading'
  | 'ready'
  | 'error'

export interface MaiaEngine {
  maia?: Maia
  status: MaiaStatus
  progress: number
  downloadModel: () => void
}

export const MAIA_MODELS = [
  'maia_kdd_1100',
  'maia_kdd_1200',
  'maia_kdd_1300',
  'maia_kdd_1400',
  'maia_kdd_1500',
  'maia_kdd_1600',
  'maia_kdd_1700',
  'maia_kdd_1800',
  'maia_kdd_1900',
]

export const MAIA_MODELS_WITH_NAMES = MAIA_MODELS.map((model) => ({
  id: model,
  name: model.replace('maia_kdd_', 'Maia '),
}))

export interface MaiaEvaluation {
  value: number
  policy: { [key: string]: number }
}

export function getPolicyValue(evaluation: MaiaEvaluation, moveKey: string): number {
  return evaluation.policy[moveKey] ?? 0;
}