import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp } from 'lucide-react';

/**
 * Floating "back to top" button. Appears in the bottom-right corner once the
 * page has been scrolled past a threshold; click smoothly scrolls back up.
 *
 * The scroll container is `<main>` (set up in AppLayout). We listen to its
 * scroll events and call `scrollTo({ behavior: 'smooth' })` for a silky animation.
 */
const SHOW_THRESHOLD = 400;

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const main = document.querySelector('main');
    if (!main) return;

    const onScroll = () => setVisible(main.scrollTop > SHOW_THRESHOLD);
    main.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => main.removeEventListener('scroll', onScroll);
  }, []);

  const handleClick = () => {
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          key="back-to-top"
          initial={{ opacity: 0, scale: 0.8, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={handleClick}
          aria-label="回到顶部"
          // bottom-20 on mobile to clear the bottom nav (h-16); bottom-6 on desktop.
          className="fixed right-6 bottom-20 lg:bottom-6 z-40
                     w-11 h-11 rounded-full
                     flex items-center justify-center
                     bg-[var(--card-bg)] backdrop-blur-md
                     border border-[var(--card-border-hover)]
                     text-[var(--text-secondary)]
                     shadow-lg shadow-black/20
                     hover:text-blue-400
                     hover:border-blue-500/40
                     hover:shadow-[0_8px_28px_rgba(59,130,246,0.25)]
                     transition-all duration-200"
        >
          <ChevronUp className="w-5 h-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
