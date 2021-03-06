import { Resizable } from "re-resizable";
import { useContext, memo } from "react";
import BaseNode, { BaseNodeProps } from "./base-node";
import { GraphInternals } from "../flow-graph";

export interface ResizableNodeProps extends BaseNodeProps {
  width: number;
  minWidth?: number | string;
  maxWidth?: number | string;
  height: number;
  minHeight?: number | string;
  maxHeight?: number | string;
  nodeId: string; // required for updating graph
}

// TODO: resize in all directions
function ResizableNodeComponent({
  sources,
  sinks,
  children,
  className,
  width,
  minWidth,
  maxWidth,
  height,
  minHeight,
  maxHeight,
  nodeId,
  label,
}: ResizableNodeProps) {
  const { proGraph, reactFlowInstance } = useContext(GraphInternals);
  const rfiSnapshot = reactFlowInstance?.toObject();

  const onResizeStop = (e, direction, ref, d) => {
    proGraph.resizeNode(nodeId, {
      width: width + d.width,
      height: height + d.height,
    });
  };

  return (
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
      scale={rfiSnapshot?.zoom}
      minWidth={minWidth}
      maxWidth={maxWidth}
      minHeight={minHeight}
      maxHeight={maxHeight}
    >
      <BaseNode
        label={label}
        sources={sources}
        sinks={sinks}
        className={`${className ?? ""} resizable-base`}
      >
        {children}
      </BaseNode>
    </Resizable>
  );
}

const ResizableNode = memo(ResizableNodeComponent);

export default ResizableNode;
