<script lang="ts">
  import AlertCircle from 'lucide-svelte/icons/alert-circle';
  import CheckCircle from 'lucide-svelte/icons/check-circle';
  import FileText from 'lucide-svelte/icons/file-text';
  import ImageIcon from 'lucide-svelte/icons/image';
  import Upload from 'lucide-svelte/icons/upload';
  import X from 'lucide-svelte/icons/x';
  import { jsPDF } from 'jspdf';
  import { useConvexClient } from 'convex-svelte';
  import { api } from '$convex/_generated/api.js';
  import type { Id } from '$convex/_generated/dataModel.js';
  import { cn } from '$lib/utils';

  type UploadState = 'idle' | 'selected' | 'uploading' | 'processing' | 'success' | 'error';
  type UploadKind = 'pdf' | 'image';

  const FILE_INPUT_ACCEPT = '.pdf,application/pdf,image/png,image/jpeg,image/webp,image/gif';
  const ALLOWED_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

  let {
    onUploadComplete,
    disabled = false,
    maxSize = 20 * 1024 * 1024,
    sessionToken
  }: {
    onUploadComplete: (fileId: string, pageCount: number) => void | Promise<void>;
    disabled?: boolean;
    maxSize?: number;
    sessionToken: string;
  } = $props();

  const client = useConvexClient();

  let uploadState = $state<UploadState>('idle');
  let progress = $state(0);
  let error: string | null = $state(null);
  let fileName: string | null = $state(null);
  let uploadKind: UploadKind | null = $state(null);
  let isDragging = $state(false);
  let fileInput: HTMLInputElement | undefined = $state();

  const isUploading = $derived(uploadState === 'uploading' || uploadState === 'processing' || uploadState === 'selected');
  const isDropzoneInteractive = $derived(!disabled && uploadState === 'idle');
  const uploaderSurfaceClassName = $derived(
    getUploaderSurfaceClassName({
      disabled,
      isDragging,
      state: uploadState,
      isUploading
    })
  );

  function stripFileExtension(name: string): string {
    const dotIndex = name.lastIndexOf('.');
    return dotIndex > 0 ? name.slice(0, dotIndex) : name;
  }

  function readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Unable to read image file.'));
      reader.readAsDataURL(file);
    });
  }

  function loadImage(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Unable to decode image.'));
      image.src = dataUrl;
    });
  }

  async function convertImageToPdf(file: File): Promise<File> {
    const imageDataUrl = await readFileAsDataUrl(file);
    const image = await loadImage(imageDataUrl);

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Unable to process image.');
    }
    context.drawImage(image, 0, 0);
    const pngDataUrl = canvas.toDataURL('image/png');

    const isLandscape = image.naturalWidth > image.naturalHeight;
    const pageWidth = isLandscape ? 297 : 210;
    const pageHeight = isLandscape ? 210 : 297;

    const pdf = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    const scale = Math.min(pageWidth / image.naturalWidth, pageHeight / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    const x = (pageWidth - drawWidth) / 2;
    const y = (pageHeight - drawHeight) / 2;

    pdf.addImage(pngDataUrl, 'PNG', x, y, drawWidth, drawHeight, undefined, 'FAST');

    const blob = pdf.output('blob');
    const name = `${stripFileExtension(file.name) || 'image'}.pdf`;
    return new File([blob], name, { type: 'application/pdf' });
  }

  function resetUploader() {
    uploadState = 'idle';
    progress = 0;
    error = null;
    fileName = null;
    uploadKind = null;
    if (fileInput) fileInput.value = '';
  }

  function validateUploadFile(file: File): string | null {
    if (file.type !== 'application/pdf' && !ALLOWED_IMAGE_MIME_TYPES.has(file.type)) {
      return 'Please select a PDF, JPG, PNG, WEBP, or GIF file';
    }
    if (file.size > maxSize) {
      return `File size exceeds ${Math.round(maxSize / (1024 * 1024))}MB limit`;
    }
    return null;
  }

  async function getPdfDocument() {
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
    return pdfjs.getDocument;
  }

  async function countPages(file: File): Promise<number> {
    const getDocument = await getPdfDocument();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await getDocument({ data: arrayBuffer }).promise;
    return pdf.numPages;
  }

  async function handleUpload(file: File) {
    const validationError = validateUploadFile(file);
    if (validationError) {
      error = validationError;
      uploadState = 'error';
      return;
    }

    const kind: UploadKind = file.type === 'application/pdf' ? 'pdf' : 'image';

    fileName = file.name;
    uploadKind = kind;
    uploadState = 'selected';
    error = null;

    try {
      let fileToUpload = file;
      let pageCount = 1;

      if (kind === 'image') {
        uploadState = 'processing';
        progress = 5;
        fileToUpload = await convertImageToPdf(file);
        if (fileToUpload.size > maxSize) {
          throw new Error(`Converted PDF exceeds ${Math.round(maxSize / (1024 * 1024))}MB limit`);
        }
      }

      uploadState = 'uploading';
      progress = 10;

      const uploadUrl = await client.mutation(api.files.generateUploadUrl, { sessionToken });
      const xhr = new XMLHttpRequest();

      await new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            progress = Math.round((event.loaded / event.total) * 70) + 10;
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error('Upload failed'));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Upload failed')));
        xhr.open('POST', uploadUrl);
        xhr.setRequestHeader('Content-Type', fileToUpload.type);
        xhr.send(fileToUpload);
      });

      progress = 85;

      const response = JSON.parse(xhr.responseText) as { storageId?: string };
      if (!response.storageId) {
        throw new Error('Upload response did not include a file ID.');
      }

      await client.mutation(api.files.validateFile, {
        sessionToken,
        fileId: response.storageId as Id<'_storage'>
      });

      progress = 92;

      if (kind === 'pdf') {
        uploadState = 'processing';
        pageCount = await countPages(fileToUpload);
      }

      progress = 100;
      uploadState = 'success';

      await onUploadComplete(response.storageId, pageCount);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Upload failed';
      uploadState = 'error';
    }
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    if (!disabled) isDragging = true;
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    isDragging = false;
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragging = false;
    if (disabled) return;

    const file = event.dataTransfer?.files[0];
    if (file) void handleUpload(file);
  }

  function handleFileSelect(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file) void handleUpload(file);
  }

  function handleClick() {
    if (!disabled && uploadState === 'idle') {
      fileInput?.click();
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (!isDropzoneInteractive) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleClick();
    }
  }

  function getUploaderSurfaceClassName(params: {
    disabled: boolean;
    isDragging: boolean;
    state: UploadState;
    isUploading: boolean;
  }): string {
    if (params.disabled) {
      return 'upload-zone-disabled';
    }
    if (params.isDragging) {
      return 'upload-zone-active';
    }
    if (params.state === 'error') {
      return 'border-3 border-solid border-brand-red bg-brand-red/10 p-12 flex flex-col items-center justify-center gap-4 text-center cursor-pointer';
    }
    if (params.state === 'success') {
      return 'border-3 border-solid border-success bg-success/10 p-12 flex flex-col items-center justify-center gap-4 text-center shadow-brutal';
    }
    if (params.isUploading) {
      return 'border-3 border-solid border-brand-blue bg-brand-blue/5 p-12 flex flex-col items-center justify-center gap-4 text-center shadow-brutal';
    }
    return 'upload-zone hover:-translate-y-1 hover:-translate-x-1 hover:shadow-brutal hover:border-solid hover:bg-brand-yellow/10';
  }

  function getUploadStatusLabel(currentState: UploadState, currentProgress: number, currentKind: UploadKind | null): string {
    if (currentState === 'uploading') {
      return `Uploading... ${currentProgress}%`;
    }
    if (currentState === 'processing') {
      return currentKind === 'image' ? 'Converting image to PDF...' : 'Processing PDF...';
    }
    if (currentState === 'selected') {
      return 'Starting upload...';
    }
    return '';
  }
