<script lang="ts">
  import ArrowLeft from 'lucide-svelte/icons/arrow-left';
  import BookOpen from 'lucide-svelte/icons/book-open';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { onMount } from 'svelte';
  import PosterStudio from '$lib/components/PosterStudio.svelte';
  import { getSessionToken } from '$lib/anonymous';

  let sessionToken = $state('');

  onMount(() => {
    sessionToken = getSessionToken();
  });
</script>

{#if !sessionToken}
  <div class="flex min-h-screen items-center justify-center bg-brutal-cream">
    <div class="text-h3 animate-pulse font-bold uppercase tracking-wider">Loading...</div>
  </div>
{:else}
  <div class="flex min-h-screen flex-col bg-brutal-cream">
    <header class="sticky top-0 z-50 shrink-0 border-b-2 border-brutal-black bg-brutal-cream">
      <div class="container-brutal flex items-center justify-between py-4">
        <div class="flex items-center gap-6">
          <a
            href={resolve('/dashboard')}
            class="border-2 border-transparent p-2 transition-all hover:border-brutal-black hover:bg-brutal-gray/50"
          >
            <ArrowLeft class="h-6 w-6 text-brutal-black" />
          </a>
          <a href={resolve('/')} class="group flex items-center gap-3">
            <div
              class="border-2 border-brutal-black bg-brand-yellow p-2 shadow-brutal transition-all duration-150 ease-brutal group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 group-hover:shadow-brutal-md"
            >
              <BookOpen class="h-6 w-6 text-brutal-black" />
            </div>
            <span class="text-h4 hidden font-bold uppercase tracking-wider sm:block">Generate</span>
          </a>
        </div>
      </div>
    </header>

    <main class="relative flex flex-1 flex-col overflow-hidden">
      <PosterStudio
        {sessionToken}
        onCreated={() => {
          void goto(resolve('/dashboard'));
        }}
        onClose={() => {
          void goto(resolve('/dashboard'));
        }}
      />
    </main>
  </div>
{/if}
