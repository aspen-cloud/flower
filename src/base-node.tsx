import React, { useMemo, memo } from "react";
import { Handle } from "react-flow-renderer";

export default memo(({ sources, sinks, children }) => {
  const targetHandles = Object.keys(sources).map((sourceName, i, keys) => (
    <Handle
      style={{ left: `${Math.round(((i + 1) / (keys.length + 1)) * 100)}%` }}
      type="target"
      position="top"
      id={sourceName}
      key={sourceName}
    />
  ));
  const sourceHandles = Object.keys(sinks).map((sinkName, i, keys) => (
    <Handle
      style={{ left: `${Math.round(((i + 1) / (keys.length + 1)) * 100)}%` }}
      type="source"
      position="bottom"
      id={sinkName}
      key={sinkName}
    />
  ));

  // const childNodes = useMemo(() => children, [sources, sinks]);

  return (
    <>
      {targetHandles}
      {children}
      {sourceHandles}
    </>
  );
});
