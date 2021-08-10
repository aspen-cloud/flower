import "./styles.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/select/lib/css/blueprint-select.css";
import "@blueprintjs/popover2/lib/css/blueprint-popover2.css";
import "@blueprintjs/table/lib/css/table.css";

import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import FlowGraphWrapper from "./flow-graph-wrapper";
import { DataManagerProvider } from "./hooks/use-data-manager";
import SelectGraphDialog from "./components/select-graph-dialog";

export default function App() {
  return (
    <DataManagerProvider>
      <Router>
        <Switch>
          <Route exact path="/">
            <SelectGraphDialog
              onClose={() => {}}
              isOpen={true}
              onNew={() => {}}
            />
          </Route>
          <Route exact path="/:graphPath">
            <FlowGraphWrapper />
          </Route>
        </Switch>
      </Router>
    </DataManagerProvider>
  );
}
