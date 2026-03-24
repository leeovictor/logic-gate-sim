/** Creates an SVG root element with shared defaults. */
function makeSvg(viewBox: string): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", viewBox);
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.5");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  return svg;
}

/** Appends a child SVG element with the given attributes. */
function add(
  parent: SVGElement,
  tag: string,
  attrs: Record<string, string>,
): void {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  parent.appendChild(el);
}

/** Mouse cursor / pointer arrow. */
export function selectIcon(): SVGSVGElement {
  const svg = makeSvg("0 0 24 24");
  add(svg, "path", {
    d: "M5,2 L5,18 L9,14 L12,20 L14,19 L11,13 L16,13 Z",
    fill: "currentColor",
    stroke: "none",
  });
  return svg;
}

/** Diagonal line with filled endpoint dots. */
export function wireIcon(): SVGSVGElement {
  const svg = makeSvg("0 0 24 24");
  add(svg, "line", { x1: "4", y1: "20", x2: "20", y2: "4" });
  add(svg, "circle", {
    cx: "4", cy: "20", r: "2.5",
    fill: "currentColor", stroke: "none",
  });
  add(svg, "circle", {
    cx: "20", cy: "4", r: "2.5",
    fill: "currentColor", stroke: "none",
  });
  return svg;
}

/**
 * AND gate: flat left side + circular arc right, matching and-gate.ts.
 * viewBox 0 0 28 22 — scaled down from the 80×50 component.
 */
export function andGateIcon(): SVGSVGElement {
  const svg = makeSvg("0 0 28 22");
  // Input lines (at ¼ and ¾ of body height)
  add(svg, "line", { x1: "0", y1: "6.5", x2: "5", y2: "6.5" });
  add(svg, "line", { x1: "0", y1: "15.5", x2: "5", y2: "15.5" });
  // Body: flat left + semicircular arc right (center 13,11 r=9)
  add(svg, "path", {
    d: "M5,2 L13,2 A9,9 0 0 1 13,20 L5,20 Z",
    "stroke-width": "2",
  });
  // Output line
  add(svg, "line", { x1: "22", y1: "11", x2: "28", y2: "11" });
  return svg;
}

/**
 * OR gate: concave left + convex arcs meeting at right tip, matching or-gate.ts.
 * viewBox 0 0 28 22.
 */
export function orGateIcon(): SVGSVGElement {
  const svg = makeSvg("0 0 28 22");
  // Input lines (offset inward to clear the concave left curve)
  add(svg, "line", { x1: "0", y1: "6.5", x2: "7", y2: "6.5" });
  add(svg, "line", { x1: "0", y1: "15.5", x2: "7", y2: "15.5" });
  // Body: top arc → right tip → bottom arc → concave left
  add(svg, "path", {
    d: "M5,2 Q16,2 22,11 Q16,20 5,20 Q11,11 5,2 Z",
    "stroke-width": "2",
  });
  // Output line
  add(svg, "line", { x1: "22", y1: "11", x2: "28", y2: "11" });
  return svg;
}

/**
 * NOT gate: triangle body + inversion bubble, matching not-gate.ts.
 * viewBox 0 0 28 22.
 */
export function notGateIcon(): SVGSVGElement {
  const svg = makeSvg("0 0 28 22");
  // Input line
  add(svg, "line", { x1: "0", y1: "11", x2: "5", y2: "11" });
  // Triangle body
  add(svg, "path", {
    d: "M5,2 L20,11 L5,20 Z",
    "stroke-width": "2",
  });
  // Inversion bubble
  add(svg, "circle", { cx: "22", cy: "11", r: "2.5", "stroke-width": "2" });
  // Output line
  add(svg, "line", { x1: "24.5", y1: "11", x2: "28", y2: "11" });
  return svg;
}

/**
 * Switch: rectangle body with output line stub, matching switch.ts.
 * viewBox 0 0 24 20.
 */
export function switchIcon(): SVGSVGElement {
  const svg = makeSvg("0 0 24 20");
  add(svg, "rect", {
    x: "2", y: "4", width: "16", height: "12", rx: "2",
    "stroke-width": "2",
  });
  add(svg, "line", { x1: "18", y1: "10", x2: "24", y2: "10" });
  return svg;
}

/**
 * Light (output): input line stub + circle bulb, matching light.ts.
 * viewBox 0 0 24 20.
 */
export function lightIcon(): SVGSVGElement {
  const svg = makeSvg("0 0 24 20");
  add(svg, "line", { x1: "0", y1: "10", x2: "7", y2: "10" });
  add(svg, "circle", { cx: "17", cy: "10", r: "7", "stroke-width": "2" });
  return svg;
}

/**
 * NAND gate: AND body + inversion bubble, matching nand-gate.ts.
 * viewBox 0 0 32 22.
 */