</script>

<div class="mx-auto w-full max-w-xl">
  <div
    onclick={handleClick}
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
    onkeydown={handleKeyDown}
    role="button"
    tabindex={isDropzoneInteractive ? 0 : -1}
    aria-disabled={!isDropzoneInteractive}
    class={cn('relative transition-all duration-150 ease-brutal', uploaderSurfaceClassName)}
  >
    <input
      bind:this={fileInput}
      type="file"
      accept={FILE_INPUT_ACCEPT}
      onchange={handleFileSelect}
      disabled={disabled || uploadState !== 'idle'}
      class="hidden"
    />

    {#if uploadState === 'idle'}
      <div
        class={cn(
          'border-3 border-brutal-black bg-brand-blue p-4 transition-all duration-150 ease-brutal',
          isDragging && '-translate-x-1 -translate-y-1 shadow-brutal-sm'
        )}
      >
        <Upload
          class={cn('h-10 w-10 text-brutal-white transition-transform duration-150 ease-brutal', isDragging && 'scale-110')}
          strokeWidth={3}
        />
      </div>
      <div>
        <p class="text-h4 font-bold uppercase tracking-wider text-brutal-black">
          {isDragging ? 'Drop it here' : 'Upload PDF or image'}
        </p>
        <p class="text-small mt-2 font-medium text-brutal-black/70">Drag & drop or click to browse</p>
        <p class="mt-3 text-xs font-bold uppercase tracking-widest text-brutal-black/50">
          PDF/JPG/PNG/WEBP/GIF • Max {Math.round(maxSize / (1024 * 1024))}MB
        </p>
      </div>
    {/if}

    {#if isUploading}
      <div class="border-3 relative border-brutal-black bg-brand-yellow p-4">
        {#if uploadKind === 'image'}
          <ImageIcon class="h-10 w-10 text-brutal-black" strokeWidth={3} />
        {:else}
          <FileText class="h-10 w-10 text-brutal-black" strokeWidth={3} />
        {/if}
      </div>
      <div class="w-full">
        <p class="text-body mx-auto max-w-xs truncate font-bold text-brutal-black">{fileName}</p>
        <p class="text-small mt-1 font-bold uppercase tracking-wider text-brand-blue">
          {getUploadStatusLabel(uploadState, progress, uploadKind)}
        </p>
      </div>
      <div class="progress-bar w-full max-w-xs">
        <div class="progress-bar-fill" style:width={`${progress}%`}></div>
      </div>
    {/if}

    {#if uploadState === 'success'}
      <div class="border-3 border-brutal-black bg-success p-4">
        <CheckCircle class="h-10 w-10 text-brutal-white" strokeWidth={3} />
      </div>
      <div>
        <p class="text-h4 font-bold uppercase tracking-wider text-brutal-black">Upload Complete!</p>
        <p class="text-small mt-2 max-w-xs truncate font-medium text-brutal-black/70">{fileName}</p>
      </div>
    {/if}

    {#if uploadState === 'error'}
      <div class="border-3 border-brutal-black bg-brand-red p-4">
        <AlertCircle class="h-10 w-10 text-brutal-white" strokeWidth={3} />
      </div>
      <div>
        <p class="text-h4 font-bold uppercase tracking-wider text-brutal-black">Upload Failed</p>
        <p class="text-small mt-2 font-bold text-brand-red">{error}</p>
      </div>
      <button
        type="button"
        onclick={(event) => {
          event.stopPropagation();
          resetUploader();
        }}
        class="btn-outline btn-sm"
      >
        <X class="h-4 w-4" strokeWidth={3} />
        Try Again
      </button>
    {/if}
  </div>
</div>
