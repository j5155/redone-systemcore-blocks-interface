/**
 * Extensions — the escape hatch.
 *
 * Everything in ../systemcore-blocks-interface's RobotPy scope is reachable here,
 * but NONE of it is in the toolbox by default. The user loads a class as an
 * "extension" (like a Scratch extension); only then do generic call / value /
 * enum blocks for that class appear in a dynamic flyout.
 *
 * The generic blocks (`sc_ext_call`, `sc_ext_value`, `sc_ext_enum`) are the same
 * escape-hatch idea as the old A301-only advanced blocks, generalized to any
 * class in the generated catalog.
 */
import * as Blockly from 'blockly';
import {Order, type PythonGenerator} from 'blockly/python';
import {
  loadCatalog,
  methodLabel,
  returnsValue,
  simpleName,
  surfacedMethods,
  type ApiClass,
} from './apiCatalog';
import {
  A301_CLASS_NAME,
  A301_INSTANCE_METHODS,
  A301_VALUE_METHODS,
} from './generated/a301';

const extensionColour = '#5C81A6';

export const EXTENSIONS_TOOLBOX_CATEGORY = 'SYSTEMCORE_EXTENSIONS';
export const ADD_EXTENSION_CALLBACK = 'ADD_EXTENSION';
export const WPILIB_SENSORS_EXTENSION_ID = 'handwrapped:wpilib-sensors';
export const REV_SENSORS_EXTENSION_ID = 'handwrapped:rev-sensors';

export const handWrappedExtensions = [
  {
    id: WPILIB_SENSORS_EXTENSION_ID,
    name: 'WPILib Sensors',
    summary:
      'Digital inputs, analog sensors, encoders, and duty-cycle encoders.',
    color: '#FF4C4C',
    chips: ['DIO', 'Analog', 'Encoders'],
  },
  {
    id: REV_SENSORS_EXTENSION_ID,
    name: 'REV Sensors',
    summary: 'REV color sensor readings, proximity, and connection status.',
    color: '#FF8C1A',
    chips: ['Color', 'Proximity', 'I2C'],
  },
] as const;

const handWrappedExtensionIds = new Set(
  handWrappedExtensions.map((extension) => extension.id),
);

export const isHandWrappedExtension = (id: string) =>
  handWrappedExtensionIds.has(id as (typeof handWrappedExtensions)[number]['id']);

// ---------------------------------------------------------------------------
// Loaded-extension registry
// ---------------------------------------------------------------------------

const loadedExtensions = new Set<string>();
const listeners = new Set<() => void>();

export const getLoadedExtensions = () => Array.from(loadedExtensions);

export const isExtensionLoaded = (className: string) =>
  loadedExtensions.has(className);

const notify = () => listeners.forEach((listener) => listener());

export const addExtension = (className: string) => {
  if (!loadedExtensions.has(className)) {
    loadedExtensions.add(className);
    notify();
  }
};

export const removeExtension = (className: string) => {
  if (loadedExtensions.delete(className)) {
    notify();
  }
};

export const setLoadedExtensions = (classNames: string[]) => {
  loadedExtensions.clear();
  for (const className of classNames) {
    if (typeof className === 'string' && className.trim()) {
      loadedExtensions.add(className);
    }
  }
  notify();
};

export const onExtensionsChanged = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

// ---------------------------------------------------------------------------
// Generic escape-hatch block definitions
// ---------------------------------------------------------------------------

const targetDefault = (cls: ApiClass) =>
  `self.${simpleName(cls.className).replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase()}`;

const scExtCall = {
  type: 'sc_ext_call',
  message0: 'call %1 . %2 ( %3 )',
  args0: [
    {type: 'field_input', name: 'TARGET', text: 'self.device', spellcheck: false},
    {type: 'field_label_serializable', name: 'METHOD', text: 'method'},
    {type: 'field_input', name: 'ARGS', text: '', spellcheck: false},
  ],
  previousStatement: 'Command',
  nextStatement: 'Command',
  colour: extensionColour,
  tooltip: 'Escape hatch: call a RobotPy method as a command.',
  helpUrl: '',
};

const scExtValue = {
  type: 'sc_ext_value',
  message0: '%1 . %2 ( %3 )',
  args0: [
    {type: 'field_input', name: 'TARGET', text: 'self.device', spellcheck: false},
    {type: 'field_label_serializable', name: 'METHOD', text: 'method'},
    {type: 'field_input', name: 'ARGS', text: '', spellcheck: false},
  ],
  output: null,
  colour: extensionColour,
  tooltip: 'Escape hatch: read the result of a RobotPy method.',
  helpUrl: '',
};

const scExtEnum = {
  type: 'sc_ext_enum',
  message0: '%1 . %2',
  args0: [
    {type: 'field_label_serializable', name: 'ENUM', text: 'Enum'},
    {type: 'field_label_serializable', name: 'VALUE', text: 'value'},
  ],
  output: null,
  colour: extensionColour,
  tooltip: 'Escape hatch: a RobotPy enum value.',
  helpUrl: '',
};

export const extensionBlocks = Blockly.common.createBlockDefinitionsFromJsonArray([
  scExtCall,
  scExtValue,
  scExtEnum,
]);

// ---------------------------------------------------------------------------
// Python generators for the escape-hatch blocks
// ---------------------------------------------------------------------------

const importForDotted = (generator: PythonGenerator, dotted: string) => {
  const root = dotted.split('.')[0];
  if (!root || root === 'self') return;
  (generator as unknown as {definitions_: Record<string, string>}).definitions_[
    `import_${root}`
  ] = `import ${root}`;
};

