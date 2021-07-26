import { useCallback, useEffect, useMemo, useState } from "react";
import { boolean, defaulted, nullable, number, string } from "superstruct";
import BaseNode from "../../../base-node";
import { TableStruct } from "../../../structs";

const Text = {
  sources: {
    text: defaulted(string(), ""),
  },
  outputs: {
    text:
      () =>
      ({ text }) =>
        text,
  },
  Component: ({ data: { sources, outputs } }) => {
    return (
      <BaseNode sources={{}} sinks={outputs}>
        <input
          value={sources.text.value}
          onChange={(e) => sources.text.set(e.target.value)}
        />
      </BaseNode>
    );
  },
};

const Number = {
  sources: {
    number: defaulted(number(), 0),
  },
  outputs: {
    number:
      () =>
      ({ number }) =>
        number,
  },
  Component: ({ data: { sources, outputs } }) => {
    return (
      <BaseNode sources={{}} sinks={outputs}>
        <input
          type="number"
          value={sources.number.value}
          onChange={(e) => sources.number.set(+e.target.value)}
        />
      </BaseNode>
    );
  },
};

const DataTable = {
  sources: {
    label: defaulted(string(), ""),
    table: defaulted(TableStruct, {}),
  },
  outputs: {
    table:
      () =>
      ({ table }) =>
        table,
  },
  Component: ({ data: { sources, outputs } }) => {
    return (
      <BaseNode sources={{}} sinks={outputs}>
        <figure style={{ textAlign: "center" }}>
          <img
            style={{
              userSelect: "none",
              pointerEvents: "none",
            }}
            width="50px"
            src="/database.svg"
          />
          <figcaption style={{ backgroundColor: "#dedede", padding: "0 1em" }}>
            {/* TODO: make editable */}
            {sources.label.value}
          </figcaption>
        </figure>
      </BaseNode>
    );
  },
};

const ErrorNode = {
  sources: {
    hasError: defaulted(boolean(), false),
  },
  outputs: {
    result: ({ hasError }) => {
      if (hasError) throw new Error("GAH!");
      return "foo";
    },
  },
  Component: ({ data }) => {
    const hasError = useMemo(
      () => data.sources.hasError.value,
      [data.sources.hasError],
    );
    const setHasError = useCallback(
      (val) => data.sources.hasError.set(val),
      [data.sources.hasError],
    );
    return (
      <BaseNode sources={{}} sinks={data.outputs}>
        <div>I will {hasError ? "" : "not"} throw an error</div>
        <button onClick={() => setHasError(!hasError)}>Toggle</button>
      </BaseNode>
    );
  },
};

export default {
  Text,
  Number,
  DataTable,
  ErrorNode,
};
