import "./styles.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/select/lib/css/blueprint-select.css";
import "@blueprintjs/popover2/lib/css/blueprint-popover2.css";
import "@blueprintjs/table/lib/css/table.css";

import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import FlowGraphWrapper from "./flow-graph-wrapper";
import { DataManagerProvider } from "./hooks/use-data-manager";
import Home from "./components/home";
import { ReactFlowProvider } from "react-flow-renderer";

export default function App() {
  return (
    <DataManagerProvider>
      <Router>
        <Switch>
          <Route exact path="/">
            <Home />
          </Route>
          <Route exact path="/:graphPath">
            <ReactFlowProvider>
              <FlowGraphWrapper />
            </ReactFlowProvider>
          </Route>
        </Switch>
      </Router>
    </DataManagerProvider>
  );
}
