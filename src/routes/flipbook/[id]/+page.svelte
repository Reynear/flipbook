<script lang="ts">
  import AlertCircle from 'lucide-svelte/icons/alert-circle';
  import ArrowLeft from 'lucide-svelte/icons/arrow-left';
  import BookOpen from 'lucide-svelte/icons/book-open';
  import Loader2 from 'lucide-svelte/icons/loader-2';
  import Share2 from 'lucide-svelte/icons/share-2';
  import { resolve } from '$app/paths';
  import { useQuery } from 'convex-svelte';
  import { api } from '$convex/_generated/api.js';
  import type { Id } from '$convex/_generated/dataModel.js';
  import FlipbookViewer from '$lib/components/FlipbookViewer.svelte';
  import QRCodeDisplay from '$lib/components/QRCodeDisplay.svelte';
  import { generateFlipbookUrl } from '$lib/utils';

  let { params }: { params: { id: string } } = $props();
  let showQR = $state(false);

  const flipbook = useQuery(api.flipbooks.get, () => ({ id: params.id as Id<'flipbooks'> }));
  const shareUrl = $derived(generateFlipbookUrl(params.id));
</script>

{#if flipbook.isLoading}
  <div class="flex h-screen items-center justify-center bg-neutral-900">
    <div class="flex flex-col items-center gap-4">
      <div class="relative">
        <div class="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white"></div>
        <Loader2 class="absolute inset-0 m-auto h-5 w-5 animate-pulse text-white" />
      </div>
      <span class="text-sm font-medium uppercase tracking-wider text-white/60">Loading...</span>
    </div>
  </div>
{:else if flipbook.data === null || flipbook.error}
  <div class="flex h-screen flex-col items-center justify-center gap-6 bg-neutral-900 p-4">
    <div class="rounded-lg border border-red-500/40 bg-red-500/20 p-4">
      <AlertCircle class="h-12 w-12 text-red-400" />
    </div>
    <div class="text-center">
      <h1 class="mb-2 text-2xl font-bold uppercase text-white">Not Found</h1>
      <p class="mb-6 max-w-md text-sm text-white/60">This flipbook may have been deleted or the link is incorrect.</p>
      <a
        href={resolve('/')}
        class="inline-flex items-center gap-2 rounded bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/90"
      >
        <ArrowLeft class="h-4 w-4" />
        Go Home
      </a>
    </div>
  </div>
{:else if flipbook.data}
  <div class="flex h-screen flex-col bg-neutral-900">
    <header class="z-50 h-12 flex-shrink-0 border-b border-white/10 bg-black/80 backdrop-blur-sm md:h-14">
      <div class="mx-auto flex h-full max-w-screen-2xl items-center justify-between px-3 md:px-6">
        <div class="flex items-center gap-2">
          <div class="rounded bg-yellow-400 p-1.5">
            <BookOpen class="h-4 w-4 text-black" />
          </div>
          <span class="hidden text-sm font-bold uppercase tracking-wider text-white sm:block">Flipbook</span>
        </div>

        <h1 class="absolute left-1/2 max-w-[40%] -translate-x-1/2 truncate text-sm font-medium text-white/80">
          {flipbook.data.title}
        </h1>

        <button
          type="button"
          onclick={() => (showQR = true)}
          class="flex items-center gap-2 rounded bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
        >
          <Share2 class="h-4 w-4" />
          <span class="hidden sm:inline">Share</span>
        </button>
      </div>
    </header>

    {#if flipbook.data.fileUrl}
      <FlipbookViewer pdfUrl={flipbook.data.fileUrl} />
    {/if}

    <QRCodeDisplay
      url={shareUrl}
      title={flipbook.data.title}
      isOpen={showQR}
      onClose={() => {
        showQR = false;
      }}
    />
  </div>
{/if}
