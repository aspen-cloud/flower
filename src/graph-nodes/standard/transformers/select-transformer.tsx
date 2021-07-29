import { any, string, set, defaulted, array } from "superstruct";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Tag, MenuItem } from "@blueprintjs/core";
import { Suggest, ItemRenderer, ItemPredicate } from "@blueprintjs/select";
import BaseNode from "../../../components/base-node";
import { Column } from "../../../types";
import { TableStruct } from "../../../structs";

const ColumnSuggest = Suggest.ofType<Column>();

const renderColumnSuggestion: ItemRenderer<Column> = (
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

const columnSuggestPredicate: ItemPredicate<Column> = (
  query,
  item,
  number,
  exactMatch,
) => {
  return item.Header.includes(query);
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

    const columnNameMap = useMemo(
      () =>
        (data.inputs.table.columns || []).reduce((currVal, nextVal) => {
          currVal[nextVal.accessor] = nextVal.Header;
          return currVal;
        }, {}),
      [data.inputs.table],
    );

    const colSuggest = useMemo(() => {
      const validColumns = data.inputs.table.columns.filter(
        (c: Column) => !tagSet.has(c.accessor),
      );
      return (
        <ColumnSuggest
          inputValueRenderer={(item: Column) => item.Header}
          items={validColumns}
          noResults={<MenuItem disabled={true} text="All columns selected." />}
          onItemSelect={(item, event) => {
            const newSet = new Set(tagSet);
            newSet.add(item.accessor);
            setSelectedTags(newSet);
          }}
          itemRenderer={renderColumnSuggestion}
          resetOnSelect={true}
          popoverProps={{ minimal: true }}
          itemPredicate={columnSuggestPredicate}
        />
      );
    }, [data.inputs.table, tagSet, setSelectedTags]);

    const onRemove = (columnAccessor: string) => {
      const newSet = new Set(tagSet);
      newSet.delete(columnAccessor);
      setSelectedTags(newSet);
    };

    return (
      <BaseNode
        label="Column Selector"
        sources={data.inputs}
        sinks={data.outputs}
      >
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
          {colSuggest}
        </div>
      </BaseNode>
    );
  },
};

export default Select;
