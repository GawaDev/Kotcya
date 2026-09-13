import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Group,
  Modal,
  NavLink,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import {
  IconBook2,
  IconChevronLeft,
  IconChevronRight,
  IconHelp,
  IconLicense,
  IconScale,
} from '@tabler/icons-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import packageJson from '../package.json' with { type: 'json' };
import { getHelpMarkdown, helpDocs, type HelpDocGroup } from './helpDocs';

type HelpModalProps = {
  opened: boolean;
  onClose: () => void;
};

const GROUP_META: Record<HelpDocGroup, { color: string; Icon: typeof IconBook2 }> = {
  マニュアル: { color: 'kotcya', Icon: IconBook2 },
  仕様書: { color: 'violet', Icon: IconScale },
  ライセンス: { color: 'gray', Icon: IconLicense },
};

marked.setOptions({ gfm: true, breaks: false });

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
}

function externalizeLinks(html: string): string {
  return html.replace(/<a\s+([^>]*?)>/gi, (full, attributes: string) => {
    const match = attributes.match(/\bhref\s*=\s*("([^"]*)"|'([^']*)')/i);
    const href = match?.[2] ?? match?.[3] ?? '';
    if (!/^https?:\/\//i.test(href)) return full;
    const target = /\btarget\s*=/i.test(attributes) ? '' : ' target="_blank"';
    const rel = /\brel\s*=/i.test(attributes) ? '' : ' rel="noopener noreferrer"';
    return `<a ${attributes}${target}${rel}>`;
  });
}

function slugifyHeading(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u3040-\u30ff\u3400-\u9fff-]/g, '');
}

