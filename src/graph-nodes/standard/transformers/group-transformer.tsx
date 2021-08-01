import { array, defaulted, enums, Infer, object, string } from "superstruct";
import { useCallback, useMemo, useState } from "react";
import BaseNode from "../../../components/base-node";
import { TableStruct } from "../../../structs";
import { RowValue, Table } from "../../../types";
import { parseRow } from "../../../utils/tables";
import { NodeClass } from "../../../prograph";

enum AggregateFunction {
  SUM = "SUM",
  AVG = "AVG",
  COUNT = "COUNT",
}

const ColumnSelectionStruct = object({
  aggregateFunction: enums(Object.keys(AggregateFunction)),
  columnAccessor: string(),
});
type GroupSelection = Infer<typeof ColumnSelectionStruct>;

// Returns rows (data) that have a specific value of some column (key)
function groupBy(data: Record<string, RowValue>[], groupKeys: string[]) {
  const groupDict: Record<string, Record<string, RowValue>[]> = {};
  for (const item of data) {
    const dictKey = JSON.stringify(
      groupKeys.reduce((currentObj, key) => {
        currentObj[key] = item[key];
        return currentObj;
      }, {}),
    );
    if (!(dictKey in groupDict)) {
      groupDict[dictKey] = [];
    }
    groupDict[dictKey].push(item);
  }

  return Object.entries(groupDict).map(([key, val]) => ({
    key: JSON.parse(key) as Record<string, RowValue>,
    data: val,
  }));
}

function aggregate(func: AggregateFunction, values: RowValue[]) {
  if (func === AggregateFunction.SUM) {
    return values.reduce(
      (currentAggregate, nextItem) =>
        currentAggregate + +nextItem.underlyingValue,
      0,
    );
  }
  if (func === AggregateFunction.AVG) {
    return values.reduce(
      (currentAggregate, nextItem, _, arr) =>
        currentAggregate + +nextItem.underlyingValue / arr.length,
      0,
    );
  }
  if (func === AggregateFunction.COUNT) {
    return values.reduce(
      (currentAggregate, nextItem) =>
        currentAggregate + (!!nextItem.underlyingValue ? 1 : 0),
      0,
    );
  }

  return 0;
}

