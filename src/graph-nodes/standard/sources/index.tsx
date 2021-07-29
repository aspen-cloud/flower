import { EditableText, Icon } from "@blueprintjs/core";
import { css } from "@emotion/css";
import { useCallback, useMemo, useState } from "react";
import { boolean, defaulted, number, string } from "superstruct";
import BaseNode from "../../../components/base-node";
import ResizableNode from "../../../components/resizable-node";
import { TableStruct } from "../../../structs";

const Text = {
  sources: {
    text: defaulted(string(), ""),
  },
  outputs: {
    text: ({ text }) => text,
  },
  Component: ({ selected, data: { sources, outputs }, size, id }) => {
    // TODO: improve resizing defaults (would be great to take text size or changes into account)
    return (
      <ResizableNode
        sources={{}}
        sinks={outputs}
        className={`${selected ? "nowheel nodrag" : ""}`}
        height={size?.height || 20}
        width={size?.width || 200}
        nodeId={id}
        label="Text"
      >
        <textarea
          value={sources.text.value}
          onChange={(e) => sources.text.set(e.target.value)}
          placeholder="Enter text..."
          style={{
            width: "100%",
            height: "100%",
            resize: "none",
          }}
        />
      </ResizableNode>
    );
  },
};

const Number = {
  sources: {
    number: defaulted(number(), 0),
  },
  outputs: {
    number: ({ number }) => number,
  },
  Component: ({ data: { sources, outputs } }) => {
    return (
      <BaseNode label="Number" sources={{}} sinks={outputs}>
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
    table: ({ table }) => table,
  },
  Component: ({ data: { sources, outputs } }) => {
    const [draftLabel, setDraftLabel] = useState(sources.label.value);
    return (
      <BaseNode label="Data Table" sources={{}} sinks={outputs}>
        <div>
          <div
            className={css`
              margin: 5px 0;
            `}
          >
            <Icon
              icon="th"
              className={css`
                margin-right: 5px;
                color: #5c7080;
              `}
            />
            <EditableText
              className={"nodrag"}
              value={draftLabel}
              onChange={(val) => setDraftLabel(val)}
              onConfirm={(newName) => {
                sources.label.set(newName);
              }}
            />
          </div>
          <div
            className={css`
              font-size: 0.6em;
              display: flex;
              align-items: center;
              color: #5c7080;

              span {
                margin-right: 5px;
              }
            `}
          >
            {/* TODO Fails on paste */}
            <span>{outputs.table?.rows.length} rows</span>
            <span>{outputs.table?.columns.length} columns</span>
          </div>
        </div>
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
      <BaseNode label="Error" sources={{}} sinks={data.outputs}>
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
