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

const ColumnSuggest = Suggest.ofType<string>();

export const renderColumnSuggestion: ItemRenderer<string> = (
  column,
  { handleClick, modifiers, query },
) => {
  if (!modifiers.matchesPredicate) {
    return null;
  }
  // const text = `${film.rank}. ${film.title}`;
  return (
    <MenuItem
      // active={modifiers.active}
      // disabled={modifiers.disabled}
      // label={film.year.toString()}
      key={column}
      onClick={handleClick}
      text={column}
    />
  );
};

/**
 * Different message on no data
 * Click away when suggest popover is open bug (there's something weird with blueprint + react flow cnavas)
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

    useEffect(() => {
      const table = data.sources.table.value;
      const columns = table.columns.filter((col) =>
        selectedTags.has(col.Header),
      );
      const rows = table.rows.map((row) =>
        Object.fromEntries(
          Object.entries(row).filter(([key, val]) => selectedTags.has(key)),
        ),
      );
      data.sinks.output.next({ columns, rows });
    }, [data.sources.table, data.sinks.output, selectedTags]);

    const onRemove = (e, tagProps) =>
      setSelectedTags(
        (prevSelectedTags) =>
          new Set(
            [...prevSelectedTags].filter((tag) => tag !== tagProps.children),
          ), // TODO: better value for this?
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
                new Set(data.sources.table.value.columns.map((c) => c.Header)),
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
              {tag}
            </Tag>
          ))}
          <ColumnSuggest
            // {...filmSelectProps}
            // {...flags}
            // createNewItemFromQuery={maybeCreateNewItemFromQuery}
            // createNewItemRenderer={maybeCreateNewItemRenderer}
            inputValueRenderer={(item: string) => item}
            // itemsEqual={areFilmsEqual}
            // we may customize the default filmSelectProps.items by
            // adding newly created items to the list, so pass our own.
            items={data.sources.table.value.columns
              .filter((c) => !selectedTags.has(c.Header))
              .map((c) => c.Header)}
            noResults={
              <MenuItem disabled={true} text="All columns selected." />
            }
            onItemSelect={(item, event) =>
              setSelectedTags(
                (prevSelectedTags) => new Set([...prevSelectedTags, item]),
              )
            }
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
