<script lang="ts">
  import ExternalLink from 'lucide-svelte/icons/external-link';
  import FileText from 'lucide-svelte/icons/file-text';
  import Share2 from 'lucide-svelte/icons/share-2';
  import Trash2 from 'lucide-svelte/icons/trash-2';
  import { resolve } from '$app/paths';
  import { cn, formatDate } from '$lib/utils';

  type Flipbook = {
    _id: string;
    title: string;
    pageCount: number;
    fileSize: number;
    createdAt: number;
    fileUrl: string | null;
    sourceType?: 'upload' | 'generated_poster';
  };

  let {
    flipbook,
    onDelete,
    onShare
  }: {
    flipbook: Flipbook;
    onDelete?: (id: string) => void;
    onShare?: (id: string) => void;
  } = $props();

  function handleDelete() {
    if (window.confirm('Delete this flipbook?')) {
      onDelete?.(flipbook._id);
    }
  }
</script>

<div
  class={cn(
    'card-hover',
    'flex w-full flex-col overflow-hidden p-0',
    'hover:-translate-x-1 hover:-translate-y-1'
  )}
>
  <a
    href={resolve('/flipbook/[id]', { id: flipbook._id })}
    class="relative flex aspect-[4/3] items-center justify-center border-b-2 border-brutal-black bg-brutal-gray"
  >
    <div
      class="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.03)_10px,rgba(0,0,0,0.03)_20px)]"
    ></div>
    <FileText class="h-16 w-16 text-brutal-black/30" strokeWidth={2} />
  </a>

  <div class="flex flex-1 flex-col bg-brutal-white p-4">
    <a href={resolve('/flipbook/[id]', { id: flipbook._id })} class="mb-3 block">
      <h3 class="truncate font-bold uppercase tracking-wider text-brutal-black" title={flipbook.title}>
        {flipbook.title}
      </h3>
    </a>

    <div class="mb-4 flex items-center gap-2">
      <span class="badge-free">{flipbook.pageCount} PG</span>
      <span class="badge-free">{flipbook.sourceType === 'generated_poster' ? 'POSTER' : 'PDF'}</span>
      <span class="badge-free">{formatDate(flipbook.createdAt)}</span>
    </div>

    <div class="mt-auto flex items-center gap-2 border-t-2 border-brutal-black pt-3">
      <a
        href={resolve('/flipbook/[id]', { id: flipbook._id })}
        class="btn btn-sm flex-1 bg-brand-blue text-brutal-white shadow-brutal hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-md active:translate-x-0 active:translate-y-0 active:shadow-brutal-sm"
      >
        <ExternalLink class="h-4 w-4" />
        <span>View</span>
      </a>

      <button type="button" onclick={() => onShare?.(flipbook._id)} class="btn btn-outline btn-sm btn-icon" title="Share">
        <Share2 class="h-4 w-4" />
      </button>

      <button
        type="button"
        onclick={handleDelete}
        class="btn btn-sm btn-icon btn-outline hover:border-brand-red hover:bg-brand-red hover:text-brutal-white"
        title="Delete"
      >
        <Trash2 class="h-4 w-4" />
      </button>
    </div>
  </div>
</div>
