<script lang="ts">
  import ChevronLeft from 'lucide-svelte/icons/chevron-left';
  import ChevronRight from 'lucide-svelte/icons/chevron-right';
  import Loader2 from 'lucide-svelte/icons/loader-2';
  import { onMount } from 'svelte';
  import { pageFlipAction } from '$lib/actions/pageFlip';

  let { pdfUrl }: { pdfUrl: string } = $props();

  type PageFlipInstance = import('page-flip').PageFlip;

  const framePadding = 12;
  const frameBorder = 2;

  let pages = $state.raw<string[]>([]);
  let loading = $state(true);
  let loadingProgress = $state(0);
  let currentPage = $state(0);
  let totalPages = $state(0);
  let dimensions = $state({ width: 0, height: 0 });
  let isMobile = $state(false);
  let pageAspectRatio = $state<number | null>(null);
  let containerElement: HTMLDivElement | undefined = $state();
  let pageFlip: PageFlipInstance | null = null;
  let resizeObserver: ResizeObserver | null = null;

  const isSinglePage = $derived(totalPages <= 1);
  const isReady = $derived(!loading && pages.length > 0 && dimensions.width > 0 && dimensions.height > 0);
  const pageWidth = $derived(Math.max(1, dimensions.width));
  const pageHeight = $derived(Math.max(1, dimensions.height));
  const bookWidth = $derived(isMobile || isSinglePage ? pageWidth : pageWidth * 2);
  const bookHeight = $derived(pageHeight);
  const frameInset = $derived(framePadding * 2 + frameBorder * 2);
  const frameWidth = $derived(bookWidth + frameInset);
  const frameHeight = $derived(bookHeight + frameInset);
  const viewportPadding = $derived(getViewportPadding(isMobile));
  const currentRangeStart = $derived(
    isSinglePage ? 1 : isMobile ? currentPage + 1 : Math.min(currentPage * 2 + 1, totalPages)
  );
  const currentRangeEnd = $derived(
    isSinglePage ? 1 : isMobile ? currentPage + 1 : Math.min(currentPage * 2 + 2, totalPages)
  );
  const pageFlipParams = $derived({
    enabled: isReady,
    pages,
    width: pageWidth,
    height: pageHeight,
    isMobile,
    isSinglePage,
    onFlip: (page: number) => {
      currentPage = page;
    },
    onReady: (instance: PageFlipInstance | null) => {
      pageFlip = instance;
    }
  });

  onMount(() => {
    updateDimensions();
    resizeObserver = new ResizeObserver(updateDimensions);
    if (containerElement) {
      resizeObserver.observe(containerElement);
    }

    return () => {
      resizeObserver?.disconnect();
    };
  });

  $effect(() => {
    const sourceUrl = pdfUrl;
    if (!sourceUrl) return;

    let active = true;
    let loadingTask: { promise: Promise<unknown>; destroy: () => Promise<void> | void } | null = null;

    pages = [];
    loading = true;
    loadingProgress = 0;
    totalPages = 0;
    currentPage = 0;
    pageAspectRatio = null;

    void (async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).toString();

        loadingTask = pdfjs.getDocument(sourceUrl);
        const pdf = (await loadingTask.promise) as { numPages: number; getPage: (page: number) => Promise<any> };
        if (!active) return;

        totalPages = pdf.numPages;
        const pageImages: string[] = [];

        for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
          if (!active) return;
          const page = await pdf.getPage(pageIndex);
          const scale = 2.5;
          const viewport = page.getViewport({ scale });
          if (pageIndex === 1) {
            pageAspectRatio = viewport.height / viewport.width;
            updateDimensions();
          }

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) {
            throw new Error('Unable to render PDF page.');
          }
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({ canvasContext: context, viewport }).promise;
          if (!active) return;

          pageImages.push(canvas.toDataURL('image/jpeg', 0.95));
          loadingProgress = Math.round((pageIndex / pdf.numPages) * 100);
        }

        pages = pageImages;
        loading = false;
      } catch (error) {
        if (!active) return;
        console.error('Failed to load PDF:', error);
        loading = false;
      }
    })();

    return () => {
      active = false;
      void loadingTask?.destroy();
    };
  });

  function getViewportPadding(mobile: boolean) {
    return {
      x: mobile ? 20 : 40,
      y: mobile ? 24 : 56
    };
  }

  function updateDimensions() {
    if (!containerElement) return;

    const containerWidth = containerElement.clientWidth;
    const containerHeight = containerElement.clientHeight;
    const mobile = window.innerWidth < 768;
    isMobile = mobile;

    const aspectRatio = pageAspectRatio ?? 1.4;
    const padding = getViewportPadding(mobile);
    const inset = framePadding * 2 + frameBorder * 2;

    const availableWidth = Math.max(0, containerWidth - padding.x * 2 - inset);
    const availableHeight = Math.max(0, containerHeight - padding.y * 2 - inset);
    const maxPageWidth = mobile || isSinglePage ? availableWidth : availableWidth / 2;
    const maxPageHeight = availableHeight;

    let width = maxPageWidth;
    let height = width * aspectRatio;

    if (height > maxPageHeight) {
      height = maxPageHeight;
      width = height / aspectRatio;
    }

    dimensions = {
      width: Math.floor(width),
      height: Math.floor(height)
    };
  }

  function goToPrevPage() {
    if (isSinglePage) return;
    pageFlip?.flipPrev();
  }

  function goToNextPage() {
    if (isSinglePage) return;
    pageFlip?.flipNext();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (isSinglePage) return;
    if (event.key === 'ArrowLeft') {
      goToPrevPage();
    } else if (event.key === 'ArrowRight') {
      goToNextPage();
    }
  }
