import { Button, Card, Dialog, Divider, H3, H4 } from "@blueprintjs/core";
import { formatDistance } from "date-fns";
import { useEffect, useState } from "react";
import graphManager from "../graph-manager";
import { Link } from 'react-router-dom';

export default function SelectGraphDialog({ isOpen, onClose, onNew }) {
    const [allGraphs, setAllGraphs] = useState([]);

    useEffect(() => {
        graphManager.getAllGraphs().then((graphs) => {
            setAllGraphs(graphs);
        });

    }, [isOpen]);

    return (<Dialog isOpen={isOpen} onClose={onClose} title="Open Graph">
        <Card style={{ overflow: 'scroll', maxHeight: '80vh' }}>
            <div style={{ display: 'flex', justifyContent: "space-between" }}><H3>Select a graph</H3><Button minimal onClick={onNew}>New</Button></div>
            <Divider />
            {allGraphs.map(({ id, name, lastAccessed }) => (
                <Link to={`/${name.split(" ").join("-")}-${id}`}><Card style={{ marginBottom: "10px" }} title={name} elevation={1} interactive={true}>
                    <div style={{ display: 'flex', justifyContent: "space-between" }}>
                        <div><H4>{name}</H4><div>{id}</div></div>
                        <div>{formatDistance(lastAccessed, new Date(), { addSuffix: true })}</div>
                    </div>
                </Card></Link>
            ))}
        </Card>
    </Dialog>)
}