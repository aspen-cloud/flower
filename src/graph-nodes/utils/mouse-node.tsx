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
          fill: rgba(255, 255, 255, 0.7);
        `}
      />
    </div>
  );
}
