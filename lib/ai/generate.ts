import { SYSTEM_PROMPT } from "./prompt";
import { getTemplateFallback } from "../runtime/templates";
import { validateSimulation } from "./validation";
import { createOpenRouterBuiltInProvider } from "./providers/openrouter";
import {
  CustomGenerationUnavailableError,
  generateCustomWithProviders,
} from "./providers";

export { CustomGenerationUnavailableError };

const OPENROUTER_TIMEOUT_MS = 30_000;

export async function generateSim(userQuery: string) {
  let builtInFallback = null;
  try {
    builtInFallback = getTemplateFallback(userQuery);
  } catch {
    // Custom concepts do not have a built-in fallback.
  }

  if (!builtInFallback) {
    return generateCustomWithProviders({ userQuery });
  }

  if (builtInFallback.template === "binary-search") return builtInFallback;

  try {
    const provider = createOpenRouterBuiltInProvider();
    const response = await provider.generate(userQuery, SYSTEM_PROMPT, OPENROUTER_TIMEOUT_MS);
    if (!response.content?.trim()) {
      console.warn("Built-in generation returned no content.", {
        provider: response.provider,
        model: response.model,
        httpStatus: response.httpStatus,
        failureCategory: "empty_content",
      });
      return builtInFallback;
    }
    const simulation = validateSimulation(response.content);
    if (builtInFallback.template === "pendulum") {
      const generatedControls = new Map(simulation.controls.map((control) => [control.id, control]));
      const missingFallbackControls = builtInFallback.controls
        .filter((control) => !generatedControls.has(control.id))
        .map(({ id }) => id);
      const fallbackDefaultsMatch = builtInFallback.controls.every(
        (control) => generatedControls.get(control.id)?.default === control.default
      );
      const simulationCodeMatchesFallback =
        simulation.simulationCode.trim() === builtInFallback.simulationCode.trim();
      const graphsMatchFallback = JSON.stringify(simulation.graphs) === JSON.stringify(builtInFallback.graphs);
      if (
        simulation.template !== "pendulum" ||
        simulation.title !== builtInFallback.title ||
        missingFallbackControls.length > 0 ||
        !fallbackDefaultsMatch ||
        !simulationCodeMatchesFallback ||
        !graphsMatchFallback
      ) {
        console.warn("Pendulum response did not match the selected built-in fallback; using the built-in spec.", {
          expectedTemplate: "pendulum",
          actualTemplate: simulation.template,
          titleMatchesFallback: simulation.title === builtInFallback.title,
          missingControlIds: missingFallbackControls,
          defaultsMatchFallback: fallbackDefaultsMatch,
          simulationCodeMatchesFallback,
          graphsMatchFallback,
        });
        return builtInFallback;
      }
    }
    console.info("OpenRouter generated a valid built-in SimSpec.", {
      provider: response.provider,
      model: response.model,
      httpStatus: response.httpStatus,
      template: simulation.template,
    });
    return simulation;
  } catch (error) {
    console.warn("Built-in OpenRouter generation failed; using the matched template.", {
      failureCategory: error instanceof Error ? error.name : "provider_request_error",
    });
    return builtInFallback;
  }
}
