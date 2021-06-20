import BaseNode from "../../../base-node";
import { BehaviorSubject, combineLatest } from "rxjs";
import { map } from "rxjs/operators";

import * as NumberFuncs from "./number";
import * as StringFuncs from "./string";
import * as FormulaFuncs from "./formula";
import * as TableFuncs from "./table";
import * as DateFuncs from "./date";
import * as CodeFuncs from "./code";

export const String = funcsToNodes(StringFuncs);
export const Number = funcsToNodes(NumberFuncs);
export const Formula = funcsToNodes(FormulaFuncs);
export const TableOps = funcsToNodes(TableFuncs);
export const Date = funcsToNodes(DateFuncs);
export const Code = funcsToNodes(CodeFuncs);

function createPrimitiveNodeData(inputs, outputs) {
  const sources: Record<string, BehaviorSubject<any>> = {},
    sinks = {};

  for (const key in inputs) {
    sources[key] = new BehaviorSubject(null);
  }

  const allSources = Object.entries(sources);

  const combinedSources = combineLatest(
    ...allSources.map(([name, subj]) => subj),
    (...latestValues: any[]) => {
      return Object.fromEntries(
        allSources.map(([name], i) => [name, latestValues[i]]),
      );
    },
  );

  for (const key in outputs) {
    sinks[key] = combinedSources.pipe(
      map((latestVals) => outputs[key](latestVals)),
    );
  }

  return {
    sources,
    sinks,
  };
}

function funcsToNodes(
  funcs: Record<
    string,
    { inputs: any; outputs: Record<string, Function>; label: string }
  >,
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
        },
      },
    ]),
  );
}
