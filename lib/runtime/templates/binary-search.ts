import type { SimSpec } from "@/lib/ai/schema";

export const binarySearchTemplate: SimSpec = {
  title: "Binary Search on a Sorted Array",
  domain: "cs",
  description: "Watch each midpoint comparison halve the remaining range of a sorted array.",
  template: "binary-search",
  controls: [
    { id: "arraySize", label: "Array Size", type: "slider", min: 5, max: 25, step: 1, default: 15, unit: "items" },
    { id: "searchSpeed", label: "Search Speed", type: "slider", min: 0.5, max: 5, step: 0.5, default: 2, unit: "checks/s" },
    { id: "targetValue", label: "Target Value", type: "slider", min: 1, max: 50, step: 1, default: 30 },
  ],
  simulationCode: `
const now = Date.now();
const requestedSize = Number(params.arraySize);
const size = Number.isFinite(requestedSize) ? Math.max(5, Math.min(25, Math.floor(requestedSize))) : 15;
const requestedTarget = Number(params.targetValue);
const target = Number.isFinite(requestedTarget) ? requestedTarget : 30;

if (!Array.isArray(state.values) || state.arraySize !== size || state.targetValue !== target) {
  state.arraySize = size;
  state.targetValue = target;
  state.values = Array.from({ length: size }, (_, index) => (index + 1) * 2);
  state.low = 0;
  state.high = size - 1;
  state.mid = Math.floor((state.low + state.high) / 2);
  state.comparisons = 0;
  state.status = "searching";
  state.comparisonResult = "Ready: compare the current midpoint.";
  state.accumulator = 0;
  state.lastFrameAt = now;
}

const lastFrameAt = Number(state.lastFrameAt);
const elapsed = Number.isFinite(lastFrameAt) ? Math.max(0, Math.min((now - lastFrameAt) / 1000, 0.1)) : 0;
state.lastFrameAt = now;
const requestedSpeed = Number(params.searchSpeed);
const checksPerSecond = Number.isFinite(requestedSpeed) ? Math.max(0.5, Math.min(5, requestedSpeed)) : 2;

if (!params.paused && state.status === "searching") {
  state.accumulator = Number(state.accumulator || 0) + elapsed;
  const interval = 1 / checksPerSecond;
  if (state.accumulator >= interval) {
    state.accumulator -= interval;
    const checkedIndex = Number(state.mid);
    const checkedValue = Number(state.values[checkedIndex]);
    state.comparisons = Number(state.comparisons || 0) + 1;

    if (checkedValue === target) {
      state.status = "found";
      state.low = checkedIndex;
      state.high = checkedIndex;
      state.comparisonResult = String(checkedValue) + " equals " + String(target) + ". Target found at index " + String(checkedIndex) + ".";
    } else if (checkedValue < target) {
      state.comparisonResult = String(checkedValue) + " is less than " + String(target) + ". Search the right half.";
      state.low = checkedIndex + 1;
    } else {
      state.comparisonResult = String(checkedValue) + " is greater than " + String(target) + ". Search the left half.";
      state.high = checkedIndex - 1;
    }

    if (state.status === "searching") {
      if (Number(state.low) > Number(state.high)) {
        state.status = "not-found";
        state.mid = null;
        state.comparisonResult += " The target is not in the array.";
      } else {
        state.mid = Math.floor((Number(state.low) + Number(state.high)) / 2);
        state.comparisonResult += " Next midpoint: index " + String(state.mid) + ".";
      }
    }
  }
}

ctx.clearRect(0, 0, 800, 500);
ctx.fillStyle = "#090d16";
ctx.fillRect(0, 0, 800, 500);
ctx.fillStyle = "#e2e8f0";
ctx.font = "bold 23px sans-serif";
ctx.textAlign = "left";
ctx.fillText("Binary Search · Sorted Array", 32, 42);
ctx.fillStyle = "#94a3b8";
ctx.font = "14px sans-serif";
ctx.fillText("Each comparison eliminates half of the remaining range.", 32, 68);

const statusText = state.status === "found"
  ? "FOUND at index " + String(state.mid)
  : state.status === "not-found" ? "NOT FOUND" : "SEARCHING";
ctx.fillStyle = state.status === "found" ? "#4ade80" : state.status === "not-found" ? "#fb7185" : "#38bdf8";
ctx.font = "bold 16px sans-serif";
ctx.fillText("Target: " + String(target) + "     Status: " + statusText, 32, 105);
ctx.fillStyle = "#cbd5e1";
ctx.font = "14px monospace";
ctx.fillText("low: " + String(state.low) + "     high: " + String(state.high) + "     mid: " + (state.mid === null ? "—" : String(state.mid)), 32, 135);
ctx.fillStyle = "#94a3b8";
ctx.fillText("Comparisons: " + String(state.comparisons) + "     " + String(state.comparisonResult), 32, 164);

const count = state.values.length;
const gap = 5;
const cellWidth = Math.min(52, (736 - gap * (count - 1)) / count);
const totalWidth = count * cellWidth + (count - 1) * gap;
const startX = (800 - totalWidth) / 2;
const boxY = 225;
const boxHeight = 54;
for (let index = 0; index < count; index++) {
  const x = startX + index * (cellWidth + gap);
  const eliminated = index < Number(state.low) || index > Number(state.high);
  const isMid = state.mid !== null && index === Number(state.mid);
  const isFound = state.status === "found" && isMid;
  ctx.fillStyle = isFound ? "#14532d" : isMid ? "#78350f" : eliminated ? "#1e293b" : "#0c4a6e";
  ctx.strokeStyle = isFound ? "#4ade80" : isMid ? "#fbbf24" : eliminated ? "#334155" : "#38bdf8";
  ctx.lineWidth = isMid ? 3 : 1.5;
  ctx.fillRect(x, boxY, cellWidth, boxHeight);
  ctx.strokeRect(x, boxY, cellWidth, boxHeight);
  ctx.fillStyle = eliminated ? "#64748b" : isFound ? "#bbf7d0" : "#e0f2fe";
  ctx.font = "bold " + String(Math.min(18, Math.max(11, cellWidth * 0.42))) + "px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(String(state.values[index]), x + cellWidth / 2, boxY + 33);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "11px sans-serif";
  ctx.fillText(String(index), x + cellWidth / 2, boxY + boxHeight + 18);

  if (!eliminated && state.status === "searching" && index === Number(state.low)) {
    ctx.fillStyle = "#67e8f9";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText("LOW", x + cellWidth / 2, boxY + boxHeight + 36);
  }
  if (!eliminated && state.status === "searching" && index === Number(state.high)) {
    ctx.fillStyle = "#c4b5fd";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText("HIGH", x + cellWidth / 2, boxY + boxHeight + 51);
  }
  if (isMid) {
    ctx.fillStyle = isFound ? "#4ade80" : "#fbbf24";
    ctx.font = "bold 11px sans-serif";
    ctx.fillText(isFound ? "FOUND" : "MID", x + cellWidth / 2, boxY - 10);
  }
}

ctx.textAlign = "left";
ctx.fillStyle = "#94a3b8";
ctx.font = "13px sans-serif";
ctx.fillText("Blue = remaining range     Amber = current midpoint     Dim = eliminated", 32, 365);
ctx.fillStyle = "#cbd5e1";
ctx.font = "14px sans-serif";
ctx.fillText("Comparison: " + String(state.comparisonResult), 32, 405);
ctx.fillStyle = "#64748b";
ctx.font = "12px sans-serif";
ctx.fillText(params.paused ? "Paused" : "Speed: " + String(checksPerSecond) + " checks per second", 32, 440);
`,
  graphs: [],
  socraticQuestions: [],
};
