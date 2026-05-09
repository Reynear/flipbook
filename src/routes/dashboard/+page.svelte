<script lang="ts">
  import BookOpen from 'lucide-svelte/icons/book-open';
  import Lock from 'lucide-svelte/icons/lock';
  import Plus from 'lucide-svelte/icons/plus';
  import Sparkles from 'lucide-svelte/icons/sparkles';
  import X from 'lucide-svelte/icons/x';
  import { onMount } from 'svelte';
  import { resolve } from '$app/paths';
  import { useConvexClient, useQuery } from 'convex-svelte';
  import { PUBLIC_ENABLE_POSTER_GENERATION } from '$env/static/public';
  import { api } from '$convex/_generated/api.js';
  import type { Id } from '$convex/_generated/dataModel.js';
  import FlipbookCard from '$lib/components/FlipbookCard.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import PDFUploader from '$lib/components/PDFUploader.svelte';
  import QRCodeDisplay from '$lib/components/QRCodeDisplay.svelte';
  import { getSessionToken } from '$lib/anonymous';
  import { generateFlipbookUrl, MAX_FLIPBOOKS_ANONYMOUS } from '$lib/utils';

  const ENABLE_POSTER_GENERATION = PUBLIC_ENABLE_POSTER_GENERATION === 'true';
  const client = useConvexClient();

  let sessionToken = $state('');
  let activeComposer = $state<'upload' | null>(null);
  let qrModal = $state<{ url: string; title: string } | null>(null);

  const anonymousFlipbooks = useQuery(api.flipbooks.listBySession, () =>
    sessionToken ? { sessionToken } : 'skip'
  );
  const canUpload = $derived(
    !anonymousFlipbooks.data || anonymousFlipbooks.data.length < MAX_FLIPBOOKS_ANONYMOUS
  );

  onMount(() => {
    sessionToken = getSessionToken();
  });

  async function handleUploadComplete(fileId: string, pageCount: number) {
    if (!sessionToken) return;
    const title = `Flipbook ${new Date().toLocaleDateString()}`;
    await client.mutation(api.flipbooks.create, {
      fileId: fileId as Id<'_storage'>,
      title,
      pageCount,
      fileSize: 0,
      sessionToken
    });
    activeComposer = null;
  }

  async function handleDelete(id: string) {
    if (!sessionToken) return;
    await client.mutation(api.flipbooks.remove, {
      id: id as Id<'flipbooks'>,
      sessionToken
    });
  }

  function handleShare(id: string) {
    const flipbook = anonymousFlipbooks.data?.find((candidate) => candidate._id === id);
    if (flipbook) {
      qrModal = {
        url: generateFlipbookUrl(id),
        title: flipbook.title
      };
    }
  }
</script>

{#if !sessionToken}
  <div class="flex min-h-screen items-center justify-center bg-brutal-cream">
    <div class="text-h3 animate-pulse font-bold uppercase tracking-wider">Loading...</div>
  </div>
{:else}
  <div class="min-h-screen bg-brutal-cream">
    <header class="sticky top-0 z-50 border-b-2 border-brutal-black bg-brutal-cream">
      <div class="container-brutal flex items-center justify-between py-4">
          <a href={resolve('/')} class="group flex items-center gap-3">
          <div
            class="border-2 border-brutal-black bg-brand-yellow p-2 shadow-brutal transition-all duration-150 ease-brutal group-hover:-translate-x-0.5 group-hover:-translate-y-0.5 group-hover:shadow-brutal-md"
          >
            <BookOpen class="h-6 w-6 text-brutal-black" />
          </div>
          <span class="text-h4 font-bold uppercase tracking-wider">Flipbook</span>
        </a>
      </div>
    </header>

    <main class="container-brutal py-8 lg:py-12">
      <div class="mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-h2 uppercase">Your Flipbooks</h1>
          <p class="text-body mt-1 text-brutal-black/60">
            <span class="flex items-center gap-2">
              <span class="badge-free">Anonymous</span>
              {anonymousFlipbooks.data?.length ?? 0} / {MAX_FLIPBOOKS_ANONYMOUS} flipbooks
            </span>
          </p>
        </div>
        <div class="flex flex-wrap gap-4">
          <button type="button" onclick={() => (activeComposer = 'upload')} disabled={!canUpload} class="btn-primary">
            <Plus class="h-5 w-5" />
            New Flipbook
          </button>
          {#if ENABLE_POSTER_GENERATION}
            <a href={resolve('/generate')} class={`btn-secondary ${!canUpload ? 'pointer-events-none opacity-50' : ''}`}>
              <Sparkles class="h-5 w-5" />
              Generate
            </a>
          {/if}
        </div>
      </div>

      {#if activeComposer}
        <div class="mb-8">
          <div class="card">
            <div class="mb-6 flex items-center justify-between">
              <h2 class="text-h3 uppercase">Upload PDF or Image</h2>
              <button type="button" onclick={() => (activeComposer = null)} class="btn-ghost btn-icon">
                <X class="h-5 w-5" />
              </button>
            </div>
            {#if canUpload}
              <PDFUploader onUploadComplete={handleUploadComplete} {sessionToken} />
            {:else}
              <div class="py-8 text-center">
                <Lock class="mx-auto mb-4 h-12 w-12 text-brutal-black/50" />
                <h3 class="text-h4 mb-2 uppercase">Limit Reached</h3>
                <p class="text-body">You've reached the {MAX_FLIPBOOKS_ANONYMOUS} flipbook limit.</p>
              </div>
            {/if}
          </div>
        </div>
      {/if}

      {#if anonymousFlipbooks.data && anonymousFlipbooks.data.length > 0}
        <div class="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {#each anonymousFlipbooks.data as flipbook (flipbook._id)}
            <FlipbookCard {flipbook} onDelete={handleDelete} onShare={handleShare} />
          {/each}
        </div>
      {:else}
        <div class="card py-16 text-center">
          <div class="mx-auto mb-6 flex h-20 w-20 items-center justify-center border-2 border-brutal-black bg-brutal-gray">
            <BookOpen class="h-10 w-10 text-brutal-black/30" />
          </div>
          <h3 class="text-h3 mb-2 uppercase">No Flipbooks Yet</h3>
          <p class="text-body mb-6 text-brutal-black/60">
            Upload a PDF or image, or generate a poster to create your first flipbook.
          </p>
          {#if !activeComposer}
            <div class="flex flex-wrap justify-center gap-4">
              <button type="button" onclick={() => (activeComposer = 'upload')} class="btn-primary">
                <Plus class="h-5 w-5" />
                Create Flipbook
              </button>
              {#if ENABLE_POSTER_GENERATION}
                <a href={resolve('/generate')} class="btn-secondary">
                  <Sparkles class="h-5 w-5" />
                  Generate
                </a>
              {/if}
            </div>
          {/if}
        </div>
      {/if}
    </main>

    {#if qrModal}
      <QRCodeDisplay
        url={qrModal.url}
        title={qrModal.title}
        isOpen={true}
        onClose={() => {
          qrModal = null;
        }}
      />
    {/if}

    <Footer />
  </div>
{/if}
