import { Card, Collapse, Icon } from "@blueprintjs/core";
import { useState } from "react";
import { Elements, FlowElement } from "react-flow-renderer";

const ElementInfoMenuItem = ({ element }: { element: FlowElement }) => {
  const [isOpen, setIsOpen] = useState(false);
  const error = element.data?.inputs?.error || element.data?.outputs?.error;
  return (
    <>
      <div onClick={() => setIsOpen((wasOpen) => !wasOpen)}>
        <b>
          <Icon icon={isOpen ? "caret-down" : "caret-right"} /> {element.id}
        </b>
      </div>
      <Collapse isOpen={isOpen}>
        <Card>
          <div>
            <b>Type:</b> {element.type}
          </div>
          {error ? (
            <div>
              <b>Error:</b> {error.message}
            </div>
          ) : (
            ""
          )}
        </Card>
      </Collapse>
    </>
  );
};

interface SelectedElementsManagerProps {
  selectedElements: Elements<any>;
}
export default function SelectedElementsManager({
  selectedElements,
}: SelectedElementsManagerProps) {
  return (
    <>
      <h4>Selected Elements</h4>
      {selectedElements.length ? (
        selectedElements.map((el, i) => (
          <ElementInfoMenuItem key={i} element={el} />
        ))
      ) : (
        <div>No elements selected.</div>
      )}
    </>
  );
}
