'use client';

import { useRef, useCallback, useEffect, useState } from 'react';

interface PanelSize {
  [panelId: string]: number; // percentage (0-100)
}

interface UsePanelResizeOptions {
  defaultSizes: PanelSize;
  minSizes?: PanelSize;
  maxSizes?: PanelSize;
  direction: 'horizontal' | 'vertical';
  onResize?: (sizes: PanelSize) => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export function usePanelResize(options: UsePanelResizeOptions) {
  const { defaultSizes, direction, onResize } = options;
  const [sizes, setSizes] = useState<PanelSize>(defaultSizes);

  // Refs to stabilize callbacks
  const sizesRef = useRef(sizes);
  const onResizeRef = useRef(onResize);
  const minSizesRef = useRef(options.minSizes ?? {});
  const maxSizesRef = useRef(options.maxSizes ?? {});

  const dragging = useRef<{
    handleId: string;
    startPos: number;
    startSizes: PanelSize;
    containerSize: number;
  } | null>(null);
  const internalRef = useRef<HTMLDivElement>(null);
  const containerRef = options.containerRef ?? internalRef;

  // Stable panel ID list
  const panelIds = useRef(Object.keys(defaultSizes));

  const getAdjacentPanels = useCallback((handleId: string): [string, string] => {
    const ids = panelIds.current;
    const idx = ids.indexOf(handleId);
    if (idx < 0 || idx >= ids.length - 1) {
      return [ids[Math.max(0, idx === 0 ? 0 : ids.length - 2)], ids[ids.length - 1]];
    }
    return [ids[idx], ids[idx + 1]];
  }, []);

  const clampSizes = useCallback(
    (leftPanel: string, rightPanel: string, leftSize: number, rightSize: number): [number, number] => {
      const leftMin = minSizesRef.current[leftPanel] ?? 0;
      const rightMin = minSizesRef.current[rightPanel] ?? 0;
      const leftMax = maxSizesRef.current[leftPanel] ?? 100;
      const rightMax = maxSizesRef.current[rightPanel] ?? 100;

      let newLeft = Math.max(leftMin, Math.min(leftMax, leftSize));
      let newRight = Math.max(rightMin, Math.min(rightMax, rightSize));

      const total = newLeft + newRight;
      if (total > 100) {
        newLeft = Math.max(leftMin, newLeft - (total - 100));
      } else if (total < 100) {
        newRight = Math.max(rightMin, newRight + (100 - total));
      }

      return [Math.round(newLeft * 100) / 100, Math.round(newRight * 100) / 100];
    },
    [],
  );

  const handlePointerDown = useCallback(
    (handleId: string) => (e: React.PointerEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const containerSize = direction === 'horizontal' ? rect.width : rect.height;

      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      e.preventDefault();

      dragging.current = {
        handleId,
        startPos: direction === 'horizontal' ? e.clientX : e.clientY,
        startSizes: { ...sizesRef.current },
        containerSize,
      };
    },
    [direction, containerRef],
  );

  const handlePointerMove = useCallback((e: PointerEvent) => {
    const drag = dragging.current;
    if (!drag) return;

    const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
    const delta = currentPos - drag.startPos;
    const deltaPercent = (delta / Math.max(drag.containerSize, 1)) * 100;

    const [leftPanel, rightPanel] = getAdjacentPanels(drag.handleId);
    const leftSize = drag.startSizes[leftPanel] ?? 0;
    const rightSize = drag.startSizes[rightPanel] ?? 0;

    // Positive delta = pointer moving RIGHT (horizontal) or DOWN (vertical).
    // Add delta to left panel, subtract from right panel.
    // This means: drag UP/LEFT → right panel grows; drag DOWN/RIGHT → left panel grows.
    // For vertical: drag UP → bottom (right) grows, top (left) shrinks.
    const leftNew = leftSize + deltaPercent;
    const rightNew = rightSize - deltaPercent;
    const [newLeft, newRight] = clampSizes(leftPanel, rightPanel, leftNew, rightNew);

    setSizes({
      ...sizesRef.current,
      [leftPanel]: newLeft,
      [rightPanel]: newRight,
    });
  }, [direction, getAdjacentPanels, clampSizes]);

  const handlePointerUp = useCallback(() => {
    if (dragging.current) {
      onResizeRef.current?.(sizesRef.current);
      dragging.current = null;
    }
  }, []);

  const handleKeyDown = useCallback(
    (handleId: string) => (e: React.KeyboardEvent) => {
      const step = e.shiftKey ? 15 : 5;

      let deltaPercent = 0;
      if (direction === 'horizontal') {
        if (e.key === 'ArrowLeft') deltaPercent = -step;
        else if (e.key === 'ArrowRight') deltaPercent = step;
        else return;
      } else {
        if (e.key === 'ArrowUp') deltaPercent = -step;
        else if (e.key === 'ArrowDown') deltaPercent = step;
        else return;
      }

      e.preventDefault();

      const [leftPanel, rightPanel] = getAdjacentPanels(handleId);
      const currentSizes = sizesRef.current;
      const leftSize = currentSizes[leftPanel] ?? 50;
      const rightSize = currentSizes[rightPanel] ?? 50;

      const leftNew = leftSize + deltaPercent;
      const rightNew = rightSize - deltaPercent;
      const [newLeft, newRight] = clampSizes(leftPanel, rightPanel, leftNew, rightNew);

      setSizes({
        ...currentSizes,
        [leftPanel]: newLeft,
        [rightPanel]: newRight,
      });
    },
    [direction, getAdjacentPanels, clampSizes],
  );

  // Sync refs after every render (avoids writing to refs during render body)
  useEffect(() => {
    sizesRef.current = sizes;
    onResizeRef.current = onResize;
    minSizesRef.current = options.minSizes ?? {};
    maxSizesRef.current = options.maxSizes ?? {};
    panelIds.current = Object.keys(sizes);
  });

  // Stable event listeners — only mount/unmount once
  useEffect(() => {
    const controller = new AbortController();
    const opts = { signal: controller.signal };

    window.addEventListener('pointermove', handlePointerMove, opts);
    window.addEventListener('pointerup', handlePointerUp, opts);
    window.addEventListener('pointercancel', handlePointerUp, opts);

    return () => controller.abort();
  }, [handlePointerMove, handlePointerUp]);

  const getPanelStyle = useCallback(
    (panelId: string): React.CSSProperties => {
      const size = sizes[panelId];
      if (size === undefined) return {};

      // Use flex-grow ratio instead of percentage height/width
      // This ensures panels properly distribute space in the flex container
      return { flex: `${size} 0 0%`, minHeight: 0, minWidth: 0, overflow: 'hidden' };
    },
    [sizes],
  );

  const getResizeHandleProps = useCallback(
    (handleId: string) => {
      const [leftPanel] = getAdjacentPanels(handleId);
      const valueNow = sizes[leftPanel] ?? 50;
      const valueMin = minSizesRef.current[leftPanel] ?? 0;
      const valueMax = maxSizesRef.current[leftPanel] ?? 100;

      return {
        role: 'separator' as const,
        tabIndex: 0,
        'aria-valuenow': Math.round(valueNow),
        'aria-valuemin': Math.round(valueMin),
        'aria-valuemax': Math.round(valueMax),
        'aria-orientation': (direction === 'horizontal' ? 'vertical' : 'horizontal') as 'vertical' | 'horizontal',
        onPointerDown: handlePointerDown(handleId),
        onKeyDown: handleKeyDown(handleId),
        style: { touchAction: 'none' as const },
      };
    },
    [direction, getAdjacentPanels, sizes, handlePointerDown, handleKeyDown],
  );

  return { containerRef, sizes, getPanelStyle, getResizeHandleProps, setSizes };
}
