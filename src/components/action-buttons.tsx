import {
  Button,
  ButtonGroup,
  HotkeyConfig,
  Icon,
  IconName,
} from "@blueprintjs/core";
import { css } from "@emotion/css";

export interface Action extends HotkeyConfig {
  icon: IconName;
}

export default function ActionButtons({
  actions,
  className,
}: {
  actions: Action[];
  className: string;
}) {
  return (
    <ButtonGroup className={className}>
      {actions.map((action) => (
        <ActionButton action={action} />
      ))}
    </ButtonGroup>
  );
}

const actionButtonStyles = css`
  width: 45px;
  height: 45px;
  position: relative;
  margin-right: 5px;
`;

const actionIconStyles = css`
  color: #343434 !important;
`;

const shortcutKeyStyles = css`
  position: absolute;
  bottom: 5px;
  right: 5px;
  color: #888;
`;

function ActionButton({ action }: { action: Action }) {
  return (
    <Button
      onClick={() => action.onKeyDown(null)}
      className={actionButtonStyles}
    >
      <Icon className={actionIconStyles} icon={action.icon} />
      <span className={shortcutKeyStyles}>{action.combo}</span>
    </Button>
  );
}
