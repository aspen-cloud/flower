import { any, array, enums, object, string } from "superstruct";
import { useEffect, useState } from "react";
import BaseNode from "../../../base-node";

enum AggregateFunction {
  SUM = "SUM",
  AVG = "AVG",
  COUNT = "COUNT",
}

// TODO: custom aggregate functions?
interface GroupSelection {
  aggregateFunction: AggregateFunction;
  columnAccessor: string;
}

function groupBy(data: any[], groupKeys: string[]) {
  const groupDict: Record<string, any[]> = {};
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
    key: JSON.parse(key) as Record<string, string>,
    data: val,
  }));
}

function aggregate(func: AggregateFunction, values: string[]) {
  if (func === AggregateFunction.SUM) {
    return values.reduce(
      (currentAggregate, nextItem) => currentAggregate + +nextItem,
      0,
    );
  }
  if (func === AggregateFunction.AVG) {
    return values.reduce(
      (currentAggregate, nextItem, _, arr) =>
        currentAggregate + +nextItem / arr.length,
      0,
    );
  }
  if (func === AggregateFunction.COUNT) {
    return values.reduce(
      (currentAggregate, nextItem) => currentAggregate + (!!nextItem ? 1 : 0),
      0,
    );
  }

  return 0;
}

const Group = {
  inputs: {
    table: any(),
  },
  sources: {
    columnSelections: any(),
    groupColumns: any(),
  },
  outputs: {
    table: (inputData) => {
      const table = inputData.table || { columns: [], rows: [] };
      const groupColumns = inputData.groupColumns || [];
      const columnSelections = inputData.columnSelections || [];
      const columnNameMap = Object.fromEntries(
        table.columns.map((c) => [c.accessor, c.Header]),
      );
      const columnSelectionName = (columnSelection: GroupSelection) =>
        `${columnSelection.aggregateFunction}-${
          columnNameMap[columnSelection.columnAccessor]
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
              accessor: columnSelectionName(columnSelection),
            };
          }),
        );

      const rows = groupBy(table.rows, groupColumns).map((groupData) => {
        const obj = {};
        Object.entries(groupData.key).forEach(
          ([subKey, value]) => (obj[subKey] = value),
        );
        columnSelections.forEach((columnSelection) => {
          obj[columnSelectionName(columnSelection)] = aggregate(
            columnSelection.aggregateFunction,
            groupData.data.map((item) => item[columnSelection.columnAccessor]),
          );
        });

        return obj;
      });

      return { columns, rows };
    },
  },
  Component: ({ data }) => {
    const [columnSelections, setColumnSelections] = useState<GroupSelection[]>(
      data.sources.columnSelections?.value || [],
    );
    useEffect(() => {
      data.sources.columnSelections.set(columnSelections);
    }, [columnSelections, data.sources.columnSelections]);

    const [groupColumns, setGroupColumns] = useState<string[]>(
      data.sources.groupColumns?.value || [],
    );
    useEffect(() => {
      data.sources.groupColumns.set(groupColumns);
    }, [groupColumns, data.sources.groupColumns]);

    const [newGroupColumnInput, setNewGroupColumnInput] = useState<string>();
    const [newColumnSelectionAccessor, setNewColumnSelectionAccessor] =
      useState<string>();
    const [newColumnselectionFunc, setNewColumnSelectionFunc] =
      useState<AggregateFunction>();

    const table = data.inputs.table || { columns: [], rows: [] };
    const columnNameMap = Object.fromEntries(
      table.columns.map((c) => [c.accessor, c.Header]),
    );

    return (
      <BaseNode sources={data.inputs} sinks={data.outputs}>
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
                    onChange={(e) =>
                      setColumnSelections((prevColumnSelections) => {
                        selection.aggregateFunction = e.target
                          .value as AggregateFunction;
                        return [...prevColumnSelections];
                      })
                    }
                  >
                    {Object.entries(AggregateFunction).map(([key, val]) => (
                      <option key={key} value={val}>
                        {val}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() =>
                      setColumnSelections((prevColumnSelections) =>
                        prevColumnSelections.filter((cs) => cs !== selection),
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
                  {[
                    <option value={""}> -- select a column -- </option>,
                    ...table.columns.map((c) => (
                      <option key={c.accessor} value={c.accessor}>
                        {c.Header}
                      </option>
                    )),
                  ]}
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
                  onClick={() =>
                    setColumnSelections((prevColumnSelections) => {
                      if (
                        !newColumnSelectionAccessor ||
                        !newColumnselectionFunc
                      )
                        return prevColumnSelections;
                      if (
                        prevColumnSelections.find(
                          (cs) =>
                            cs.columnAccessor === newColumnSelectionAccessor &&
                            cs.aggregateFunction === newColumnselectionFunc,
                        )
                      )
                        return prevColumnSelections;

                      return [
                        ...prevColumnSelections,
                        {
                          aggregateFunction:
                            AggregateFunction[newColumnselectionFunc],
                          columnAccessor: newColumnSelectionAccessor,
                        },
                      ];
                    })
                  }
                >
                  Add
                </button>
              </div>
            </label>
          </div>
          <div>
            <label>
              By:
              {groupColumns.map((colName, i) => (
                <div key={i}>
                  {colName}
                  <button
                    onClick={() =>
                      setGroupColumns((prevGroupColumns) =>
                        prevGroupColumns.filter((gc) => gc !== colName),
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
                    ...table.columns
                      .filter((c) => !groupColumns.includes(c.Header))
                      .map((c) => (
                        <option key={c.accessor} value={c.accessor}>
                          {c.Header}
                        </option>
                      )),
                  ]}
                </select>
                <button
                  onClick={() =>
                    setGroupColumns((prevGroupColumns) => {
                      if (!newGroupColumnInput) return prevGroupColumns;
                      return [
                        ...new Set([...prevGroupColumns, newGroupColumnInput]),
                      ];
                    })
                  }
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
