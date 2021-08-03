import React, { useState, useCallback, useEffect } from "react";
import {
  Column,
  Table,
  EditableCell,
  ColumnHeaderCell,
  RowHeaderCell,
  EditableName,
} from "@blueprintjs/table";
import { EditableText, Icon, Intent, Menu, MenuItem } from "@blueprintjs/core";
import { nanoid } from "nanoid";
import { Table as DataTable, Column as DataColumn, RowValue } from "../types";
import { parseRow } from "../utils/tables";
import { columnTypes } from "../column-parsers";

interface SpreadsheetProps {
  onDataUpdate?: (
    columnIds: DataColumn[],
    rowData: Record<string, RowValue>[],
  ) => void;
  initialData?: DataTable;
}

interface SpreadsheetCoordinates {
  columnIndex: number;
  rowIndex: number;
}

export default React.memo(function Spreadsheet({
  onDataUpdate,
  initialData,
}: SpreadsheetProps) {
  const [columnData, setColumnData] = useState<DataColumn[]>([newColumn()]);
  const [rowData, setRowData] = useState<Record<string, RowValue>[]>([{}]);
  const [editCoordinates, setEditCoordinates] = useState<
    SpreadsheetCoordinates | undefined
  >();

  function newColumn(accessor?: string, label?: string): DataColumn {
    return {
      accessor: accessor || nanoid(),
      Header: label || "",
      Type: "Text",
    };
  }

  useEffect(() => {
    if (!initialData) return;

    setColumnData(initialData.columns);
    setRowData(initialData.rows);
  }, [initialData]);

  useEffect(() => {
    // NOTE: probably best to avoid adding onDataUpdate as dep, may run the update with bad data and causes the data to get screwy
    if (onDataUpdate) onDataUpdate(columnData, rowData);
  }, [rowData, columnData]);

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
    setColumnData((prevColumnData) => {
      prevColumnData.splice(columnIndex, 0, newColumn());
      return [...prevColumnData];
    });
  }

  function deleteColumn(columnIndex: number) {
    setColumnData((prevColumnData) => {
      if (prevColumnData.length > 1) prevColumnData.splice(columnIndex, 1);
      return [...prevColumnData];
    });
  }

  const cellSetter = useCallback(
    (rowIndex: number, columnIndex: number, type: string) => {
      return (value: string) => {
        setRowData((prevRowData) => {
          const newRows = [...prevRowData];
          const { accessor: colId, Type: colType } = columnData[columnIndex];
          newRows[rowIndex][colId] = parseRow(value, colType);
          return newRows;
        });
      };
    },
    [columnData],
  );

  const cellRenderer = (rowIndex: number, columnIndex: number) => {
    const colId = columnData[columnIndex].accessor;
    const rowValue = rowData[rowIndex] ? rowData[rowIndex][colId] : null;
    const isEditing =
      editCoordinates?.rowIndex === rowIndex &&
      editCoordinates?.columnIndex === columnIndex;
    return (
      <EditableCell
        value={(isEditing ? rowValue?.writeValue : rowValue?.readValue) ?? ""}
        intent={rowValue?.error ? Intent.DANGER : Intent.NONE}
        onEditChange={(isEditing) =>
          isEditing
            ? setEditCoordinates({ columnIndex, rowIndex })
            : setEditCoordinates(undefined)
        }
        onCancel={cellSetter(rowIndex, columnIndex, "CANCEL")}
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
            setColumnData((prevColumnData) => {
              const newColumnData = [...prevColumnData];
              const newColsNeeded =
                columnIndex + matrixData[0].length - newColumnData.length;
              if (newColsNeeded > 0) {
                newColumnData.splice(
                  newColumnData.length,
                  0,
                  ...Array(newColsNeeded)
                    .fill(0)
                    .map(() => newColumn()),
                );
              }
              setRowData((prevRowData) => {
                const newRows = [...prevRowData];
                matrixData.forEach((row, i) => {
                  row.forEach((cellValue, j) => {
                    const { accessor: columnId, Type: columnType } =
                      newColumnData[columnIndex + j];
                    if (rowIndex + i === newRows.length)
                      newRows.splice(newRows.length, 0, {});
                    newRows[rowIndex + i][columnId] = parseRow(
                      cellValue,
                      columnType,
                    );
                  });
                });
                return newRows;
              });
              return newColumnData;
            });
          }

          if (
            (e.key === "ArrowRight" || e.key === "Tab") &&
            columnIndex === columnData.length - 1
          ) {
            insertColumn(columnIndex + 1);
          }

          if (
            (e.key === "ArrowDown" || e.key === "Enter") &&
            rowIndex === rowData.length - 1
          ) {
            insertRow(rowIndex + 1);
          }

          if (e.key === "Backspace") {
            if (!isEditing) {
              e.stopPropagation();
              setRowData((prevRowData) => {
                const newRows = [...prevRowData];
                const colId = columnData[columnIndex].accessor;
                delete newRows[rowIndex][colId];
                return newRows;
              });
            }
          }
        }}
      />
    );
  };

  const columnNameSetter = (columnIndex: number, type: string) => {
    return (value: string) => {
      setColumnData((prevColumnData) => {
        const newColumnData = [...prevColumnData];
        newColumnData[columnIndex].Header = value;
        return newColumnData;
      });
    };
  };

  const columnRenderer = (columnIndex: number) => {
    const columnHeaderCellRenderer = () => {
      const column = columnData[columnIndex];

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
            <MenuItem text="Select type">
              {Object.keys(columnTypes).map((t) => (
                <MenuItem
                  key={t}
                  active={columnData[columnIndex].Type === t}
                  text={t}
                  icon={columnTypes[t].icon}
                  onClick={() =>
                    setColumnData((prevColumnData) => {
                      const newColumnData = [...prevColumnData];
                      const column = newColumnData[columnIndex];
                      column.Type = t;
                      setRowData((prevRowData) => {
                        const newRowData = [...prevRowData];
                        newRowData.forEach(
                          (row) =>
                            (row[column.accessor] = parseRow(
                              row[column.accessor]?.writeValue,
                              t,
                            )),
                        );
                        return newRowData;
                      });
                      return newColumnData;
                    })
                  }
                />
              ))}
            </MenuItem>
          </Menu>
        );
      };

      const nameRenderer = (name: string) => {
        return (
          <div style={{ display: "flex", alignItems: "center" }}>
            <Icon
              icon={columnTypes[column.Type].icon}
              style={{ marginRight: "1em" }}
              iconSize={10}
            />
            <EditableName
              name={name}
              onCancel={columnNameSetter(columnIndex, "CANCEL")}
              onConfirm={columnNameSetter(columnIndex, "CONFIRM")}
            />
          </div>
        );
      };

      return (
        <ColumnHeaderCell
          name={column.Header}
          menuRenderer={menuRenderer}
          nameRenderer={nameRenderer}
        />
      );
    };
    return (
      <Column
        cellRenderer={cellRenderer}
        columnHeaderCellRenderer={columnHeaderCellRenderer}
        id={columnData[columnIndex].accessor}
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
        enableColumnInteractionBar={true}
        enableRowReordering={true}
        onColumnsReordered={(oldIndex, newIndex, length) => {
          setColumnData((prevColumnData) => {
            const newColIds = [...prevColumnData];
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
          const columnId = columnData[columnIndex].accessor;
          const cellData = rowData[rowIndex][columnId].writeValue;
          return cellData;
        }}
        rowHeaderCellRenderer={rowHeaderCellRenderer}
      >
        {[...Array(columnData.length).keys()].map(columnRenderer)}
      </Table>
    </>
  );
});