// TODO: custom aggregate functions
const Group: NodeClass = {
  inputs: {
    table: defaulted(TableStruct, {}),
  },
  sources: {
    columnSelections: defaulted(array(ColumnSelectionStruct), []),
    groupColumns: defaulted(array(string()), []),
  },
  outputs: {
    table: {
      func: ({
        table,
        columnSelections,
        groupColumns,
      }: {
        table: Table;
        columnSelections: GroupSelection[];
        groupColumns: string[];
      }) => {
        const columnMap = Object.fromEntries(
          table.columns.map((c) => [c.accessor, c]),
        );
        const columnSelectionName = (columnSelection: GroupSelection) =>
          `${columnSelection.aggregateFunction}-${
            columnMap[columnSelection.columnAccessor].Header
          }`;

        const columns = table.columns
          .filter((c) => groupColumns.includes(c.accessor))
          .concat(
            columnSelections.map((columnSelection) => {
              const column = table.columns.find(
                (c) => c.accessor === columnSelection.columnAccessor,
              );
              return {
                ...column,
                Header: columnSelectionName(columnSelection),
                accessor: columnSelectionName(columnSelection), // todo: nanoid or hash?
              };
            }),
          );

        const rows = groupBy(table.rows, groupColumns).map((groupData) => {
          const groupByColumnsFilled = Object.entries(groupData.key).reduce(
            (rowData, nextGroupByValue) => {
              const [colId, value] = nextGroupByValue;
              rowData[colId] = value;
              return rowData;
            },
            {},
          );

          const fullRows = columnSelections.reduce(
            (rowData, nextAggregateValue) => {
              const column = columnMap[nextAggregateValue.columnAccessor];
              rowData[columnSelectionName(nextAggregateValue)] = parseRow(
                aggregate(
                  AggregateFunction[nextAggregateValue.aggregateFunction],
                  groupData.data.map(
                    (item) => item[nextAggregateValue.columnAccessor],
                  ),
                ).toString(),
                column.Type,
              );
              return rowData;
            },
            groupByColumnsFilled,
          );

          return fullRows;
        });

        return { columns, rows };
      },
      struct: TableStruct,
    },
  },
  Component: ({ data }) => {
    const columnSelections: GroupSelection[] = useMemo(
      () => data.sources.columnSelections.value,
      [data.sources.columnSelections],
    );
    const setColumnSelections = useCallback(
      (newColumnSelections) => {
        data.sources.columnSelections.set(newColumnSelections);
      },
      [data.sources.columnSelections],
    );

    const groupColumns: string[] = useMemo(
      () => data.sources.groupColumns.value,
      [data.sources.groupColumns],
    );
    const setGroupColumns = useCallback(
      (newGroupColumns) => {
        data.sources.groupColumns.set(newGroupColumns);
      },
      [data.sources.groupColumns],
    );

    const [newGroupColumnInput, setNewGroupColumnInput] = useState<string>();
    const [newColumnSelectionAccessor, setNewColumnSelectionAccessor] =
      useState<string>();
    const [newColumnselectionFunc, setNewColumnSelectionFunc] =
      useState<AggregateFunction>();

    const columnNameMap = useMemo(
      () =>
        (data.inputs.table.columns || []).reduce((currVal, nextVal) => {
          currVal[nextVal.accessor] = nextVal.Header;
          return currVal;
        }, {}),
      [data.inputs.table],
    );

    const columnOptions = useMemo(
      () => [
        <option value={""}> -- select a column -- </option>,
        ...data.inputs.table.columns.map((c) => (
          <option key={c.accessor} value={c.accessor}>
            {c.Header}
          </option>
        )),
      ],
      [data.inputs.table.columns],
    );

    return (
      <BaseNode
        label="Column Aggregator"
        sources={data.inputs}
        sinks={data.outputs}
      >
        <div
          style={{
            backgroundColor: "white",
            padding: "1em",
          }}
        >
          <div>
            <label>
              Aggregate:
              {columnSelections.map((selection, i) => (
                <div key={i}>
                  {columnNameMap[selection.columnAccessor]} -{" "}
                  <select
                    value={selection.aggregateFunction}
                    onChange={(e) => {
                      selection.aggregateFunction = e.target
                        .value as AggregateFunction;
                      setColumnSelections(columnSelections);
                    }}
                  >
                    {Object.entries(AggregateFunction).map(([key, val]) => (
                      <option key={key} value={val}>
                        {val}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() =>
                      setColumnSelections(
                        columnSelections.filter((cs) => cs !== selection),
                      )
                    }
                  >
                    Delete
                  </button>
                </div>
              ))}
              <div>
                <select
                  value={newColumnSelectionAccessor}
                  onChange={(e) =>
                    setNewColumnSelectionAccessor(e.target.value)
                  }
                >
                  {columnOptions}
                </select>
                <select
                  value={newColumnselectionFunc}
                  onChange={(e) =>
                    setNewColumnSelectionFunc(AggregateFunction[e.target.value])
                  }
                >
                  {[
                    <option value={""}> -- select a function -- </option>,
                    ...Object.entries(AggregateFunction).map(([key, val]) => (
                      <option key={key} value={val}>
                        {val}
                      </option>
                    )),
                  ]}
                </select>
                <button
                  onClick={() => {
                    if (!newColumnSelectionAccessor || !newColumnselectionFunc)
                      return;
                    if (
                      columnSelections.find(
                        (cs) =>
                          cs.columnAccessor === newColumnSelectionAccessor &&
                          cs.aggregateFunction === newColumnselectionFunc,
                      )
                    )
                      return;

                    setColumnSelections([
                      ...columnSelections,
                      {
                        aggregateFunction:
                          AggregateFunction[newColumnselectionFunc],
                        columnAccessor: newColumnSelectionAccessor,
                      },
                    ]);
                  }}
                >
                  Add
                </button>
              </div>
            </label>
          </div>
          <div>
            <label>
              By:
              {groupColumns.map((colAccessor, i) => (
                <div key={i}>
                  {columnNameMap[colAccessor]}
                  <button
                    onClick={() =>
                      setGroupColumns(
                        groupColumns.filter((gc) => gc !== colAccessor),
                      )
                    }
                  >
                    Delete
                  </button>
                </div>
              ))}
              <div>
                <select
                  value={newGroupColumnInput}
                  onChange={(e) => setNewGroupColumnInput(e.target.value)}
                >
                  {[
                    <option value={""}> -- select a column -- </option>,
                    ...data.inputs.table.columns
                      .filter((c) => !groupColumns.includes(c.Header))
                      .map((c) => (
                        <option key={c.accessor} value={c.accessor}>
                          {c.Header}
                        </option>
                      )),
                  ]}
                </select>
                <button
                  onClick={() => {
                    if (!newGroupColumnInput) return;
                    setGroupColumns(
                      Array.from(
                        new Set([...groupColumns, newGroupColumnInput]),
                      ),
                    );
                  }}
                >
                  Add
                </button>
              </div>
            </label>
          </div>
        </div>
      </BaseNode>
    );
  },
};

export default Group;
