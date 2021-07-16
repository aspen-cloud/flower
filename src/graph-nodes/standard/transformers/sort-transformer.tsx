import { any, array, enums, object, string } from "superstruct";
import { useEffect, useState } from "react";
import BaseNode from "../../../base-node";

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

const SortDirectionType = enums(["ASC", "DESC"]);

const SortDefinitionType = object({
  columnAccessor: string(),
  direction: SortDirectionType,
});

const Sort = {
  inputs: {
    table: any(),
  },
  sources: {
    sortDefinitions: array(SortDefinitionType),
  },
  outputs: {
    table: ({ table, sortDefinitions }) => {
      const tbl = table || { columns: [], rows: [] };
      const sortDefs = sortDefinitions || [];
      const columns = [...tbl.columns];
      const rows = [...tbl.rows].sort((a, b) =>
        sortDefs.reduce((current, nextSortDef) => {
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
              a[nextSortDef.columnAccessor]?.toLowerCase(),
              b[nextSortDef.columnAccessor]?.toLowerCase(),
              nextSortDef.direction,
            )
          );
        }, 0),
      );
      return { columns, rows };
    },
  },
  Component: ({ data }) => {
    const [sortDefinitions, setSortDefinitions] = useState<SortDefinition[]>(
      data.sources?.sortDefinitions.value || [],
    );
    const [
      newSortDefinitionColumnAccessor,
      setNewSortDefinitionColumnAccessor,
    ] = useState<string>();
    const [newSortDefinitionDirection, setNewSortDefinitionDirection] =
      useState<SortDirection>();
    const [columnNameMap, setColumnNameMap] = useState<Record<string, string>>(
      {},
    );

    useEffect(() => {
      const newNameMap = (data.inputs.table?.columns || []).reduce(
        (currVal, nextVal) => {
          currVal[nextVal.accessor] = nextVal.Header;
          return currVal;
        },
        {},
      );
      setColumnNameMap(newNameMap);
    }, [data.inputs.table]);

    // TODO: do we need state/effects here?
    useEffect(() => {
      data.sources.sortDefinitions.set(sortDefinitions);
    }, [sortDefinitions, data.sources.sortDefinitions]);

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
                    ...(data.inputs.table?.columns || [])
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
};

export default Sort;
