import { useEffect, useState } from 'react';
import { ArrowUpIcon } from './icons';

const SHOW_AFTER = 600;

/** Button at the bottom right that appears after scrolling down and leads back to the top. */
export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SHOW_AFTER);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;
  return (
    <button
      type="button"
      onClick={() => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      }}
      aria-label="Back to top"
      title="Back to top"
      className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1.25rem,env(safe-area-inset-right))] z-40 grid h-12 w-12 place-items-center rounded-full bg-ink text-bg shadow-lg shadow-black/15 transition-opacity duration-150 hover:opacity-85 active:opacity-75"
    >
      <ArrowUpIcon width={20} height={20} />
    </button>
  );
}
