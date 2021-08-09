import { useMemo } from "react";
import { useParams } from "react-router-dom";

export default function useCurrentGraphId() {
  const { graphPath } = useParams<{ graphPath?: string }>();
  const graphId: string | null = useMemo(
    () => (graphPath ? graphPath.slice(-21) : null),
    [graphPath],
  );
  return graphId;
}
