import {
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import type { ImageAnalysis } from './imageAnalysis';
import type { C2paResult } from './c2paCheck';

type ImageInfoPanelProps = {
  analysis: ImageAnalysis | null;
  analyzing: boolean;
  sourceFile: File | null;
  c2paResult: C2paResult | null;
  checkingC2pa: boolean;
  onCheckC2pa: () => void;
};

const metadataLabels: Record<string, string> = {
  Make: 'カメラメーカー',
  Model: 'カメラ',
  LensMake: 'レンズメーカー',
  LensModel: 'レンズ',
  Software: '使用ソフトウェア',
  Artist: '作成者',
  Creator: '作成者',
  Copyright: '著作権',
  ImageDescription: '説明',
  Description: '説明',
  Title: 'タイトル',
  Subject: 'キーワード',
  Keywords: 'キーワード',
  Rating: '評価',
  DateTimeOriginal: '撮影日時',
  CreateDate: '作成日時',
  ModifyDate: '更新日時',
  OffsetTimeOriginal: '撮影地の時差',
  ExposureTime: 'シャッター速度',
  FNumber: '絞り値',
  ISO: 'ISO感度',
  FocalLength: '焦点距離',
  FocalLengthIn35mmFormat: '35mm換算焦点距離',
  ExposureBiasValue: '露出補正',
  ExposureProgram: '露出プログラム',
  MeteringMode: '測光方式',
  Flash: 'フラッシュ',
  WhiteBalance: 'ホワイトバランス',
  Orientation: '向き',
  latitude: '緯度',
  longitude: '経度',
  GPSAltitude: '標高',
  GPSDateStamp: 'GPS日付',
  GPSTimeStamp: 'GPS時刻',
  XResolution: '水平解像度',
  YResolution: '垂直解像度',
  ResolutionUnit: '解像度単位',
  ColorSpace: '色空間',
  ProfileDescription: 'カラープロファイル',
  ProfileCopyright: 'プロファイル著作権',
  BitsPerSample: 'チャンネルごとのビット数',
  Compression: '圧縮方式',
  Interlace: 'インターレース',
};

const metadataLabel = (key: string) =>
  metadataLabels[key]
  ?? key.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' ');

const formatBytes = (bytes: number) =>
  new Intl.NumberFormat('ja-JP', { style: 'unit', unit: 'megabyte', maximumFractionDigits: 2 })
    .format(bytes / 1024 / 1024);

const validationLabel = {
  Trusted: '信頼済み',
  Valid: '有効',
  Invalid: '無効',
  Unknown: '未確認',
} as const;

const validationMessage = (code: string, explanation: string | null) => {
  const message = explanation ?? code;
  return message
    .replace(/^timestamp message digest matched: /i, 'タイムスタンプのダイジェストを確認：')
    .replace(/^claim signature valid$/i, '署名を確認')
    .replace(/^hashed uri matched: /i, '参照データのハッシュを確認：')
    .replace(/^data hash valid$/i, '画像データのハッシュを確認')
    .replace(/^timestamp cert untrusted: /i, 'タイムスタンプ証明書の発行元を信頼ストアで確認できません：')
    .replace(/^signing certificate untrusted$/i, '署名証明書の発行元を信頼ストアで確認できません');
};

export function ImageInfoPanel({
  analysis,
  analyzing,
  sourceFile,
  c2paResult,
  checkingC2pa,
  onCheckC2pa,
}: ImageInfoPanelProps) {
  const hasTrustIssue = c2paResult?.validations.some((item) =>
    item.level === 'failure' && /untrusted|trust/i.test(`${item.code} ${item.explanation ?? ''}`),
  ) ?? false;

  return (
    <Box className="infoPanel" p="md">
      {analyzing && <Group gap="sm"><Loader size="sm" /><Text size="sm">調べています</Text></Group>}
      {!analysis && !analyzing && <Text size="sm" c="dimmed">画像を開くと情報を表示します。</Text>}
      {analysis && (
        <>
          <Stack gap="md">
            <SimpleGrid cols={{ base: 2, lg: 3 }} spacing="xs">
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
            <Group grow align="flex-start">
              <Box>
                <Text size="xs" c="dimmed">知覚ハッシュ</Text>
                <Text className="hashValue" size="xs">{analysis.perceptualHash}</Text>
              </Box>
              <Box>
                <Text size="xs" c="dimmed">SHA-256</Text>
                <Text className="hashValue" size="xs">{analysis.sha256}</Text>
              </Box>
            </Group>
          </Stack>

          <Divider my="lg" />
          <Text fw={700} size="sm" mb="xs">メタデータ</Text>
          {Object.keys(analysis.metadata).length === 0 && <Text size="sm" c="dimmed">画像に付加情報はありません。</Text>}
          <div className="metadataGrid">
            {Object.entries(analysis.metadata).map(([key, value]) => (
              <Box key={key} className="metadataRow">
                <Text size="xs" c="dimmed">{metadataLabel(key)}</Text>
                <Text size="xs" className="metadataValue">{value}</Text>
              </Box>
            ))}
          </div>
        </>
      )}

      <Divider my="lg" />
      <Box>
        <Text fw={700} size="sm">生成情報</Text>
        <Text size="xs" c="dimmed" mt={4} mb="sm">コンテンツ認証情報を検証します。</Text>
        <Button size="xs" variant="default" loading={checkingC2pa} disabled={!sourceFile} onClick={onCheckC2pa}>
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
                {c2paResult.generators.map((generator) => <Text key={generator} size="xs" mt={3}>{generator}</Text>)}
              </Box>
              {c2paResult.found && (
                <Badge size="xs" color={c2paResult.validationState === 'Invalid' ? 'red' : hasTrustIssue ? 'yellow' : 'kotcya'}>
                  {hasTrustIssue && c2paResult.validationState !== 'Invalid'
                    ? '署名有効・信頼未確認'
                    : validationLabel[c2paResult.validationState]}
                </Badge>
              )}
            </Group>

            {c2paResult.found && (
              <Stack gap="md" mt="md">
                <SimpleGrid cols={2} spacing="xs">
                  {[
                    ['タイトル', c2paResult.title ?? '—'],
                    ['形式', c2paResult.format ?? '—'],
                    ['来歴', `${c2paResult.manifestCount}件`],
                    ['使用素材', `${c2paResult.ingredientCount}件`],
                  ].map(([label, value]) => (
                    <Box key={label}><Text size="xs" c="dimmed">{label}</Text><Text size="xs">{value}</Text></Box>
                  ))}
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
                        <Badge size="xs" color={validation.level === 'failure' ? 'red' : validation.level === 'information' ? 'gray' : 'kotcya'}>
                          {validation.level === 'failure' ? '問題' : validation.level === 'information' ? '情報' : '確認'}
                        </Badge>
                        <Text size="xs">{validationMessage(validation.code, validation.explanation)}</Text>
                      </Group>
                    ))}
                  </Box>
                )}
              </Stack>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}
