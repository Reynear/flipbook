<script lang="ts">
  import BookOpen from 'lucide-svelte/icons/book-open';
  import { resolve } from '$app/paths';
</script>

<footer class="border-t-2 border-brutal-black bg-brutal-cream py-8">
  <div class="container-brutal">
    <div class="flex flex-col items-center justify-between gap-6 md:flex-row">
      <div class="flex items-center gap-3">
        <div class="border-2 border-brutal-black bg-brand-yellow p-1.5">
          <BookOpen class="h-4 w-4 text-brutal-black" />
        </div>
        <span class="text-small font-bold uppercase tracking-wider">Flipbook</span>
      </div>

      <nav class="text-small flex flex-wrap items-center justify-center gap-4">
        <a class="text-brutal-black/60 transition-colors hover:text-brutal-black" href={resolve('/privacy')}>
          Privacy Policy
        </a>
        <a class="text-brutal-black/60 transition-colors hover:text-brutal-black" href={resolve('/terms')}>
          Terms of Service
        </a>
        <a class="text-brutal-black/60 transition-colors hover:text-brutal-black" href={resolve('/dmca')}>
          DMCA
        </a>
        <a
          class="text-brutal-black/60 transition-colors hover:text-brutal-black"
          href="mailto:support@flipbook.app"
        >
          Contact
        </a>
      </nav>

      <p class="text-small text-brutal-black/60">
        © {new Date().getFullYear()} Flipbook. All rights reserved.
      </p>
    </div>
  </div>
</footer>
