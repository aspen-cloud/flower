import React, { useEffect, useState } from "react";
import XLSX from "xlsx";
import { BehaviorSubject } from "rxjs";
import BaseNode from "../../base-node";
import { GraphNode, Table } from "../../types";
import DataTable from "./standard/table-node/data-table";

interface WriterNodeIO {
  sources: {
    table: BehaviorSubject<Table<any>>;
  };
  sinks: {
    output: BehaviorSubject<Table<any>>;
  };
}

const WriterNode: GraphNode<WriterNodeIO> = {
  initializeStreams: () => {
    const tableStream = new BehaviorSubject({ rows: [], columns: [] });
    return {
      sources: {
        table: tableStream,
      },
      sinks: {
        output: tableStream,
      },
    };
  },
  Component: ({ data: { sources, sinks } }) => {
    const [table, setTable] = useState({ rows: [], columns: [] });
    const [fileHandle, setFileHandle] = useState<FileSystemFileHandle>();
    useEffect(() => {
      const subscription = sinks.output.subscribe(async (newTable) => {
        setTable({
          // @ts-ignore
          rows: newTable?.rows || [],
          // @ts-ignore
          columns: newTable?.columns || [],
        });

        if (fileHandle && newTable) {
          const writable = await fileHandle.createWritable();
          const ws = XLSX.utils.json_to_sheet(newTable.rows);
          const csv = XLSX.utils.sheet_to_csv(ws);
          const buf = new ArrayBuffer(csv.length);
          const view = new Uint8Array(buf);
          for (let i = 0; i != csv.length; ++i)
            view[i] = csv.charCodeAt(i) & 0xff;

          await writable.write(buf);
          await writable.close();
        }
      });
      return () => {
        subscription.unsubscribe();
      };
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

export default WriterNode;
