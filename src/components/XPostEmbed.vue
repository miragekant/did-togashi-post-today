<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

const props = defineProps<{ postId: string; username: string }>();
const container = ref<HTMLElement | null>(null);
const state = ref<"loading" | "ready" | "failed">("loading");
let renderToken = 0;
let widgetsLoadPromise: Promise<XWidgets> | null = null;

const WIDGET_LOAD_TIMEOUT = 10_000;
const POST_RENDER_TIMEOUT = 12_000;
const WIDGET_SCRIPT_SELECTOR = 'script[src="https://platform.twitter.com/widgets.js"]';

function withTimeout<T>(promise: Promise<T>, milliseconds: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(message)), milliseconds);
    promise.then(
      (value) => {
        window.clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

function ensureWidgets(): Promise<XWidgets> {
  if (window.twttr?.widgets) return Promise.resolve(window.twttr.widgets);
  if (widgetsLoadPromise) return widgetsLoadPromise;

  widgetsLoadPromise = new Promise<XWidgets>((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>(WIDGET_SCRIPT_SELECTOR);
    let shouldAppend = false;

    if (script?.dataset.xWidgetState === "failed") {
      script.remove();
      script = null;
    }

    if (script?.dataset.xWidgetState === "loaded" && !window.twttr?.widgets) {
      script.remove();
      script = null;
    }

    if (!script) {
      script = document.createElement("script");
      script.src = "https://platform.twitter.com/widgets.js";
      script.async = true;
      script.dataset.xWidgetState = "loading";
      shouldAppend = true;
    }

    const activeScript = script;
    let settled = false;

    const cleanup = () => {
      window.clearTimeout(timeout);
      activeScript.removeEventListener("load", handleLoad);
      activeScript.removeEventListener("error", handleError);
    };

    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      activeScript.dataset.xWidgetState = "failed";
      cleanup();
      reject(error);
    };

    const handleLoad = () => {
      activeScript.dataset.xWidgetState = "loaded";
      if (!window.twttr?.widgets) {
        fail(new Error("X widgets loaded without a rendering API"));
        return;
      }
      if (settled) return;
      settled = true;
      cleanup();
      resolve(window.twttr.widgets);
    };

    const handleError = () => fail(new Error("X widgets failed to load"));
    const timeout = window.setTimeout(
      () => fail(new Error("X widgets timed out")),
      WIDGET_LOAD_TIMEOUT,
    );

    activeScript.addEventListener("load", handleLoad, { once: true });
    activeScript.addEventListener("error", handleError, { once: true });

    if (window.twttr?.widgets) {
      settled = true;
      cleanup();
      resolve(window.twttr.widgets);
    } else if (shouldAppend) {
      document.head.appendChild(activeScript);
    }
  }).catch((error) => {
    widgetsLoadPromise = null;
    throw error;
  });

  return widgetsLoadPromise;
}

async function renderPost() {
  const token = ++renderToken;
  state.value = "loading";
  await nextTick();
  if (!container.value || token !== renderToken) return;
  container.value.replaceChildren();

  try {
    const widgets = await ensureWidgets();
    const rendered = await withTimeout(
      widgets.createTweet(props.postId, container.value, {
        conversation: "none",
        dnt: true,
        theme: "light",
      }),
      POST_RENDER_TIMEOUT,
      "X post rendering timed out",
    );

    if (token === renderToken) state.value = rendered ? "ready" : "failed";
  } catch {
    if (token === renderToken) state.value = "failed";
  }
}

onMounted(renderPost);
onBeforeUnmount(() => {
  renderToken += 1;
});
watch(() => props.postId, renderPost);
</script>

<template>
  <article class="x-embed" :class="`is-${state}`">
    <div v-if="state === 'loading'" class="embed-loading" role="status">
      <span class="embed-loading-mark" aria-hidden="true">X</span>
      <div>
        <strong>Loading the official post…</strong>
        <small>This can take a moment on privacy-focused browsers.</small>
      </div>
    </div>

    <div ref="container" class="embed-container" />

    <div v-if="state === 'failed'" class="embed-error" role="alert">
      <span aria-hidden="true">!</span>
      <div>
        <strong>X couldn’t display this post here.</strong>
        <p>A privacy extension, network filter, or temporary X issue may be blocking the widget.</p>
        <div class="embed-error-actions">
          <button type="button" @click="renderPost">Try again</button>
          <a
            :href="`https://x.com/${username}/status/${postId}`"
            target="_blank"
            rel="noreferrer"
          >
            Open on X ↗
          </a>
        </div>
      </div>
    </div>

    <div v-if="state === 'ready'" class="embed-toolbar">
      <span>Official X embed</span>
      <a
        :href="`https://x.com/${username}/status/${postId}`"
        target="_blank"
        rel="noreferrer"
      >
        Open on X ↗
      </a>
    </div>
  </article>
</template>
