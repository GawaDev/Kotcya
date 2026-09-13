import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ActionIcon,
  Alert,
  Anchor,
  AppShell,
  Badge,
  Box,
  Button,
  ColorInput,
  Container,
  Divider,
  Group,
  Loader,
  Modal,
  NumberInput,
  Paper,
  Progress,
  SegmentedControl,
  SimpleGrid,
  Slider,
  Splitter,
  Stack,
  Switch,
  Tabs,
  Text,
  Tooltip,
} from '@mantine/core';
import { Dropzone } from '@mantine/dropzone';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconArrowBackUp,
  IconBackground,
  IconDownload,
  IconFlipHorizontal,
  IconFlipVertical,
  IconHelp,
  IconPhoto,
  IconRotateClockwise,
  IconUpload,
  IconWindowMaximize,
  IconX,
  IconTrees,
} from '@tabler/icons-react';
import {
  renderImage,
  type ExportFormat,
  type ImageOptions,
} from './imageProcessing';
import { analyzeImage, type ImageAnalysis } from './imageAnalysis';
import type { C2paResult } from './c2paCheck';
import { ImageInfoPanel } from './ImageInfoPanel';
import { PaneHeader, ProductHeader, ToolBar } from './ui/AppChrome';
import './App.css';

const HelpModal = lazy(() =>
  import('./HelpModal').then((module) => ({ default: module.HelpModal })),
);

const initialOptions: ImageOptions = {
  outlineWidth: 0,
  outlineColor: '#ffffff',
  backgroundColor: null,
  brightness: 100,
  contrast: 100,
  saturation: 100,
  exposure: 0,
  highlights: 0,
  shadows: 0,
  blackPoint: 0,
  vibrance: 0,
  warmth: 0,
  tint: 0,
  hdr: 0,
  sharpness: 0,
  vignette: 0,
  grayscale: 0,
  blur: 0,
  rotation: 0,
  flipX: false,
  flipY: false,
  trim: false,
  cropAspect: null,
  padding: 0,
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 12,
  shadowColor: 'rgba(0, 0, 0, 0.28)',
  outputWidth: null,
};

const extensionByFormat: Record<ExportFormat, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

const acceptedImageTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const maxFileSize = 30 * 1024 ** 2;
const maxImageSide = 8192;
const maxImagePixels = maxImageSide * maxImageSide;

function inspectImageDimensions(file: File) {
  return new Promise<void>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    const finish = () => URL.revokeObjectURL(url);
    image.onload = () => {
      const { naturalWidth: width, naturalHeight: height } = image;
      finish();
      if (!width || !height) {
        reject(new Error('画像の寸法を確認できませんでした'));
      } else if (width > maxImageSide || height > maxImageSide || width * height > maxImagePixels) {
        reject(new Error('縦横8192px以下の画像を選択してください'));
      } else {
        resolve();
      }
    };
    image.onerror = () => {
      finish();
      reject(new Error('画像を開けませんでした'));
    };
    image.src = url;
  });
}

const formatBytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;
const metadataLabel = (key: string) => key.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ');

type SaveFileHandle = {
  createWritable: () => Promise<{
    write: (data: Blob) => Promise<void>;
    close: () => Promise<void>;
  }>;
};

