import { useMemo, useState } from "react";
import ProGraph from "../prograph";
import useDataManager from "./use-data-manager";

export default function useGraph(graphId: string) {
  const dataManager = useDataManager();
  const [prograph, setPrograph] = useState<ProGraph | null>(null);
  useMemo(() => {
    dataManager.loadGraph(graphId).then(setPrograph);
  }, [graphId]);
  return prograph;
}
