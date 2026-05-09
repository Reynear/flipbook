<script lang="ts">
  import ArrowUp from 'lucide-svelte/icons/arrow-up';
  import Download from 'lucide-svelte/icons/download';
  import MousePointer2 from 'lucide-svelte/icons/mouse-pointer-2';
  import Paperclip from 'lucide-svelte/icons/paperclip';
  import RefreshCcw from 'lucide-svelte/icons/refresh-ccw';
  import Sparkles from 'lucide-svelte/icons/sparkles';
  import Wand2 from 'lucide-svelte/icons/wand-2';
  import X from 'lucide-svelte/icons/x';
  import { useConvexClient, useQuery } from 'convex-svelte';
  import { api } from '$convex/_generated/api.js';
  import type { Id } from '$convex/_generated/dataModel.js';
  import PosterElementLayer from '$lib/components/PosterElementLayer.svelte';
  import { createPosterPdfFileFromElement } from '$lib/posterPdf';
  import {
    normalizePosterSchema,
    posterSchemaToMarkup,
    type PosterElement,
    type PosterSchema
  } from '$lib/posterSchema';

  type PosterResult = {
    title: string;
    schema: PosterSchema;
    model: string;
    generatedAt: number;
    html: string;
    css: string;
  };

  type ReferenceImage = {
    storageId: Id<'_storage'>;
    url: string;
    fileName: string;
  };

  type LocalBusyState = 'idle' | 'regenerating' | 'exporting' | 'uploading_references';
  type BusyState = LocalBusyState | 'generating';
  type GenerationStage =
    | 'queued'
    | 'requesting_model'
    | 'model_output_received'
    | 'validating_output'
    | 'normalizing_schema'
    | 'rendering_markup'
    | 'completed'
    | 'failed';

  type GenerationSnapshot = {
    stage: GenerationStage;
    progress: number;
  };

  const MAX_REFERENCE_IMAGES = 4;
  const STAGE_LABELS: Record<GenerationStage, string> = {
    queued: 'Queued',
    requesting_model: 'Generating layout',
    model_output_received: 'Processing model output',
    validating_output: 'Validating poster data',
    normalizing_schema: 'Normalizing layout',
    rendering_markup: 'Building preview',
    completed: 'Done',
    failed: 'Failed'
  };

  let {
    sessionToken,
    onCreated,
    onClose
  }: {
    sessionToken: string;
    onCreated?: (flipbookId: string) => void;
    onClose?: () => void;
  } = $props();

  const client = useConvexClient();

  let prompt = $state('');
  let refinementPrompt = $state('');
  let poster = $state<PosterResult | null>(null);
  let selectedElementId = $state<string | null>(null);
  let localBusyState = $state<LocalBusyState>('idle');
  let activeGenerationId = $state<Id<'posterGenerations'> | null>(null);
  let generationSnapshot = $state<GenerationSnapshot | null>(null);
  let referenceImages = $state.raw<ReferenceImage[]>([]);
  let error = $state<string | null>(null);
  let previewElement: HTMLDivElement | undefined = $state();
  let referenceInput: HTMLInputElement | undefined = $state();

  const activeGeneration = useQuery(api.posterGenerations.getPosterGeneration, () =>
    activeGenerationId
      ? {
          generationId: activeGenerationId,
          sessionToken
        }
      : 'skip'
  );

  const isGenerating = $derived(
    activeGenerationId !== null &&
      (activeGeneration.isLoading ||
        activeGeneration.data === null ||
        activeGeneration.data?.status === 'queued' ||
        activeGeneration.data?.status === 'running')
  );
  const busyState = $derived<BusyState>(isGenerating ? 'generating' : localBusyState);
  const stageLabel = $derived(generationSnapshot ? STAGE_LABELS[generationSnapshot.stage] : STAGE_LABELS.queued);
  const progressValue = $derived(generationSnapshot ? clampProgress(generationSnapshot.progress) : 5);
  const sortedElements = $derived.by(() =>
    poster ? [...poster.schema.elements].sort((a, b) => a.zIndex - b.zIndex) : []
  );
  const selectedElement = $derived.by<PosterElement | null>(() => {
    if (!selectedElementId || !poster) {
      return null;
    }
    return poster.schema.elements.find((element) => element.id === selectedElementId) ?? null;
  });

  $effect(() => {
    const generation = activeGeneration.data;
    if (!activeGenerationId || !generation) {
      return;
    }

    generationSnapshot = {
      stage: generation.stage as GenerationStage,
      progress: generation.progress
    };

    if (generation.status === 'succeeded') {
      try {
        if (
          typeof generation.resultSchema !== 'string' ||
          typeof generation.resultTitle !== 'string' ||
          typeof generation.resultHtml !== 'string' ||
          typeof generation.resultCss !== 'string' ||
          typeof generation.resultModel !== 'string' ||
          typeof generation.resultGeneratedAt !== 'number'
        ) {
          throw new Error('Generation completed without a valid poster payload.');
        }

        const schema = normalizePosterSchema(parseGenerationSchema(generation.resultSchema));
        poster = {
          title: generation.resultTitle,
          schema,
          html: generation.resultHtml,
          css: generation.resultCss,
          model: generation.resultModel,
          generatedAt: generation.resultGeneratedAt
        };
        refinementPrompt = '';
        selectedElementId = null;
        referenceImages = [];
        void deleteReferenceImagesBestEffort(generation.referenceImageStorageIds ?? []);
      } catch (err) {
        error = err instanceof Error ? err.message : 'Failed to load generated poster.';
      } finally {
        activeGenerationId = null;
        generationSnapshot = null;
      }
      return;
    }

    if (generation.status === 'failed') {
      error = generation.errorMessage ?? 'Failed to generate poster.';
      activeGenerationId = null;
      generationSnapshot = null;
    }
  });

  async function deleteReferenceImage(storageId: Id<'_storage'>) {
    await client.mutation(api.files.deleteUploadedFile, { sessionToken, fileId: storageId });
  }

  async function deleteReferenceImagesBestEffort(storageIds: Id<'_storage'>[]) {
    for (const storageId of storageIds) {
      try {
        await deleteReferenceImage(storageId);
      } catch (err) {
        console.error('Failed to delete reference image', err);
      }
    }
  }

  async function handleGenerate() {
    const trimmed = prompt.trim();
    if (!trimmed) {
      error = 'Enter a prompt to generate a poster.';
      return;
    }

    try {
      error = null;
      selectedElementId = null;
      generationSnapshot = {
        stage: 'queued',
        progress: 5
      };
      activeGenerationId = await client.mutation(api.posterGenerations.startPosterGeneration, {
        sessionToken,
        prompt: trimmed,
        referenceImageStorageIds:
          referenceImages.length > 0 ? referenceImages.map((image) => image.storageId) : undefined
      });
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to generate poster.';
      generationSnapshot = null;
    }
  }

  function handleSelect(event: MouseEvent) {
    if (!previewElement) return;
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-element-id]');
    if (!target || !previewElement.contains(target)) return;
    selectedElementId = target.dataset.elementId ?? null;
  }

  function handlePreviewKeydown(event: KeyboardEvent) {
    if (busyState === 'exporting') return;
    if (event.key === 'Escape') {
      selectedElementId = null;
    }
  }

  async function handleRegenerateElement() {
    if (!poster || !selectedElementId) {
      error = 'Select an element before regenerating.';
      return;
    }
    const trimmed = refinementPrompt.trim();
    if (!trimmed) {
      error = 'Add a refinement prompt for the selected element.';
      return;
    }

    try {
      localBusyState = 'regenerating';
      error = null;
      const result = await client.action(api.posters.regeneratePosterElement, {
        sessionToken,
        posterSchema: JSON.stringify(poster.schema),
        elementId: selectedElementId,
        refinementPrompt: trimmed
      });

      const schema = normalizePosterSchema(result.schema);
      const markup = posterSchemaToMarkup(schema);
      poster = {
        title: typeof result.title === 'string' ? result.title : poster.title,
        schema,
        model: typeof result.model === 'string' ? result.model : poster.model,
        generatedAt: typeof result.generatedAt === 'number' ? result.generatedAt : Date.now(),
        html: markup.html,
        css: markup.css
      };
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to regenerate element.';
    } finally {
      localBusyState = 'idle';
    }
  }

  async function handleExportPdf() {
    if (!poster) return;

    try {
      localBusyState = 'exporting';
      error = null;

      if (!previewElement) {
        throw new Error('Poster preview is not ready.');
      }

      const fileName = `${slugify(poster.title || 'generated-poster')}.pdf`;
      const pdfFile = await createPosterPdfFileFromElement(previewElement, fileName, poster.schema);
      const uploadUrl = await client.mutation(api.files.generateUploadUrl, { sessionToken });
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': pdfFile.type
        },
        body: pdfFile
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload generated PDF.');
      }

      const uploadPayload = (await uploadResponse.json()) as { storageId?: string };
      if (!uploadPayload.storageId) {
        throw new Error('Upload response did not include a file ID.');
      }

      await client.mutation(api.files.validateFile, {
        sessionToken,
        fileId: uploadPayload.storageId as Id<'_storage'>
      });

      const createdId = await client.mutation(api.flipbooks.create, {
        fileId: uploadPayload.storageId as Id<'_storage'>,
        title: poster.title || 'Generated Poster',
        pageCount: 1,
        fileSize: pdfFile.size,
        sessionToken,
        sourceType: 'generated_poster',
        posterSchema: JSON.stringify(poster.schema),
        posterHtml: poster.html,
        posterCss: poster.css,
        generationMeta: {
          model: poster.model,
          generatedAt: poster.generatedAt
        }
      });

      onCreated?.(createdId as string);
      onClose?.();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to export poster.';
    } finally {
      localBusyState = 'idle';
    }
  }

  async function uploadReferenceImage(file: File): Promise<ReferenceImage> {
    const uploadUrl = await client.mutation(api.files.generateUploadUrl, { sessionToken });
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': file.type
      },
      body: file
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload reference image.');
    }

    const uploadPayload = (await uploadResponse.json()) as { storageId?: string };
    if (!uploadPayload.storageId) {
      throw new Error('Upload response did not include a file ID.');
    }

    const storageId = uploadPayload.storageId as Id<'_storage'>;
    const validation = await client.mutation(api.files.validateImageFile, {
      sessionToken,
      fileId: storageId
    });
    if (!validation.url) {
      throw new Error('Reference image URL is unavailable.');
    }

    return {
      storageId,
      url: validation.url,
      fileName: file.name || 'reference-image'
    };
  }

  async function handleUploadReferenceImages(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length || busyState !== 'idle') {
      return;
    }

    const remainingSlots = Math.max(0, MAX_REFERENCE_IMAGES - referenceImages.length);
    if (remainingSlots === 0) {
      error = `You can attach up to ${MAX_REFERENCE_IMAGES} reference images.`;
      return;
    }

    const filesToUpload = files.slice(0, remainingSlots);
    if (filesToUpload.some((file) => !file.type.startsWith('image/'))) {
      error = 'Only image files can be used as references.';
      return;
    }

    try {
      localBusyState = 'uploading_references';
      error = null;

      const uploaded: ReferenceImage[] = [];
      for (const file of filesToUpload) {
        uploaded.push(await uploadReferenceImage(file));
      }

      referenceImages = [...referenceImages, ...uploaded];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to upload reference images.';
    } finally {
      localBusyState = 'idle';
    }
  }

  async function handleRemoveReferenceImage(storageId: Id<'_storage'>) {
    if (busyState !== 'idle') {
      return;
    }

    try {
      error = null;
      await deleteReferenceImage(storageId);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to delete reference image.';
      return;
    }

    referenceImages = referenceImages.filter((image) => image.storageId !== storageId);
  }

  function handlePromptInput(event: Event) {
    const target = event.currentTarget as HTMLTextAreaElement;
    prompt = target.value;
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 150)}px`;
  }

  function handlePromptKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (prompt.trim() && busyState === 'idle') {
        void handleGenerate();
      }
    }
  }

  function slugify(value: string): string {
    return (
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'generated-poster'
    );
  }

  function parseGenerationSchema(raw: string): unknown {
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error('Generated poster schema is invalid JSON.');
    }
  }

  function clampProgress(value: number): number {
    return Math.max(0, Math.min(100, Math.round(value)));
  }
</script>

<div class="flex w-full flex-1 flex-col overflow-hidden bg-brutal-cream">
  <div class="relative flex w-full flex-1 flex-col overflow-y-auto">
    {#if poster}
      <div class="mx-auto w-full max-w-7xl flex-1 p-4 md:p-8">
        <div class="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_380px]">
          <div class="card flex flex-col p-4 md:p-8">
            <div class="mb-6 flex items-center justify-between">
              <h3 class="text-h3 truncate pr-4 uppercase">{poster.title}</h3>
              <span class="badge-free shrink-0">{poster.schema.elements.length} Elements</span>
            </div>

            <div
              bind:this={previewElement}
              onclick={handleSelect}
              onkeydown={handlePreviewKeydown}
              role="button"
              tabindex={busyState === 'exporting' ? -1 : 0}
              aria-label="Poster preview. Click an element to select it for refinement."
              class="relative mx-auto aspect-[1/1.414] w-full max-w-[600px] cursor-crosshair overflow-hidden border-2 border-brutal-black bg-brutal-white shadow-brutal"
              style:background-color={poster.schema.backgroundColor}
            >
              {#each sortedElements as element (element.id)}
                <PosterElementLayer
                  {element}
                  selected={element.id === selectedElementId && busyState !== 'exporting'}
                  interactive={busyState !== 'exporting'}
                />
              {/each}
            </div>
          </div>

          <div class="flex flex-col gap-4">
            <div class="card p-4">
              <div class="mb-4 flex items-center gap-2 text-brutal-black/80">
                <MousePointer2 class="h-4 w-4" />
                <h4 class="text-sm font-bold uppercase tracking-wider">Refine Element</h4>
              </div>

              {#if selectedElement}
                <div class="space-y-4">
                  <textarea
                    bind:value={refinementPrompt}
                    rows="3"
                    maxlength="400"
                    class="input w-full resize-none p-3 text-sm"
                    placeholder="Describe how to change this element..."
                    disabled={busyState !== 'idle'}
                  ></textarea>
                  <button
                    type="button"
                    onclick={handleRegenerateElement}
                    disabled={busyState !== 'idle' || !refinementPrompt.trim()}
                    class="btn-outline flex w-full items-center justify-center gap-2 py-2 text-sm"
                  >
                    <RefreshCcw class={`h-4 w-4 ${busyState === 'regenerating' ? 'animate-spin' : ''}`} />
                    {busyState === 'regenerating' ? 'Regenerating...' : 'Regenerate Element'}
                  </button>
                </div>
              {:else}
                <div class="border-2 border-dashed border-brutal-black/20 py-6 text-center">
                  <p class="text-sm text-brutal-black/60">Select an element to refine it</p>
                </div>
              {/if}

              <div class="mt-4 border-t-2 border-brutal-black/10 pt-4">
                <p class="flex items-center gap-1.5 font-mono text-xs text-brutal-black/50">
                  <Wand2 class="h-3 w-3" />
                  {poster.model}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    {:else}
      <div class="flex min-h-[60vh] w-full flex-1 flex-col items-center justify-center p-6">
        <div class="mx-auto max-w-2xl text-center">
          <div
            class="mx-auto mb-8 flex h-24 w-24 items-center justify-center border-4 border-brutal-black bg-brand-yellow shadow-brutal transition-transform hover:-translate-y-1"
          >
            {#if busyState === 'generating'}
              <RefreshCcw class="h-12 w-12 animate-spin text-brutal-black" />
            {:else}
              <Sparkles class="h-12 w-12 text-brutal-black" />
            {/if}
          </div>
          <h2 class="text-h1 mb-6 uppercase">Generate Poster</h2>
          <p class="text-h4 font-normal leading-relaxed text-brutal-black/70">
            Describe the poster you want to generate. Be specific about the theme, style, text, and layout for the best results.
          </p>

          {#if busyState === 'generating'}
            <div class="mx-auto mt-10 w-full max-w-xl">
              <div class="mb-3 flex items-center justify-between text-sm font-bold uppercase tracking-wider">
                <span>{stageLabel}</span>
                <span>{progressValue}%</span>
              </div>
              <div class="progress-bar h-6">
                <div class="progress-bar-fill" style:width={`${progressValue}%`}></div>
              </div>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>

  <div class="relative z-20 shrink-0 bg-brutal-cream p-4 md:p-6">
    <div class="mx-auto max-w-7xl">
      {#if error}
        <div class="mb-4 border-2 border-brutal-black bg-[#ffcccc] p-3 font-bold">{error}</div>
      {/if}
      <div
        class="border-3 relative border-brutal-black bg-brutal-white p-4 pb-14 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all duration-150"
      >
        {#if referenceImages.length > 0}
          <div class="mb-4 flex flex-wrap gap-3">
            {#each referenceImages as image (image.storageId)}
              <div
                class="relative h-16 w-16 overflow-hidden border-2 border-brutal-black bg-brutal-cream shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:h-20 sm:w-20"
              >
                <img src={image.url} alt={image.fileName} class="h-full w-full object-cover" />
                <button
                  type="button"
                  class="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center border-2 border-brutal-black bg-brutal-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-colors hover:bg-brutal-gray active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                  onclick={() => void handleRemoveReferenceImage(image.storageId)}
                  disabled={busyState !== 'idle'}
                >
                  <X class="h-3 w-3" strokeWidth={3} />
                </button>
              </div>
            {/each}
          </div>
        {/if}

        <textarea
          value={prompt}
          oninput={handlePromptInput}
          onkeydown={handlePromptKeydown}
          rows="1"
          class="w-full resize-none bg-transparent py-2 text-lg leading-loose outline-none ring-0 placeholder-brutal-black/50 focus:outline-none focus:ring-0"
          placeholder="What kind of poster do you want to create?"
          disabled={busyState !== 'idle'}
          style:min-height="24px"
        ></textarea>

        <div class="absolute bottom-3 left-4 flex items-center gap-3">
          <input
            bind:this={referenceInput}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            multiple
            class="hidden"
            onchange={handleUploadReferenceImages}
            disabled={busyState !== 'idle'}
          />
          <button
            type="button"
            onclick={() => referenceInput?.click()}
            disabled={busyState !== 'idle' || referenceImages.length >= MAX_REFERENCE_IMAGES}
            class="flex items-center gap-2 border-2 border-brutal-black bg-brutal-white px-4 py-1.5 font-bold uppercase tracking-wider text-brutal-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:pointer-events-none disabled:opacity-50"
          >
            {#if busyState === 'uploading_references'}
              <RefreshCcw class="h-4 w-4 animate-spin" strokeWidth={2.5} />
            {:else}
              <Paperclip class="h-4 w-4" strokeWidth={2.5} />
            {/if}
            <span class="text-sm">Attach</span>
          </button>
        </div>

        <div class="absolute bottom-3 right-4 flex items-center gap-3">
          {#if poster}
            <button
              type="button"
              onclick={handleExportPdf}
              disabled={busyState !== 'idle'}
              class="flex items-center gap-2 border-2 border-brutal-black bg-brutal-white px-4 py-1.5 font-bold uppercase tracking-wider text-brutal-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:pointer-events-none disabled:opacity-50"
              title="Export as PDF"
            >
              <Download class="h-4 w-4" strokeWidth={2.5} />
              <span class="hidden text-sm sm:inline-block">Export</span>
            </button>
          {/if}
          <button
            type="button"
            onclick={handleGenerate}
            disabled={busyState !== 'idle' || !prompt.trim()}
            class="flex h-10 w-10 items-center justify-center bg-brutal-black text-brutal-white shadow-[3px_3px_0px_0px_rgba(0,0,0,0.2)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none active:translate-x-[3px] active:translate-y-[3px] disabled:pointer-events-none disabled:opacity-50"
          >
            {#if busyState === 'generating'}
              <RefreshCcw class="h-5 w-5 animate-spin" strokeWidth={3} />
            {:else}
              <ArrowUp class="h-5 w-5" strokeWidth={3} />
            {/if}
          </button>
        </div>
      </div>

      <div class="mt-4 text-center sm:text-right">
        <p class="flex items-center justify-end gap-2 text-xs font-bold uppercase tracking-widest text-brutal-black/40">
          <span>Press</span>
          <kbd class="bg-brutal-gray/50 px-1.5 py-0.5 font-mono text-brutal-black shadow-[1px_1px_0px_0px_rgba(0,0,0,0.5)]">Return</kbd>
          <span>to send</span>
        </p>
      </div>
    </div>
  </div>
</div>
