import { createContext, useContext } from "react";
import dataManager from "../data-manager";

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
