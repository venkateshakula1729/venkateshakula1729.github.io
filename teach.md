# Website Customization & Hosting Guide

This document outlines how to add your own content to the website and how to host it on GitHub Pages using your existing repository `Logbook`.

## 1. How to Add Content

The website is built entirely with raw HTML, CSS, and vanilla JavaScript. There is no build step or framework (like React or Hexo) required to run it locally or deploy it.

### Adding a new Blog Post
1. **Create the Directory:** Create a new folder under `/site/blog/` for your post (e.g., `/site/blog/my-new-post/`).
2. **Create the File:** Copy the `index.html` from an existing blog post (like `/site/blog/why-quant-research/index.html`) into your new folder.
3. **Update the Content:**
   - Change the `<title>`, `<h1>`, and metadata tags.
   - Replace the content inside the `<div class="blog-post-body">` with your own writing.
   - Update the Table of Contents (`<aside class="blog-toc-sidebar">`) to match your new `<h2>` headings. Give each `<h2>` an `id` attribute, and link to it in the TOC (`<a href="#your-id" class="toc-link">`).
4. **Update the Explorer:**
   To make your new post appear in the left sidebar across all blog pages, you need to add the link to the `update_blogs.py` script located in `/site/update_blogs.py`.
   - Open `/site/update_blogs.py`
   - Find the `EXPLORER_HTML` variable.
   - Add your new link under the appropriate category. For example: `<li><a href="/blog/my-new-post/">My New Post</a></li>`
   - Run the script: `python3 /Users/venkatesh/Downloads/Hexo/site/update_blogs.py`
   - This script will automatically update the sidebar in **all** blog posts.

### Adding a Reading Review
1. Go to `/site/readings/` and create a folder (e.g., `/site/readings/new-book/`).
2. Copy an existing review's `index.html` (e.g., from `/site/readings/concrete-mathematics/index.html`) into your new folder.
3. Edit the title, author, rating, and review content.
4. Open `/site/readings/index.html` and add a new `<a class="reading-card">` entry pointing to your new folder.

### Adding a Life Post
1. Similar to Readings, create a folder under `/site/life/` (e.g., `/site/life/new-poem/`).
2. Copy the `index.html` from `/site/life/real-me/index.html`.
3. Update the content.
4. Open `/site/life/index.html` and add an `<a href="/life/new-poem/" class="life-post-card fade-in">` entry under the appropriate category section.

## 2. How to Host on GitHub Pages

Since your site consists of static files (HTML/CSS/JS), GitHub Pages is the perfect, free way to host it.

1. **Move to the site directory** in your terminal:
   ```bash
   cd /Users/venkatesh/Downloads/Hexo/site
   ```

2. **Initialize Git** (if not already done) and link your Logbook repo:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of portfolio website"
   git branch -M main
   git remote add origin https://github.com/venkateshakula1729/Logbook.git
   ```
   *(Note: If you already cloned the Logbook repo locally, just copy all the contents of the `/site` folder into that cloned repo folder).*

3. **Push the code to GitHub:**
   ```bash
   git push -u origin main
   ```
   *(You may be asked to authenticate with your GitHub credentials or a Personal Access Token).*

4. **Enable GitHub Pages:**
   - Go to your repository on GitHub: `https://github.com/venkateshakula1729/Logbook`
   - Click on **Settings** (the gear icon at the top).
   - In the left sidebar, scroll down and click on **Pages**.
   - Under **Build and deployment**, set the **Source** to `Deploy from a branch`.
   - Under **Branch**, select `main` and the `/ (root)` folder, then click **Save**.

5. **Wait for deployment:**
   GitHub will take about 1-2 minutes to build and deploy your site. Once done, your website will be live at:
   `https://venkateshakula1729.github.io/Logbook/`

### 3. Fixing Giscus Comments
Because your site will be hosted at a subpath (`/Logbook/`), and the domain changes from `localhost` to `venkateshakula1729.github.io`, you might need to adjust your Giscus settings if comments stop working:
- Go to [https://giscus.app](https://giscus.app)
- Enter your repository `venkateshakula1729/Logbook`
- Make sure discussions are enabled in your repo settings on GitHub.
- Generate the new `<script>` tag and update it in your blog post templates if necessary.
