# Venkatesh Akula — Portfolio Website

> Mathematics · Engineering · Research

Personal portfolio website for Venkatesh Akula — Incoming Quant at Squarepoint Capital, B.Tech CSE at IIT Kanpur.

## Quick Start

```bash
# Navigate to the site directory
cd site/

# Option 1: Live reload development server
npm run dev
# Opens at http://localhost:3000

# Option 2: Static file server
npm run serve
# Opens at http://localhost:3000
```

## Structure

```
site/
├── index.html                              # Landing page
├── cv/index.html                           # Curriculum Vitae
├── projects/
│   ├── index.html                          # Projects hub
│   ├── multi-agent-llm/index.html          # Adobe Research project
│   ├── deepfake-detection/index.html       # CS776 project
│   ├── high-performance-computing/index.html # CS633 project
│   ├── stock-forecasting/index.html        # CS771 project
│   ├── domain-adaptation/index.html        # CS771 project
│   └── gemos/index.html                    # CS330 project
├── blog/
│   ├── index.html                          # Blog hub
│   ├── why-quant-research/index.html
│   ├── competitive-programming-math/index.html
│   ├── multi-agent-systems-lessons/index.html
│   └── ml-systems-stack/index.html
├── publications/index.html                 # Publications
├── readings/index.html                     # Reading list
├── css/main.css                            # Design system
├── js/main.js                              # Theme, nav, animations
├── assets/images/                          # Images
├── robots.txt                              # SEO
├── sitemap.xml                             # SEO
├── feed.xml                                # RSS feed
└── package.json
```

## Design

- **Color palette**: Deep navy (#0a1628) with gold accent (#c9a227)
- **Typography**: Inter (body), JetBrains Mono (code), Playfair Display (headings)
- **Theme**: Dark mode default with light mode toggle
- **Style**: Clean, academic, minimal animations — "Mathematics + Engineering + Research"

## Adding Content

### New Blog Post
1. Create `blog/your-post-slug/index.html`
2. Copy structure from an existing blog post
3. Update meta tags, title, content
4. Add entry to `blog/index.html`
5. Add `<item>` to `feed.xml`
6. Add `<url>` to `sitemap.xml`

### New Project
1. Create `projects/your-project/index.html`
2. Copy structure from an existing project page
3. Follow the template: Overview → Motivation → Technical Details → Architecture → Results → Lessons → Future Work
4. Add card to `projects/index.html`

## Deployment

### Netlify
1. Connect GitHub repo
2. Set build directory to `site/`
3. No build command needed (static files)

### GitHub Pages
1. Push `site/` contents to `gh-pages` branch
2. Enable Pages in repo settings

### Vercel
1. Import project
2. Set root directory to `site/`
3. Framework preset: "Other"

## SEO Checklist
- [x] OpenGraph tags on all pages
- [x] Twitter Card meta tags
- [x] JSON-LD structured data (Person, Article schemas)
- [x] XML Sitemap
- [x] robots.txt
- [x] RSS feed for blog
- [x] Semantic HTML (h1 hierarchy, nav, main, footer)
- [x] Meta descriptions on all pages
- [ ] Update domain from placeholder (venkateshakula.dev)
- [ ] Add Google Analytics tracking ID
- [ ] Submit sitemap to Google Search Console

## Tech Stack
- Pure HTML, CSS, JavaScript — no framework, no build step
- Google Fonts (CDN)
- Zero dependencies in production

## License
© 2026 Venkatesh Akula. All rights reserved.
