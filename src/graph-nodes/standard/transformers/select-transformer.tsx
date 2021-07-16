import { any, array, string } from "superstruct";
import { useEffect, useState } from "react";
import { Tag, MenuItem } from "@blueprintjs/core";
import { Suggest, ItemRenderer } from "@blueprintjs/select";
import BaseNode from "../../../base-node";
import { Column } from "../../../types";

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
    table: any(),
  },
  sources: {
    selectedTags: array(string()),
  },
  outputs: {
    table: ({ table, selectedTags }) => {
      const tbl = table || { columns: [], rows: [] };
      const tags = selectedTags || [];
      const columns = tbl.columns.filter((col) => tags.includes(col.accessor));
      const rows = tbl.rows.map((row) =>
        Object.fromEntries(
          Object.entries(row).filter(([key, val]) => tags.includes(key)),
        ),
      );
      return { columns, rows };
    },
  },
  Component: ({ data }) => {
    const table = data.inputs.table || { columns: [], rows: [] };
    const [selectedTags, setSelectedTags] = useState<Set<string>>(
      data.sources.selectedTags?.value
        ? new Set(data.sources.selectedTags?.value)
        : new Set(),
    );
    useEffect(() => {
      data.sources.selectedTags.set([...selectedTags]);
    }, [selectedTags, data.sources.selectedTags]);

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

    const onRemove = (e, tagProps) =>
      setSelectedTags(
        (prevSelectedTags) =>
          new Set(
            [...prevSelectedTags].filter((tag) => tag !== tagProps.children),
          ),
      );

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
              setSelectedTags(new Set(table.columns.map((c) => c.accessor)))
            }
          >
            Select All
          </button>
          <button onClick={() => setSelectedTags(new Set())}>
            Deselect All
          </button>
          {[...selectedTags].map((tag) => (
            <Tag key={tag} onRemove={onRemove}>
              {columnNameMap[tag]}
            </Tag>
          ))}
          <ColumnSuggest
            inputValueRenderer={(item: Column) => item.Header}
            items={table.columns.filter((c) => !selectedTags.has(c.accessor))}
            noResults={
              <MenuItem disabled={true} text="All columns selected." />
            }
            onItemSelect={(item, event) => {
              setSelectedTags(
                (prevSelectedTags) =>
                  new Set([...prevSelectedTags, item.accessor]),
              );
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
