import type { Action } from 'svelte/action';
import type { PageFlip as PageFlipInstance } from 'page-flip';

export type PageFlipActionParams = {
  enabled: boolean;
  pages: string[];
  width: number;
  height: number;
  isMobile: boolean;
  isSinglePage: boolean;
  onFlip: (page: number) => void;
  onReady: (instance: PageFlipInstance | null) => void;
};

export const pageFlipAction: Action<HTMLDivElement, PageFlipActionParams> = (node, initialParams) => {
  let instance: PageFlipInstance | null = null;
  let buildId = 0;
  let params = initialParams;

  function destroyInstance() {
    const active = instance;
    instance = null;
    params.onReady(null);
    try {
      active?.destroy();
    } catch {
      // PageFlip removes its generated mount during normal teardown.
    }
    node.replaceChildren();
  }

  function rebuild(nextParams: PageFlipActionParams) {
    params = nextParams;
    buildId += 1;
    const currentBuildId = buildId;
    destroyInstance();

    if (!nextParams.enabled) {
      return;
    }

    const mount = document.createElement('div');
    node.replaceChildren(mount);

    void import('page-flip').then(({ PageFlip }) => {
      if (currentBuildId !== buildId || !mount.isConnected) {
        mount.remove();
        return;
      }

      instance = new PageFlip(mount, {
        width: params.width,
        height: params.height,
        minWidth: 100,
        maxWidth: 2000,
        minHeight: 100,
        maxHeight: 2000,
        size: 'fixed',
        maxShadowOpacity: 0.7,
        showCover: !params.isSinglePage,
        mobileScrollSupport: true,
        swipeDistance: 20,
        useMouseEvents: true,
        usePortrait: params.isMobile || params.isSinglePage,
        flippingTime: 600,
        drawShadow: true,
        startPage: 0,
        clickEventForward: true,
        startZIndex: 0,
        autoSize: false,
        showPageCorners: true,
        disableFlipByClick: false
      });
      instance.on('flip', (event) => params.onFlip(event.data));
      instance.loadFromImages(params.pages);
      params.onReady(instance);
    });
  }

  rebuild(initialParams);

  return {
    update: rebuild,
    destroy: destroyInstance
  };
};
