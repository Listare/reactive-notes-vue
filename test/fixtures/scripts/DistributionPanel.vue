<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import type { Distribution } from './distributions.ts'
import DistributionChart from './DistributionChart.vue'

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