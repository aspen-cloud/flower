import { getBezierPath, getMarkerEnd } from "react-flow-renderer";

export default function SuggestedEdge({
  id,
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
}) {
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
        id={id}
        style={{ stroke: "orange", ...style }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={markerEnd}
      />
    </>
  );
}