const callExpression = (block: Blockly.Block, generator: PythonGenerator) => {
  const target = (block.getFieldValue('TARGET') || 'self.device').trim();
  const method = block.getFieldValue('METHOD');
  const args = (block.getFieldValue('ARGS') || '').trim();
  importForDotted(generator, target);
  return `${target}.${method}(${args})`;
};

export const extensionForBlock = Object.create(null);

extensionForBlock['sc_ext_call'] = function (
  block: Blockly.Block,
  generator: PythonGenerator,
) {
  return `commands2.InstantCommand(lambda: ${callExpression(block, generator)}),\n`;
};

extensionForBlock['sc_ext_value'] = function (
  block: Blockly.Block,
  generator: PythonGenerator,
) {
  return [callExpression(block, generator), Order.FUNCTION_CALL];
};

extensionForBlock['sc_ext_enum'] = function (
  block: Blockly.Block,
  generator: PythonGenerator,
) {
  const enumName = block.getFieldValue('ENUM');
  const value = block.getFieldValue('VALUE');
  importForDotted(generator, enumName);
  return [`${enumName}.${value}`, Order.MEMBER];
};

// ---------------------------------------------------------------------------
// Dynamic flyout for the Extensions category
// ---------------------------------------------------------------------------

type FlyoutItem = {kind: string; [key: string]: unknown};

const callBlockFor = (cls: ApiClass, method: {name: string; args: {name: string}[]}): FlyoutItem => ({
  kind: 'block',
  type: 'sc_ext_call',
  fields: {
    TARGET: targetDefault(cls),
    METHOD: method.name,
    ARGS: method.args.map((arg) => arg.name).join(', '),
  },
});

const valueBlockFor = (cls: ApiClass, method: {name: string; args: {name: string}[]}): FlyoutItem => ({
  kind: 'block',
  type: 'sc_ext_value',
  fields: {
    TARGET: targetDefault(cls),
    METHOD: method.name,
    ARGS: method.args.map((arg) => arg.name).join(', '),
  },
});

const enumBlocksFor = (cls: ApiClass): FlyoutItem[] => {
  const items: FlyoutItem[] = [];
  for (const enumData of cls.enums) {
    for (const value of enumData.values) {
      items.push({
        kind: 'block',
        type: 'sc_ext_enum',
        fields: {ENUM: enumData.name, VALUE: value},
      });
    }
  }
  return items;
};

const firstA301Method = (
  methods: typeof A301_INSTANCE_METHODS,
  preferredId: string,
) =>
  methods.find((method) => method.id === preferredId)?.id ||
  methods[0]?.id ||
  '';

const a301BlocksFor = (): FlyoutItem[] => [
  {
    kind: 'block',
    type: 'sc_a301_advanced_call',
    fields: {
      METHOD: firstA301Method(A301_INSTANCE_METHODS, 'clearFaults'),
    },
  },
  {
    kind: 'block',
    type: 'sc_a301_advanced_value',
    fields: {
      METHOD: firstA301Method(A301_VALUE_METHODS, 'getThrottle'),
    },
  },
];

// The catalog is loaded lazily. Once loaded we cache class lookups so the
// (synchronous) toolbox callback can build flyouts immediately.
let classIndex: Map<string, ApiClass> | null = null;

export const ensureCatalogLoaded = async () => {
  const catalog = await loadCatalog();
  classIndex = catalog.classByName;
  return catalog;
};

export const buildExtensionsFlyout = (): FlyoutItem[] => {
  const contents: FlyoutItem[] = [
    {
      kind: 'button',
      text: 'Add extension…',
      callbackkey: ADD_EXTENSION_CALLBACK,
    },
  ];

  const loaded = getLoadedExtensions().filter(
    (className) => !isHandWrappedExtension(className),
  );
  if (!loaded.length) {
    contents.push({
      kind: 'label',
      text: 'No generated API classes loaded.',
    });
    return contents;
  }

  for (const className of loaded) {
    const cls = classIndex?.get(className);
    contents.push({kind: 'label', text: className});
    if (className === A301_CLASS_NAME) {
      contents.push(...a301BlocksFor());
      continue;
    }
    if (!cls) continue;

    for (const method of surfacedMethods(cls)) {
      contents.push(
        returnsValue(method) ? valueBlockFor(cls, method) : callBlockFor(cls, method),
      );
    }
    contents.push(...enumBlocksFor(cls));
  }

  return contents;
};

/**
 * Registers the escape-hatch blocks, generators, the dynamic Extensions
 * category and the "Add extension…" button. `onAddExtension` is invoked when the
 * user clicks that button (the host app shows the picker UI).
 */
export const registerExtensions = (
  workspace: Blockly.WorkspaceSvg,
  pythonGenerator: PythonGenerator,
  onAddExtension: () => void,
) => {
  if (!Blockly.Blocks['sc_ext_call']) {
    Blockly.common.defineBlocks(extensionBlocks);
  }
  Object.assign(pythonGenerator.forBlock, extensionForBlock);

  workspace.registerToolboxCategoryCallback(
    EXTENSIONS_TOOLBOX_CATEGORY,
    () => buildExtensionsFlyout(),
  );

  workspace.registerButtonCallback(ADD_EXTENSION_CALLBACK, () => {
    onAddExtension();
  });

  // Refresh the flyout whenever the loaded set changes. The catalog is only
  // fetched on demand (when the picker opens), so nothing generated is loaded
  // until the user asks for it.
  onExtensionsChanged(() => {
    workspace.getToolbox()?.refreshSelection();
  });
};
