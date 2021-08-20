import {
  Button,
  ButtonGroup,
  HotkeyConfig,
  Icon,
  IconName,
  useHotkeys,
} from "@blueprintjs/core";
import { css } from "@emotion/css";

interface Action {
  icon: IconName;
  onTrigger: () => void;
  shortcutKey: string;
  label: string;
}

export default function ActionButtons({
  actions,
  className,
}: {
  actions: Action[];
  className: string;
}) {
  const hotKeys: HotkeyConfig[] = actions.map((action) => ({
    combo: action.shortcutKey,
    label: action.label,
    onKeyUp: action.onTrigger,
    global: true,
  }));

  const { handleKeyDown, handleKeyUp } = useHotkeys(hotKeys);

  return (
    <ButtonGroup
      className={className}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
    >
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
    <Button onClick={action.onTrigger} className={actionButtonStyles}>
      <Icon className={actionIconStyles} icon={action.icon} />
      <span className={shortcutKeyStyles}>{action.shortcutKey}</span>
    </Button>
  );
}
