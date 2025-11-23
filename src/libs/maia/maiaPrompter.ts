interface SanMaiaEvaluation {
  value: number
  policy: { [key: string]: number }
}


export const getMaiaAnalysisSpeech = (
  sanEvaluations: { [key: string]: SanMaiaEvaluation } | null
): string => {
  if (!sanEvaluations) {
    return ''
  }

  const allModels = [
    'maia_kdd_1100', 'maia_kdd_1200', 'maia_kdd_1300',
    'maia_kdd_1400', 'maia_kdd_1500', 'maia_kdd_1600',
    'maia_kdd_1700', 'maia_kdd_1800', 'maia_kdd_1900'
  ]

  let speech = `Maia Human-Like Analysis (All Rating Levels):

Position Evaluation (White Win Probability):
┌──────────┬───────────┐
│  Rating  │  Win %    │
├──────────┼───────────┤
`

  allModels.forEach(model => {
    const rating = model.replace('maia_kdd_', '')
    const evaluation = sanEvaluations[model]
    if (evaluation) {
      const winRate = (evaluation.value * 100).toFixed(1)
      speech += `│  ${rating}  │   ${winRate.padStart(5)}%  │\n`
    }
  })

  speech += `└──────────┴───────────┘

`

  
  const allMoves = new Set<string>()
  allModels.forEach(model => {
    const evaluation = sanEvaluations[model]
    if (evaluation) {
      Object.keys(evaluation.policy).forEach(move => allMoves.add(move))
    }
  })


  const topMovesPerModel: { [key: string]: [string, number][] } = {}
  allModels.forEach(model => {
    const evaluation = sanEvaluations[model]
    if (evaluation) {
      topMovesPerModel[model] = Object.entries(evaluation.policy)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
    }
  })


  speech += `Top 5 Human-Like Moves by Rating Level:
┌──────────┬────────────────────────────────────────────────────────────────────────────┐
│  Rating  │  Move 1      Move 2      Move 3      Move 4      Move 5                  │
├──────────┼────────────────────────────────────────────────────────────────────────────┤
`

  allModels.forEach(model => {
    const rating = model.replace('maia_kdd_', '')
    const topMoves = topMovesPerModel[model] || []
    
    let movesLine = '│  ' + rating.padEnd(6) + ' │  '
    
    for (let i = 0; i < 5; i++) {
      if (i < topMoves.length) {
        const [move, prob] = topMoves[i]
        const percentage = (prob * 100).toFixed(1)
        movesLine += `${move}(${percentage}%)`.padEnd(12) + ' '
      } else {
        movesLine += ''.padEnd(13)
      }
    }
    
    movesLine += '│'
    speech += movesLine + '\n'
  })

  speech += `└──────────┴────────────────────────────────────────────────────────────────────────┘

`
  const move1900 = sanEvaluations['maia_kdd_1900']
  if (move1900) {
    const topMoves = Object.entries(move1900.policy)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)

    speech += `Move Popularity Across All Rating Levels (Top 3 Moves):

`

    topMoves.forEach(([move], moveIndex) => {
      speech += `Move: ${move}
┌──────────┬───────────┐
│  Rating  │  Prob %   │
├──────────┼───────────┤
`

      allModels.forEach(model => {
        const rating = model.replace('maia_kdd_', '')
        const evaluation = sanEvaluations[model]
        if (evaluation) {
          const prob = evaluation.policy[move]
          if (prob !== undefined) {
            const percentage = (prob * 100).toFixed(1)
            speech += `│  ${rating}  │   ${percentage.padStart(5)}%  │\n`
          } else {
            speech += `│  ${rating}  │     0.0%  │\n`
          }
        }
      })

      speech += `└──────────┴───────────┘
`

      if (moveIndex < topMoves.length - 1) {
        speech += '\n'
      }
    })
  }

  return speech
}


export const addMaiaAnalysisToQuery = (
  sanEvaluations: { [key: string]: SanMaiaEvaluation } | null
): string => {
  const maiaAnalysis = getMaiaAnalysisSpeech(sanEvaluations)
  
  if (!maiaAnalysis) {
    return "";
  }


  return `\n<maia_analysis>\n${maiaAnalysis}\n</maia_analysis>\n` 
       
}