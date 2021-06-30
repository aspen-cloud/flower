import { useState, useCallback, useEffect } from "react";
import {
  Column,
  Table,
  EditableCell,
  ColumnHeaderCell,
  RowHeaderCell,
} from "@blueprintjs/table";
import { Menu, MenuItem } from "@blueprintjs/core";
import { csvToJson } from "./utils/files";
import { jsonToTable } from "./utils/tables";
import { nanoid } from "nanoid";

interface SpreadsheetProps {
  onDataUpdate?: (
    columnIds: string[],
    rowData: Record<string, string>[],
  ) => void;
}

// TODO: bulk delete
export default function Spreadsheet({ onDataUpdate }: SpreadsheetProps) {
  const [columnIds, setColumnIds] = useState<string[]>([nanoid()]);
  const [rowData, setRowData] = useState<Record<string, string>[]>([{}]);

  useEffect(() => {
    onDataUpdate(columnIds, rowData);
  }, [rowData, columnIds, onDataUpdate]);

  function insertRow(rowIndex: number) {
    setRowData((prevRowData) => {
      prevRowData.splice(rowIndex, 0, {});
      return [...prevRowData];
    });
  }

  function deleteRow(rowIndex: number) {
    setRowData((prevRowData) => {
      if (prevRowData.length > 1) prevRowData.splice(rowIndex, 1);
      return [...prevRowData];
    });
  }

  function insertColumn(columnIndex: number) {
    setColumnIds((prevColumnData) => {
      prevColumnData.splice(columnIndex, 0, nanoid());
      return [...prevColumnData];
    });
  }

  function deleteColumn(columnIndex: number) {
    setColumnIds((prevColumnData) => {
      if (prevColumnData.length > 1) prevColumnData.splice(columnIndex, 1);
      return [...prevColumnData];
    });
  }

  const cellSetter = useCallback(
    (rowIndex: number, columnIndex: number, type: string) => {
      return (value) => {
        setRowData((prevRowData) => {
          const newRows = [...prevRowData];
          const colId = columnIds[columnIndex];
          newRows[rowIndex][colId] = value;
          return newRows;
        });
      };
    },
    [columnIds],
  );

  // TODO: better handling of focus loss (impacting omnibar)
  const cellRenderer = (rowIndex: number, columnIndex: number) => {
    const colId = columnIds[columnIndex];
    const value = rowData[rowIndex] ? rowData[rowIndex][colId] : null;
    return (
      <EditableCell
        value={value == null ? "" : value}
        onCancel={cellSetter(rowIndex, columnIndex, "CANCEL")}
        onChange={cellSetter(rowIndex, columnIndex, "CHANGE")}
        onConfirm={cellSetter(rowIndex, columnIndex, "CONFIRM")}
        onKeyDown={async (e) => {
          // stop propagation from triggering omnibar
          if (e.key === "n") e.stopPropagation();

          if (e.metaKey && e.key === "v") {
            e.preventDefault();
            const clipboardData = await navigator.clipboard.readText();
            const matrixData = clipboardData
              .split("\n")
              .map((line) => line.split("\t"));
            setColumnIds((prevColumnIds) => {
              const newColumnIds = [...prevColumnIds];
              const newColsNeeded =
                columnIndex + matrixData[0].length - newColumnIds.length;
              if (newColsNeeded > 0) {
                newColumnIds.splice(
                  newColumnIds.length,
                  0,
                  ...Array(newColsNeeded)
                    .fill(0)
                    .map(() => nanoid()),
                );
              }
              setRowData((prevRowData) => {
                const newRows = [...prevRowData];
                matrixData.forEach((row, i) => {
                  row.forEach((cellValue, j) => {
                    const columnId = newColumnIds[columnIndex + j];
                    if (rowIndex + i === newRows.length)
                      newRows.splice(newRows.length, 0, {});
                    newRows[rowIndex + i][columnId] = cellValue;
                  });
                });
                return newRows;
              });
              return newColumnIds;
            });
          }

          if (
            (e.key === "ArrowRight" || e.key === "Tab") &&
            columnIndex === columnIds.length - 1
          ) {
            insertColumn(columnIndex + 1);
          }

          if (
            (e.key === "ArrowDown" || e.key === "Enter") &&
            rowIndex === rowData.length - 1
          ) {
            insertRow(rowIndex + 1);
          }

          // TODO: monitor if in edit mode
          // if (e.key === "Backspace") {
          //   e.stopPropagation();
          //   setRowData((prevRowData) => {
          //     const newRows = [...prevRowData];
          //     const colId = columnIds[columnIndex];
          //     delete newRows[rowIndex][colId];
          //     return newRows;
          //   });
          // }
        }}
      />
    );
  };
  const columnRenderer = (columnIndex: number) => {
    const columnHeaderCellRenderer = () => {
      const menuRenderer = () => {
        return (
          <Menu>
            <MenuItem
              text="Insert left"
              onClick={() => {
                insertColumn(columnIndex);
              }}
            />
            <MenuItem
              text="Insert right"
              onClick={() => {
                insertColumn(columnIndex + 1);
              }}
            />
            <MenuItem
              text="Delete column"
              onClick={() => {
                deleteColumn(columnIndex);
              }}
            />
          </Menu>
        );
      };

      return (
        <ColumnHeaderCell
          name={(columnIndex + 1).toString()}
          menuRenderer={menuRenderer}
        />
      );
    };
    return (
      <Column
        cellRenderer={cellRenderer}
        columnHeaderCellRenderer={columnHeaderCellRenderer}
        id={columnIds[columnIndex]}
      />
    );
  };

  const rowHeaderCellRenderer = (rowIndex: number) => {
    const menuRenderer = () => {
      return (
        <Menu>
          <MenuItem
            text="Insert above"
            onClick={() => {
              insertRow(rowIndex);
            }}
          />
          <MenuItem
            text="Insert below"
            onClick={() => {
              insertRow(rowIndex + 1);
            }}
          />
          <MenuItem
            text="Delete row"
            onClick={() => {
              deleteRow(rowIndex);
            }}
          />
        </Menu>
      );
    };
    return (
      <RowHeaderCell
        menuRenderer={menuRenderer}
        name={(rowIndex + 1).toString()}
      />
    );
  };

  return (
    <>
      <Table
        numRows={rowData.length}
        enableFocusedCell={true}
        enableColumnReordering={true}
        enableRowReordering={true}
        onColumnsReordered={(oldIndex, newIndex, length) => {
          setColumnIds((prevColumnIds) => {
            const newColIds = [...prevColumnIds];
            newColIds.splice(
              newIndex,
              0,
              ...newColIds.splice(oldIndex, length),
            );
            return newColIds;
          });
        }}
        onRowsReordered={(oldIndex, newIndex, length) => {
          setRowData((prevRowData) => {
            const newRowData = [...prevRowData];
            newRowData.splice(
              newIndex,
              0,
              ...newRowData.splice(oldIndex, length),
            );
            return newRowData;
          });
        }}
        getCellClipboardData={(rowIndex, columnIndex) => {
          const columnId = columnIds[columnIndex];
          const cellData = rowData[rowIndex][columnId];
          return cellData;
        }}
        rowHeaderCellRenderer={rowHeaderCellRenderer}
      >
        {[...Array(columnIds.length).keys()].map(columnRenderer)}
      </Table>

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
              Object.entries(r).map(([key, val]) => [columnIndex[key], val]),
            ),
          );

          //@ts-ignore
          const rows = coldata.concat(rowData);
          const columns = Object.values(columnIndex);

          setColumnIds(columns);
          setRowData(rows);
        }}
      >
        Import data
      </button>
    </>
  );
}
