"use client";

import { useState, useEffect, useRef, useCallback, forwardRef } from "react";
import HTMLFlipBook from "react-pageflip";
import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

interface FlipbookViewerProps {
  pdfUrl: string;
}

interface PageProps {
  pageImage: string;
  pageNumber: number;
  totalPages: number;
}

const getViewportPadding = (mobile: boolean) => ({
  x: mobile ? 20 : 40,
  y: mobile ? 24 : 56,
});

const Page = forwardRef<HTMLDivElement, PageProps>(({ pageImage, pageNumber, totalPages }, ref) => {
  return (
    <div 
      ref={ref} 
      className="relative w-full h-full bg-white overflow-hidden"
    >
      <img
        src={pageImage}
        alt={`Page ${pageNumber}`}
        className="w-full h-full object-contain select-none pointer-events-none"
        draggable={false}
      />
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-black/60 rounded text-[10px] font-mono text-white">
        {pageNumber} / {totalPages}
      </div>
    </div>
  );
});

Page.displayName = "Page";

export default function FlipbookViewer({ pdfUrl }: FlipbookViewerProps) {
  const [pages, setPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [isMobile, setIsMobile] = useState(false);
  const [pageAspectRatio, setPageAspectRatio] = useState<number | null>(null);

  const framePadding = 12;
  const frameBorder = 2;
  
  const flipBookRef = useRef<typeof HTMLFlipBook>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateDimensions = useCallback(() => {
    if (!containerRef.current) return;
    
    const containerWidth = containerRef.current.clientWidth;
    const containerHeight = containerRef.current.clientHeight;
    const mobile = window.innerWidth < 768;
    setIsMobile(mobile);
    
    const aspectRatio = pageAspectRatio ?? 1.4;
    const viewportPadding = getViewportPadding(mobile);
    const frameInset = framePadding * 2 + frameBorder * 2;

    const availableWidth = Math.max(0, containerWidth - viewportPadding.x * 2 - frameInset);
    const availableHeight = Math.max(0, containerHeight - viewportPadding.y * 2 - frameInset);
    const maxPageWidth = mobile ? availableWidth : availableWidth / 2;
    const maxPageHeight = availableHeight;

    let width = maxPageWidth;
    let height = width * aspectRatio;

    if (height > maxPageHeight) {
      height = maxPageHeight;
      width = height / aspectRatio;
    }

    setDimensions({
      width: Math.floor(width),
      height: Math.floor(height),
    });
  }, [pageAspectRatio]);

  useEffect(() => {
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    window.addEventListener("orientationchange", updateDimensions);
    
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => {
      window.removeEventListener("resize", updateDimensions);
      window.removeEventListener("orientationchange", updateDimensions);
      resizeObserver.disconnect();
    };
  }, [updateDimensions]);

  useEffect(() => {
    const loadPdf = async () => {
      try {
        setLoading(true);
        setLoadingProgress(0);
        
        const pdf = await getDocument(pdfUrl).promise;
        const numPages = pdf.numPages;
        setTotalPages(numPages);
        
        const pageImages: string[] = [];
        
        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const scale = 2.5;
          const viewport = page.getViewport({ scale });
          if (i === 1) {
            setPageAspectRatio(viewport.height / viewport.width);
          }
          
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d")!;
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          
          await page.render({ canvasContext: context, viewport }).promise;
          pageImages.push(canvas.toDataURL("image/jpeg", 0.95));
          setLoadingProgress(Math.round((i / numPages) * 100));
        }
        
        setPages(pageImages);
        setLoading(false);
      } catch (error) {
        console.error("Failed to load PDF:", error);
        setLoading(false);
      }
    };

    if (pdfUrl) {
      loadPdf();
    }
  }, [pdfUrl]);

  const handleFlip = useCallback((e: { data: number }) => {
    setCurrentPage(e.data);
  }, []);

  const goToPrevPage = useCallback(() => {
    (flipBookRef.current as any)?.pageFlip()?.flipPrev();
  }, []);

  const goToNextPage = useCallback(() => {
    (flipBookRef.current as any)?.pageFlip()?.flipNext();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        goToPrevPage();
      } else if (e.key === "ArrowRight") {
        goToNextPage();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPrevPage, goToNextPage]);

  const isReady =
    !loading && pages.length > 0 && dimensions.width > 0 && dimensions.height > 0;
  const pageWidth = Math.max(1, dimensions.width);
  const pageHeight = Math.max(1, dimensions.height);
  const bookWidth = isMobile ? pageWidth : pageWidth * 2;
  const bookHeight = pageHeight;
  const frameInset = framePadding * 2 + frameBorder * 2;
  const frameWidth = bookWidth + frameInset;
  const frameHeight = bookHeight + frameInset;
  const viewportPadding = getViewportPadding(isMobile);

  return (
    <div 
      ref={containerRef}
      className="flex-1 flex flex-col items-center justify-center bg-neutral-900 relative overflow-hidden w-full h-full"
      style={{ padding: `${viewportPadding.y}px ${viewportPadding.x}px` }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.03)_0%,_transparent_70%)]" />
      
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        {loading && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-neutral-900/80 backdrop-blur-sm">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin" />
              <Loader2 className="absolute inset-0 m-auto w-6 h-6 text-white animate-pulse" />
            </div>
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm font-medium text-white uppercase tracking-wider">
                Preparing Flipbook
              </p>
              <div className="w-48 h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white rounded-full transition-all duration-300"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <span className="text-xs font-mono text-white/60">
                {loadingProgress}%
              </span>
            </div>
          </div>
        )}
        <button
          onClick={goToPrevPage}
          disabled={currentPage === 0}
          className="absolute left-2 md:left-8 z-20 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 disabled:opacity-20 disabled:hover:bg-white/10 rounded-full backdrop-blur-sm transition-all"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 text-white" />
        </button>

        <div 
          className="relative flex items-center justify-center rounded-[18px] bg-neutral-100/90 p-2 shadow-2xl"
          style={{
            filter: "drop-shadow(0 25px 50px rgba(0,0,0,0.5))",
            width: frameWidth,
            height: frameHeight,
          }}
        >
          {isReady && (
            <HTMLFlipBook
              key={`${dimensions.width}x${dimensions.height}-${isMobile}`}
              ref={flipBookRef as any}
              width={pageWidth}
              height={pageHeight}
              minWidth={100}
              maxWidth={2000}
              minHeight={100}
              maxHeight={2000}
              size="fixed"
              maxShadowOpacity={0.7}
              showCover={true}
              mobileScrollSupport={true}
              swipeDistance={20}
              useMouseEvents={true}
              usePortrait={isMobile}
              flippingTime={600}
              drawShadow={true}
              onFlip={handleFlip}
              className=""
              style={{}}
              startPage={0}
              clickEventForward={true}
              startZIndex={0}
              autoSize={false}
              showPageCorners={true}
              disableFlipByClick={false}
            >
              {pages.map((pageImage, index) => (
                <Page 
                  key={index} 
                  pageImage={pageImage} 
                  pageNumber={index + 1} 
                  totalPages={totalPages}
                />
              ))}
            </HTMLFlipBook>
          )}
        </div>

        <button
          onClick={goToNextPage}
          disabled={currentPage >= totalPages - (isMobile ? 1 : 2)}
          className="absolute right-2 md:right-8 z-20 w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 disabled:opacity-20 disabled:hover:bg-white/10 rounded-full backdrop-blur-sm transition-all"
          aria-label="Next page"
        >
          <ChevronRight className="w-5 h-5 md:w-6 md:h-6 text-white" />
        </button>
      </div>

      <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-20">
        <div className="flex items-center gap-3 px-4 py-2 bg-black/60 backdrop-blur-sm rounded-full">
          <span className="text-sm font-mono text-white">
            {isMobile ? currentPage + 1 : Math.min(currentPage * 2 + 1, totalPages)}-{isMobile ? currentPage + 1 : Math.min(currentPage * 2 + 2, totalPages)}
          </span>
          <span className="text-white/40">/</span>
          <span className="text-sm font-mono text-white/60">{totalPages}</span>
        </div>
      </div>

      <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 z-20">
        <p className="text-[10px] text-white/40 uppercase tracking-wider">
          Swipe or use arrow keys
        </p>
      </div>
    </div>
  );
}
