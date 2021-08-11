import { css, cx } from "@emotion/css";
import { ReactComponent as MouseIcon } from "./mouse-cursor.svg";

export default function MouseNode({ data }) {
  return (
    <div
      className={cx([
        css`
          position: "relative";
          .label {
            position: relative;
            visibility: hidden;
            color: white;
          }
          &:hover .label {
            visibility: visible;
          }
        `,
        "nodrag",
      ])}
    >
      <div className="label">{data.label}</div>
      <MouseIcon
        width="20px"
        className={css`
          fill: #343434;
          stroke: white;
          stroke-width: 2px;
        `}
      />
    </div>
  );
}
