import { useMemo, useState } from "react";
import ProGraph from "../prograph";
import useDataManager from "./use-data-manager";

export default function useGraph(graphId: string) {
  const dataManager = useDataManager();
  const [prograph, setPrograph] = useState<ProGraph | null>(null);
  useMemo(() => {
    const oldGraph = prograph;
    dataManager.loadGraph(graphId).then(setPrograph);
    if (oldGraph) {
      oldGraph.unmount();
    }
  }, [graphId]);
  return prograph;
}
