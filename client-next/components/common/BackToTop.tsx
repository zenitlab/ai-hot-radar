import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronUp } from 'lucide-react';

/**
 * Floating "back to top" button. Appears in the bottom-right corner once the
 * page has been scrolled past a threshold; click smoothly scrolls back up.
 *
 * Default scroll container is `<main>` (set up in AppLayout). The scoped
 * variant accepts a getter so views with their own overflow container
 * (e.g. Digest's right column) can also use it.
 */
const SHOW_THRESHOLD = 400;

const BUTTON_CLASSES =
  'fixed right-6 bottom-20 lg:bottom-6 z-40 ' +
  'w-11 h-11 rounded-full flex items-center justify-center ' +
  'bg-[var(--card-bg)] backdrop-blur-md ' +
  'border border-[var(--card-border-hover)] ' +
  'text-[var(--text-secondary)] shadow-lg shadow-black/10 ' +
  'hover:text-[var(--accent-blue)] dark:hover:text-blue-400 ' +
  'hover:border-[var(--accent-blue)]/40 dark:hover:border-blue-500/40 ' +
  'transition-all duration-200';

function FloatingButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      key="back-to-top"
      initial={{ opacity: 0, scale: 0.8, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 12 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onClick={onClick}
      aria-label="回到顶部"
      className={BUTTON_CLASSES}
    >
      <ChevronUp className="w-5 h-5" />
    </motion.button>
  );
}

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

  return (
    <AnimatePresence>
      {visible && (
        <FloatingButton
          onClick={() =>
            document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })
          }
        />
      )}
    </AnimatePresence>
  );
}

/**
 * Variant that targets a specific scroll container instead of `<main>`.
 * Used by Digest where the right column is its own overflow-scroll element.
 */
export function BackToTopFor({ getContainer }: { getContainer: () => HTMLElement | null }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = getContainer();
    if (!el) return;
    const onScroll = () => setVisible(el.scrollTop > SHOW_THRESHOLD);
    el.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, [getContainer]);

  return (
    <AnimatePresence>
      {visible && (
        <FloatingButton
          onClick={() => getContainer()?.scrollTo({ top: 0, behavior: 'smooth' })}
        />
      )}
    </AnimatePresence>
  );
}
