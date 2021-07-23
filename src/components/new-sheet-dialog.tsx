import { Button, Card, Classes, Dialog, FormGroup, InputGroup } from "@blueprintjs/core";
import { useState } from "react";

export default function NewSheetDialog({ isOpen, onSubmit, onCancel }) {
    const [name, setName] = useState("Untitled");
    return (
        <Dialog title="New Sheet/Canvas/Graph thing" isOpen={isOpen} onClose={onCancel}>
            <Card>
                <FormGroup label="Name">
                    <InputGroup value={name} onChange={(e) => setName(e.target.value)} />
                </FormGroup>
            </Card>
            <div className={Classes.DIALOG_FOOTER}>
                <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                    <Button intent="primary" onClick={() => onSubmit(name)}>Create</Button>
                </div>
            </div>
        </Dialog>
    )
}