import { defaulted, nullable, number, string } from "superstruct";
import BaseNode from "../../../base-node";
import { TableStruct } from "../../../structs";

const Text = {
  sources: {
    text: defaulted(string(), ""),
  },
  Component: ({ data: { sources } }) => {
    return (
      <BaseNode sources={{}} sinks={sources}>
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
  Component: ({ data: { sources } }) => {
    return (
      <BaseNode sources={{}} sinks={sources}>
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
  Component: ({ data: { sources } }) => {
    return (
      <BaseNode sources={{}} sinks={{ table: sources.table }}>
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

export default {
  Text,
  Number,
  DataTable,
};
