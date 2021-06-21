import { Property } from "kefir";
import { FunctionComponent } from "react";
import KefirBus from "./utils/kefir-bus";

export interface Column {
  Header: string;
  accessor: string;
}

export interface Table<E extends Record<string, any>> {
  rows: E[];
  columns: Column[];
}

export interface NodeIO {
  sources: Record<string, KefirBus<any, void>>;
  sinks: Record<string, Property<any, void>>;
}

export interface GraphNode<T extends NodeIO> {
  initializeStreams({ initialData }: { initialData: any }): T | Promise<T>;
  //Component({ data }: { data: T }): Element;
  Component: FunctionComponent<{ data: T }>;
}
