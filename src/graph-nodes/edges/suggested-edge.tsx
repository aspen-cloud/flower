import { EdgeProps, getBezierPath, getMarkerEnd } from "react-flow-renderer";
import { GraphEdge } from "../../prograph";

interface DefaultEdgeProps extends EdgeProps {
  onDoubleClick: (conn: Omit<GraphEdge, "id">) => void;
}

export default function SuggestedEdge({
  id,
  source,
  sourceHandleId,
  target,
  targetHandleId,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  arrowHeadType,
  markerEndId,
  onDoubleClick,
}: DefaultEdgeProps) {
  const edgePath = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const markerEnd = getMarkerEnd(arrowHeadType, markerEndId);
  return (
    <>
      <path
        onDoubleClick={() =>
          onDoubleClick({
            from: {
              nodeId: source,
              busKey: sourceHandleId,
            },
            to: {
              nodeId: target,
              busKey: targetHandleId,
            },
          })
        }
        id={id}
        style={{
          stroke: "rgb(206 206 206 / 35%)",
          strokeWidth: "5px",
          ...style,
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
    </>
  );
}

export function suggestedEdgeId(conn: Omit<GraphEdge, "id">) {
  return JSON.stringify(conn);
}
