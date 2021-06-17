import * as Kefir from "kefir";
import KefirBus from "../../../utils/kefir-bus";
import BaseNode from "../../../base-node";

import * as NumberFuncs from "./number";
import * as StringFuncs from "./string";
import * as FormulaFuncs from "./formula";
import * as TableFuncs from "./table";
import * as DateFuncs from "./date";
import * as CodeFuncs from "./code";
import React from "react";

export const String = funcsToNodes(StringFuncs);
export const Number = funcsToNodes(NumberFuncs);
export const Formula = funcsToNodes(FormulaFuncs);
export const TableOps = funcsToNodes(TableFuncs);
export const Date = funcsToNodes(DateFuncs);
export const Code = funcsToNodes(CodeFuncs);

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
      .flatMap((sourceVals) => {
        try {
          return Kefir.constant(outputs[key](sourceVals));
        } catch (e) {
          console.log("Error throw in primitive", e);
          return Kefir.constantError(e);
        }
      })
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
              <p
                style={{ backgroundColor: "white", padding: "10px", margin: 0 }}
              >
                {label}
              </p>
            </BaseNode>
          );
        }
      }
    ])
  );
}
