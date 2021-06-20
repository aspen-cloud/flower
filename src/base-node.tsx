import { Tooltip2 } from "@blueprintjs/popover2";
import React, { memo, ReactNode } from "react";
import { Handle, Position } from "react-flow-renderer";

export default memo(
  ({
    sources,
    sinks,
    children,
  }: {
    sources: any;
    sinks: any;
    children: ReactNode;
  }) => {
    const targetHandles = Object.keys(sources).map((sourceName, i, keys) => (
      <Tooltip2
        content={sourceName}
        placement="top"
        portalClassName="handle-tooltip"
        renderTarget={({ ...tooltipProps }) => (
          <span
            style={{
              position: "absolute",
              top: 0,
              left: `${Math.round(((i + 1) / (keys.length + 1)) * 100)}%`,
            }}
            {...tooltipProps}
          >
            <Handle
              style={{
                left: `${Math.round(((i + 1) / (keys.length + 1)) * 100)}%`,
              }}
              type="target"
              position={Position.Top}
              id={sourceName}
              key={sourceName}
            />
          </span>
        )}
      ></Tooltip2>
    ));
    const sourceHandles = Object.keys(sinks).map((sinkName, i, keys) => (
      <Tooltip2
        content={sinkName}
        placement="bottom"
        portalClassName="handle-tooltip"
        renderTarget={({ ...tooltipProps }) => (
          <span
            style={{
              position: "absolute",
              bottom: 0,
              left: `${Math.round(((i + 1) / (keys.length + 1)) * 100)}%`,
            }}
            {...tooltipProps}
          >
            <Handle
              style={{
                left: `${Math.round(((i + 1) / (keys.length + 1)) * 100)}%`,
              }}
              type="source"
              position={Position.Bottom}
              id={sinkName}
              key={sinkName}
            />
          </span>
        )}
      ></Tooltip2>
    ));

    // const childNodes = useMemo(() => children, [sources, sinks]);

    return (
      <>
        {targetHandles}
        {children}
        {sourceHandles}
      </>
    );
  },
);
