export function aggregateResults(evaluations, isJDProvided = true) {
  let totalWeight = 0;
  let weightedScoreSum = 0;
  const breakdown = {};

  // Dynamic Weights Map
  const weights = isJDProvided 
    ? {
        skillMatch: 0.15,
        semanticMatch: 0.20,
        keywordMatch: 0.15,
        experienceMatch: 0.1,
        impactMatch: 0.15,
        atsOptimization: 0.1,
        readabilityMatch: 0.1,
        consistencyMatch: 0.05,
        techStandard: 0.0, // ignored in JD mode as skillMatch covers it
      }
    : {
        skillMatch: 0.0,
        keywordMatch: 0.0,
        experienceMatch: 0.0,
        impactMatch: 0.4,
        atsOptimization: 0.3,
        readabilityMatch: 0.15,
        consistencyMatch: 0.1,
        techStandard: 0.05,
      };

  evaluations.forEach((evalResult) => {
    if (!evalResult || (evalResult.score === null && isJDProvided)) return;

    // Use dynamic weight if defined, otherwise fallback to evalResult.weight
    const weight = weights[evalResult.name] !== undefined ? weights[evalResult.name] : (evalResult.weight || 0);

    if (weight > 0 && evalResult.score !== null) {
      totalWeight += weight;
      weightedScoreSum += evalResult.score * weight;
    }

    breakdown[evalResult.name] = evalResult.score;
  });

  const finalScore =
    totalWeight > 0 ? Math.round(weightedScoreSum / totalWeight) : 0;

  return {
    score: finalScore,
    breakdown,
  };
}