</script>

<svelte:window onresize={updateDimensions} onorientationchange={updateDimensions} onkeydown={handleKeydown} />

<div
  bind:this={containerElement}
  class="relative flex h-full w-full flex-1 flex-col items-center justify-center overflow-hidden bg-neutral-900"
  style:padding={`${viewportPadding.y}px ${viewportPadding.x}px`}
>
  <div class="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.03)_0%,_transparent_70%)]"></div>

  <div class="absolute inset-0 z-10 flex items-center justify-center">
    {#if loading}
      <div class="absolute inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-neutral-900/80 backdrop-blur-sm">
        <div class="relative">
          <div class="h-16 w-16 animate-spin rounded-full border-4 border-white/20 border-t-white"></div>
          <Loader2 class="absolute inset-0 m-auto h-6 w-6 animate-pulse text-white" />
        </div>
        <div class="flex flex-col items-center gap-3">
          <p class="text-sm font-medium uppercase tracking-wider text-white">Preparing Flipbook</p>
          <div class="h-1.5 w-48 overflow-hidden rounded-full bg-white/20">
            <div class="h-full rounded-full bg-white transition-all duration-300" style:width={`${loadingProgress}%`}></div>
          </div>
          <span class="font-mono text-xs text-white/60">{loadingProgress}%</span>
        </div>
      </div>
    {/if}

    {#if !isSinglePage}
      <button
        type="button"
        onclick={goToPrevPage}
        disabled={currentPage === 0}
        class="absolute left-2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm transition-all hover:bg-white/20 disabled:opacity-20 disabled:hover:bg-white/10 md:left-8 md:h-12 md:w-12"
        aria-label="Previous page"
      >
        <ChevronLeft class="h-5 w-5 text-white md:h-6 md:w-6" />
      </button>
    {/if}

    <div
      class="relative flex items-center justify-center rounded-[18px] bg-neutral-100/90 p-2 shadow-2xl"
      style:filter="drop-shadow(0 25px 50px rgba(0,0,0,0.5))"
      style:width={`${frameWidth}px`}
      style:height={`${frameHeight}px`}
    >
      <div use:pageFlipAction={pageFlipParams} class="h-full w-full"></div>
    </div>

    {#if !isSinglePage}
      <button
        type="button"
        onclick={goToNextPage}
        disabled={currentPage >= totalPages - (isMobile ? 1 : 2)}
        class="absolute right-2 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm transition-all hover:bg-white/20 disabled:opacity-20 disabled:hover:bg-white/10 md:right-8 md:h-12 md:w-12"
        aria-label="Next page"
      >
        <ChevronRight class="h-5 w-5 text-white md:h-6 md:w-6" />
      </button>
    {/if}
  </div>

  <div class="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 md:bottom-6">
    <div class="flex items-center gap-3 rounded-full bg-black/60 px-4 py-2 backdrop-blur-sm">
      <span class="font-mono text-sm text-white">{currentRangeStart}-{currentRangeEnd}</span>
      <span class="text-white/40">/</span>
      <span class="font-mono text-sm text-white/60">{totalPages}</span>
    </div>
  </div>

  <div class="absolute bottom-4 right-4 z-20 md:bottom-6 md:right-6">
    <p class="text-[10px] uppercase tracking-wider text-white/40">
      {isSinglePage ? 'Single page view' : 'Swipe or use arrow keys'}
    </p>
  </div>
</div>
