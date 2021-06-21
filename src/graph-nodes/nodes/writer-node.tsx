import { Property } from "kefir";
import React, { useEffect, useState } from "react";
import XLSX from "xlsx";
import BaseNode from "../../base-node";
import KefirBus from "../../utils/kefir-bus";
import { GraphNode, Table } from "../../types";
import DataTable from "./standard/table-node/data-table";

interface TableNodeIO {
  sources: {
    table: KefirBus<Table<any>, void>;
  };
  sinks: {
    output: Property<Table<any>, void>;
  };
  // internals: {
  //   fileHandle:
  // }
}

const TableNode: GraphNode<TableNodeIO> = {
  initializeStreams: () => {
    const tableStream = new KefirBus<Table<any>, void>("table");
    return {
      sources: {
        table: tableStream,
      },
      sinks: {
        output: tableStream.stream.toProperty(),
      },
    };
  },
  Component: ({ data: { sources, sinks } }) => {
    const [table, setTable] = useState({ rows: [], columns: [] });
    const [fileHandle, setFileHandle] = useState(null);
    useEffect(() => {
      const subscription = sinks.output.observe({
        value: (newTable) => {
          console.log("new table", newTable);
          setTable({
            // @ts-ignore
            rows: newTable?.rows || [],
            // @ts-ignore
            columns: newTable?.columns || [],
          });
          console.log(fileHandle);
          if (fileHandle && newTable) {
            (async () => {
              const writable = await fileHandle.createWritable();
              const ws = XLSX.utils.json_to_sheet(newTable.rows);
              const csv = XLSX.utils.sheet_to_csv(ws);
              const buf = new ArrayBuffer(csv.length);
              const view = new Uint8Array(buf);
              for (let i = 0; i != csv.length; ++i)
                view[i] = csv.charCodeAt(i) & 0xff;

              // Write the contents of the file to the stream.
              await writable.write(buf);
              await writable.close();
            })();
          }
        },
        end: (...val) => {
          console.log("completed", val);
        },
      });
      return subscription.unsubscribe;
      // plainly pipe input to output
      // sinks.output.remember(sources.table);
    }, [sinks.output, fileHandle]);
    return (
      <BaseNode sources={sources} sinks={sinks}>
        <DataTable data={table.rows} columns={table.columns} />
        {fileHandle ? (
          <div>{fileHandle.name}</div>
        ) : (
          <button
            onClick={async () => {
              const handle = await window.showSaveFilePicker();
              setFileHandle(handle);
            }}
          >
            Select File
          </button>
        )}
      </BaseNode>
    );
  },
};

export default TableNode;
