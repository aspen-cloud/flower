import { Resizable } from "re-resizable";
import { useContext, memo } from "react";
import BaseNode, { BaseNodeProps } from "./base-node";
import { GraphInternals } from "./flow-graph";

export interface ResizableNodeProps extends BaseNodeProps {
  width: number;
  height: number;
  nodeId: string; // required for updating graph
}

function ResizableNode({
  sources,
  sinks,
  children,
  className,
  width,
  height,
  nodeId,
}: ResizableNodeProps) {
  const { proGraph } = useContext(GraphInternals);
  const onResizeStop = (e, direction, ref, d) => {
    proGraph.resizeNode(nodeId, {
      width: width + d.width,
      height: height + d.height,
    });
  };

  return (
    <BaseNode sources={sources} sinks={sinks} className={className}>
      <Resizable
        size={{ width: `${width}px`, height: `${height}px` }}
        onResizeStop={onResizeStop}
        handleClasses={{
          top: "nodrag",
          right: "nodrag",
          bottom: "nodrag",
          left: "nodrag",
          topRight: "nodrag",
          bottomRight: "nodrag",
          bottomLeft: "nodrag",
          topLeft: "nodrag",
        }}
      >
        {children}
      </Resizable>
    </BaseNode>
  );
}

export default memo(ResizableNode);
