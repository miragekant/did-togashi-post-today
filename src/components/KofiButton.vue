<script setup lang="ts">
import { onMounted, ref } from "vue";

const container = ref<HTMLElement | null>(null);

onMounted(() => {
  const widget = window.kofiwidget2;
  if (!widget || !container.value) return;

  widget.init("Support me on Ko-fi", "#72a4f2", "U0C423G6QU");
  container.value.innerHTML = widget.getHTML();

  const link = container.value.querySelector<HTMLAnchorElement>("a.kofi-button");
  if (link) {
    link.href = "https://ko-fi.com/miragekant";
    link.rel = "noreferrer";
  }
});
</script>

<template>
  <span ref="container" class="kofi-widget">
    <a
      class="kofi-fallback"
      href="https://ko-fi.com/miragekant"
      target="_blank"
      rel="noreferrer"
    >
      Support me on Ko-fi ↗
    </a>
  </span>
</template>
