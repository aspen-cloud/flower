import { useEffect, useState } from "react";
import ProGraph from "../prograph";
import useDataManager from "./use-data-manager";

export default function useGraph(graphId: string) {
  const dataManager = useDataManager();
  const [prograph, setPrograph] = useState<ProGraph | null>(null);

  useEffect(() => {
    if (prograph) {
      prograph.unmount();
    }
    dataManager.loadGraph(graphId).then(setPrograph);
  }, [graphId]);

  return prograph;
}
