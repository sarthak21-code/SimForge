export type SimulationState = Record<string, unknown>;

export type SimulationRunner = (
  params: Record<string, number | boolean | string>,
  ctx: CanvasRenderingContext2D,
  state: SimulationState
) => void;

/** Compile once per simulation setup; state is shared across every frame call. */
export function createSimulationRunner(simulationCode: string): SimulationRunner {
  // eslint-disable-next-line no-new-func
  const run = new Function("params", "ctx", "Date", "state", simulationCode) as (
    params: Record<string, number | boolean | string>,
    ctx: CanvasRenderingContext2D,
    date: DateConstructor,
    state: SimulationState
  ) => void;

  return (params, ctx, state) => run(params, ctx, Date, state);
}