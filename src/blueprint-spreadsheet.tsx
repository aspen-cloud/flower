import React, { useState, useCallback, useEffect } from "react";
import {
  Column,
  Table,
  EditableCell,
  ColumnHeaderCell,
  RowHeaderCell,
  EditableName,
} from "@blueprintjs/table";
import { Menu, MenuItem } from "@blueprintjs/core";
import { nanoid } from "nanoid";
import { Table as DataTable } from "./types";

interface SpreadsheetProps {
  onDataUpdate?: (
    columnIds: TypedColumn[],
    rowData: Record<string, string>[],
  ) => void;
  initialData?: DataTable<any>;
}

enum DataType {
  Text = "text",
  Number = "number",
}

// Cleanup: this is basically a Column ... ported over from a different branch so that's why it wasnt changed
interface TypedColumn {
  id: string;
  label: string;
  type: DataType;
}

export default React.memo(function Spreadsheet({
  onDataUpdate,
  initialData,
}: SpreadsheetProps) {
  const [columnData, setColumnData] = useState<TypedColumn[]>([newColumn()]);
  const [rowData, setRowData] = useState<Record<string, string>[]>([{}]);

  function newColumn(accessor?: string, label?: string): TypedColumn {
    return {
      id: accessor || nanoid(),
      label: label || "",
      type: DataType.Text,
    };
  }

  useEffect(() => {
    if (!initialData) return;
    const columns = initialData.columns.map((c) =>
      newColumn(c.accessor, c.Header),
    );
    const rows = initialData.rows;

    setColumnData(columns);
    setRowData(rows);
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
      return (value) => {
        setRowData((prevRowData) => {
          const newRows = [...prevRowData];
          const colId = columnData[columnIndex].id;
          newRows[rowIndex][colId] = value;
          return newRows;
        });
      };
    },
    [columnData],
  );

  const cellRenderer = (rowIndex: number, columnIndex: number) => {
    const colId = columnData[columnIndex].id;
    const value = rowData[rowIndex] ? rowData[rowIndex][colId] : null;
    return (
      <EditableCell
        value={value == null ? "" : value}
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
                    const columnId = newColumnData[columnIndex + j].id;
                    if (rowIndex + i === newRows.length)
                      newRows.splice(newRows.length, 0, {});
                    newRows[rowIndex + i][columnId] = cellValue;
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

  const columnNameSetter = (columnIndex: number, type: string) => {
    return (value) => {
      setColumnData((prevColumnData) => {
        const newColumnData = [...prevColumnData];
        newColumnData[columnIndex].label = value;
        return newColumnData;
      });
    };
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
            {/* <MenuItem text="Select type">
              {Object.keys(DataType).map((k) => (
                <MenuItem
                  key={k}
                  active={columnData[columnIndex].type === DataType[k]}
                  text={k}
                  onClick={() =>
                    // TODO: change underlying data or always parse as string?
                    setColumnData((prevColumnData) => {
                      const newColumnData = [...prevColumnData];
                      newColumnData[columnIndex].type = DataType[k];
                      return newColumnData;
                    })
                  }
                />
              ))}
            </MenuItem> */}
          </Menu>
        );
      };

      const nameRenderer = (name: string) => {
        return (
          <EditableName
            name={name}
            // onChange={columnNameSetter(columnIndex, "CHANGE")}
            onCancel={columnNameSetter(columnIndex, "CANCEL")}
            onConfirm={columnNameSetter(columnIndex, "CONFIRM")}
            placeholder={(columnIndex + 1).toString()}
          />
        );
      };

      const column = columnData[columnIndex];
      return (
        <ColumnHeaderCell
          name={column.label}
          menuRenderer={menuRenderer}
          nameRenderer={nameRenderer}
        />
      );
    };
    return (
      <Column
        cellRenderer={cellRenderer}
        columnHeaderCellRenderer={columnHeaderCellRenderer}
        id={columnData[columnIndex].id}
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
          const columnId = columnData[columnIndex].id;
          const cellData = rowData[rowIndex][columnId];
          return cellData;
        }}
        rowHeaderCellRenderer={rowHeaderCellRenderer}
      >
        {[...Array(columnData.length).keys()].map(columnRenderer)}
      </Table>
    </>
  );
});
