import * as Kefir from "kefir";
import KefirBus from "../../../utils/kefir-bus";
import BaseNode from "../../../base-node";

import * as NumberFuncs from "./number";
import * as StringFuncs from "./string";
console.log("StringFuncs", StringFuncs, funcsToNodes(StringFuncs));

export const String = funcsToNodes(StringFuncs);
export const Number = funcsToNodes(NumberFuncs);

function createPrimitiveNodeData(inputs, outputs) {
  const sources: Record<string, KefirBus<any, void>> = {},
    sinks = {};

  for (const key in inputs) {
    sources[key] = new KefirBus<any, void>(key);
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

function funcsToNodes(
  funcs: Record<string, { inputs: any; outputs: Record<string, Function> }>
) {
  return Object.fromEntries(
    Object.entries(funcs).map(([op, { inputs, outputs, label }]) => [
      op,
      {
        initializeStreams: ({ initialData }) => {
          return createPrimitiveNodeData(inputs, outputs);
        },
        Component({ data: { sources, sinks } }) {
          return (
            <BaseNode sources={sources} sinks={sinks}>
              <div style={{ backgroundColor: "white" }}>{label}</div>
            </BaseNode>
          );
        }
      }
    ])
  );
}
