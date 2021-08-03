import { array, defaulted, enums, Infer, object, string } from "superstruct";
import { useCallback, useMemo, useState } from "react";
import BaseNode from "../../../components/base-node";
import { TableStruct } from "../../../structs";
import { NodeClass } from "../../../prograph";

// TODO: what's the best way to converge struct and enum values
enum SortDirection {
  ASC = "ASC",
  DESC = "DESC",
}
const SortDirectionStruct = enums(Object.keys(SortDirection));

const SortDefinitionStruct = object({
  columnAccessor: string(),
  direction: SortDirectionStruct,
});
type SortDefinition = Infer<typeof SortDefinitionStruct>;

function simpleSort(a: any, b: any, direction: SortDirection) {
  if (direction === SortDirection.ASC) return a > b ? 1 : a < b ? -1 : 0;
  return a < b ? 1 : a > b ? -1 : 0;
}

const Sort: NodeClass = {
  inputs: {
    table: defaulted(TableStruct, () => ({ rows: [], columns: [] })),
  },
  sources: {
    sortDefinitions: defaulted(array(SortDefinitionStruct), []),
  },
  outputs: {
    table: {
      func: ({ table, sortDefinitions }) => {
        const columns = [...table.columns];
        const columnMap = Object.fromEntries(
          columns.map((c) => [c.accessor, c]),
        );
        const rows = [...table.rows].sort((a, b) =>
          sortDefinitions.reduce((current, nextSortDef) => {
            // TODO: Declare compare type in Type definition (or something like that)...this is rigid
            const isNumber =
              columnMap[nextSortDef.columnAccessor].Type.name !== "Text";
            if (isNumber) {
              return (
                current ||
                simpleSort(
                  a[nextSortDef.columnAccessor]?.underlyingValue,
                  b[nextSortDef.columnAccessor]?.underlyingValue,
                  nextSortDef.direction,
                )
              );
            }
            return (
              current ||
              simpleSort(
                a[nextSortDef.columnAccessor]?.underlyingValue?.toLowerCase(),
                b[nextSortDef.columnAccessor]?.underlyingValue?.toLowerCase(),
                nextSortDef.direction,
              )
            );
          }, 0),
        );
        return { columns, rows };
      },
      struct: TableStruct,
    },
  },
  Component: ({ data }) => {
    const sortDefinitions: SortDefinition[] = useMemo(
      () => data.sources.sortDefinitions.value,
      [data.sources.sortDefinitions],
    );
    const setSortDefinitions = useCallback(
      (newSortDefinitions) => {
        data.sources.sortDefinitions.set(newSortDefinitions);
      },
      [data.sources.sortDefinitions],
    );

    const [
      newSortDefinitionColumnAccessor,
      setNewSortDefinitionColumnAccessor,
    ] = useState<string>();
    const [newSortDefinitionDirection, setNewSortDefinitionDirection] =
      useState<SortDirection>();

    const columnNameMap: Record<string, string> = useMemo(
      () =>
        (data.inputs.table?.columns || []).reduce((currVal, nextVal) => {
          currVal[nextVal.accessor] = nextVal.Header;
          return currVal;
        }, {}),
      [data.inputs.table],
    );

    const columnOptions = useMemo(
      () => [
        <option disabled selected value={""}>
          {" "}
          -- select a column --{" "}
        </option>,
        ...data.inputs.table.columns
          .filter(
            (c) =>
              !sortDefinitions.some((sd) => c.accessor === sd.columnAccessor),
          )
          .map((c) => <option value={c.accessor}>{c.Header}</option>),
      ],
      [data.inputs.table.columns, sortDefinitions],
    );

    return (
      <BaseNode label="Sort" sources={data.inputs} sinks={data.outputs}>
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
                    onChange={(e) => {
                      sortDef.direction = e.target.value as SortDirection;
                      setSortDefinitions(sortDefinitions);
                    }}
                  >
                    {Object.entries(SortDirection).map(([key, val]) => (
                      <option key={key}>{val}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      setSortDefinitions(
                        sortDefinitions.filter((cs) => cs !== sortDef),
                      );
                    }}
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
                  {columnOptions}
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
                  onClick={() => {
                    if (
                      !newSortDefinitionColumnAccessor ||
                      !newSortDefinitionDirection
                    )
                      return;
                    if (
                      sortDefinitions.find(
                        (cs) =>
                          cs.columnAccessor ===
                            newSortDefinitionColumnAccessor &&
                          cs.direction === newSortDefinitionDirection,
                      )
                    )
                      return;

                    setSortDefinitions([
                      ...sortDefinitions,
                      {
                        direction: newSortDefinitionDirection,
                        columnAccessor: newSortDefinitionColumnAccessor,
                      },
                    ]);
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

export default Sort;
