```ts {name=types}
function logGamma(z: number): number {
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

interface DistributionParameter {
    id: string;
    name: string;
    symbol: string;
    min: number;
    max: number;
    step: number;
    defaultValue: number;
}

interface Distribution {
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
```

```vue-interactive {name=chart,hide=true}
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { Distribution } from './15 - 复杂场景.md?block=types'

const props = defineProps<{
  distribution: Distribution
  params: Record<string, number>
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)
const width = ref(640)
const height = 320

const SAMPLE_COUNT = 240

const domain = computed(() => {
  const domain = props.distribution.domain
  return typeof domain === 'function' ? domain(props.params) : domain
})

const isDiscrete = computed(() => props.distribution.type === 'discrete')

const samples = computed(() => {
  const [xMin, xMax] = domain.value
  const points: { x: number; y: number }[] = []
  let yMax = 0

  if (isDiscrete.value) {
    const kMin = Math.ceil(xMin)
    const kMax = Math.floor(xMax)
    for (let k = kMin; k <= kMax; k++) {
      const y = props.distribution.pdf(k, props.params)
      if (y <= 0) continue
      points.push({ x: k, y })
      if (y > yMax) yMax = y
    }
  } else {
    const step = (xMax - xMin) / (SAMPLE_COUNT - 1)
    for (let i = 0; i < SAMPLE_COUNT; i++) {
      const x = xMin + i * step
      const y = props.distribution.pdf(x, props.params)
      points.push({ x, y })
      if (y > yMax) yMax = y
    }
  }

  return { points, yMax: yMax || 1 }
})

function draw() {
  const canvas = canvasRef.value
  const container = containerRef.value
  if (!canvas || !container) return

  const dpr = window.devicePixelRatio || 1
  const w = width.value
  const h = height
  canvas.width = w * dpr
  canvas.height = h * dpr
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)

  const padding = { top: 24, right: 24, bottom: 40, left: 48 }
  const plotW = w - padding.left - padding.right
  const plotH = h - padding.top - padding.bottom
  const [xMin, xMax] = domain.value
  const { points, yMax } = samples.value
  const yTop = yMax * 1.12
  const baseY = padding.top + plotH

  const toX = (x: number) => padding.left + ((x - xMin) / (xMax - xMin)) * plotW
  const toY = (y: number) => padding.top + plotH - (y / yTop) * plotH

  // grid
  ctx.strokeStyle = '#e8ecf0'
  ctx.lineWidth = 1
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (plotH * i) / 4
    ctx.beginPath()
    ctx.moveTo(padding.left, y)
    ctx.lineTo(padding.left + plotW, y)
    ctx.stroke()
  }

  // axes
  ctx.strokeStyle = '#94a3b8'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(padding.left, padding.top)
  ctx.lineTo(padding.left, baseY)
  ctx.lineTo(padding.left + plotW, baseY)
  ctx.stroke()

  if (isDiscrete.value) {
    drawDiscreteBars(ctx, points, toX, toY, baseY, xMin, xMax, plotW)
  } else {
    drawContinuousCurve(ctx, points, toX, toY, baseY)
  }

  // axis labels
  ctx.fillStyle = '#64748b'
  ctx.font = '12px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('x', padding.left + plotW / 2, h - 8)

  ctx.save()
  ctx.translate(14, padding.top + plotH / 2)
  ctx.rotate(-Math.PI / 2)
  ctx.textAlign = 'center'
  ctx.fillText(isDiscrete.value ? 'P(X = k)' : 'f(x)', 0, 0)
  ctx.restore()

  drawXTicks(ctx, points, xMin, xMax, toX, baseY, isDiscrete.value)
}

function drawContinuousCurve(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  toX: (x: number) => number,
  toY: (y: number) => number,
  baseY: number,
) {
  if (points.length === 0) return

  ctx.beginPath()
  points.forEach((p, i) => {
    const px = toX(p.x)
    const py = toY(p.y)
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  })
  const last = points[points.length - 1]!
  const first = points[0]!
  ctx.lineTo(toX(last.x), baseY)
  ctx.lineTo(toX(first.x), baseY)
  ctx.closePath()
  ctx.fillStyle = 'rgba(59, 130, 246, 0.15)'
  ctx.fill()

  ctx.beginPath()
  points.forEach((p, i) => {
    const px = toX(p.x)
    const py = toY(p.y)
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  })
  ctx.strokeStyle = '#2563eb'
  ctx.lineWidth = 2.5
  ctx.stroke()
}

function drawDiscreteBars(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  toX: (x: number) => number,
  toY: (y: number) => number,
  baseY: number,
  xMin: number,
  xMax: number,
  plotW: number,
) {
  if (points.length === 0) return

  const span = Math.max(xMax - xMin, 1)
  const barWidth = Math.min((plotW / span) * 0.85, 48)

  for (const p of points) {
    const centerX = toX(p.x)
    const topY = toY(p.y)
    const left = centerX - barWidth / 2

    ctx.fillStyle = 'rgba(59, 130, 246, 0.7)'
    ctx.fillRect(left, topY, barWidth, baseY - topY)

    ctx.strokeStyle = '#1d4ed8'
    ctx.lineWidth = 1
    ctx.strokeRect(left, topY, barWidth, baseY - topY)
  }
}

function drawXTicks(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  xMin: number,
  xMax: number,
  toX: (x: number) => number,
  baseY: number,
  discrete: boolean,
) {
  ctx.fillStyle = '#475569'
  ctx.font = '11px system-ui, sans-serif'
  ctx.textAlign = 'center'

  if (discrete && points.length > 0) {
    const maxLabels = 15
    const step = Math.max(1, Math.ceil(points.length / maxLabels))
    points.forEach((p, i) => {
      if (i % step !== 0 && i !== points.length - 1) return
      ctx.fillText(String(p.x), toX(p.x), baseY + 18)
    })
    return
  }

  const tickCount = 5
  for (let i = 0; i <= tickCount; i++) {
    const x = xMin + ((xMax - xMin) * i) / tickCount
    ctx.fillText(x.toFixed(1), toX(x), baseY + 18)
  }
}

function updateWidth() {
  if (containerRef.value) {
    width.value = Math.max(320, Math.floor(containerRef.value.clientWidth))
  }
}

let resizeObserver: ResizeObserver | undefined

onMounted(() => {
  updateWidth()
  draw()
  resizeObserver = new ResizeObserver(() => {
    updateWidth()
    draw()
  })
  if (containerRef.value) resizeObserver.observe(containerRef.value)
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})

watch([() => props.params, () => props.distribution.type, samples, width], draw, { deep: true })
</script>

<template>
  <div ref="containerRef" class="w-full rounded-lg border border-slate-200 bg-slate-50">
    <canvas
      ref="canvasRef"
      class="block"
      :aria-label="isDiscrete ? '概率质量函数柱状图' : '概率密度函数曲线'"
    />
  </div>
</template>
```

