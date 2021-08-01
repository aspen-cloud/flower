import { InputGroup, Overlay, Tag } from "@blueprintjs/core";
import {
  IQueryListRendererProps,
  OmnibarProps,
  QueryList,
} from "@blueprintjs/select";
import { useState } from "react";
import { OmnibarItem } from "./types";

// TODO: possibly control tags elsewhere...
interface GraphOmnibarProps extends OmnibarProps<OmnibarItem> {
  itemPredicateWithFilters?: (
    query: string,
    filters: string[],
    item: OmnibarItem,
    index?: number,
    exactMatch?: boolean,
  ) => boolean;
  filters: string[];
  onFiltersChange: (filters: string[]) => void;
}

const OmnibarQueryList = QueryList.ofType<OmnibarItem>();

// Very similar to blueprint default omnibar, need way to add tags so p
export default function GraphOmnibar(props: GraphOmnibarProps) {
  const {
    isOpen,
    inputProps,
    overlayProps,
    itemPredicate,
    filters,
    onFiltersChange,
    ...restProps
  } = props;
  const initialContent =
    "initialContent" in props ? props.initialContent : null;

  // const [filterTags, setFilterTags] = useState<string[]>([
  //   "input:number",
  //   "output:number",
  // ]);

  const handleOverlayClose = (event: React.SyntheticEvent<HTMLElement>) => {
    props.overlayProps?.onClose?.(event);
    props.onClose?.(event);
  };

  const renderQueryList = (listProps: IQueryListRendererProps<OmnibarItem>) => {
    const { handleKeyDown, handleKeyUp } = listProps;
    const handlers = isOpen
      ? { onKeyDown: handleKeyDown, onKeyUp: handleKeyUp }
      : {};

    return (
      <Overlay
        hasBackdrop={true}
        {...overlayProps}
        isOpen={isOpen}
        className={`bp3-omnibar-overlay ${overlayProps?.className}`}
        onClose={handleOverlayClose}
      >
        <div className={`bp3-omnibar ${listProps?.className}`} {...handlers}>
          <div style={{ display: "flex", alignItems: "center" }}>
            {filters.map((tag) => (
              <Tag
                style={{ margin: "0 2px" }}
                key={tag}
                onRemove={() =>
                  onFiltersChange(filters.filter((t) => t !== tag))
                }
              >
                {tag}
              </Tag>
            ))}
            <InputGroup
              autoFocus={true}
              large={true}
              leftIcon="search"
              placeholder="Search..."
              {...inputProps}
              onChange={listProps.handleQueryChange}
              value={listProps.query}
            />
          </div>

          {listProps.itemList}
        </div>
      </Overlay>
    );
  };

  return (
    <OmnibarQueryList
      {...restProps}
      itemPredicate={(
        query: string,
        item: OmnibarItem,
        index?: number,
        exactMatch?: boolean,
      ) =>
        props.itemPredicateWithFilters(query, filters, item, index, exactMatch)
      }
      initialContent={initialContent}
      renderer={renderQueryList}
    />
  );
}
