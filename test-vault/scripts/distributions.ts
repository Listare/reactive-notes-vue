export function logGamma(z: number): number {
  const g = 7
  const p = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ]

  if (z < 0.5) {
    return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z)
  }

  z -= 1
  let xVal = p[0]!
  for (let i = 1; i < g + 2; i++) {
    xVal += p[i]! / (z + i)
  }

  const t = z + g + 0.5
  return Math.log(2 * Math.PI) / 2 + Math.log(xVal) - t + (z + 0.5) * Math.log(t)
}

export interface DistributionParameter {
    id: string;
    name: string;
    symbol: string;
    min: number;
    max: number;
    step: number;
    defaultValue: number;
}

export interface Distribution {
    id: string;
    name: string;
    description: string;
    parameters: DistributionParameter[];
    pdf: (x: number, params: Record<string, number>) => number;
    getMean: (params: Record<string, number>) => number;
    getVariance: (params: Record<string, number>) => number;
    domain: [number, number] | ((params: Record<string, number>) => [number, number]);
    // latex formula of the distribution, with parameters substituted
    formula: (params: Record<string, number>) => string;
    type: 'continuous' | 'discrete';
}