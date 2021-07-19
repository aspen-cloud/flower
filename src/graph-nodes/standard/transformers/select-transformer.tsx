import { any, string, set, defaulted, array } from "superstruct";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Tag, MenuItem } from "@blueprintjs/core";
import { Suggest, ItemRenderer } from "@blueprintjs/select";
import BaseNode from "../../../base-node";
import { Column } from "../../../types";
import { TableStruct } from "../../../structs";

const ColumnSuggest = Suggest.ofType<Column>();

export const renderColumnSuggestion: ItemRenderer<Column> = (
  column,
  { handleClick, modifiers, query },
) => {
  if (!modifiers.matchesPredicate) {
    return null;
  }
  return (
    <MenuItem
      key={column.accessor}
      onClick={handleClick}
      text={column.Header}
    />
  );
};

const Select = {
  inputs: {
    table: defaulted(TableStruct, {}),
  },
  sources: {
    // TODO: can we use set? Can set be serialized?
    selectedTags: defaulted(array(string()), []),
  },
  outputs: {
    table: ({ table, selectedTags }) => {
      const columns = table.columns.filter((col) =>
        selectedTags.includes(col.accessor),
      );
      const rows = table.rows.map((row) =>
        Object.fromEntries(
          Object.entries(row).filter(([key, val]) =>
            selectedTags.includes(key),
          ),
        ),
      );
      return { columns, rows };
    },
  },
  Component: ({ data }) => {
    const setSelectedTags = useCallback(
      (newSet) => {
        data.sources.selectedTags.set(Array.from(new Set(newSet.values())));
      },
      [data.sources.selectedTags],
    );

    const tagSet: Set<string> = useMemo(
      () => new Set(data.sources.selectedTags?.value),
      [data.sources.selectedTags],
    );

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

    const onRemove = (columnAccessor: string) => {
      const newSet = new Set(tagSet);
      newSet.delete(columnAccessor);
      setSelectedTags(newSet);
    };

    return (
      <BaseNode sources={data.inputs} sinks={data.outputs}>
        <div
          style={{
            backgroundColor: "white",
            padding: "1em",
          }}
        >
          <button
            onClick={() =>
              setSelectedTags(
                new Set(data.inputs.table.columns.map((c) => c.accessor)),
              )
            }
          >
            Select All
          </button>
          <button onClick={() => setSelectedTags(new Set())}>
            Deselect All
          </button>
          {Array.from(tagSet.values()).map((tag) => (
            <Tag key={tag} onRemove={() => onRemove(tag)}>
              {columnNameMap[tag]}
            </Tag>
          ))}
          <ColumnSuggest
            inputValueRenderer={(item: Column) => item.Header}
            items={data.inputs.table.columns.filter(
              (c) => !tagSet.has(c.accessor),
            )}
            noResults={
              <MenuItem disabled={true} text="All columns selected." />
            }
            onItemSelect={(item, event) => {
              const newSet = new Set(tagSet);
              newSet.add(item.accessor);
              setSelectedTags(newSet);
            }}
            itemRenderer={renderColumnSuggestion}
            resetOnSelect={true}
            popoverProps={{ minimal: true }}
          />
        </div>
      </BaseNode>
    );
  },
};

export default Select;
