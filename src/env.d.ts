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
  kofiwidget2?: {
    init: (text: string, color: string, id: string) => void;
    getHTML: () => string;
  };
}
