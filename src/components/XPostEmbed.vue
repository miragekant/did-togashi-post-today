<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from "vue";

const props = defineProps<{ postId: string; username: string }>();
const container = ref<HTMLElement | null>(null);
const failed = ref(false);

function ensureWidgets(): Promise<void> {
  if (window.twttr?.widgets) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://platform.twitter.com/widgets.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("X widgets failed to load")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://platform.twitter.com/widgets.js";
    script.async = true;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("X widgets failed to load")), {
      once: true,
    });
    document.head.appendChild(script);
  });
}

async function renderPost() {
  failed.value = false;
  await nextTick();
  if (!container.value) return;
  container.value.replaceChildren();

  try {
    await ensureWidgets();
    const rendered = await window.twttr?.widgets.createTweet(props.postId, container.value, {
      conversation: "none",
      dnt: true,
      theme: "light",
    });
    failed.value = !rendered;
  } catch {
    failed.value = true;
  }
}

onMounted(renderPost);
watch(() => props.postId, renderPost);
</script>

<template>
  <div class="x-embed">
    <div ref="container" />
    <a
      v-if="failed"
      class="embed-fallback"
      :href="`https://x.com/${username}/status/${postId}`"
      target="_blank"
      rel="noreferrer"
    >
      This post could not be embedded. View it on X ↗
    </a>
  </div>
</template>
