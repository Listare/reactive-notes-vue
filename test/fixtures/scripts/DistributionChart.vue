<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { Distribution } from './distributions.ts'

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