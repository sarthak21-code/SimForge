export type RuntimeParams = Record<string, number | boolean | string>;

export type RestartedSimulation = {
  runId: number;
  params: RuntimeParams;
};

/** Start a fresh runtime while keeping user controls and clearing playback-only flags. */
export function getRestartedSimulation(
  runId: number,
  params: RuntimeParams
): RestartedSimulation {
  let nextParams = params;
  if (params.paused === true || params.reset === true) {
    nextParams = { ...params };
    if (params.paused === true) nextParams.paused = false;
    if (params.reset === true) nextParams.reset = false;
  }
  return { runId: runId + 1, params: nextParams };
}