function resolveDocId(fromId: string, href: string): string | null {
  const value = href.trim();
  if (!value || value.startsWith('#') || /^(https?:|mailto:|data:|javascript:)/i.test(value)) {
    return null;
  }
  const path = value.split('#')[0];
  if (!/\.md$/i.test(path)) return null;
  try {
    const directory = fromId.slice(0, fromId.lastIndexOf('/') + 1);
    const resolved = new URL(path, `https://kotcya.help/${directory}`);
    return decodeURIComponent(resolved.pathname.replace(/^\//, ''));
  } catch {
    return null;
  }
}

export function HelpModal({ opened, onClose }: HelpModalProps) {
  const [activeId, setActiveId] = useState('manual/01-intro.md');
  const viewportRef = useRef<HTMLDivElement>(null);
  const pendingHashRef = useRef('');
  const activeIndex = helpDocs.findIndex((item) => item.id === activeId);
  const active = helpDocs[activeIndex] ?? helpDocs[0];
  const previous = activeIndex > 0 ? helpDocs[activeIndex - 1] : null;
  const next = activeIndex < helpDocs.length - 1 ? helpDocs[activeIndex + 1] : null;

  const grouped = useMemo(
    () => (['マニュアル', '仕様書', 'ライセンス'] as const).map((group) => ({
      group,
      items: helpDocs.filter((item) => item.group === group),
    })),
    [],
  );

  const html = useMemo(() => {
    const markdown = getHelpMarkdown(active.id).replaceAll('__KOTCYA_VERSION__', packageJson.version);
    try {
      const rendered = marked.parse(markdown, { async: false }) as string;
      const withHeadingIds = rendered.replace(
        /<h([1-4])>([\s\S]*?)<\/h\1>/gi,
        (_match, level: string, inner: string) => {
          const id = slugifyHeading(inner.replace(/<[^>]+>/g, ''));
          return id
            ? `<h${level} id="${escapeHtml(id)}">${inner}</h${level}>`
            : `<h${level}>${inner}</h${level}>`;
        },
      );
      return externalizeLinks(sanitizeHtml(withHeadingIds));
    } catch {
      return `<pre>${escapeHtml(markdown)}</pre>`;
    }
  }, [active.id]);

  useEffect(() => {
    if (!opened || !html) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    const hash = pendingHashRef.current;
    pendingHashRef.current = '';
    if (hash) {
      const target = viewport.querySelector(`#${CSS.escape(hash)}`) as HTMLElement | null;
      if (target) {
        target.scrollIntoView({ block: 'start' });
        return;
      }
    }
    viewport.scrollTo(0, 0);
  }, [active.id, html, opened]);

  const handleArticleClick = (event: MouseEvent<HTMLDivElement>) => {
    const anchor = (event.target as HTMLElement).closest('a');
    if (!anchor || !viewportRef.current?.contains(anchor)) return;
    const href = anchor.getAttribute('href');
    if (!href) return;

    if (href.startsWith('#')) {
      event.preventDefault();
      const target = viewportRef.current.querySelector(
        `#${CSS.escape(decodeURIComponent(href.slice(1)))}`,
      ) as HTMLElement | null;
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (/^https?:\/\//i.test(href)) {
      event.preventDefault();
      window.open(href, '_blank', 'noopener,noreferrer');
      return;
    }

    const resolved = resolveDocId(active.id, href);
    const destination = helpDocs.find((item) => item.id === resolved);
    if (!destination) return;
    event.preventDefault();
    const hash = href.includes('#') ? href.slice(href.indexOf('#') + 1) : '';
    pendingHashRef.current = decodeURIComponent(hash);
    setActiveId(destination.id);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap={8}>
          <IconHelp size={18} />
          <Text fw={700} size="sm">ヘルプ</Text>
        </Group>
      }
      fullScreen
      size="100%"
      padding={0}
      radius={0}
      closeButtonProps={{ 'aria-label': '閉じる' }}
      classNames={{
        content: 'kotcyaHelpModalContent',
        header: 'kotcyaHelpModalHeader',
        body: 'kotcyaHelpModalBody',
        title: 'kotcyaHelpModalTitle',
      }}
    >
      <Box className="kotcyaHelpLayout">
        <aside className="kotcyaHelpNav" aria-label="ヘルプ目次">
          <ScrollArea className="kotcyaHelpNavScroll" type="auto" offsetScrollbars>
            <Stack gap="md" p="sm">
              {grouped.map(({ group, items }) => {
                const { Icon } = GROUP_META[group];
                return (
                  <Box key={group}>
                    <Group gap={6} px={6} mb={6}>
                      <Icon size={14} className="kotcyaHelpMuted" />
                      <Text size="xs" fw={700} className="kotcyaHelpMuted">{group}</Text>
                    </Group>
                    <Stack gap={2}>
                      {items.map((item) => (
                        <NavLink
                          key={item.id}
                          label={item.title}
                          active={item.id === active.id}
                          onClick={() => setActiveId(item.id)}
                          variant="subtle"
                          classNames={{
                            root: 'kotcyaHelpNavLink',
                            label: 'kotcyaHelpNavLinkLabel',
                          }}
                        />
                      ))}
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          </ScrollArea>
        </aside>

        <Box className="kotcyaHelpMain">
          <Group className="kotcyaHelpMainHead" px="md" py={10} gap="sm" wrap="nowrap">
            <Badge
              variant="light"
              color={GROUP_META[active.group].color}
              size="sm"
              radius="sm"
            >
              {active.group}
            </Badge>
            <Text fw={700} size="sm" truncate>{active.title}</Text>
          </Group>
          <ScrollArea
            className="kotcyaHelpArticle"
            type="auto"
            offsetScrollbars
            viewportRef={viewportRef}
          >
            <Box className="kotcyaHelpArticleInner" p="lg">
              <div
                className="kotcyaHelpMarkdown"
                onClick={handleArticleClick}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </Box>
          </ScrollArea>
          <Group className="kotcyaHelpFooter" px="md" py={8} justify="space-between" wrap="nowrap">
            <Tooltip label={previous?.title ?? '前の項目はありません'}>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="lg"
                disabled={!previous}
                aria-label="前の項目"
                onClick={() => previous && setActiveId(previous.id)}
              >
                <IconChevronLeft size={18} />
              </ActionIcon>
            </Tooltip>
            <Text size="xs" c="dimmed" ta="center" truncate>
              Kotcya {packageJson.version} · {activeIndex + 1} / {helpDocs.length}
            </Text>
            <Tooltip label={next?.title ?? '次の項目はありません'}>
              <ActionIcon
                variant="subtle"
                color="gray"
                size="lg"
                disabled={!next}
                aria-label="次の項目"
                onClick={() => next && setActiveId(next.id)}
              >
                <IconChevronRight size={18} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Box>
      </Box>
    </Modal>
  );
}
