declare module 'page-flip' {
  type FlipCorner = 'top' | 'bottom';

  export class PageFlip {
    constructor(element: HTMLElement, settings: Record<string, unknown>);
    destroy(): void;
    loadFromImages(images: string[]): void;
    on(event: 'flip', callback: (event: { data: number }) => void): this;
    flipNext(corner?: FlipCorner): void;
    flipPrev(corner?: FlipCorner): void;
    turnToNextPage(): void;
    turnToPrevPage(): void;
    getCurrentPageIndex(): number;
  }
}
