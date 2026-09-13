import wasmSrc from '@contentauth/c2pa-web/resources/c2pa.wasm?url';
import type { ManifestAssertion, ValidationState, ValidationStatus } from '@contentauth/c2pa-web';

export type C2paAction = {
  action: string;
  sourceType: string | null;
  software: string | null;
  when: string | null;
};

export type C2paValidation = {
  level: 'success' | 'information' | 'failure';
  code: string;
  explanation: string | null;
};

export type C2paResult = {
  found: boolean;
  validationState: ValidationState | 'Unknown';
  generatedByAi: boolean;
  editedWithAi: boolean;
  provider: string | null;
  title: string | null;
  format: string | null;
  generators: string[];
  actions: C2paAction[];
  manifestCount: number;
  ingredientCount: number;
  signature: {
    issuer: string | null;
    commonName: string | null;
    algorithm: string | null;
    signedAt: string | null;
  } | null;
  validations: C2paValidation[];
};

const providerPatterns: Array<[RegExp, string]> = [
  [/openai|dall.?e/i, 'OpenAI DALL·E'],
  [/google|imagen/i, 'Google Imagen'],
  [/microsoft|designer/i, 'Microsoft Designer'],
  [/adobe|firefly/i, 'Adobe Firefly'],
];

const sourceTypeLabels: Record<string, string> = {
  trainedAlgorithmicMedia: '生成AIによる作成',
  compositeWithTrainedAlgorithmicMedia: '生成AI素材との合成',
  algorithmicallyEnhanced: 'アルゴリズムによる補正',
  digitalCapture: 'デジタル撮影',
  computationalCapture: 'コンピュテーショナル撮影',
  humanEdits: '人による編集',
  minorHumanEdits: '人による軽微な編集',
  digitalArt: 'デジタルアート',
  digitalCreation: 'デジタル制作',
};

const actionLabels: Record<string, string> = {
  'c2pa.created': '作成',
  'c2pa.opened': '編集開始',
  'c2pa.edited': '編集',
  'c2pa.placed': '素材を配置',
  'c2pa.cropped': '切り抜き',
  'c2pa.filtered': 'フィルタ',
  'c2pa.color_adjustments': '色調整',
};

let sdkPromise: ReturnType<typeof import('@contentauth/c2pa-web')['createC2pa']> | null = null;

const sourceTypeLabel = (value: string) => {
  const key = value.split('/').pop() ?? value;
  return sourceTypeLabels[key] ?? key;
};

const softwareName = (value: unknown) => {
  if (typeof value === 'string') return value;
  if (typeof value !== 'object' || value === null) return null;
  const agent = value as Record<string, unknown>;
  if (typeof agent.name !== 'string') return null;
  return typeof agent.version === 'string' ? `${agent.name} ${agent.version}` : agent.name;
};

const extractActions = (assertions: ManifestAssertion[] | undefined): C2paAction[] =>
  (assertions ?? [])
    .filter((assertion) => assertion.label.startsWith('c2pa.actions'))
    .flatMap((assertion) => {
      const data = assertion.data as { actions?: Array<Record<string, unknown>> };
      return data.actions ?? [];
    })
    .map((action) => ({
      action: actionLabels[String(action.action)] ?? String(action.action).replace(/^c2pa\./, ''),
      sourceType: typeof action.digitalSourceType === 'string'
        ? sourceTypeLabel(action.digitalSourceType)
        : null,
      software: softwareName(action.softwareAgent),
      when: typeof action.when === 'string' ? action.when : null,
    }));

const validationEntry = (
  level: C2paValidation['level'],
  item: ValidationStatus,
): C2paValidation => ({
  level,
  code: item.code,
  explanation: item.explanation ?? null,
});

export async function checkC2pa(file: Blob): Promise<C2paResult> {
  const { createC2pa } = await import('@contentauth/c2pa-web');
  sdkPromise ??= createC2pa({ wasmSrc });
  const sdk = await sdkPromise;
  const reader = await sdk.reader.fromBlob(file.type, file);

  if (!reader) {
    return {
      found: false,
      validationState: 'Unknown',
      generatedByAi: false,
      editedWithAi: false,
      provider: null,
      title: null,
      format: null,
      generators: [],
      actions: [],
      manifestCount: 0,
      ingredientCount: 0,
      signature: null,
      validations: [],
    };
  }

  try {
    const [manifest, store] = await Promise.all([
      reader.activeManifest(),
      reader.manifestStore(),
    ]);
    const serialized = JSON.stringify({ manifest, store });
    const actions = extractActions(manifest.assertions);
    const activeValidation = store.validation_results?.activeManifest;
    const rawValidations = [
      ...(activeValidation?.success ?? []).map((item) => validationEntry('success', item)),
      ...(activeValidation?.informational ?? []).map((item) => validationEntry('information', item)),
      ...(activeValidation?.failure ?? []).map((item) => validationEntry('failure', item)),
      ...(!activeValidation ? (store.validation_status ?? []).map((item) =>
        validationEntry(item.success === false ? 'failure' : item.success ? 'success' : 'information', item),
      ) : []),
    ];
    const validations = rawValidations.filter((item, index, items) =>
      items.findIndex((candidate) =>
        candidate.level === item.level
        && (candidate.explanation ?? candidate.code) === (item.explanation ?? item.code),
      ) === index,
    );
    const generators = [
      ...(manifest.claim_generator ? [manifest.claim_generator] : []),
      ...(manifest.claim_generator_info ?? []).map((item) =>
        item.version ? `${item.name} ${item.version}` : item.name,
      ),
    ];
    const sourceTypes = actions.map((action) => action.sourceType);
    const signature = manifest.signature_info;

    return {
      found: true,
      validationState: store.validation_state ?? 'Unknown',
      generatedByAi: sourceTypes.includes('生成AIによる作成'),
      editedWithAi: sourceTypes.includes('生成AI素材との合成'),
      provider: providerPatterns.find(([pattern]) => pattern.test(serialized))?.[1] ?? null,
      title: manifest.title ?? null,
      format: manifest.format ?? null,
      generators: [...new Set(generators)],
      actions,
      manifestCount: Object.keys(store.manifests ?? {}).length,
      ingredientCount: manifest.ingredients?.length ?? 0,
      signature: signature ? {
        issuer: signature.issuer ?? null,
        commonName: signature.common_name ?? null,
        algorithm: signature.alg ?? null,
        signedAt: signature.time ?? null,
      } : null,
      validations,
    };
  } finally {
    await reader.free();
  }
}