export function nandGateIcon(): SVGSVGElement {
  const svg = makeSvg("0 0 32 22");
  // Input lines
  add(svg, "line", { x1: "0", y1: "6.5", x2: "5", y2: "6.5" });
  add(svg, "line", { x1: "0", y1: "15.5", x2: "5", y2: "15.5" });
  // Body: flat left + semicircular arc right (center 13,11 r=9)
  add(svg, "path", {
    d: "M5,2 L13,2 A9,9 0 0 1 13,20 L5,20 Z",
    "stroke-width": "2",
  });
  // Inversion bubble
  add(svg, "circle", { cx: "22", cy: "11", r: "2.5", "stroke-width": "2" });
  // Output line
  add(svg, "line", { x1: "24.5", y1: "11", x2: "32", y2: "11" });
  return svg;
}

/**
 * NOR gate: OR body + inversion bubble, matching nor-gate.ts.
 * viewBox 0 0 32 22.
 */
export function norGateIcon(): SVGSVGElement {
  const svg = makeSvg("0 0 32 22");
  // Input lines
  add(svg, "line", { x1: "0", y1: "6.5", x2: "7", y2: "6.5" });
  add(svg, "line", { x1: "0", y1: "15.5", x2: "7", y2: "15.5" });
  // Body: top arc → right tip → bottom arc → concave left (adjusted for bubble)
  add(svg, "path", {
    d: "M5,2 Q19,2 24,11 Q19,20 5,20 Q11,11 5,2 Z",
    "stroke-width": "2",
  });
  // Inversion bubble
  add(svg, "circle", { cx: "26.5", cy: "11", r: "2.5", "stroke-width": "2" });
  // Output line
  add(svg, "line", { x1: "29", y1: "11", x2: "32", y2: "11" });
  return svg;
}

/**
 * XOR gate: OR body + extra concave left curve, matching xor-gate.ts.
 * viewBox 0 0 28 22.
 */
export function xorGateIcon(): SVGSVGElement {
  const svg = makeSvg("0 0 28 22");
  // Input lines
  add(svg, "line", { x1: "0", y1: "6.5", x2: "7", y2: "6.5" });
  add(svg, "line", { x1: "0", y1: "15.5", x2: "7", y2: "15.5" });
  // Body: top arc → right tip → bottom arc → concave left
  add(svg, "path", {
    d: "M5,2 Q16,2 22,11 Q16,20 5,20 Q11,11 5,2 Z",
    "stroke-width": "2",
  });
  // Extra concave curve for XOR
  add(svg, "path", {
    d: "M-1,2 Q-6,11 -1,20",
    "stroke-width": "2",
  });
  // Output line
  add(svg, "line", { x1: "22", y1: "11", x2: "28", y2: "11" });
  return svg;
}

/**
 * XNOR gate: XOR body + inversion bubble, matching xnor-gate.ts.
 * viewBox 0 0 32 22.
 */
export function xnorGateIcon(): SVGSVGElement {
  const svg = makeSvg("0 0 32 22");
  // Input lines
  add(svg, "line", { x1: "0", y1: "6.5", x2: "7", y2: "6.5" });
  add(svg, "line", { x1: "0", y1: "15.5", x2: "7", y2: "15.5" });
  // Body: top arc → right tip → bottom arc → concave left (adjusted for bubble)
  add(svg, "path", {
    d: "M5,2 Q19,2 24,11 Q19,20 5,20 Q11,11 5,2 Z",
    "stroke-width": "2",
  });
  // Extra concave curve for XOR body
  add(svg, "path", {
    d: "M-1,2 Q-6,11 -1,20",
    "stroke-width": "2",
  });
  // Inversion bubble
  add(svg, "circle", { cx: "26.5", cy: "11", r: "2.5", "stroke-width": "2" });
  // Output line
  add(svg, "line", { x1: "29", y1: "11", x2: "32", y2: "11" });
  return svg;
}

/** Sun icon for light theme toggle. */
export function sunIcon(): SVGSVGElement {
  const svg = makeSvg("0 0 24 24");
  add(svg, "circle", { cx: "12", cy: "12", r: "4" });
  // rays
  add(svg, "line", { x1: "12", y1: "2", x2: "12", y2: "5" });
  add(svg, "line", { x1: "12", y1: "19", x2: "12", y2: "22" });
  add(svg, "line", { x1: "2", y1: "12", x2: "5", y2: "12" });
  add(svg, "line", { x1: "19", y1: "12", x2: "22", y2: "12" });
  add(svg, "line", { x1: "4.93", y1: "4.93", x2: "7.05", y2: "7.05" });
  add(svg, "line", { x1: "16.95", y1: "16.95", x2: "19.07", y2: "19.07" });
  add(svg, "line", { x1: "4.93", y1: "19.07", x2: "7.05", y2: "16.95" });
  add(svg, "line", { x1: "16.95", y1: "7.05", x2: "19.07", y2: "4.93" });
  return svg;
}

/** Moon icon for dark theme toggle. */
export function moonIcon(): SVGSVGElement {
  const svg = makeSvg("0 0 24 24");
  add(svg, "path", {
    d: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z",
  });
  return svg;
}

/** Lightning bolt for the Simulate toggle. */
export function simulateIcon(): SVGSVGElement {
  const svg = makeSvg("0 0 24 24");
  add(svg, "path", {
    d: "M13,2 L6,13 L12,13 L11,22 L18,11 L12,11 Z",
    fill: "currentColor",
    stroke: "none",
  });
  return svg;
}


