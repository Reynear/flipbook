<script lang="ts">
  import ArrowLeft from 'lucide-svelte/icons/arrow-left';
  import { resolve } from '$app/paths';
  import Footer from '$lib/components/Footer.svelte';

  let { title, children }: { title: string; children: import('svelte').Snippet } = $props();
  const updatedAt = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
</script>

<div class="flex min-h-screen flex-col bg-brutal-cream">
  <header class="sticky top-0 z-50 border-b-2 border-brutal-black bg-brutal-cream">
    <div class="container-brutal py-4">
      <a href={resolve('/')} class="btn-ghost btn-sm inline-flex">
        <ArrowLeft class="h-4 w-4" />
        Back
      </a>
    </div>
  </header>

  <main class="section flex-1">
    <div class="container-brutal max-w-3xl">
      <h1 class="text-h1 mb-4 uppercase">{title}</h1>
      <p class="text-small mb-8 text-brutal-black/60">Last updated: {updatedAt}</p>

      <div class="prose prose-brutal space-y-8">
        {@render children()}
      </div>
    </div>
  </main>

  <Footer />
</div>
