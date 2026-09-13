import type { ReactNode } from 'react';
import {
  ActionIcon,
  Box,
  Group,
  Text,
  Tooltip,
  useMantineColorScheme,
} from '@mantine/core';
import { IconMoon, IconSun } from '@tabler/icons-react';
import './AppChrome.css';

type ProductHeaderProps = {
  mark: ReactNode;
  name: string;
  version?: string;
  documentName?: string;
  actions?: ReactNode;
};

export function ProductHeader({
  mark,
  name,
  version,
  documentName,
  actions,
}: ProductHeaderProps) {
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  return (
    <Group h="100%" justify="space-between" wrap="nowrap" gap="sm">
      <Group gap={8} wrap="nowrap" style={{ minWidth: 0 }}>
        <Box className="appChromeMark">{mark}</Box>
        <Text size="sm" fw={700} className="appChromeTitle">{name}</Text>
        {version && <Text size="xs" c="dimmed" className="appChromeVersion">{version}</Text>}
        {documentName && (
          <Box className="appChromeDocument">
            <Text size="xs" c="dimmed" lineClamp={1}>{documentName}</Text>
          </Box>
        )}
      </Group>
      <Group gap={4} wrap="nowrap">
        <Tooltip label={colorScheme === 'dark' ? 'ライトモード' : 'ダークモード'} withArrow>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            aria-label={colorScheme === 'dark' ? 'ライトモード' : 'ダークモード'}
            onClick={() => setColorScheme(colorScheme === 'dark' ? 'light' : 'dark')}
          >
            {colorScheme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
          </ActionIcon>
        </Tooltip>
        {actions}
      </Group>
    </Group>
  );
}

type PaneHeaderProps = {
  title: string;
  actions?: ReactNode;
};

export function PaneHeader({ title, actions }: PaneHeaderProps) {
  return (
    <Group className="appChromePaneHeader" px="sm" justify="space-between" wrap="nowrap">
      <Text size="xs" fw={700} c="dimmed" lh={1}>{title}</Text>
      {actions && <Group gap={4} wrap="nowrap">{actions}</Group>}
    </Group>
  );
}

export function ToolBar({ children }: { children: ReactNode }) {
  return (
    <Group className="appChromeToolbar" gap={2} wrap="nowrap" px="xs" py={4}>
      {children}
    </Group>
  );
}
