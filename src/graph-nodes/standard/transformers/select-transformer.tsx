import { useCallback, useMemo, useState } from "react";
import { Tag, MenuItem, Button } from "@blueprintjs/core";
import { Suggest, ItemRenderer, ItemPredicate } from "@blueprintjs/select";
import { css, cx } from "@emotion/css";
import { Column } from "../../../types";
import { registerNode, ValueTypes } from "../../../node-type-manager";
import ResizableNode from "../../../components/resizable-node";

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

const DEFAULT_WIDTH = 200;
const MIN_WIDTH = 200;
const DEFAULT_HEIGHT = 200;
const MIN_HEIGHT = 100;

const tagGroupHeaderStyles = css`
  font-size: 18px;
  font-weight: bold;
  color: #5c7080;
`;

const columnSuggestPredicate: ItemPredicate<Column> = (
  query,
  item,
  number,
  exactMatch,
) => {
  return item.Header.includes(query);
};

const Select = registerNode({
  inputs: {
    table: ValueTypes.TABLE,
  },
  sources: {
    selectedTags: ValueTypes.ANY, // TODO make string[]
  },
  outputs: {
    table: {
      func: ({ table, selectedTags }) => {
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
      returns: ValueTypes.TABLE,
    },
  },
  Component: ({ data, id, selected }) => {
    const [showSelectedTags, setShowSelectedTags] = useState(true);
    const [showUnselectedTags, setShowUnselectedTags] = useState(true);

    const setSelectedTags = useCallback(
      (newSet: Set<string>) => {
        data.sources.selectedTags.set(Array.from(new Set(newSet.values())));
      },
      [data.sources.selectedTags],
    );

    const selectedTagSet: Set<string> = useMemo(
      () => new Set(data.sources.selectedTags?.value),
      [data.sources.selectedTags],
    );

    const unselectedTagSet: Set<string> = useMemo(
      () =>
        new Set(
          [...data.inputs.table.columns]
            .filter((c) => !selectedTagSet.has(c.accessor))
            .map((c) => c.accessor),
        ),
      [selectedTagSet, data.inputs.table],
    );

    const columnNameMap = useMemo<Record<string, string>>(
      () =>
        (data.inputs.table.columns || []).reduce((currVal, nextVal) => {
          currVal[nextVal.accessor] = nextVal.Header;
          return currVal;
        }, {}),
      [data.inputs.table],
    );

    const colSuggest = useMemo(() => {
      const validColumns = data.inputs.table.columns.filter(
        (c: Column) => !selectedTagSet.has(c.accessor),
      );
      return (
        <ColumnSuggest
          inputValueRenderer={(item: Column) => item.Header}
          items={validColumns}
          noResults={<MenuItem disabled={true} text="All columns selected." />}
          onItemSelect={(item, event) => {
            const newSet = new Set(selectedTagSet);
            newSet.add(item.accessor);
            setSelectedTags(newSet);
          }}
          itemRenderer={renderColumnSuggestion}
          resetOnSelect={true}
          popoverProps={{ minimal: true, fill: true }}
          itemPredicate={columnSuggestPredicate}
          inputProps={{
            placeholder: "Search for a column...",
            fill: true,
          }}
        />
      );
    }, [data.inputs.table, selectedTagSet, setSelectedTags]);

    const onRemove = (columnAccessor: string) => {
      const newSet = new Set(selectedTagSet);
      newSet.delete(columnAccessor);
      setSelectedTags(newSet);
    };

    return (
      <ResizableNode
        label="Column Selector"
        sources={data.inputs}
        sinks={data.outputs}
        height={data.metadata?.size?.height || DEFAULT_HEIGHT}
        width={data.metadata?.size?.width || DEFAULT_WIDTH}
        minWidth={MIN_WIDTH}
        minHeight={MIN_HEIGHT}
        nodeId={id}
        className={selected ? "nowheel" : ""}
      >
        <div
          style={{
            backgroundColor: "white",
            padding: "1em",
          }}
        >
          {colSuggest}
          <div style={{ marginTop: "0.5em" }}>
            <Button
              onClick={() =>
                setSelectedTags(
                  new Set(data.inputs.table.columns.map((c) => c.accessor)),
                )
              }
              small={true}
              outlined={true}
            >
              Select All
            </Button>
            <Button
              onClick={() => setSelectedTags(new Set())}
              small={true}
              outlined={true}
            >
              Deselect All
            </Button>
          </div>

          <div
            onClick={() => setShowSelectedTags((prev) => !prev)}
            className={tagGroupHeaderStyles}
            style={{
              margin: "1em 0 .5em 0",
            }}
          >
            Selected ({selectedTagSet?.size ?? 0}) [
            {showSelectedTags ? "-" : "+"}]
          </div>
          <div style={{ margin: "0.5em" }}>
            {showSelectedTags ? (
              selectedTagSet.size ? (
                Array.from(selectedTagSet.values()).map((tag) => (
                  <Tag
                    key={tag}
                    onRemove={() => onRemove(tag)}
                    style={{ margin: ".1em" }}
                  >
                    {columnNameMap[tag]}
                  </Tag>
                ))
              ) : (
                <i>No columns selected</i>
              )
            ) : (
              <></>
            )}
          </div>

          <div
            onClick={() => setShowUnselectedTags((prev) => !prev)}
            className={tagGroupHeaderStyles}
          >
            Available ({unselectedTagSet?.size ?? 0}) [
            {showUnselectedTags ? "-" : "+"}]
          </div>
          <div style={{ margin: "0.5em" }}>
            {showUnselectedTags ? (
              unselectedTagSet.size ? (
                Array.from(unselectedTagSet.values()).map((tag) => (
                  <Tag
                    key={tag}
                    style={{ margin: ".1em" }}
                    onClick={() =>
                      setSelectedTags(new Set([...selectedTagSet, tag]))
                    }
                  >
                    {columnNameMap[tag]}
                  </Tag>
                ))
              ) : (
                <i>All columns selected</i>
              )
            ) : (
              <></>
            )}
          </div>
        </div>
      </ResizableNode>
    );
  },
});

export default Select;
