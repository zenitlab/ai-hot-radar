import { useState } from 'react';
import { Play, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { MediaItem } from '../../types';

interface Props {
  media: MediaItem[];
}

/** Compact responsive grid that mirrors X/Twitter's media layout. */
export function HotspotMedia({ media }: Props) {
  const [activeVideo, setActiveVideo] = useState<MediaItem | null>(null);
  const [lightbox, setLightbox] = useState<MediaItem | null>(null);

  if (!media || media.length === 0) return null;

  // X uses a fixed grid pattern based on count: 1 = full, 2 = 2-col, 3 = first
  // big + 2 stacked, 4 = 2x2.
  const count = Math.min(media.length, 4);
  const items = media.slice(0, count);

  const layoutClass =
    count === 1 ? 'grid-cols-1' :
    count === 2 ? 'grid-cols-2' :
    count === 3 ? 'grid-cols-2' :
                  'grid-cols-2';

  return (
    <>
      <div
        className={cn(
          'grid gap-1 mt-3 rounded-xl overflow-hidden border border-[var(--card-border)]',
          layoutClass,
          // Constrain max height so media cards don't dominate the feed
          // Use aspect-ratio to preserve original proportions, then limit via max-h
          count === 1 ? 'max-h-[320px]' : 'max-h-[280px]',
        )}
      >
        {items.map((m, i) => {
          // 3-up layout: first item spans both rows
          const spanClass = count === 3 && i === 0 ? 'row-span-2' : '';
          return (
            <MediaTile
              key={i}
              item={m}
              spanClass={spanClass}
              singleItem={count === 1}
              onPlayVideo={() => setActiveVideo(m)}
              onOpenImage={() => setLightbox(m)}
            />
          );
        })}
      </div>

      {/* Inline video player */}
      {activeVideo && (
        <VideoModal item={activeVideo} onClose={() => setActiveVideo(null)} />
      )}

      {/* Image lightbox */}
      {lightbox && (
        <ImageLightbox item={lightbox} onClose={() => setLightbox(null)} />
      )}
    </>
  );
}

function MediaTile({
  item,
  spanClass,
  singleItem,
  onPlayVideo,
  onOpenImage,
}: {
  item: MediaItem;
  spanClass: string;
  singleItem: boolean;
  onPlayVideo: () => void;
  onOpenImage: () => void;
}) {
  const isVideo = item.type === 'video' || item.type === 'gif';
  const src = isVideo ? (item.previewUrl ?? item.url) : item.url;

  return (
    <button
      type="button"
      onClick={isVideo ? onPlayVideo : onOpenImage}
      className={cn(
        'relative group/media bg-black/5 dark:bg-black/20 overflow-hidden flex items-center justify-center',
        spanClass,
        // Single item: natural aspect ratio up to max-h; multi: square tiles
        singleItem ? 'aspect-video' : 'aspect-square',
      )}
    >
      <img
        src={src}
        loading="lazy"
        alt=""
        className="max-w-full max-h-full object-contain transition-transform group-hover/media:scale-[1.02]"
        onError={(e) => {
          // Hide broken images so layout doesn't show a broken icon
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
      {isVideo && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover/media:bg-black/15 transition-colors">
          <span className="w-12 h-12 rounded-full bg-black/55 backdrop-blur flex items-center justify-center ring-1 ring-white/30">
            <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
          </span>
        </span>
      )}
      {item.type === 'gif' && (
        <span className="absolute bottom-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/60 text-white tracking-wider">
          GIF
        </span>
      )}
    </button>
  );
}

function VideoModal({ item, onClose }: { item: MediaItem; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        aria-label="关闭"
      >
        <X className="w-5 h-5" />
      </button>
      <video
        src={item.url}
        poster={item.previewUrl}
        controls
        autoPlay
        playsInline
        className="max-w-full max-h-[85vh] rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

function ImageLightbox({ item, onClose }: { item: MediaItem; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        aria-label="关闭"
      >
        <X className="w-5 h-5" />
      </button>
      <img
        src={item.url}
        alt=""
        className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
