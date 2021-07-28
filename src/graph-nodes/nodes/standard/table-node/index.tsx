import React, { useEffect, useState } from "react";
import BaseNode from "../../../../base-node";
import { GraphNode, Table } from "../../../../types";
import DataTable from "./data-table";
import { BehaviorSubject } from "rxjs";

interface TableNodeIO {
  sources: {
    table: BehaviorSubject<Table>;
  };
  sinks: {
    output: BehaviorSubject<Table>;
  };
}

const TableNode: GraphNode<TableNodeIO> = {
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
    useEffect(() => {
      const subscription = sinks.output.subscribe(setTable);
      return () => subscription.unsubscribe();
    }, [sources.table]);
    return (
      <BaseNode sources={sources} sinks={sinks}>
        <DataTable data={table.rows} columns={table.columns} />
      </BaseNode>
    );
  },
};

export default TableNode;
