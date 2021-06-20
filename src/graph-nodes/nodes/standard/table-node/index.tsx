import { Property } from "kefir";
import React, { useEffect, useState } from "react";
import BaseNode from "../../../../base-node";
import KefirBus from "../../../../utils/kefir-bus";
import { GraphNode, Table } from "../../../../types";
import DataTable from "./data-table";

interface TableNodeIO {
  sources: {
    table: KefirBus<Table<any>, void>;
  };
  sinks: {
    output: Property<Table<any>, void>;
  };
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
        },
        end: (...val) => {
          console.log("completed", val);
        },
      });
      return subscription.unsubscribe;
      // plainly pipe input to output
      // sinks.output.remember(sources.table);
    }, [sinks.output]);
    return (
      <BaseNode sources={sources} sinks={sinks}>
        <DataTable data={table.rows} columns={table.columns} />
      </BaseNode>
    );
  },
};

export default TableNode;
