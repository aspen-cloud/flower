import React, { useEffect, useState } from "react";

import { GraphNode, Table } from "../../types";
import BaseNode from "../../components/base-node";
import { BehaviorSubject } from "rxjs";

interface GroupNodeIO {
  sources: {
    table: BehaviorSubject<Table>;
  };
  sinks: {
    output: BehaviorSubject<Table>;
  };
}

enum AggregateFunction {
  SUM = "SUM",
  AVG = "AVG",
  COUNT = "COUNT",
}

// TODO: custom aggregate functions?
interface GroupSelection {
  aggregateFunction: AggregateFunction;
  columnName: string;
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

export default {
  initializeStreams: function () {
    return {
      sources: {
        table: new BehaviorSubject({ columns: [], rows: [] } as Table),
      },
      sinks: {
        output: new BehaviorSubject({ columns: [], rows: [] } as Table),
      },
    };
  },
  Component: function ({ data }) {
    const [columnSelections, setColumnSelections] = useState<GroupSelection[]>(
      [],
    );
    const [groupColumns, setGroupColumns] = useState<string[]>([]);

    useEffect(() => {
      const table = data.sources.table.value;
      const columnSelectionName = (columnSelection: GroupSelection) =>
        `${columnSelection.aggregateFunction}-${columnSelection.columnName}`;

      const columns = table.columns
        .filter((c) => groupColumns.includes(c.Header))
        .concat(
          columnSelections.map((columnSelection) => {
            const column = table.columns.find(
              (c) => c.Header === columnSelection.columnName,
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
            groupData.data.map((item) => item[columnSelection.columnName]),
          );
        });

        return obj;
      });

      data.sinks.output.next({ columns, rows });
    }, [
      data.sources.table.value,
      data.sinks.output,
      groupColumns,
      columnSelections,
    ]);

    const [newGroupColumnInput, setNewGroupColumnInput] = useState<string>();
    const [newColumnSelectionName, setNewColumnSelectionName] =
      useState<string>();
    const [newColumnselectionFunc, setNewColumnSelectionFunc] =
      useState<AggregateFunction>();

    return (
      <BaseNode sources={data.sources} sinks={data.sinks}>
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
                  {selection.columnName} -{" "}
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
                      <option key={key}>{val}</option>
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
                  value={newColumnSelectionName}
                  onChange={(e) => setNewColumnSelectionName(e.target.value)}
                >
                  {[
                    <option value={""}> -- select a column -- </option>,
                    ...data.sources.table.value.columns.map((c) => (
                      <option key={c.accessor}>{c.Header}</option>
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
                      <option key={key}>{val}</option>
                    )),
                  ]}
                </select>
                <button
                  onClick={() =>
                    setColumnSelections((prevColumnSelections) => {
                      if (!newColumnSelectionName || !newColumnselectionFunc)
                        return prevColumnSelections;
                      if (
                        prevColumnSelections.find(
                          (cs) =>
                            cs.columnName === newColumnSelectionName &&
                            cs.aggregateFunction === newColumnselectionFunc,
                        )
                      )
                        return prevColumnSelections;

                      return [
                        ...prevColumnSelections,
                        {
                          aggregateFunction:
                            AggregateFunction[newColumnselectionFunc],
                          columnName: newColumnSelectionName,
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
                    ...data.sources.table.value.columns
                      .filter((c) => !groupColumns.includes(c.Header))
                      .map((c) => <option key={c.accessor}>{c.Header}</option>),
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
} as GraphNode<GroupNodeIO>;
