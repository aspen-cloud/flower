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

enum SortDirection {
  ASC = "ASC",
  DESC = "DESC",
}

interface SortDefinition {
  columnAccessor: string;
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
        table: new BehaviorSubject({ columns: [], rows: [] } as Table),
      },
      sinks: {
        output: new BehaviorSubject({ columns: [], rows: [] } as Table),
      },
    };
  },
  Component: function ({ data }) {
    const [sortDefinitions, setSortDefinitions] = useState<SortDefinition[]>(
      [],
    );

    const [
      newSortDefinitionColumnAccessor,
      setNewSortDefinitionColumnAccessor,
    ] = useState<string>();
    const [newSortDefinitionDirection, setNewSortDefinitionDirection] =
      useState<SortDirection>();
    const [columnNameMap, setColumnNameMap] =
      useState<Record<string, string>>();

    useEffect(() => {
      const sub = data.sources.table.subscribe((value) => {
        const newNameMap = value.columns.reduce((currVal, nextVal) => {
          currVal[nextVal.accessor] = nextVal.Header;
          return currVal;
        }, {});
        setColumnNameMap(newNameMap);
      });

      return () => sub.unsubscribe();
    }, [data.sources.table]);

    useEffect(() => {
      const sub = data.sources.table.subscribe((table) => {
        const columns = [...table.columns];

        const rows = [...table.rows].sort((a, b) =>
          sortDefinitions.reduce(
            (current, nextSortDef) => {
              // until we have better typing just supporting string and number compare
              const isNumber = table.rows.every(
                (r) => !isNaN(Number(r[nextSortDef.columnAccessor])),
              );

              if (isNumber) {
                return (
                  current ||
                  simpleSort(
                    Number(a[nextSortDef.columnAccessor]),
                    Number(b[nextSortDef.columnAccessor]),
                    nextSortDef.direction,
                  )
                );
              }

              return (
                current ||
                simpleSort(
                  a[nextSortDef.columnAccessor]?.underlyingValue.toLowerCase(),
                  b[nextSortDef.columnAccessor]?.underlyingValue.toLowerCase(),
                  nextSortDef.direction,
                )
              );
            },

            0,
          ),
        );
        data.sinks.output.next({ columns, rows });
      });
      return sub.unsubscribe();
    }, [data.sources.table, data.sinks.output, sortDefinitions]);

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
                  {columnNameMap[sortDef.columnAccessor]} -{" "}
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
                  value={newSortDefinitionColumnAccessor}
                  onChange={(e) => {
                    setNewSortDefinitionColumnAccessor(e.target.value);
                  }}
                >
                  {[
                    <option value={""}> -- select a column -- </option>,
                    ...data.sources.table.value.columns
                      .filter(
                        (c) =>
                          !sortDefinitions.some(
                            (sd) => c.accessor === sd.columnAccessor,
                          ),
                      )
                      .map((c) => (
                        <option key={c.accessor} value={c.accessor}>
                          {c.Header}
                        </option>
                      )),
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
                        !newSortDefinitionColumnAccessor ||
                        !newSortDefinitionDirection
                      )
                        return prevSortDefs;
                      if (
                        prevSortDefs.find(
                          (cs) =>
                            cs.columnAccessor ===
                              newSortDefinitionColumnAccessor &&
                            cs.direction === newSortDefinitionDirection,
                        )
                      )
                        return prevSortDefs;

                      return [
                        ...prevSortDefs,
                        {
                          direction: newSortDefinitionDirection,
                          columnAccessor: newSortDefinitionColumnAccessor,
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
