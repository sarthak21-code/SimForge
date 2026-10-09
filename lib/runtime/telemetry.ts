import type { SimulationState } from "./simulationRunner";

export type GraphSample = { x: number; y: number };
export type GraphTelemetryStore = Record<string, GraphSample[]>;
export type GraphTelemetryRef = { current: GraphTelemetryStore };
export type GraphDefinition = {
  id: string;
  label: string;
  xLabel: string;
  yLabel: string;
  color?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function createGraphTelemetryStore(): GraphTelemetryStore {
  return Object.create(null) as GraphTelemetryStore;
}

export function clearGraphTelemetry(store: GraphTelemetryStore): void {
  for (const graphId of Object.keys(store)) delete store[graphId];
}

/** Remove last frame's measurements without disturbing other persistent state. */
export function clearFrameGraphTelemetry(state: SimulationState): void {
  if (!isRecord(state.telemetry)) {
    state.telemetry = {};
    return;
  }
  for (const graphId of Object.keys(state.telemetry)) delete state.telemetry[graphId];
}

/** Copy only finite, declared graph measurements from the current simulation frame. */
export function collectGraphTelemetry(
  graphs: readonly Pick<GraphDefinition, "id">[],
  state: SimulationState,
  store: GraphTelemetryStore,
  maxSamples = 600
): void {
  const telemetry = state.telemetry;
  if (!isRecord(telemetry)) return;

  for (const graph of graphs) {
    if (!Object.hasOwn(telemetry, graph.id)) continue;
    const measurement = telemetry[graph.id];
    if (!isRecord(measurement)) continue;
    const { x, y } = measurement;
    if (typeof x !== "number" || !Number.isFinite(x) || typeof y !== "number" || !Number.isFinite(y)) continue;

    const samples = store[graph.id] ?? (store[graph.id] = []);
    samples.push({ x, y });
    if (samples.length > maxSamples) samples.splice(0, samples.length - maxSamples);
  }
}

export type PlotPoint = { x: number; y: number };

/** Map finite measurements into the chart's drawable area using their actual extents. */
export function mapGraphSamples(
  samples: readonly GraphSample[],
  width: number,
  height: number
): PlotPoint[] {
  const finite = samples.filter((sample) =>
    Number.isFinite(sample.x) && Number.isFinite(sample.y)
  );
  if (finite.length === 0 || width <= 100 || height <= 80) return [];

  let minX = Math.min(...finite.map(({ x }) => x));
  let maxX = Math.max(...finite.map(({ x }) => x));
  let minY = Math.min(...finite.map(({ y }) => y));
  let maxY = Math.max(...finite.map(({ y }) => y));

  if (minX === maxX) {
    const padding = Math.max(Math.abs(minX) * 0.05, 0.5);
    minX -= padding;
    maxX += padding;
  }
  if (minY === maxY) {
    const padding = Math.max(Math.abs(minY) * 0.1, 1);
    minY -= padding;
    maxY += padding;
  }

  const left = 54;
  const right = width - 18;
  const top = 18;
  const bottom = height - 48;
  return finite.map(({ x, y }) => ({
    x: left + ((x - minX) / (maxX - minX)) * (right - left),
    y: bottom - ((y - minY) / (maxY - minY)) * (bottom - top),
  }));
}

export function drawTelemetryGraph(
  ctx: CanvasRenderingContext2D,
  graph: GraphDefinition,
  samples: readonly GraphSample[],
  width: number,
  height: number
): void {
  ctx.fillStyle = "#090d16";
  ctx.fillRect(0, 0, width, height);

  const left = 54;
  const right = width - 18;
  const top = 18;
  const bottom = height - 48;

  ctx.strokeStyle = "#1e293b";
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 4]);
  for (let index = 0; index <= 4; index++) {
    const y = top + ((bottom - top) / 4) * index;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  ctx.strokeStyle = "#475569";
  ctx.beginPath();
  ctx.moveTo(left, top);
  ctx.lineTo(left, bottom);
  ctx.lineTo(right, bottom);
  ctx.stroke();

  const finiteSamples = samples.filter((sample) =>
    Number.isFinite(sample.x) && Number.isFinite(sample.y)
  );
  if (finiteSamples.length > 0) {
    let minX = Math.min(...finiteSamples.map(({ x }) => x));
    let maxX = Math.max(...finiteSamples.map(({ x }) => x));
    let minY = Math.min(...finiteSamples.map(({ y }) => y));
    let maxY = Math.max(...finiteSamples.map(({ y }) => y));
    if (minX === maxX) {
      const padding = Math.max(Math.abs(minX) * 0.05, 0.5);
      minX -= padding;
      maxX += padding;
    }
    if (minY === maxY) {
      const padding = Math.max(Math.abs(minY) * 0.1, 1);
      minY -= padding;
      maxY += padding;
    }

    ctx.fillStyle = "#64748b";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "right";
    for (let index = 0; index <= 4; index++) {
      const value = maxY - ((maxY - minY) / 4) * index;
      const y = top + ((bottom - top) / 4) * index;
      ctx.fillText(value.toFixed(1), left - 7, y + 3);
    }
    ctx.textAlign = "left";
    ctx.fillText(minX.toFixed(2), left, bottom + 15);
    ctx.textAlign = "right";
    ctx.fillText(maxX.toFixed(2), right, bottom + 15);
  }

  ctx.fillStyle = "#94a3b8";
  ctx.font = "11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(graph.xLabel, (left + right) / 2, height - 8);
  ctx.save();
  ctx.translate(14, (top + bottom) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(graph.yLabel, 0, 0);
  ctx.restore();

  const points = mapGraphSamples(samples, width, height);
  if (points.length === 0) {
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "center";
    ctx.fillText("Waiting for simulation measurements", (left + right) / 2, (top + bottom) / 2);
    return;
  }

  ctx.strokeStyle = graph.color || "#38bdf8";
  ctx.fillStyle = graph.color || "#38bdf8";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.stroke();

  const latest = points[points.length - 1];
  ctx.beginPath();
  ctx.arc(latest.x, latest.y, 4, 0, Math.PI * 2);
  ctx.fill();
}
