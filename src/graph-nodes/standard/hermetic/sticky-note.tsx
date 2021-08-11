import { css } from "@emotion/css";
import { Global } from "@emotion/react";
import { defaulted, string } from "superstruct";
import BaseNode from "../../../components/base-node";
import ResizableNode from "../../../components/resizable-node";

const StickyNote = {
  sources: {
    content: defaulted(string(), ""),
  },
  Component: ({
    data: {
      sources,
      metadata: { size },
    },
    id,
    selected,
  }) => {
    return (
      <ResizableNode
        className={`${selected ? "nowheel nodrag" : ""}`}
        height={size?.height || 20}
        width={size?.width || 200}
        nodeId={id}
        label="Notes"
      >
        <Global
          styles={css`
            @import url("https://fonts.googleapis.com/css2?family=Patrick+Hand&display=swap");
          `}
        ></Global>
        <textarea
          value={sources.content.value}
          onChange={(e) => sources.content.set(e.target.value)}
          placeholder="Enter text..."
          className={css`
            font-family: "Patrick Hand", cursive;
            width: 100%;
            height: 100%;
            resize: none;
            color: white;
            background-color: #343434;
            box-shadow: inset 0px 0px 20px 1px rgb(255 255 255 / 30%);
            padding: 10px;
            font-size: 18px;
            border-radius: 4px;
          `}
        />
      </ResizableNode>
    );
  },
};

export default StickyNote;
