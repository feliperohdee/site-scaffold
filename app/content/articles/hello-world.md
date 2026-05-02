---
title: Hello, World
date: 2026-05-02
excerpt: A friendly tour of the new markdown article system — drop a file, get a page.
tags: [meta, writing]
---

# Hello, World

This is the first article rendered by the new markdown system. It was created by dropping a single `.md` file into `app/content/articles/`. No registration, no boilerplate — Vite's `import.meta.glob` picks it up at build time.

## How it works

Each `.md` file becomes an article. Frontmatter at the top sets the title, date, excerpt, and tags. Everything else is regular markdown.

- **Auto-discovery**: new files appear without touching code.
- **SSR + R2 cache**: pages render server-side and the HTML is cached in R2 keyed by URL.
- **Reusable component**: `<Markdown content={...} />` renders any markdown string anywhere in the app.

## Frontmatter

```
---
title: My Article
date: 2026-05-02
excerpt: Optional — auto-generated from the body if omitted.
tags: [react, web]
---
```

## What works in the body

Headings, lists, links, **bold**, _italic_, `inline code`, and:

```ts
const greet = (name: string) => {
	return `Hello, ${name}!`;
};
```

> Block quotes too. Styled by `@tailwindcss/typography`.

| Feature        | Status |
| -------------- | ------ |
| Headings       | ✓      |
| Code blocks    | ✓      |
| Tables         | ✓      |
| Auto-discovery | ✓      |

[Back to the articles index](/articles).
