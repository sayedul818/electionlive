import { useEffect, useMemo, useRef, useState } from "react";

type InteractiveSvgMapProps = {
  src: string;
  idMap?: Record<string, string>;
  labelFillMap?: Record<string, string>;
  selectedId?: string | null;
  onSelect?: (value: string) => void;
  interactivePaths?: boolean;
  selectedPathId?: string | null;
  onSelectPath?: (value: string) => void;
  onHoverPath?: (value: string | null) => void;
  onHoverLabel?: (value: string | null) => void;
  baseFill?: string;
  className?: string;
  hoverFill?: string;
  activeFill?: string;
};

export default function InteractiveSvgMap({
  src,
  idMap,
  labelFillMap,
  selectedId,
  onSelect,
  interactivePaths = false,
  selectedPathId,
  onSelectPath,
  onHoverPath,
  onHoverLabel,
  baseFill,
  className,
  hoverFill = "#38bdf8",
  activeFill = "#22c55e",
}: InteractiveSvgMapProps) {
  const [svgText, setSvgText] = useState<string>("");
  const [isReady, setIsReady] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hoveredGroupRef = useRef<SVGGElement | null>(null);
  const hoveredPathRef = useRef<SVGPathElement | null>(null);

  const interactiveIds = useMemo(() => (idMap ? Object.keys(idMap) : []), [idMap]);

  useEffect(() => {
    let mounted = true;
    setIsReady(false);
    fetch(src)
      .then((response) => response.text())
      .then((text) => {
        if (!mounted) return;
        const legendNames = [
          "Awami League",
          "Islami Jatiya Oikya Front",
          "Bangladesh Nationalist Party",
          "Islami Oikya Jote",
          "Bangladesh Jatiya Party",
          "Bangladesh Jamaat-e-Islami",
          "Krishak Sramik Janata League",
          "Jatiya Party (Manju)",
        ];
        const normalized = legendNames.reduce((acc, name) => {
          const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const regex = new RegExp(`<text[^>]*>\\s*${escaped}\\s*<\\/text>`, "gi");
          return acc.replace(regex, "");
        }, text)
          .replace(/<g[^>]*transform="matrix\(0\.537047[^\"]*\)"[^>]*>[\s\S]*?<\/g>/gi, "")
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/\swidth="[^"]*"/i, "")
          .replace(/\sheight="[^"]*"/i, "")
          .replace(/\swidth='[^']*'/i, "")
          .replace(/\sheight='[^']*'/i, "")
          .replace(/\sstyle="[^"]*"/gi, "")
          .replace(/\sstyle='[^']*'/gi, "")
          .replace(/\sclass="[^"]*"/gi, "")
          .replace(/\sclass='[^']*'/gi, "")
          .replace(/\sfill="[^"]*"/gi, "")
          .replace(/\sfill='[^']*'/gi, "")
          .replace(/\sstroke="[^"]*"/gi, "")
          .replace(/\sstroke='[^']*'/gi, "")
          .replace(/\sstroke-width="[^"]*"/gi, "")
          .replace(/\sstroke-width='[^']*'/gi, "")
          .replace(
            /<svg\b/i,
            '<svg width="100%" height="100%" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%;max-width:100%;max-height:100%;display:block;"'
          );
        setSvgText(normalized);
      });
    return () => {
      mounted = false;
    };
  }, [src]);

  useEffect(() => {
    if (!containerRef.current || !svgText) return;
    const svg = containerRef.current.querySelector("svg");
    if (!svg) return;

    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.maxWidth = "100%";
    svg.style.maxHeight = "100%";
    svg.style.display = "block";
    svg.style.pointerEvents = "auto";
    requestAnimationFrame(() => setIsReady(true));

    const selectedSvgId = selectedId
      ? idMap
        ? Object.entries(idMap).find(([, value]) => value === selectedId)?.[0]
        : null
      : null;

    if (interactivePaths) {
      const shapeSelector = "path, polygon, polyline, rect, circle, ellipse";
      const labelSelector = "text";

      const parseTransformPoint = (transform?: string | null) => {
        if (!transform) return null;
        const match = transform.match(/matrix\(([^)]+)\)/);
        if (!match) return null;
        const values = match[1].split(/[,\s]+/).map((val) => Number(val)).filter((val) => !Number.isNaN(val));
        if (values.length < 6) return null;
        return { x: values[4], y: values[5] };
      };

      const seatLabels = Array.from(svg.querySelectorAll(labelSelector))
        .map((text) => {
          const value = text.textContent?.trim() ?? "";
          if (!/^[0-9]+$/.test(value)) return null;
          const xAttr = text.getAttribute("x");
          const yAttr = text.getAttribute("y");
          if (xAttr && yAttr) {
            const x = Number(xAttr);
            const y = Number(yAttr);
            if (!Number.isNaN(x) && !Number.isNaN(y)) return { value, x, y };
          }
          const transformPoint = parseTransformPoint(text.getAttribute("transform"));
          if (transformPoint) return { value, x: transformPoint.x, y: transformPoint.y };
          return null;
        })
        .filter((item): item is { value: string; x: number; y: number } => Boolean(item));

           const findNearestLabel = (shape: SVGGraphicsElement): string | null => {
        if (seatLabels.length === 0) return null;
        const box = shape.getBBox();
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;

        const nearest = seatLabels.reduce<{ value: string; distance: number } | null>((acc, label) => {
          const dx = label.x - cx;
          const dy = label.y - cy;
          const distance = Math.hypot(dx, dy);
          if (!acc || distance < acc.distance) {
            return { value: label.value, distance };
          }
          return acc;
        }, null);

        return nearest && nearest.distance <= 60 ? nearest.value : null;
      };

      const rememberOriginalFill = (shape: SVGGraphicsElement) => {
        if (!shape.dataset.originalFill) {
          const attrFill = shape.getAttribute("fill");
          const computedFill = window.getComputedStyle(shape).fill;
          shape.dataset.originalFill = baseFill ?? attrFill ?? computedFill ?? "";
        }
      };

      const applyFill = (shape: SVGGraphicsElement, fill: string) => {
        shape.style.fill = fill;
        shape.setAttribute("fill", fill);
      };

      const restoreFill = (shape: SVGGraphicsElement) => {
        const original = shape.dataset.originalFill ?? "";
        if (original) {
          shape.style.removeProperty("fill");
          shape.setAttribute("fill", original);
        } else {
          shape.style.removeProperty("fill");
          shape.removeAttribute("fill");
        }
      };

      const shapesRoot = (svg.querySelector("#Wahlkreise") as SVGElement | null) ?? svg;
      const allShapes = Array.from(shapesRoot.querySelectorAll(shapeSelector)) as SVGGraphicsElement[];
      const allShapesInSvg = Array.from(svg.querySelectorAll(shapeSelector)) as SVGGraphicsElement[];
      if (baseFill) {
        allShapesInSvg.forEach((shape) => {
          shape.style.fill = baseFill;
          shape.setAttribute("fill", baseFill);
        });
      }

      const getSeatFill = (shape: SVGGraphicsElement) => {
        if (!labelFillMap) return undefined;
        const seatLabel = findNearestLabel(shape);
        if (!seatLabel) return undefined;
        return labelFillMap[seatLabel];
      };
      allShapes.forEach((shape, index) => {
        rememberOriginalFill(shape);
        shape.dataset.pathId = shape.dataset.pathId ?? `shape-${index}`;
        shape.style.cursor = "pointer";
        shape.style.pointerEvents = "auto";
        shape.style.transition = "opacity 150ms ease, filter 150ms ease";
        shape.style.opacity =
          selectedPathId && shape.dataset.pathId !== selectedPathId ? "0.65" : "1";
        shape.style.filter =
          selectedPathId === shape.dataset.pathId
            ? "drop-shadow(0 0 8px rgba(56, 189, 248, 0.6))"
            : "none";
        if (selectedPathId === shape.dataset.pathId) {
          applyFill(shape, activeFill);
        } else {
          const seatFill = getSeatFill(shape);
          if (seatFill) {
            applyFill(shape, seatFill);
          } else if (baseFill) {
            applyFill(shape, baseFill);
          } else {
            restoreFill(shape);
          }
        }
      });

      const handleHover = (event: MouseEvent) => {
        const target = event.target as Element | null;
        const shape = target?.closest(shapeSelector) as SVGGraphicsElement | null;
        if (!shape) return;
        if (hoveredPathRef.current && hoveredPathRef.current !== shape) {
          const previous = hoveredPathRef.current as SVGGraphicsElement;
          previous.style.opacity =
            selectedPathId && previous.dataset.pathId !== selectedPathId ? "0.65" : "1";
          previous.style.filter =
            selectedPathId === previous.dataset.pathId
              ? "drop-shadow(0 0 8px rgba(56, 189, 248, 0.6))"
              : "none";
          if (selectedPathId === previous.dataset.pathId) {
            applyFill(previous, activeFill);
          } else {
            const seatFill = getSeatFill(previous);
            if (seatFill) {
              applyFill(previous, seatFill);
            } else if (baseFill) {
              applyFill(previous, baseFill);
            } else {
              restoreFill(previous);
            }
          }
        }
        shape.style.opacity = "1";
        shape.style.filter = "drop-shadow(0 0 8px rgba(56, 189, 248, 0.6))";
        applyFill(shape, hoverFill);
        hoveredPathRef.current = shape as unknown as SVGPathElement;
        const seatLabel = findNearestLabel(shape);
        if (onHoverPath) {
          onHoverPath(shape.dataset.pathId ?? null);
        }
        if (onHoverLabel) {
          onHoverLabel(seatLabel);
        }
      };

      const handleLeave = (event: MouseEvent) => {
        const target = event.target as Element | null;
        const shape = target?.closest(shapeSelector) as SVGGraphicsElement | null;
        if (!shape) return;
        shape.style.opacity =
          selectedPathId && shape.dataset.pathId !== selectedPathId ? "0.65" : "1";
        shape.style.filter =
          selectedPathId === shape.dataset.pathId
            ? "drop-shadow(0 0 8px rgba(56, 189, 248, 0.6))"
            : "none";
        if (selectedPathId === shape.dataset.pathId) {
          applyFill(shape, activeFill);
        } else {
          const seatFill = getSeatFill(shape);
          if (seatFill) {
            applyFill(shape, seatFill);
          } else if (baseFill) {
            applyFill(shape, baseFill);
          } else {
            restoreFill(shape);
          }
        }
        if (hoveredPathRef.current === (shape as unknown as SVGPathElement)) hoveredPathRef.current = null;
        if (onHoverPath) {
          onHoverPath(null);
        }
        if (onHoverLabel) {
          onHoverLabel(null);
        }
      };

      const handleClick = (event: MouseEvent) => {
        const target = event.target as Element | null;
        const shape = target?.closest(shapeSelector) as SVGGraphicsElement | null;
        if (!shape) return;
        const id = shape.dataset.pathId ?? "";
        if (id && onSelectPath) onSelectPath(id);
      };

      svg.addEventListener("mouseover", handleHover);
      svg.addEventListener("mouseout", handleLeave);
      svg.addEventListener("click", handleClick);

      return () => {
        svg.removeEventListener("mouseover", handleHover);
        svg.removeEventListener("mouseout", handleLeave);
        svg.removeEventListener("click", handleClick);
      };
    }

    const rememberOriginalFill = (group: SVGGElement) => {
      group.querySelectorAll("path").forEach((path) => {
        const svgPath = path as SVGPathElement;
        if (!svgPath.dataset.originalFill) {
          svgPath.dataset.originalFill = svgPath.getAttribute("fill") ?? "";
        }
      });
    };

    const applyFill = (group: SVGGElement, fill: string) => {
      group.querySelectorAll("path").forEach((path) => {
        const svgPath = path as SVGPathElement;
        svgPath.setAttribute("fill", fill);
      });
    };

    const restoreFill = (group: SVGGElement) => {
      group.querySelectorAll("path").forEach((path) => {
        const svgPath = path as SVGPathElement;
        const original = svgPath.dataset.originalFill ?? "";
        if (original) {
          svgPath.setAttribute("fill", original);
        }
      });
    };

    const allGroups = Array.from(svg.querySelectorAll("g[id]")) as SVGGElement[];
    allGroups.forEach((group) => {
      if (!interactiveIds.includes(group.id)) return;
      rememberOriginalFill(group);
      group.style.cursor = "pointer";
      group.style.transition = "opacity 150ms ease, filter 150ms ease";
      group.style.opacity = selectedSvgId && group.id !== selectedSvgId ? "0.55" : "1";
      group.style.filter = selectedSvgId === group.id ? "drop-shadow(0 0 8px rgba(56, 189, 248, 0.6))" : "none";
      if (selectedSvgId === group.id) {
        applyFill(group, activeFill);
      } else {
        restoreFill(group);
      }
      group.querySelectorAll("path").forEach((path) => {
        (path as SVGPathElement).style.pointerEvents = "auto";
      });
    });

    const handleHover = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const group = target?.closest("g[id]") as SVGGElement | null;
      if (!group || !interactiveIds.includes(group.id)) return;
      if (hoveredGroupRef.current && hoveredGroupRef.current !== group) {
        hoveredGroupRef.current.style.opacity = selectedSvgId && hoveredGroupRef.current.id !== selectedSvgId ? "0.55" : "1";
        hoveredGroupRef.current.style.filter = selectedSvgId === hoveredGroupRef.current.id ? "drop-shadow(0 0 8px rgba(56, 189, 248, 0.6))" : "none";
        if (selectedSvgId === hoveredGroupRef.current.id) {
          applyFill(hoveredGroupRef.current, activeFill);
        } else {
          restoreFill(hoveredGroupRef.current);
        }
      }
      group.style.opacity = "1";
      group.style.filter = "drop-shadow(0 0 8px rgba(56, 189, 248, 0.6))";
      applyFill(group, hoverFill);
      hoveredGroupRef.current = group;
    };

    const handleLeave = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const group = target?.closest("g[id]") as SVGGElement | null;
      if (!group || !interactiveIds.includes(group.id)) return;
      group.style.opacity = selectedSvgId && group.id !== selectedSvgId ? "0.55" : "1";
      group.style.filter = selectedSvgId === group.id ? "drop-shadow(0 0 8px rgba(56, 189, 248, 0.6))" : "none";
      if (selectedSvgId === group.id) {
        applyFill(group, activeFill);
      } else {
        restoreFill(group);
      }
      if (hoveredGroupRef.current === group) hoveredGroupRef.current = null;
    };

    const handleClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const group = target?.closest("g[id]") as SVGGElement | null;
      if (!group || !interactiveIds.includes(group.id)) return;
      const mapped = idMap?.[group.id];
      if (mapped && onSelect) onSelect(mapped);
    };

    svg.addEventListener("mouseover", handleHover);
    svg.addEventListener("mouseout", handleLeave);
    svg.addEventListener("click", handleClick);

    return () => {
      svg.removeEventListener("mouseover", handleHover);
      svg.removeEventListener("mouseout", handleLeave);
      svg.removeEventListener("click", handleClick);
    };
  }, [
    svgText,
    idMap,
    interactiveIds,
    onSelect,
    selectedId,
    interactivePaths,
    selectedPathId,
    onSelectPath,
    onHoverPath,
    onHoverLabel,
    hoverFill,
    activeFill,
    labelFillMap,
    baseFill,
  ]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ opacity: isReady ? 1 : 0, visibility: isReady ? "visible" : "hidden" }}
      aria-live="polite"
      dangerouslySetInnerHTML={{ __html: svgText }}
    />
  );
}