```vue-interactive {name=panel,hide=true}
<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import type { Distribution } from './15 - 复杂场景.md?block=types'
import DistributionChart from './15 - 复杂场景.md?block=chart'

const props = defineProps<{
  distribution: Distribution
}>()

function buildDefaultParams(dist: Distribution): Record<string, number> {
  return Object.fromEntries(dist.parameters.map((p) => [p.id, p.defaultValue]))
}

const params = reactive<Record<string, number>>(buildDefaultParams(props.distribution))

watch(
  () => props.distribution,
  (dist) => {
    const next = buildDefaultParams(dist)
    for (const key of Object.keys(params)) {
      delete params[key]
    }
    Object.assign(params, next)
  },
)

const mean = computed(() => props.distribution.getMean(params))
const variance = computed(() => props.distribution.getVariance(params))

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(4)
}
</script>

<template>
  <section class="flex flex-col gap-5">
    <header>
      <h2 class="mb-1.5 text-xl font-semibold text-slate-900">{{ distribution.name }}</h2>
      <p class="m-0 text-[0.95rem] text-slate-500">{{ distribution.description }}</p>
    </header>

    <div class="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
      <div class="flex flex-col gap-1 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <span class="text-xs font-medium text-slate-600">期望 E[X]</span>
        <span class="text-xl font-semibold text-blue-700 tabular-nums">{{ formatNumber(mean) }}</span>
      </div>
      <div class="flex flex-col gap-1 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <span class="text-xs font-medium text-slate-600">方差 Var(X)</span>
        <span class="text-xl font-semibold text-blue-700 tabular-nums">{{
          formatNumber(variance)
        }}</span>
      </div>
    </div>

    <DistributionChart :distribution="distribution" :params="params" />

    <div class="flex flex-col gap-4">
      <label
        v-for="param in distribution.parameters"
        :key="param.id"
        class="grid grid-cols-[7rem_1fr_4rem] items-center gap-3"
      >
        <span class="text-sm text-slate-700">
          <span class="mr-1 inline-block min-w-5 font-semibold text-blue-800">{{ param.symbol }}</span>
          {{ param.name }}
        </span>
        <input
          v-model.number="params[param.id]"
          type="range"
          class="w-full cursor-pointer accent-blue-600"
          :min="param.min"
          :max="param.max"
          :step="param.step"
        />
        <span class="text-right text-sm text-slate-600 tabular-nums">
          {{ formatNumber(params[param.id] ?? param.defaultValue) }}
        </span>
      </label>
    </div>
  </section>
</template>

```

```vue-interactive
<script setup lang="ts">
import DistributionPanel from './15 - 复杂场景.md?block=panel'

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
