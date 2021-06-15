import * as Kefir from "kefir";
import KefirBus from "../../../utils/kefir-bus";

export default function createPrimitiveNodeData(inputs, outputs) {
  const sources: Record<string, KefirBus<any, void>> = {},
    sinks = {};

  for (const key in inputs) {
    sources[key] = new KefirBus();
  }

  const allSources = Object.entries(sources);
  const combinedSources = Kefir.combine(
    allSources.map(([name, bus]) => bus.stream.toProperty()),
    (...vals) =>
      Object.fromEntries(allSources.map(([name], i) => [name, vals[i]]))
  ).toProperty();

  for (const key in outputs) {
    sinks[key] = combinedSources
      .map((sourceVals) => outputs[key](sourceVals))
      .toProperty();
  }

  return {
    sources,
    sinks
  };
}