export default function App() {
  const isPhone = useMediaQuery('(max-width: 560px)');
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState('image');
  const [options, setOptions] = useState(initialOptions);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewSize, setPreviewSize] = useState<[number, number] | null>(null);
  const [format, setFormat] = useState<ExportFormat>('image/png');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showOriginal, setShowOriginal] = useState(false);
  const [mobilePane, setMobilePane] = useState<'settings' | 'preview' | 'information'>('preview');
  const [analysis, setAnalysis] = useState<ImageAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [c2paResult, setC2paResult] = useState<C2paResult | null>(null);
  const [checkingC2pa, setCheckingC2pa] = useState(false);
  const [helpOpened, setHelpOpened] = useState(false);
  const [cutoutConsentOpened, setCutoutConsentOpened] = useState(false);
  const [previewWindow, setPreviewWindow] = useState<Window | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const sourceUrlRef = useRef<string | null>(null);
  const originalUrlRef = useRef<string | null>(null);
  const fileRequestRef = useRef(0);
  const c2paRequestRef = useRef(0);

  useEffect(() => {
    document.title = `${sourceFile?.name ?? '無題'} — Kotcya`;
  }, [sourceFile]);

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    if (sourceUrlRef.current && sourceUrlRef.current !== originalUrlRef.current) {
      URL.revokeObjectURL(sourceUrlRef.current);
    }
    if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
  }, []);

  useEffect(() => {
    if (!previewWindow) return;
    return () => previewWindow.close();
  }, [previewWindow]);

  const updateOptions = (patch: Partial<ImageOptions>) =>
    setOptions((current) => ({ ...current, ...patch }));

  useEffect(() => {
    if (!sourceUrl) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const result = await renderImage(sourceUrl, options, format, 1600);
        if (cancelled) return;
        const nextUrl = URL.createObjectURL(result.blob);
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = nextUrl;
        setPreviewUrl(nextUrl);
        setPreviewSize([result.width, result.height]);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : 'プレビューに失敗しました');
      }
    }, 80);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [format, options, sourceUrl]);

  const loadFile = async (file: File) => {
    const requestId = ++fileRequestRef.current;
    c2paRequestRef.current += 1;
    setError(null);
    try {
      await inspectImageDimensions(file);
    } catch (caught) {
      if (requestId === fileRequestRef.current) {
        setError(caught instanceof Error ? caught.message : '画像を開けませんでした');
      }
      return;
    }
    if (requestId !== fileRequestRef.current) return;

    const url = URL.createObjectURL(file);
    if (sourceUrlRef.current && sourceUrlRef.current !== originalUrlRef.current) {
      URL.revokeObjectURL(sourceUrlRef.current);
    }
    if (originalUrlRef.current) URL.revokeObjectURL(originalUrlRef.current);
    sourceUrlRef.current = url;
    originalUrlRef.current = url;
    setPreviewUrl(null);
    setSourceUrl(url);
    setOriginalUrl(url);
    setFileName(file.name.replace(/\.[^.]+$/, '') || 'image');
    setSourceFile(file);
    setC2paResult(null);
    setOptions(initialOptions);
    setAnalysis(null);
    setAnalyzing(true);
    void analyzeImage(file)
      .then((result) => {
        if (requestId === fileRequestRef.current) setAnalysis(result);
      })
      .catch((caught) => {
        if (requestId === fileRequestRef.current) {
          setError(caught instanceof Error ? caught.message : '画像を解析できませんでした');
        }
      })
      .finally(() => {
        if (requestId === fileRequestRef.current) setAnalyzing(false);
      });
  };

  const runC2paCheck = async () => {
    if (!sourceFile) return;
    const requestId = ++c2paRequestRef.current;
    const file = sourceFile;
    setCheckingC2pa(true);
    setError(null);
    try {
      const { checkC2pa } = await import('./c2paCheck');
      const result = await checkC2pa(file);
      if (requestId === c2paRequestRef.current) setC2paResult(result);
    } catch (caught) {
      if (requestId === c2paRequestRef.current) {
        setError(caught instanceof Error ? caught.message : '生成情報を確認できませんでした');
      }
    } finally {
      if (requestId === c2paRequestRef.current) setCheckingC2pa(false);
    }
  };

  const cutOutPerson = async () => {
    if (!sourceUrl) return;
    const requestedUrl = sourceUrl;
    setProcessing(true);
    setProgress(2);
    setError(null);
    try {
      const { cutOutPerson: runCutout } = await import('./personCutout');
      const result = await runCutout(requestedUrl, setProgress);
      if (sourceUrlRef.current !== requestedUrl) return;
      const nextUrl = URL.createObjectURL(result);
      if (requestedUrl !== originalUrlRef.current) URL.revokeObjectURL(requestedUrl);
      sourceUrlRef.current = nextUrl;
      setSourceUrl(nextUrl);
      updateOptions({ trim: true, backgroundColor: null });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '人物の切り抜きに失敗しました');
    } finally {
      setProcessing(false);
    }
  };

  const requestPersonCutout = () => {
    try {
      if (localStorage.getItem('kotcya-mediapipe-consent') === 'accepted') {
        void cutOutPerson();
        return;
      }
    } catch {
      // Storage may be unavailable; ask again without blocking the feature.
    }
    setCutoutConsentOpened(true);
  };

  const acceptPersonCutout = () => {
    try {
      localStorage.setItem('kotcya-mediapipe-consent', 'accepted');
    } catch {
      // Consent still applies to this invocation when storage is unavailable.
    }
    setCutoutConsentOpened(false);
    void cutOutPerson();
  };

  const download = async () => {
    if (!sourceUrl) return;
    try {
      const { blob } = await renderImage(sourceUrl, options, format);
      const extension = extensionByFormat[format];
      const suggestedName = `${fileName}-edited.${extension}`;
      const picker = (window as Window & {
        showSaveFilePicker?: (options: {
          suggestedName: string;
          types: Array<{ description: string; accept: Record<string, string[]> }>;
        }) => Promise<SaveFileHandle>;
      }).showSaveFilePicker;
      if (picker) {
        const handle = await picker({
          suggestedName,
          types: [{
            description: extension.toUpperCase(),
            accept: { [format]: [`.${extension}`] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      }
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = suggestedName;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === 'AbortError') return;
      setError(caught instanceof Error ? caught.message : 'ダウンロードに失敗しました');
    }
  };

  const openPreviewWindow = () => {
    if (previewWindow && !previewWindow.closed) {
      previewWindow.focus();
      return;
    }
    const popup = window.open('', 'kotcya-preview', 'popup=yes,width=1000,height=760');
    if (!popup) {
      setError('別ウィンドウを開けませんでした');
      return;
    }
    popup.document.documentElement.dataset.mantineColorScheme =
      document.documentElement.dataset.mantineColorScheme ?? 'light';
    popup.document.head.replaceChildren(
      ...Array.from(document.head.querySelectorAll('link[rel="stylesheet"], style')).map((node) =>
        node.cloneNode(true),
      ),
    );
    popup.document.title = `${sourceFile?.name ?? '無題'} — Kotcya`;
    popup.document.body.style.margin = '0';
    const syncColorScheme = () => {
      popup.document.documentElement.dataset.mantineColorScheme =
        document.documentElement.dataset.mantineColorScheme ?? 'light';
    };
    const colorSchemeObserver = new MutationObserver(syncColorScheme);
    colorSchemeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-mantine-color-scheme'],
    });
    popup.addEventListener('beforeunload', () => {
      colorSchemeObserver.disconnect();
      setPreviewWindow(null);
    }, { once: true });
    setPreviewWindow(popup);
  };

  const closePreviewWindow = () => {
    previewWindow?.close();
    setPreviewWindow(null);
  };

  const previewStage = (
    <Box className="checkerboard">
      {sourceUrl ? (
        previewUrl
          ? <img className="previewImage" src={showOriginal ? originalUrl ?? previewUrl : previewUrl} alt="加工プレビュー" />
          : <Loader />
      ) : (
        <Dropzone
          className="workspaceDropzone"
          accept={acceptedImageTypes}
          maxSize={maxFileSize}
          maxFiles={1}
          multiple={false}
          onDrop={(files) => void loadFile(files[0])}
          onReject={() => setError('30MB以下のPNG・JPEG・WebP・SVGを選択してください')}
        >
          <Stack align="center" gap={6} style={{ pointerEvents: 'none' }}>
            <Dropzone.Accept><IconUpload size={32} /></Dropzone.Accept>
            <Dropzone.Reject><IconX size={32} /></Dropzone.Reject>
            <Dropzone.Idle><IconPhoto size={32} /></Dropzone.Idle>
            <Text fw={700} size="sm">画像を開く</Text>
            <Text size="xs" c="dimmed">PNG・JPG・WebP・SVG／最大30MB</Text>
          </Stack>
        </Dropzone>
      )}
    </Box>
  );

  return (
    <AppShell className="imageApp" mode="static" header={{ height: 40 }} padding={0}>
      <AppShell.Header className="appHeader">
        <Container fluid h="100%" px="sm">
          <ProductHeader
            mark={
              <Box className="kotcyaMark" aria-hidden>
                <IconTrees className="kotcyaMarkTrees" size={16} stroke={2} />
                <IconPhoto className="kotcyaMarkPhoto" size={11} stroke={2.4} />
              </Box>
            }
            name="Kotcya"
            version="0.1"
            documentName={sourceFile?.name ?? '無題'}
            actions={
              <>
              <Tooltip label="ヘルプ" withArrow>
                <ActionIcon aria-label="ヘルプ" variant="subtle" color="gray" size="sm" onClick={() => setHelpOpened(true)}>
                  <IconHelp size={16} />
                </ActionIcon>
              </Tooltip>
              {sourceUrl && (
                <Button size="compact-xs" leftSection={<IconDownload size={14} />} onClick={download}>名前を付けて保存</Button>
              )}
              </>
            }
          />
        </Container>
      </AppShell.Header>

      <AppShell.Main className="appMain">
        {error && (
          <Alert
            className="globalError"
            color="red"
            role="alert"
            withCloseButton
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}
        <Container fluid p={0} h="100%">
            <div className="workspaceHost">
              <SegmentedControl
                className="mobilePaneSwitch"
                fullWidth
                value={mobilePane}
                onChange={(value) => setMobilePane(value as 'settings' | 'preview' | 'information')}
                data={[
                  { label: 'ツール', value: 'settings' },
                  { label: 'プレビュー', value: 'preview' },
                  { label: '情報', value: 'information' },
                ]}
              />
            <Splitter className="editorSplitter" orientation="horizontal" h="100%" resetOnDoubleClick withHandle={!isPhone}>
              <Splitter.Pane defaultSize={80} min={50} style={{ display: isPhone && mobilePane === 'settings' ? 'none' : undefined }}>
              <Splitter className="mainSplitter" orientation="horizontal" h="100%" resetOnDoubleClick withHandle={!isPhone}>
              <Splitter.Pane defaultSize={75} min={45} style={{ display: isPhone && mobilePane !== 'preview' ? 'none' : undefined }}>
              <Paper className="canvasPanel">
                <PaneHeader
                  title="プレビュー"
                  actions={
                    <>
                      <Tooltip label="別ウィンドウで表示" withArrow>
                        <ActionIcon aria-label="別ウィンドウで表示" variant="subtle" color="gray" size="sm" onClick={openPreviewWindow}>
                          <IconWindowMaximize size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Text size="xs" c="dimmed">{previewSize ? `${previewSize[0]} × ${previewSize[1]} px` : '処理中'}</Text>
                      <Dropzone
                        accept={acceptedImageTypes}
                        maxSize={maxFileSize}
                        maxFiles={1}
                        multiple={false}
                        onDrop={(files) => void loadFile(files[0])}
                        onReject={() => setError('30MB以下のPNG・JPEG・WebP・SVGを選択してください')}
                        className="miniDropzone"
                      ><Text size="xs" fw={600}>画像を変更</Text></Dropzone>
                    </>
                  }
                />
                <ToolBar>
                  <Switch
                    size="xs"
                    label="元画像"
                    disabled={!sourceUrl}
                    checked={showOriginal}
                    onChange={(event) => setShowOriginal(event.currentTarget.checked)}
                  />
                  <Divider orientation="vertical" mx={4} />
                  <Tooltip label="右へ90°回転">
                    <ActionIcon aria-label="右へ90度回転" disabled={!sourceUrl} variant="subtle" color="gray" size="sm" onClick={() => updateOptions({ rotation: ((options.rotation + 90) % 360) as ImageOptions['rotation'] })}><IconRotateClockwise size={16} /></ActionIcon>
                  </Tooltip>
                  <Tooltip label="左右反転">
                    <ActionIcon aria-label="左右反転" disabled={!sourceUrl} variant={options.flipX ? 'light' : 'subtle'} color={options.flipX ? 'kotcya' : 'gray'} size="sm" onClick={() => updateOptions({ flipX: !options.flipX })}><IconFlipHorizontal size={16} /></ActionIcon>
                  </Tooltip>
                  <Tooltip label="上下反転">
                    <ActionIcon aria-label="上下反転" disabled={!sourceUrl} variant={options.flipY ? 'light' : 'subtle'} color={options.flipY ? 'kotcya' : 'gray'} size="sm" onClick={() => updateOptions({ flipY: !options.flipY })}><IconFlipVertical size={16} /></ActionIcon>
                  </Tooltip>
                  <Divider orientation="vertical" mx={4} />
                    <Switch
                      size="xs" label="透明部分を切除" checked={options.trim} disabled={!sourceUrl}
                      onChange={(event) => updateOptions({ trim: event.currentTarget.checked })}
                    />
                  <Box style={{ flex: 1 }} />
                  <Tooltip label="すべての加工を取り消す">
                      <ActionIcon aria-label="すべての加工を取り消す" disabled={!sourceUrl} variant="subtle" color="gray" size="sm" onClick={() => {
                        if (sourceUrlRef.current && sourceUrlRef.current !== originalUrlRef.current) {
                          URL.revokeObjectURL(sourceUrlRef.current);
                        }
                        sourceUrlRef.current = originalUrlRef.current;
                        if (originalUrl) setSourceUrl(originalUrl);
                        setOptions(initialOptions);
                      }}><IconArrowBackUp size={18} /></ActionIcon>
                  </Tooltip>
                </ToolBar>
                {previewWindow && !previewWindow.closed ? (
                  <Box className="poppedPreviewPlaceholder">
                    <IconWindowMaximize size={26} />
                    <Text size="sm">別ウィンドウで表示中</Text>
                    <Button size="xs" variant="default" onClick={closePreviewWindow}>元に戻す</Button>
                  </Box>
                ) : previewStage}
              </Paper>
              </Splitter.Pane>
              <Splitter.Pane defaultSize={25} min="260px" max="45%" style={{ display: isPhone && mobilePane !== 'information' ? 'none' : undefined }}>
                <Paper className="infoPane">
                  <PaneHeader title="画像情報" />
                  <ImageInfoPanel
                    analysis={analysis}
                    analyzing={analyzing}
                    sourceFile={sourceFile}
                    c2paResult={c2paResult}
                    checkingC2pa={checkingC2pa}
                    onCheckC2pa={() => void runC2paCheck()}
                  />
                </Paper>
              </Splitter.Pane>
              </Splitter>
              </Splitter.Pane>

              <Splitter.Pane defaultSize={20} min="260px" max="40%" style={{ display: isPhone && mobilePane !== 'settings' ? 'none' : undefined }}>
              <Paper className="controlPanel">
                <PaneHeader title="ツール" />
                <Tabs value="edit" className="controlTabs controlTabsSingle">
                  <Tabs.Panel value="edit">
                <fieldset className="controlsFieldset" disabled={!sourceUrl}>
                <Stack gap="lg" p="lg">
                  <Box>
                    <Text fw={700} mb="sm">用途</Text>
                    <SimpleGrid cols={2} spacing="xs">
                      <Button variant="default" size="xs" onClick={() => updateOptions({ outputWidth: 1200, trim: true, padding: 48 })}>商品画像</Button>
                      <Button variant="default" size="xs" onClick={() => updateOptions({ outputWidth: 1024, trim: true, padding: 64, outlineWidth: 12 })}>ステッカー</Button>
                      <Button variant="default" size="xs" onClick={() => updateOptions({ outputWidth: 1080, trim: false, padding: 0 })}>SNS投稿</Button>
                      <Button variant="default" size="xs" onClick={() => setOptions(initialOptions)}>設定を初期化</Button>
                    </SimpleGrid>
                  </Box>

                  <Divider />
                  <Box>
                    <Text fw={700} mb={4}>人物を切り抜く</Text>
                    <Button
                      fullWidth
                      leftSection={<IconBackground size={18} />}
                      loading={processing}
                      disabled={!sourceUrl}
                      onClick={requestPersonCutout}
                    >人物を切り抜く</Button>
                    {processing && (
                      <Progress
                        value={progress}
                        animated
                        mt="sm"
                        aria-label="人物を切り抜いています"
                      />
                    )}
                  </Box>

                  <Divider />
                  <Box>
                    <Group justify="space-between" mb="xs">
                      <Text fw={700}>縁取り</Text>
                      <Text size="xs" c="dimmed">{options.outlineWidth}px</Text>
                    </Group>
                    <Slider
                      value={options.outlineWidth}
                      onChange={(outlineWidth) => updateOptions({ outlineWidth })}
                      min={0}
                      max={64}
                      label={(value) => `${value}px`}
                    />
                    <ColorInput
                      mt="sm"
                      label="縁の色"
                      value={options.outlineColor}
                      onChange={(outlineColor) => updateOptions({ outlineColor })}
                      disabled={options.outlineWidth === 0}
                    />
                  </Box>

                  <Divider />
                  <Box>
                    <Text fw={700} mb="sm">背景</Text>
                    <SegmentedControl
                      fullWidth
                      value={options.backgroundColor ? 'color' : 'transparent'}
                      onChange={(value) => updateOptions({ backgroundColor: value === 'color' ? '#ffffff' : null })}
                      data={[{ label: '透明', value: 'transparent' }, { label: '単色', value: 'color' }]}
                    />
                    {options.backgroundColor && (
                      <ColorInput mt="sm" value={options.backgroundColor} onChange={(backgroundColor) => updateOptions({ backgroundColor })} />
                    )}
                  </Box>

                  <Divider />
                  <Box>
                    <Text fw={700} mb="sm">フィルタ</Text>
                    <SimpleGrid cols={3} spacing="xs">
                      <Button variant="default" size="xs" onClick={() => updateOptions({ brightness: 100, contrast: 100, saturation: 100, vibrance: 0, warmth: 0, tint: 0, grayscale: 0 })}>標準</Button>
                      <Button variant="default" size="xs" onClick={() => updateOptions({ contrast: 110, saturation: 125, vibrance: 25, grayscale: 0 })}>鮮やか</Button>
                      <Button variant="default" size="xs" onClick={() => updateOptions({ contrast: 125, saturation: 90, highlights: -20, grayscale: 0 })}>ドラマ</Button>
                      <Button variant="default" size="xs" onClick={() => updateOptions({ contrast: 112, saturation: 100, grayscale: 100 })}>モノクロ</Button>
                      <Button variant="default" size="xs" onClick={() => updateOptions({ warmth: 28, saturation: 108, grayscale: 0 })}>暖色</Button>
                      <Button variant="default" size="xs" onClick={() => updateOptions({ warmth: -22, saturation: 104, grayscale: 0 })}>寒色</Button>
                    </SimpleGrid>
                  </Box>

                  <Divider />
                  <Box>
                    <Text fw={700} mb="sm">切り抜き比率</Text>
                    <SegmentedControl
                      fullWidth
                      size="xs"
                      value={options.cropAspect?.toString() ?? 'original'}
                      onChange={(value) => updateOptions({ cropAspect: value === 'original' ? null : Number(value) })}
                      data={[
                        { label: '元画像', value: 'original' },
                        { label: '1:1', value: '1' },
                        { label: '4:3', value: String(4 / 3) },
                        { label: '16:9', value: String(16 / 9) },
                      ]}
                    />
                  </Box>

                  <Divider />
                  <Box>
                    <Text fw={700} mb="sm">明るさ</Text>
                    {([
                      ['露出', 'exposure'],
                      ['ハイライト', 'highlights'],
                      ['シャドウ', 'shadows'],
                    ] as const).map(([label, key]) => (
                      <Box key={key} mb="sm">
                        <Group justify="space-between"><Text size="sm">{label}</Text><Text size="xs" c="dimmed">{options[key]}</Text></Group>
                        <Slider value={options[key]} onChange={(value) => updateOptions({ [key]: value })} min={-100} max={100} />
                      </Box>
                    ))}
                    {([
                      ['ブラックポイント', 'blackPoint'],
                      ['HDR効果', 'hdr'],
                    ] as const).map(([label, key]) => (
                      <Box key={key} mb="sm">
                        <Group justify="space-between"><Text size="sm">{label}</Text><Text size="xs" c="dimmed">{options[key]}</Text></Group>
                        <Slider value={options[key]} onChange={(value) => updateOptions({ [key]: value })} min={0} max={100} />
                      </Box>
                    ))}
                  </Box>

                  <Divider />
                  <Box>
                    <Text fw={700} mb="sm">カラー</Text>
                    {([
                      ['明るさ', 'brightness'],
                      ['コントラスト', 'contrast'],
                      ['彩度', 'saturation'],
                    ] as const).map(([label, key]) => (
                      <Box key={key} mb="sm">
                        <Group justify="space-between"><Text size="sm">{label}</Text><Text size="xs" c="dimmed">{options[key]}%</Text></Group>
                        <Slider value={options[key]} onChange={(value) => updateOptions({ [key]: value })} min={0} max={200} />
                      </Box>
                    ))}
                    {([
                      ['自然な彩度', 'vibrance'],
                      ['暖かみ', 'warmth'],
                      ['色合い', 'tint'],
                    ] as const).map(([label, key]) => (
                      <Box key={key} mb="sm">
                        <Group justify="space-between"><Text size="sm">{label}</Text><Text size="xs" c="dimmed">{options[key]}</Text></Group>
                        <Slider value={options[key]} onChange={(value) => updateOptions({ [key]: value })} min={-100} max={100} />
                      </Box>
                    ))}
                  </Box>

                  <Divider />
                  <Box>
                    <Text fw={700} mb="sm">ディテール</Text>
                    {([
                      ['シャープネス', 'sharpness'],
                      ['周辺光量', 'vignette'],
                      ['ぼかし', 'blur'],
                    ] as const).map(([label, key]) => (
                      <Box key={key} mb="sm">
                        <Group justify="space-between"><Text size="sm">{label}</Text><Text size="xs" c="dimmed">{options[key]}</Text></Group>
                        <Slider value={options[key]} onChange={(value) => updateOptions({ [key]: value })} min={0} max={key === 'blur' ? 20 : 100} />
                      </Box>
                    ))}
                  </Box>

                  <Box>
                    <Group justify="space-between">
                      <Text size="sm">外側の余白</Text>
                      <Text size="xs" c="dimmed">{options.padding}px</Text>
                    </Group>
                    <Slider value={options.padding} onChange={(padding) => updateOptions({ padding })} min={0} max={256} />
                  </Box>

                  <Divider />
                  <Box>
                    <Group justify="space-between" mb="xs">
                      <Text fw={700}>ドロップシャドウ</Text>
                      <Switch
                        size="xs"
                        checked={options.shadowBlur > 0}
                        onChange={(event) => updateOptions({ shadowBlur: event.currentTarget.checked ? 24 : 0 })}
                      />
                    </Group>
                    <Stack gap="xs" opacity={options.shadowBlur > 0 ? 1 : 0.45}>
                      <Box>
                        <Group justify="space-between"><Text size="sm">ぼかし</Text><Text size="xs" c="dimmed">{options.shadowBlur}px</Text></Group>
                        <Slider disabled={options.shadowBlur === 0} value={options.shadowBlur} onChange={(shadowBlur) => updateOptions({ shadowBlur })} min={1} max={80} />
                      </Box>
                      <Group grow>
                        <NumberInput label="横位置" suffix=" px" value={options.shadowOffsetX} onChange={(value) => updateOptions({ shadowOffsetX: Number(value) || 0 })} />
                        <NumberInput label="縦位置" suffix=" px" value={options.shadowOffsetY} onChange={(value) => updateOptions({ shadowOffsetY: Number(value) || 0 })} />
                      </Group>
                    </Stack>
                  </Box>

                  <NumberInput
                    label="画像の幅"
                    description="空欄なら元のサイズ"
                    placeholder="元のサイズ"
                    suffix=" px"
                    min={16}
                    max={8192}
                    value={options.outputWidth ?? ''}
                    onChange={(value) => updateOptions({ outputWidth: typeof value === 'number' ? value : null })}
                  />

                  <Divider />
                  <Box>
                    <Text fw={700} mb="sm">保存</Text>
                    <SegmentedControl
                      fullWidth
                      value={format}
                      onChange={(value) => setFormat(value as ExportFormat)}
                      data={[{ label: 'PNG', value: 'image/png' }, { label: 'JPG', value: 'image/jpeg' }, { label: 'WebP', value: 'image/webp' }]}
                    />
                    <Button fullWidth mt="sm" size="md" leftSection={<IconDownload size={19} />} onClick={download}>名前を付けて保存</Button>
                  </Box>
                </Stack>
                </fieldset>
                  </Tabs.Panel>

                  <Tabs.Panel value="metadata" p="md">
                    {analyzing && <Group gap="sm"><Loader size="sm" /><Text size="sm">調べています</Text></Group>}
                    {!analysis && <Text size="sm" c="dimmed">画像を開くと情報を表示します。</Text>}
                    {analysis && (
                      <Stack gap="md">
                        <SimpleGrid cols={2} spacing="xs">
                          {[
                            ['寸法', `${analysis.width} × ${analysis.height} px`],
                            ['縦横比', analysis.aspectRatio],
                            ['画素数', `${analysis.megapixels.toFixed(2)} MP`],
                            ['容量', formatBytes(analysis.fileSize)],
                            ['1画素あたりの容量', `${(analysis.fileSize / analysis.width / analysis.height).toFixed(2)} byte/px`],
                            ['形式', analysis.mimeType],
                            ['ファイル識別', analysis.signature],
                            ['ビット深度', analysis.bitDepth ? `${analysis.bitDepth} bit` : '—'],
                            ['カラーモデル', analysis.colorModel ?? '—'],
                            ['透明部分', analysis.hasAlpha ? 'あり' : 'なし'],
                            ['アニメーション', analysis.animated ? 'あり' : 'なし'],
                            ['平均輝度', analysis.averageLuminance.toFixed(1)],
                            ['階調幅', analysis.dynamicRange.toFixed(1)],
                            ['標本色数', analysis.colorCount.toLocaleString('ja-JP')],
                            ['黒つぶれ', `${analysis.shadowClipping.toFixed(2)}%`],
                            ['白飛び', `${analysis.highlightClipping.toFixed(2)}%`],
                            ['ファイル更新日時', sourceFile ? new Date(sourceFile.lastModified).toLocaleString('ja-JP') : '—'],
                          ].map(([label, value]) => (
                            <Box key={label} className="resultCell">
                              <Text size="xs" c="dimmed">{label}</Text>
                              <Text size="sm" fw={600}>{value}</Text>
                            </Box>
                          ))}
                        </SimpleGrid>
                        <Box>
                          <Text size="xs" c="dimmed" mb={6}>主要色</Text>
                          <Group gap={6}>
                            <Tooltip label={`平均 ${analysis.averageColor}`}>
                              <button className="colorSwatch averageSwatch" style={{ backgroundColor: analysis.averageColor }} aria-label={`平均色 ${analysis.averageColor}`} onClick={() => void navigator.clipboard.writeText(analysis.averageColor)} />
                            </Tooltip>
                            {analysis.palette.map((color) => (
                              <Tooltip key={color} label={color}>
                                <button className="colorSwatch" style={{ backgroundColor: color }} aria-label={color} onClick={() => void navigator.clipboard.writeText(color)} />
                              </Tooltip>
                            ))}
                          </Group>
                        </Box>
                        <Box>
                          <Text size="xs" c="dimmed">知覚ハッシュ</Text>
                          <Text className="hashValue" size="xs">{analysis.perceptualHash}</Text>
                        </Box>
                        <Box>
                          <Text size="xs" c="dimmed">SHA-256</Text>
                          <Text className="hashValue" size="xs">{analysis.sha256}</Text>
                        </Box>
                      </Stack>
                    )}
                    <Divider my="lg" />
                    <Text fw={700} size="sm" mb="xs">メタデータ</Text>
                    {analysis && Object.keys(analysis.metadata).length === 0 && <Text size="sm" c="dimmed">画像に付加情報はありません。</Text>}
                    {analysis && (
                      <Stack gap={0} className="metadataList">
                        {Object.entries(analysis.metadata).map(([key, value]) => (
                          <Box key={key} className="metadataRow">
                            <Text size="xs" c="dimmed">{metadataLabel(key)}</Text>
                            <Text size="xs" className="metadataValue">{value}</Text>
                          </Box>
                        ))}
                      </Stack>
                    )}
                    <Divider my="lg" />
                    <Box>
                      <Text fw={700} size="sm">生成情報</Text>
                      <Text size="xs" c="dimmed" mt={4} mb="sm">コンテンツ認証情報を検証します。</Text>
                      <Button
                        size="xs"
                        variant="default"
                        loading={checkingC2pa}
                        disabled={!sourceFile}
                        onClick={() => void runC2paCheck()}
                      >
                        生成情報を確認
                      </Button>
                      {c2paResult && (
                        <Box className="c2paResult" mt="md">
                          <Group justify="space-between" align="flex-start" wrap="nowrap">
                            <Box>
                              <Text fw={700} size="sm">
                                {!c2paResult.found
                                  ? 'コンテンツ認証情報なし'
                                  : c2paResult.generatedByAi
                                    ? `${c2paResult.provider ?? '生成AI'}で作成`
                                    : c2paResult.editedWithAi
                                      ? '生成AI素材を含む画像'
                                      : 'コンテンツ認証情報あり'}
                              </Text>
                              {c2paResult.generators.map((generator) => (
                                <Text key={generator} size="xs" mt={3}>{generator}</Text>
                              ))}
                            </Box>
                            {c2paResult.found && (
                              <Badge
                                size="xs"
                                color={c2paResult.validationState === 'Invalid' ? 'red' : 'kotcya'}
                              >
                                {({
                                  Trusted: '信頼済み',
                                  Valid: '有効',
                                  Invalid: '無効',
                                  Unknown: '未確認',
                                } as const)[c2paResult.validationState]}
                              </Badge>
                            )}
                          </Group>

                          {c2paResult.found && (
                            <Stack gap="md" mt="md">
                              <SimpleGrid cols={2} spacing="xs">
                                <Box>
                                  <Text size="xs" c="dimmed">タイトル</Text>
                                  <Text size="xs">{c2paResult.title ?? '—'}</Text>
                                </Box>
                                <Box>
                                  <Text size="xs" c="dimmed">形式</Text>
                                  <Text size="xs">{c2paResult.format ?? '—'}</Text>
                                </Box>
                                <Box>
                                  <Text size="xs" c="dimmed">来歴</Text>
                                  <Text size="xs">{c2paResult.manifestCount}件</Text>
                                </Box>
                                <Box>
                                  <Text size="xs" c="dimmed">使用素材</Text>
                                  <Text size="xs">{c2paResult.ingredientCount}件</Text>
                                </Box>
                              </SimpleGrid>

                              {c2paResult.signature && (
                                <Box>
                                  <Text size="xs" fw={700} mb={4}>署名</Text>
                                  <Text size="xs">{c2paResult.signature.commonName ?? c2paResult.signature.issuer ?? '署名者情報あり'}</Text>
                                  {c2paResult.signature.algorithm && <Text size="xs" c="dimmed">方式：{c2paResult.signature.algorithm}</Text>}
                                  {c2paResult.signature.signedAt && <Text size="xs" c="dimmed">日時：{new Date(c2paResult.signature.signedAt).toLocaleString('ja-JP')}</Text>}
                                </Box>
                              )}

                              {c2paResult.actions.length > 0 && (
                                <Box>
                                  <Text size="xs" fw={700} mb={4}>操作履歴</Text>
                                  {c2paResult.actions.map((action, index) => (
                                    <Box key={`${action.action}-${index}`} className="c2paAction">
                                      <Text size="xs" fw={600}>{action.action}</Text>
                                      {action.sourceType && <Text size="xs">{action.sourceType}</Text>}
                                      {action.software && <Text size="xs" c="dimmed">{action.software}</Text>}
                                    </Box>
                                  ))}
                                </Box>
                              )}

                              {c2paResult.validations.length > 0 && (
                                <Box>
                                  <Text size="xs" fw={700} mb={4}>検証結果</Text>
                                  {c2paResult.validations.map((validation, index) => (
                                    <Group key={`${validation.code}-${index}`} gap={6} wrap="nowrap" align="flex-start" className="validationRow">
                                      <Badge
                                        size="xs"
                                        color={validation.level === 'failure' ? 'red' : validation.level === 'information' ? 'gray' : 'kotcya'}
                                      >
                                        {validation.level === 'failure' ? '問題' : validation.level === 'information' ? '情報' : '確認'}
                                      </Badge>
                                      <Text size="xs">{validation.explanation ?? validation.code}</Text>
                                    </Group>
                                  ))}
                                </Box>
                              )}
                            </Stack>
                          )}
                        </Box>
                      )}
                    </Box>
                  </Tabs.Panel>
                </Tabs>
              </Paper>
              </Splitter.Pane>
            </Splitter>
            </div>
        </Container>
      </AppShell.Main>
      {previewWindow && !previewWindow.closed && createPortal(
        <div className="popoutPreview">
          <PaneHeader
            title="プレビュー"
            actions={<Button size="compact-xs" variant="subtle" color="gray" onClick={closePreviewWindow}>元に戻す</Button>}
          />
          {previewStage}
        </div>,
        previewWindow.document.body,
      )}
      <Modal
        opened={cutoutConsentOpened}
        onClose={() => setCutoutConsentOpened(false)}
        title="人物を切り抜く"
        centered
        size="sm"
        closeButtonProps={{ 'aria-label': '閉じる' }}
      >
        <Stack gap="md">
          <Text size="sm">
            初回はGoogleとjsDelivrから実行データを取得します。画像自体は送信しません。
            MediaPipeの診断情報や利用状況はGoogleへ送信されます。
          </Text>
          <Anchor
            size="sm"
            href="https://developers.google.com/edge/mediapipe/solutions/tasks"
            target="_blank"
            rel="noopener noreferrer"
          >
            MediaPipeのプライバシー情報
          </Anchor>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setCutoutConsentOpened(false)}>キャンセル</Button>
            <Button onClick={acceptPersonCutout}>続ける</Button>
          </Group>
        </Stack>
      </Modal>
      <Suspense fallback={null}>
        {helpOpened && <HelpModal opened onClose={() => setHelpOpened(false)} />}
      </Suspense>
    </AppShell>
  );
}
