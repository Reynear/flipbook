<script lang="ts">
  import { PUBLIC_CONVEX_URL } from '$env/static/public';
  import { setupConvex } from 'convex-svelte';
  import favicon from '$lib/assets/favicon.svg';
  import '../app.css';

  setupConvex(PUBLIC_CONVEX_URL);

  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <title>Flipbook - Transform PDFs into Interactive Flipbooks</title>
  <meta
    name="description"
    content="Upload PDFs and create shareable, interactive flipbooks with page-turning animations. No sign up required."
  />
  <meta name="keywords" content="PDF, flipbook, document viewer, interactive, page flip" />
</svelte:head>

{@render children()}
