import { createContext, useContext } from "react";
import DataManager from "../data-manager";
import GraphNodes from "../graph-nodes";

const dataManager = new DataManager(GraphNodes);

const DataManagerContext = createContext(dataManager);

export function DataManagerProvider({ children }) {
  return (
    <DataManagerContext.Provider value={dataManager}>
      {children}
    </DataManagerContext.Provider>
  );
}

export default function useDataManager() {
  return useContext(DataManagerContext);
}
