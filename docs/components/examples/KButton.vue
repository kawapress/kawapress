<script setup lang="ts">
import { ref } from 'vue'

/** 文档站用来演示组件 API 与组件演示插件的示例按钮。 */
export interface KButtonProps {
  /** 按钮文字。 */
  label: string
  /**
   * 尺寸。
   * @since 0.1.0
   */
  size?: 'small' | 'medium' | 'large'
  /** 外观。 */
  variant?: 'solid' | 'outline' | 'ghost'
  /** 禁用后不响应点击。 */
  disabled?: boolean
  /** 显示在文字后的计数，0 时不显示。 */
  count?: number
  /**
   * 旧的圆角开关，请改用主题 Token。
   * @deprecated 0.2.0 起移除
   */
  rounded?: boolean
}

const props = withDefaults(defineProps<KButtonProps>(), {
  size: 'medium',
  variant: 'solid',
  disabled: false,
  count: 0,
})

const emit = defineEmits<{
  /** 点击按钮时触发，参数是累计点击次数。 */
  press: [times: number]
}>()

defineSlots<{
  /** 文字前的图标。 */
  icon?: () => unknown
}>()

const times = ref(0)
const button = ref<HTMLButtonElement>()

function press(): void {
  if (props.disabled) {
    return
  }
  times.value++
  emit('press', times.value)
}

defineExpose({
  /** 让按钮获得焦点。 */
  focus: () => button.value?.focus(),
})
</script>

<template>
  <button
    ref="button"
    type="button"
    class="k-button"
    :class="[`k-button--${props.size}`, `k-button--${props.variant}`]"
    :disabled="props.disabled"
    @click="press"
  >
    <slot name="icon" />
    <span>{{ props.label }}</span>
    <span v-if="props.count > 0" class="k-button__count">{{ props.count }}</span>
  </button>
</template>

<style scoped>
.k-button {
  display: inline-flex;
  align-items: center;
  gap: 0.4em;
  border: 1px solid var(--kawa-c-brand);
  border-radius: 0.5rem;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s, background-color 0.15s;
}

.k-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.k-button--small { padding: 0.2rem 0.6rem; font-size: 0.8125rem; }
.k-button--medium { padding: 0.4rem 0.9rem; font-size: 0.9375rem; }
.k-button--large { padding: 0.6rem 1.2rem; font-size: 1.0625rem; }

.k-button--solid { background: var(--kawa-c-brand); color: var(--kawa-c-bg); }
.k-button--outline { background: transparent; color: var(--kawa-c-brand); }
.k-button--ghost { border-color: transparent; background: transparent; color: var(--kawa-c-brand); }

.k-button__count {
  min-width: 1.4em;
  padding: 0 0.35em;
  border-radius: 999px;
  background: color-mix(in oklab, currentColor 18%, transparent);
  font-size: 0.8em;
  text-align: center;
}
</style>
