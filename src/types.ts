import { FunctionComponent } from "react";
import { BehaviorSubject } from "rxjs";
import { NodeClass } from "./prograph";

export interface Column {
  Header: string;
  accessor: string;
  Type: string;
}

export interface RowValue {
  readValue: string; // Formatted value
  writeValue: string; // What I edit in (parsed as read and to underlying value)
  underlyingValue: any; // Ex JS Date
  error: string; // Error message (had trouble serializing entire error)
}

export interface Table {
  rows: Record<string, RowValue>[];
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
