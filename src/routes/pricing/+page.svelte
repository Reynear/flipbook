<script lang="ts">
  import ArrowLeft from 'lucide-svelte/icons/arrow-left';
  import Check from 'lucide-svelte/icons/check';
  import { resolve } from '$app/paths';
  import Footer from '$lib/components/Footer.svelte';
  import { MAX_FLIPBOOKS_ANONYMOUS } from '$lib/utils';
</script>

<div class="min-h-screen bg-brutal-cream">
  <header class="sticky top-0 z-50 border-b-2 border-brutal-black bg-brutal-cream">
    <div class="container-brutal py-4">
      <a href={resolve('/')} class="btn-ghost btn-sm inline-flex">
        <ArrowLeft class="h-4 w-4" />
        Back
      </a>
    </div>
  </header>

  <main class="section">
    <div class="container-brutal">
      <div class="section-header text-center">
        <span class="badge-secondary mb-4">Simple Limits</span>
        <h1 class="text-display uppercase">
          Free<br />Forever
        </h1>
        <p class="text-h4 mx-auto mt-6 max-w-2xl font-normal">
          No accounts, no upgrades. Upload and share instantly.
        </p>
      </div>

      <div class="mx-auto max-w-xl">
        <div class="card-pricing">
          <div class="mb-6">
            <span class="badge-free mb-4">Free</span>
            <div class="flex items-baseline gap-1">
              <span class="text-display">$0</span>
            </div>
            <div class="text-body text-brutal-black/60">Forever free</div>
          </div>

          <div class="divider mb-6"></div>

          <ul class="mb-8 flex-1 space-y-4">
            <li class="flex items-start gap-3">
              <div class="mt-0.5 bg-success p-1">
                <Check class="h-3 w-3 text-brutal-white" strokeWidth={3} />
              </div>
              <span>{MAX_FLIPBOOKS_ANONYMOUS} Flipbooks</span>
            </li>
            <li class="flex items-start gap-3">
              <div class="mt-0.5 bg-success p-1">
                <Check class="h-3 w-3 text-brutal-white" strokeWidth={3} />
              </div>
              <span>20MB per PDF</span>
            </li>
            <li class="flex items-start gap-3">
              <div class="mt-0.5 bg-success p-1">
                <Check class="h-3 w-3 text-brutal-white" strokeWidth={3} />
              </div>
              <span>Shareable Links</span>
            </li>
            <li class="flex items-start gap-3">
              <div class="mt-0.5 bg-success p-1">
                <Check class="h-3 w-3 text-brutal-white" strokeWidth={3} />
              </div>
              <span>QR Code Export</span>
            </li>
          </ul>

          <a href={resolve('/dashboard')} class="btn-outline w-full">Get Started</a>
        </div>
      </div>

      <div class="mt-16 text-center">
        <p class="text-body mx-auto max-w-lg text-brutal-black/60">
          All flipbooks are shareable by link, mobile-friendly, and ready in seconds.
        </p>
      </div>
    </div>
  </main>

  <Footer />
</div>
