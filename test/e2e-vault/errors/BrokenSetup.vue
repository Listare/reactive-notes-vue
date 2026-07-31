<template>
  <p class="broken-setup">若看到这段文字，说明子组件 setup 错误未被捕获。</p>
</template>

<script setup lang="ts">
throw new Error('导入组件 setup 测试错误')
</script>
