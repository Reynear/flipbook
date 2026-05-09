<script lang="ts">
  import Check from 'lucide-svelte/icons/check';
  import Copy from 'lucide-svelte/icons/copy';
  import Download from 'lucide-svelte/icons/download';
  import X from 'lucide-svelte/icons/x';
  import * as QRCode from 'qrcode';
  import { onDestroy } from 'svelte';
  import { cn } from '$lib/utils';

  let {
    url,
    title,
    isOpen,
    onClose
  }: {
    url: string;
    title?: string;
    isOpen: boolean;
    onClose: () => void;
  } = $props();

  let copied = $state(false);
  let isVisible = $state(false);
  let shouldRender = $state(false);
  let qrDataUrl = $state('');
  let closeTimer: number | null = null;
  let copiedTimer: number | null = null;
  let entranceFrame: number | null = null;
  let visibilityFrame: number | null = null;

  const truncatedUrl = $derived(url.length > 40 ? `${url.substring(0, 37)}...` : url);

  $effect(() => {
    const targetUrl = url;
    void QRCode.toDataURL(targetUrl, {
      width: 200,
      margin: 0,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    }).then((dataUrl) => {
      if (targetUrl === url) {
        qrDataUrl = dataUrl;
      }
    });
  });

  $effect(() => {
    clearCloseAnimation();

    if (isOpen) {
      shouldRender = true;
      entranceFrame = requestAnimationFrame(() => {
        visibilityFrame = requestAnimationFrame(() => {
          isVisible = true;
          visibilityFrame = null;
        });
      });
    } else {
      isVisible = false;
      closeTimer = window.setTimeout(() => {
        shouldRender = false;
        closeTimer = null;
      }, 300);
    }
  });

  onDestroy(() => {
    clearCloseAnimation();
    if (copiedTimer !== null) {
      clearTimeout(copiedTimer);
    }
  });

  function clearCloseAnimation() {
    if (entranceFrame !== null) {
      cancelAnimationFrame(entranceFrame);
      entranceFrame = null;
    }
    if (visibilityFrame !== null) {
      cancelAnimationFrame(visibilityFrame);
      visibilityFrame = null;
    }
    if (closeTimer !== null) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    copied = true;
    if (copiedTimer !== null) {
      clearTimeout(copiedTimer);
    }
    copiedTimer = window.setTimeout(() => {
      copied = false;
      copiedTimer = null;
    }, 2000);
  }

  function handleDownload() {
    if (!qrDataUrl) return;
    const downloadLink = document.createElement('a');
    downloadLink.href = qrDataUrl;
    downloadLink.download = `${title || 'qrcode'}.png`;
    downloadLink.click();
  }

  function handleBackdropKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      onClose();
      return;
    }
    if ((event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget) {
      event.preventDefault();
      onClose();
    }
  }
</script>

{#if shouldRender}
  <div
    class={cn('modal-backdrop transition-all duration-300 ease-brutal', isVisible ? 'opacity-100' : 'opacity-0')}
    onclick={(event) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    }}
    onkeydown={handleBackdropKeydown}
    role="button"
    tabindex="0"
    aria-label="Close QR code modal"
  >
    <div
      class={cn(
        'modal transition-all duration-300 ease-brutal',
        isVisible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-95 opacity-0'
      )}
    >
      <div class="modal-header flex items-center justify-between">
        <div>
          {#if title}
            <h3 class="text-h4 truncate pr-8 font-bold uppercase tracking-wider">{title}</h3>
          {/if}
          <p class="text-small text-brutal-black/60">Scan to open this flipbook</p>
        </div>
        <button type="button" onclick={onClose} class="btn-ghost btn-icon">
          <X class="h-5 w-5" />
        </button>
      </div>

      <div class="modal-body">
        <div class="qr-container mx-auto w-fit">
          {#if qrDataUrl}
            <img src={qrDataUrl} alt="QR code for {title || 'flipbook'}" width="200" height="200" />
          {/if}
        </div>

        <div class="mt-6 border-2 border-brutal-black bg-brutal-gray px-4 py-3">
          <p class="truncate text-center font-mono text-xs text-brutal-black" title={url}>
            {truncatedUrl}
          </p>
        </div>
      </div>

      <div class="modal-footer">
        <button
          type="button"
          onclick={handleCopy}
          class={cn('btn btn-sm flex-1', copied ? 'border-success bg-success text-brutal-white' : 'btn-outline')}
        >
          {#if copied}
            <Check class="h-4 w-4" />
            Copied!
          {:else}
            <Copy class="h-4 w-4" />
            Copy URL
          {/if}
        </button>

        <button type="button" onclick={handleDownload} class="btn btn-sm btn-primary flex-1">
          <Download class="h-4 w-4" />
          Download
        </button>
      </div>
    </div>
  </div>
{/if}
