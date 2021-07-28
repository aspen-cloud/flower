import React, { useState } from "react";
import BaseNode from "../../base-node";
import {
  GraphNode,
  Table as DataTable,
  Column as DataColumn,
} from "../../types";
import { BehaviorSubject } from "rxjs";
import Spreadsheet from "../../blueprint-spreadsheet";
import { Resizable } from "re-resizable";
import { csvToJson } from "../../utils/files";
import { jsonToTable } from "../../utils/tables";
import { nanoid } from "nanoid";

interface SpreadsheetNodeIO {
  sources: {};
  sinks: {
    output: BehaviorSubject<DataTable>;
  };
}

const SpreadsheetNode: GraphNode<SpreadsheetNodeIO> = {
  initializeStreams: function ({ initialData }): SpreadsheetNodeIO {
    return {
      sources: {
        label: new BehaviorSubject(initialData?.label || ""),
      },
      sinks: {
        output: new BehaviorSubject(
          initialData?.data || { columns: [], rows: [] },
        ),
      },
    };
  },

  Component: function ({
    data: { sources, sinks },
    selected,
  }: {
    data: SpreadsheetNodeIO;
    selected: boolean;
  }) {
    const [width, setWidth] = useState(500);
    const [height, setHeight] = useState(500);

    const onResizeStop = (e, direction, ref, d) => {
      setHeight((prev) => prev + d.height);
      setWidth((prev) => prev + d.width);
    };

    return (
      <BaseNode
        sources={sources}
        sinks={sinks}
        className={`${selected ? "nowheel nodrag" : ""}`}
      >
        {/* Can maybe use resizeRatio prop to deal with canvas scale changes */}
        <Resizable size={{ width, height }} onResizeStop={onResizeStop}>
          <Spreadsheet
            onDataUpdate={(columnIds, rowData) => {
              // const [columnsData, ...rowsData] = rowData;
              // const columnIdIndex = Object.fromEntries(
              //   columnIds.map((columnId, i) => [columnId, i]),
              // );
              // const tableColumns: DataColumn[] = columnIds.map(
              //   (columnId, i) => ({
              //     accessor: columnsData[columnId] ?? columnId,
              //     Header: columnsData[columnId] ?? columnId,
              //   }),
              // );
              // const tableRows = rowsData.map((row) =>
              //   Object.fromEntries(
              //     Object.entries(row)
              //       // TODO: for some reason lots of repeat values in rows
              //       .filter(([key, val]) => key in columnIdIndex)
              //       .map(([key, val]) => [
              //         tableColumns[columnIdIndex[key]].accessor,
              //         val,
              //       ]),
              //   ),
              // );
              // sinks.output.next({
              //   columns: tableColumns,
              //   rows: tableRows,
              // });
            }}
          />
          <button
            onClick={async () => {
              const [fileHandle] = await window.showOpenFilePicker({
                multiple: false,
              });
              const fileData = await fileHandle.getFile();
              const jsonData = await csvToJson(fileData);
              const tableData = jsonToTable(jsonData);

              const columnIndex = Object.fromEntries(
                tableData.columns.map((c, i) => [c.accessor, nanoid()]),
              );
              const coldata = [
                Object.fromEntries(
                  tableData.columns.map((c, i) => [
                    columnIndex[c.accessor],
                    c.accessor,
                  ]),
                ),
              ];
              const rowData = tableData.rows.map((r) =>
                Object.fromEntries(
                  Object.entries(r).map(([key, val]) => [
                    columnIndex[key],
                    val,
                  ]),
                ),
              );

              //@ts-ignore
              const rows = coldata.concat(rowData);
              const columns = Object.values(columnIndex);

              // TODO: Set data
              // setColumnIds(columns);
              // setRowData(rows);
            }}
          >
            Import data
          </button>
        </Resizable>
      </BaseNode>
    );
  },
};

export default SpreadsheetNode;
