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
  persist?: boolean;
  beforeStore?: (inputs: any) => any;
  Component: FunctionComponent<{ data: T }>;
}

export interface OmnibarItem {
  type: string;
  label: string;
  data: any;
}
