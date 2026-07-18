<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import type { DataMode } from "../types";
import XPostEmbed from "./XPostEmbed.vue";

const props = defineProps<{
  date: string;
  postIds: string[];
  mode: DataMode;
  username: string;
}>();

const emit = defineEmits<{ close: [] }>();
const closeButton = ref<HTMLButtonElement | null>(null);

const formattedDate = computed(() =>
  new Date(`${props.date}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }),
);

const demoMessages = [
  "Manuscript progress: another page completed.",
  "Inking and background work continue.",
  "A brief studio update from today’s work.",
];

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") emit("close");
}

async function focusClose() {
  await nextTick();
  closeButton.value?.focus();
}

onMounted(() => {
  document.addEventListener("keydown", onKeydown);
  focusClose();
});
onBeforeUnmount(() => document.removeEventListener("keydown", onKeydown));
watch(() => props.date, focusClose);
</script>

<template>
  <div class="drawer-backdrop" role="presentation" @click.self="emit('close')">
    <aside class="day-drawer" role="dialog" aria-modal="true" :aria-label="`Posts on ${formattedDate}`">
      <div class="drawer-grip" aria-hidden="true" />
      <span class="drawer-sticker" aria-hidden="true">{{ postIds.length ? "FOUND!" : "QUIET..." }}</span>
      <header class="drawer-header">
        <div>
          <p class="eyebrow">Opened day</p>
          <h2>{{ formattedDate }}</h2>
          <p>{{ postIds.length }} {{ postIds.length === 1 ? "post" : "posts" }} found in the log</p>
        </div>
        <button ref="closeButton" class="close-button" type="button" aria-label="Close details" @click="emit('close')">
          ×
        </button>
      </header>

      <div v-if="postIds.length === 0" class="empty-day">
        <span aria-hidden="true">○</span>
        <h3>A quiet day</h3>
        <p>No original posts were recorded for this date.</p>
      </div>

      <div v-else class="post-list">
        <template v-if="mode === 'demo'">
          <article v-for="(postId, index) in postIds" :key="postId" class="demo-post">
            <div class="demo-post-topline">
              <span class="avatar-placeholder">YT</span>
              <div>
                <strong>Yoshihiro Togashi</strong>
                <span>@{{ username }} · preview</span>
              </div>
            </div>
            <p>{{ demoMessages[index % demoMessages.length] }}</p>
            <div class="image-placeholder" aria-label="Image placeholder">
              <div class="mock-manuscript" aria-hidden="true">
                <span>PAGE {{ String(index + 1).padStart(2, "0") }}</span>
                <i /><i /><i /><i />
              </div>
              <strong>Post image appears here</strong>
            </div>
            <div class="demo-post-footer">
              <small>Demo content — the official X embed will replace this card after API sync is connected.</small>
              <span>Open on X ↗</span>
            </div>
          </article>
        </template>

        <XPostEmbed
          v-else
          v-for="postId in postIds"
          :key="postId"
          :post-id="postId"
          :username="username"
        />
      </div>
    </aside>
  </div>
</template>
