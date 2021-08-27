import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import {
  Column,
  Table,
  EditableCell,
  ColumnHeaderCell,
  RowHeaderCell,
  EditableName,
} from "@blueprintjs/table";
import { Button, Icon, Intent, Menu, MenuItem } from "@blueprintjs/core";
import { nanoid } from "nanoid";
import { Table as DataTable, Column as DataColumn, RowValue } from "../types";
import { parseRow } from "../utils/tables";
import { columnTypes } from "../column-parsers";
import * as Y from "yjs";
import { WebrtcProvider } from "y-webrtc";
import * as awarenessProtocol from "y-protocols/awareness.js";

interface SpreadsheetProps {
  doc: Y.Doc;
}

interface SpreadsheetCoordinates {
  columnIndex: number;
  rowIndex: number;
}

export default React.memo(function Spreadsheet({ doc }: SpreadsheetProps) {
  const undoManager = useRef<Y.UndoManager>(null);
  const yOriginRef = useRef<string>(null);
  const yColumnsRef = useRef<Y.Array<DataColumn>>(null);
  const yRowsRef = useRef<Y.Array<Record<string, RowValue>>>(null);
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

  const [columnData, setColumnData] = useState<DataColumn[]>(
    doc.getArray<DataColumn>("columns").toArray(),
  );
  const [rowData, setRowData] = useState<Record<string, RowValue>[]>(
    doc.getArray<Record<string, RowValue>>("rows").toArray(),
  );

  useEffect(() => {
    yOriginRef.current = nanoid();
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      setColumnData(doc.getArray<DataColumn>("columns").toArray());
      setRowData(doc.getArray<Record<string, RowValue>>("rows").toArray());
    };
    doc.on("update", handleUpdate);
    return () => {
      doc.off("update", handleUpdate);
    };
  }, [doc]);

  useEffect(() => {
    yColumnsRef.current = doc.getArray("columns");
    yRowsRef.current = doc.getArray("rows");
    undoManager.current = new Y.UndoManager(
      [yColumnsRef.current, yRowsRef.current],
      {
        trackedOrigins: new Set([yOriginRef.current]),
      },
    );
  }, [doc]);

  function insertRow(rowIndex: number) {
    doc.transact(() => {
      yRowsRef.current.insert(rowIndex, [{}]);
    }, yOriginRef.current);
  }

  function deleteRow(rowIndex: number) {
    doc.transact(() => {
      yRowsRef.current.delete(rowIndex, 1);
    }, yOriginRef.current);
  }

  function insertColumn(columnIndex: number) {
    doc.transact(() => {
      yColumnsRef.current.insert(columnIndex, [newColumn()]);
    }, yOriginRef.current);
  }

  function deleteColumn(columnIndex: number) {
    doc.transact(() => {
      yColumnsRef.current.delete(columnIndex, 1);
    }, yOriginRef.current);
  }

  const cellSetter = useCallback(
    (rowIndex: number, columnIndex: number, type: string) => {
      return (value: string) => {
        const { accessor: colId, Type: colType } = columnData[columnIndex];
        const row = rowData[rowIndex];
        // TODO: easier way to just edit?
        doc.transact(() => {
          yRowsRef.current.delete(rowIndex, 1);
          yRowsRef.current.insert(rowIndex, [
            { ...row, [colId]: parseRow(value, colType) },
          ]);
        }, yOriginRef.current);
      };
    },
    [columnData, rowData, doc],
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
        }}
        editableTextProps={{
          confirmOnEnterKey: true,
          multiline: true,
        }}
      />
    );
  };

  const columnNameSetter = (columnIndex: number, type: string) => {
    return (value: string) => {
      const column = columnData[columnIndex];
      doc.transact(() => {
        yColumnsRef.current.delete(columnIndex, 1);
        yColumnsRef.current.insert(columnIndex, [{ ...column, Header: value }]);
      }, yOriginRef.current);
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
                  onClick={() => {
                    doc.transact(() => {
                      const col = yColumnsRef.current.get(columnIndex);
                      yColumnsRef.current.delete(columnIndex, 1);
                      yColumnsRef.current.insert(columnIndex, [
                        { ...col, Type: t },
                      ]);

                      yRowsRef.current.forEach((row, i) => {
                        yRowsRef.current.delete(i, 1);
                        yRowsRef.current.insert(i, [
                          {
                            ...row,
                            [col.accessor]: parseRow(
                              row[col.accessor].writeValue,
                              t,
                            ),
                          },
                        ]);
                      });
                    }, yOriginRef.current);
                  }}
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

  const addCellsOnEmpty = useCallback(() => {
    if (columnData.length === 0) {
      undoManager.current.stopCapturing();
      yColumnsRef.current.insert(0, [newColumn()]);
    }
    if (rowData.length === 0) {
      undoManager.current.stopCapturing();
      yRowsRef.current.insert(0, [{}]);
    }
  }, [columnData, rowData]);

  return (
    <>
      {columnData.length > 0 && rowData.length > 0 ? (
        <Table
          numRows={rowData.length}
          enableFocusedCell={true}
          enableColumnReordering={true}
          // Interaction bar not really necessary and causes formatting issues on 1 col 1 row tables (which is our default)
          // enableColumnInteractionBar={true}
          enableRowReordering={true}
          onColumnsReordered={(oldIndex, newIndex, length) => {
            doc.transact(() => {
              const cols = yColumnsRef.current.slice(
                oldIndex,
                oldIndex + length,
              );
              yColumnsRef.current.delete(oldIndex, length);
              yColumnsRef.current.insert(newIndex, cols);
            }, yOriginRef.current);
          }}
          onRowsReordered={(oldIndex, newIndex, length) => {
            doc.transact(() => {
              const rows = yRowsRef.current.slice(oldIndex, oldIndex + length);
              yRowsRef.current.delete(oldIndex, length);
              yRowsRef.current.insert(newIndex, rows);
            }, yOriginRef.current);
          }}
          getCellClipboardData={(rowIndex, columnIndex) => {
            const columnId = columnData[columnIndex].accessor;
            const cellData = rowData[rowIndex][columnId]?.writeValue;
            return cellData;
          }}
          rowHeaderCellRenderer={rowHeaderCellRenderer}
          additionalHotKeys={[
            {
              key: "delete-selection-hotkey",
              label: "Handle selection delete",
              combo: "backspace",
              onKeyDown: (e, props, state) => {
                e.stopPropagation();
                doc.transact(() => {
                  for (const region of state.selectedRegions ?? []) {
                    const [colMin, colMax] = region.cols ?? [
                      0,
                      columnData.length - 1,
                    ];
                    const [rowMin, rowMax] = region.rows ?? [
                      0,
                      yRowsRef.current.length - 1,
                    ];

                    for (let rIndex = rowMin; rIndex <= rowMax; rIndex++) {
                      const newRow = { ...yRowsRef.current.get(rIndex) };
                      for (let cIndex = colMin; cIndex <= colMax; cIndex++) {
                        delete newRow[yColumnsRef.current.get(cIndex).accessor];
                      }
                      yRowsRef.current.delete(rIndex, 1);
                      yRowsRef.current.insert(rIndex, [newRow]);
                    }
                  }
                }, yOriginRef.current);
              },
            },
            {
              key: "paste-hotkey",
              label: "Paste data to table",
              combo: "mod+v",
              onKeyDown: async (e, props, state) => {
                e.preventDefault();
                const clipboardData = await navigator.clipboard.readText();
                const matrixData = clipboardData
                  .split("\n")
                  .map((line) => line.split("\t"));

                const { col: columnIndex, row: rowIndex } = state.focusedCell;

                doc.transact(() => {
                  const newColsNeeded =
                    columnIndex +
                    matrixData[0].length -
                    yColumnsRef.current.length;
                  if (newColsNeeded > 0) {
                    yColumnsRef.current.insert(
                      yColumnsRef.current.length,
                      Array(newColsNeeded)
                        .fill(0)
                        .map(() => newColumn()),
                    );
                  }

                  matrixData.forEach((clipboardRow, i) => {
                    clipboardRow.forEach((cellValue, j) => {
                      const { accessor: columnId, Type: columnType } =
                        yColumnsRef.current.get(columnIndex + j);
                      const row = yRowsRef.current.get(rowIndex + i);
                      if (rowIndex + i < yRowsRef.current.length)
                        yRowsRef.current.delete(rowIndex + i, 1);
                      yRowsRef.current.insert(rowIndex + i, [
                        { ...row, [columnId]: parseRow(cellValue, columnType) },
                      ]);
                    });
                  });
                }, yOriginRef.current);
              },
            },
            {
              key: "undo-hotkey",
              label: "Undo change to table",
              combo: "mod+z",
              onKeyDown: (e) => {
                // if edit coordinates are set we are editing a cell
                if (!editCoordinates) {
                  undoManager.current.undo();
                }
              },
            },
            {
              key: "redo-hotkey",
              label: "Redo change to table",
              combo: "mod+shift+z",
              onKeyDown: (e) => {
                // if edit coordinates are set we are editing a cell
                if (!editCoordinates) {
                  undoManager.current.redo();
                }
              },
            },
            {
              key: "cell-new-line",
              label: "Add new line in cell",
              combo: "mod+enter",
              onKeyDown: (e, props, state) => {
                console.log(e, props, state);
              },
            },
          ]}
        >
          {[...Array(columnData.length).keys()].map(columnRenderer)}
        </Table>
      ) : (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
          }}
        >
          <Button intent="primary" onClick={() => addCellsOnEmpty()}>
            Add cells
          </Button>
        </div>
      )}
    </>
  );
});
