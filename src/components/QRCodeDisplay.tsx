"use client";

import { useState, useRef, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { X, Copy, Download, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface QRCodeDisplayProps {
  url: string;
  title?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function QRCodeDisplay({
  url,
  title,
  isOpen,
  onClose,
}: QRCodeDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setShouldRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const svgUrl = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = 400;
      canvas.height = 400;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 400, 400);
      ctx.drawImage(img, 0, 0, 400, 400);
      URL.revokeObjectURL(svgUrl);

      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `${title || "qrcode"}.png`;
      downloadLink.click();
    };

    img.src = svgUrl;
  };

  const truncatedUrl =
    url.length > 40 ? `${url.substring(0, 37)}...` : url;

  if (!shouldRender) return null;

  return (
    <div
      className={cn(
        "modal-backdrop",
        "transition-all duration-300 ease-brutal",
        isVisible ? "opacity-100" : "opacity-0"
      )}
      onClick={onClose}
    >
      <div
        className={cn(
          "modal",
          "transition-all duration-300 ease-brutal",
          isVisible
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 translate-y-4"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header flex items-center justify-between">
          <div>
            {title && (
              <h3 className="text-h4 font-bold uppercase tracking-wider truncate pr-8">
                {title}
              </h3>
            )}
            <p className="text-small text-brutal-black/60">
              Scan to open this flipbook
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn-ghost btn-icon"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="modal-body">
          <div
            ref={qrRef}
            className="qr-container mx-auto w-fit"
          >
            <QRCodeSVG
              value={url}
              size={200}
              level="H"
              includeMargin={false}
              bgColor="#ffffff"
              fgColor="#000000"
            />
          </div>

          <div className="mt-6 px-4 py-3 bg-brutal-gray border-2 border-brutal-black">
            <p
              className="text-xs font-mono text-center text-brutal-black truncate"
              title={url}
            >
              {truncatedUrl}
            </p>
          </div>
        </div>

        <div className="modal-footer">
          <button
            onClick={handleCopy}
            className={cn(
              "btn btn-sm flex-1",
              copied
                ? "bg-success text-brutal-white border-success"
                : "btn-outline"
            )}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy URL
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            className="btn btn-sm btn-primary flex-1"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
