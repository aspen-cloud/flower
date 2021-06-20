import { FunctionComponent } from "react";
import { BehaviorSubject } from "rxjs";

export interface Column {
  Header: string;
  accessor: string;
}

export interface Table<E extends Record<string, any>> {
  rows: E[];
  columns: Column[];
}

export interface NodeIO {
  sources: Record<string, BehaviorSubject<any>>;
  sinks: Record<string, BehaviorSubject<any>>;
}

export interface GraphNode<T extends NodeIO> {
  initializeStreams({ initialData }: { initialData: any }): T;
  Component: FunctionComponent<{ data: T }>;
}
