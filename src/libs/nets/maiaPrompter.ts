interface SanMaiaEvaluation {
  value: number
  policy: { [key: string]: number }
}

interface MaiaEvaluations {
  maia2?: { [key: string]: SanMaiaEvaluation } | null
  bigLeela?: SanMaiaEvaluation | null
  elitemaia?: SanMaiaEvaluation | null
}

export const getNetAnalysisSpeech = (
  sanEvaluations: MaiaEvaluations
): string => {
  if (!sanEvaluations) {
    return ''
  }

  let speech = ''

  // Maia 1900 Analysis (most relevant skill level)
  const maia1900 = sanEvaluations.maia2?.['maia_kdd_1900']
  if (maia1900) {
    const winRate = (maia1900.value * 100).toFixed(1)
    const topMoves = Object.entries(maia1900.policy)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([move, prob]) => `${move}(${(prob * 100).toFixed(1)}%)`)
      .join(', ')

    speech += `Maia-1900 (Human-like ~1900 ELO):\nWin%: ${winRate}% | Top moves: ${topMoves}\n\n`
  }

  // Big Leela Analysis (Strong engine)
  if (sanEvaluations.bigLeela) {
    const winRate = (sanEvaluations.bigLeela.value * 100).toFixed(1)
    const topMoves = Object.entries(sanEvaluations.bigLeela.policy)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([move, prob]) => `${move}(${(prob * 100).toFixed(1)}%)`)
      .join(', ')

    speech += `<leela> Leela (Strong Neural Network):\nWin%: ${winRate}% | Top moves: ${topMoves}\n\n </leela>`
  }

  // Elite Maia Analysis (Top human-like play)
  if (sanEvaluations.elitemaia) {
    const winRate = (sanEvaluations.elitemaia.value * 100).toFixed(1)
    const topMoves = Object.entries(sanEvaluations.elitemaia.policy)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([move, prob]) => `${move}(${(prob * 100).toFixed(1)}%)`)
      .join(', ')

    speech += `<eliteLeela> Elite Leela (Expert Human-like):\nWin%: ${winRate}% | Top moves: ${topMoves}\n\n </eliteleela>`
  }

  // Compare move preferences if multiple models available
  if (maia1900 && sanEvaluations.bigLeela) {
    const maia1900Top = Object.entries(maia1900.policy)
      .sort(([, a], [, b]) => b - a)[0]
    const leelaTop = Object.entries(sanEvaluations.bigLeela.policy)
      .sort(([, a], [, b]) => b - a)[0]

    if (maia1900Top[0] !== leelaTop[0]) {
      speech += `<maia> Note: Human players (~1900) prefer ${maia1900Top[0]}, while strong engines prefer ${leelaTop[0]}\n<maia/>`
    }
  }

  return speech.trim()
}

export const addNetAnalysisToQuery = (
  sanEvaluations: MaiaEvaluations
): string => {
  const maiaAnalysis = getNetAnalysisSpeech(sanEvaluations)
  
  if (!maiaAnalysis) {
    return "";
  }

  return `\n<neural_nets_analysis>\n${maiaAnalysis}\n</neural_nets_analysis>\n`
}