```vue-interactive
<script setup lang="ts">
import DistributionPanel from '@custom-script/DistributionPanel.vue'
import { logGamma } from '@custom-script/distributions.ts'

const distribution = {
	id: 'normal',
	name: '正态分布',
	description: '连续型概率分布，由均值 μ 与标准差 σ 决定。',
	parameters: [
		{
			id: 'mu',
			name: '均值',
			symbol: 'μ',
			min: -5,
			max: 5,
			step: 0.1,
			defaultValue: 0,
		},
		{
			id: 'sigma',
			name: '标准差',
			symbol: 'σ',
			min: 0.1,
			max: 3,
			step: 0.1,
			defaultValue: 1,
		},
	],
	pdf: (x, params) => {
		const mu = params.mu!
		const sigma = params.sigma!
		const exponent = -0.5 * Math.pow((x - mu) / sigma, 2)
		const coefficient = 1 / (sigma * Math.sqrt(2 * Math.PI))
		return coefficient * Math.exp(exponent)
	},
	getMean: (params) => params.mu!,
	getVariance: (params) => Math.pow(params.sigma!, 2),
	formula: (params) => `N(${params.mu}, ${params.sigma}^2)`,
	domain: [-6, 6],
	type: 'continuous',
}
</script>

<template>
	<div class="bg-white">
		<DistributionPanel :distribution="distribution" />
	</div>
</template>
```
