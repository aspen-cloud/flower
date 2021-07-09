import React, { useEffect, useState } from "react";

import { GraphNode, Table } from "../../types";
import BaseNode from "../../base-node";
import { BehaviorSubject } from "rxjs";

interface GroupNodeIO {
  sources: {
    table: BehaviorSubject<Table<any>>;
  };
  sinks: {
    output: BehaviorSubject<Table<any>>;
  };
}

enum SortDirection {
  ASC = "ASC",
  DESC = "DESC",
}

interface SortDefinition {
  columnName: string;
  direction: SortDirection;
}

function simpleSort(a: any, b: any, direction: SortDirection) {
  if (direction === SortDirection.ASC) return a > b ? 1 : a < b ? -1 : 0;
  return a < b ? 1 : a > b ? -1 : 0;
}

export default {
  initializeStreams: function () {
    return {
      sources: {
        table: new BehaviorSubject({ columns: [], rows: [] } as Table<any>),
      },
      sinks: {
        output: new BehaviorSubject({ columns: [], rows: [] } as Table<any>),
      },
    };
  },
  Component: function ({ data }) {
    const [sortDefinitions, setSortDefinitions] = useState<SortDefinition[]>(
      [],
    );

    const [newSortDefinitionColumn, setNewSortDefinitionColumn] =
      useState<string>();
    const [newSortDefinitionDirection, setNewSortDefinitionDirection] =
      useState<SortDirection>();

    useEffect(() => {
      const table = data.sources.table.value;
      const columns = [...table.columns];

      const rows = [
        ...table.rows.sort((a, b) =>
          sortDefinitions.reduce(
            (current, nextSortDef) => {
              // until we have better typing just supporting string and number compare
              const isNumber = table.rows.every(
                (r) => !isNaN(Number(r[nextSortDef.columnName])),
              );

              if (isNumber) {
                return (
                  current ||
                  simpleSort(
                    Number(a[nextSortDef.columnName]),
                    Number(b[nextSortDef.columnName]),
                    nextSortDef.direction,
                  )
                );
              }

              return (
                current ||
                simpleSort(
                  a[nextSortDef.columnName].toLowerCase(),
                  b[nextSortDef.columnName].toLowerCase(),
                  nextSortDef.direction,
                )
              );
            },

            0,
          ),
        ),
      ];

      data.sinks.output.next({ columns, rows });
    }, [data.sources.table.value, data.sinks.output, sortDefinitions]);

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
              Sort by:
              {sortDefinitions.map((sortDef, i) => (
                <div key={i}>
                  {sortDef.columnName} -{" "}
                  <select
                    value={sortDef.direction}
                    onChange={(e) =>
                      setSortDefinitions((prevSortDefs) => {
                        sortDef.direction = e.target.value as SortDirection;
                        return [...prevSortDefs];
                      })
                    }
                  >
                    {Object.entries(SortDirection).map(([key, val]) => (
                      <option key={key}>{val}</option>
                    ))}
                  </select>
                  <button
                    onClick={() =>
                      setSortDefinitions((prevSortDefs) =>
                        prevSortDefs.filter((cs) => cs !== sortDef),
                      )
                    }
                  >
                    Delete
                  </button>
                </div>
              ))}
              <div>
                <select
                  value={newSortDefinitionColumn}
                  onChange={(e) => setNewSortDefinitionColumn(e.target.value)}
                >
                  {[
                    <option value={""}> -- select a column -- </option>,
                    ...data.sources.table.value.columns
                      .filter(
                        (c) =>
                          !sortDefinitions.some(
                            (sd) => c.Header === sd.columnName,
                          ),
                      )
                      .map((c) => <option key={c.accessor}>{c.Header}</option>),
                  ]}
                </select>
                <select
                  value={newSortDefinitionDirection}
                  onChange={(e) =>
                    setNewSortDefinitionDirection(SortDirection[e.target.value])
                  }
                >
                  {[
                    <option value={""}> -- select a function -- </option>,
                    ...Object.entries(SortDirection).map(([key, val]) => (
                      <option key={key}>{val}</option>
                    )),
                  ]}
                </select>
                <button
                  onClick={() =>
                    setSortDefinitions((prevSortDefs) => {
                      if (
                        !newSortDefinitionColumn ||
                        !newSortDefinitionDirection
                      )
                        return prevSortDefs;
                      if (
                        prevSortDefs.find(
                          (cs) =>
                            cs.columnName === newSortDefinitionColumn &&
                            cs.direction === newSortDefinitionDirection,
                        )
                      )
                        return prevSortDefs;

                      return [
                        ...prevSortDefs,
                        {
                          direction: newSortDefinitionDirection,
                          columnName: newSortDefinitionColumn,
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
        </div>
      </BaseNode>
    );
  },
} as GraphNode<GroupNodeIO>;
