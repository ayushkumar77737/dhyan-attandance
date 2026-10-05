import { useEffect, useRef } from "react";

/* Finds whichever parent element actually scrolls (nav or aside) */
const getScrollParent = (el) => {
  let node = el?.parentElement;
  while (node && node !== document.body) {
    const { overflowY } = window.getComputedStyle(node);
    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      node.scrollHeight > node.clientHeight
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
};

export default function useSidebarScroll(pathname, accessConfig) {
  const navRef = useRef(null);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const showActive = () => {
      const active = nav.querySelector(".side-link.active");
      if (!active) return;

      const scroller = getScrollParent(active);
      if (!scroller) return;

      const sRect = scroller.getBoundingClientRect();
      const aRect = active.getBoundingClientRect();
      const outOfView = aRect.top < sRect.top || aRect.bottom > sRect.bottom;

      if (outOfView) {
        // put the active button in the middle of the sidebar
        scroller.scrollTop +=
          aRect.top - sRect.top - scroller.clientHeight / 2 + aRect.height / 2;
      }
    };

    // run now, after paint, and again after logos/images finish loading
    const raf = requestAnimationFrame(showActive);
    const t1 = setTimeout(showActive, 300);
    const t2 = setTimeout(showActive, 800);

    // if the sidebar resizes (logo loads), re-check
    const ro = new ResizeObserver(showActive);
    ro.observe(nav);
    const stopObserving = setTimeout(() => ro.disconnect(), 1500);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(stopObserving);
      ro.disconnect();
    };
  }, [pathname, accessConfig]);

  return navRef;
}

/* kept so existing imports don't break */
export const clearSidebarScroll = () => {};