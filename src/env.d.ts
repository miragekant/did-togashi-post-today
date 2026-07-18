/// <reference types="vite/client" />

interface XWidgets {
  createTweet: (
    id: string,
    element: HTMLElement,
    options?: Record<string, unknown>,
  ) => Promise<HTMLElement | undefined>;
}

interface Window {
  twttr?: { widgets: XWidgets };
}
