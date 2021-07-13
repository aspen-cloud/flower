import React, { useEffect, useState } from "react";
import { Column, GraphNode, Table } from "../../types";
import BaseNode from "../../base-node";
import { BehaviorSubject } from "rxjs";
import { Tag, MenuItem } from "@blueprintjs/core";
import { Suggest, ItemRenderer } from "@blueprintjs/select";

interface SelectNodeIO {
  sources: {
    table: BehaviorSubject<Table<any>>;
  };
  sinks: {
    output: BehaviorSubject<Table<any>>;
  };
}

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

/**
 * TODO:
 * Different message on no data vs not found
 * Click away when suggest popover is open bug (there's something weird with blueprint + react flow canvas)
 */
const SelectNode: GraphNode<SelectNodeIO> = {
  initializeStreams: function ({
    initialData,
  }: {
    initialData: any;
  }): SelectNodeIO {
    const table = new BehaviorSubject(
      initialData?.table || { columns: [], rows: [] },
    );
    const output = new BehaviorSubject({ columns: [], rows: [] });
    return {
      sources: {
        table,
      },
      sinks: {
        output,
      },
    };
  },

  persist: true,

  Component: function ({ data }: { data: SelectNodeIO }) {
    const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
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
        const columns = table.columns.filter((col) =>
          selectedTags.has(col.accessor),
        );
        const rows = table.rows.map((row) =>
          Object.fromEntries(
            Object.entries(row).filter(([key, val]) => selectedTags.has(key)),
          ),
        );
        data.sinks.output.next({ columns, rows });
      });
      return () => sub.unsubscribe();
    }, [data.sources.table, data.sinks.output, selectedTags]);

    const onRemove = (e, tagProps) =>
      setSelectedTags(
        (prevSelectedTags) =>
          new Set(
            [...prevSelectedTags].filter((tag) => tag !== tagProps.children),
          ),
      );
    return (
      <BaseNode sources={data.sources} sinks={data.sinks}>
        <div
          style={{
            backgroundColor: "white",
            padding: "1em",
          }}
        >
          <button
            onClick={() =>
              setSelectedTags(
                new Set(
                  data.sources.table.value.columns.map((c) => c.accessor),
                ),
              )
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
            items={data.sources.table.value.columns.filter(
              (c) => !selectedTags.has(c.accessor),
            )}
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

export default SelectNode;
