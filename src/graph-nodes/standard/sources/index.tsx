import { EditableText, Icon, Spinner } from "@blueprintjs/core";
import { css } from "@emotion/css";
import { useCallback, useEffect, useMemo, useState } from "react";
import BaseNode from "../../../components/base-node";
import ResizableNode from "../../../components/resizable-node";
import { registerNode, ValueTypes } from "../../../node-type-manager";
import useDataManager from "../../../hooks/use-data-manager";
import { Doc } from "yjs";

const Text = registerNode({
  inputs: {},
  sources: {
    text: ValueTypes.STRING,
  },
  outputs: {
    text: { func: ({ text }) => text, returns: ValueTypes.STRING },
  },
  Component: ({
    selected,
    data: {
      sources,
      outputs,
      metadata: { size },
    },
    id,
  }) => {
    // TODO: improve resizing defaults (would be great to take text size or changes into account)
    return (
      <ResizableNode
        sources={{}}
        sinks={outputs}
        className={`${selected ? "nowheel" : ""}`}
        height={size?.height || 20}
        width={size?.width || 200}
        nodeId={id}
        label="Text"
      >
        <textarea
          className="nodrag"
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
});

const Number = registerNode({
  inputs: {},
  sources: {
    number: ValueTypes.NUMBER,
  },
  outputs: {
    number: { func: ({ number }) => number, returns: ValueTypes.NUMBER },
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
});

const DataTable = registerNode({
  inputs: {},
  sources: {
    label: ValueTypes.STRING,
    table: ValueTypes.TABLE,
    sourceLabel: ValueTypes.STRING,
    docId: ValueTypes.STRING,
  },
  outputs: {
    table: {
      func: ({ table }) => table,
      returns: ValueTypes.TABLE,
    },
  },
  Component: ({ data: { sources, outputs } }) => {
    const [draftLabel, setDraftLabel] = useState(sources.label.value);
    const dataManager = useDataManager();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      let tableDoc: Doc;
      let onTableDocUpdate: Function;
      let onTableSubdocs: Function;
      let tableDataDoc: Doc;
      let onTableDataDocUpdate: Function;

      // This is all a bit hacky to say the least
      (async () => {
        let docId = sources.docId.value;
        // Creating an empty table may not have a doc assigned
        if (!docId) {
          docId = await dataManager.newTable({
            columns: [],
            rows: [],
          });
          sources.docId.set(docId);
        }

        tableDoc = await dataManager.getTable(docId);

        // Handle relevant UI updates for table metadata
        const updateTable = () => {
          sources.sourceLabel.set(tableDoc.getMap("metadata").get("label"));
        };
        onTableDocUpdate = () => updateTable();
        tableDoc.on("update", onTableDocUpdate);

        tableDataDoc = tableDoc.getMap().get("tableData");

        // Run once we know we have data
        const onTableDataDoc = () => {
          // Update table data on docuent updates
          const updateTableData = () => {
            sources.table.set({
              columns: tableDataDoc.getArray("columns").toArray(),
              rows: tableDataDoc.getArray("rows").toArray(),
            });
          };
          onTableDataDocUpdate = () => {
            updateTableData();
            setLoading(false);
          };
          tableDataDoc.on("update", onTableDataDocUpdate);

          // Using share.size as proxy for if any data has loaded
          if (tableDataDoc?.share?.size) {
            updateTable();
            updateTableData();
            setLoading(false);
          }
          tableDataDoc.load();
        };

        // If table data is already available
        if (tableDataDoc) {
          onTableDataDoc();
        }

        // If data is not already available (ie hasnt synced, wait for subdoc to load)
        onTableSubdocs = ({
          loaded,
          added,
          removed,
        }: {
          loaded: Set<Doc>;
          added: Set<Doc>;
          removed: Set<Doc>;
        }) => {
          if (!tableDataDoc && Array.from(added).length) {
            tableDataDoc = Array.from(added)[0];
            onTableDataDoc();
          }
        };

        tableDoc.on("subdocs", onTableSubdocs);
      })();

      return () => {
        if (tableDoc && onTableDocUpdate)
          tableDoc.off("update", onTableDocUpdate);
        if (tableDoc && onTableSubdocs) tableDoc.off("subdocs", onTableSubdocs);
        if (tableDataDoc && onTableDataDocUpdate)
          tableDataDoc.off("update", onTableDataDocUpdate);
      };
    }, []);

    return (
      <BaseNode label="Data Table" sources={{}} sinks={outputs}>
        {loading ? (
          <Spinner intent="primary" />
        ) : (
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
                className={"nodrag nodoubleclick"}
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
                flex-direction: column;
                align-items: center;
                color: #5c7080;

                span {
                  margin-right: 5px;
                }
              `}
            >
              <div>Data source: {sources.sourceLabel.value}</div>
              <div>
                {/* TODO Fails on paste */}
                <span>{outputs.table?.rows.length} rows</span>
                <span>{outputs.table?.columns.length} columns</span>
              </div>
            </div>
          </div>
        )}
      </BaseNode>
    );
  },
});

const ErrorNode = registerNode({
  inputs: {},
  sources: {
    hasError: ValueTypes.BOOLEAN,
  },
  outputs: {
    result: {
      func: ({ hasError }) => {
        if (hasError) throw new Error("GAH!");
        return "foo";
      },
      returns: ValueTypes.STRING,
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
});

export default {
  Text,
  Number,
  DataTable,
  ErrorNode,
};
