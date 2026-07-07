/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly';

const scratchPalette = {
  motion: {
    primary: '#4C97FF',
    secondary: '#4280D7',
    tertiary: '#3373CC',
  },
  looks: {
    primary: '#9966FF',
    secondary: '#855CD6',
    tertiary: '#774DCB',
  },
  sound: {
    primary: '#CF63CF',
    secondary: '#C94FC9',
    tertiary: '#BD42BD',
  },
  events: {
    primary: '#FFBF00',
    secondary: '#E6AC00',
    tertiary: '#CC9900',
  },
  control: {
    primary: '#FFAB19',
    secondary: '#EC9C13',
    tertiary: '#CF8B17',
  },
  sensing: {
    primary: '#5CB1D6',
    secondary: '#47A8D1',
    tertiary: '#2E8EB8',
  },
  operators: {
    primary: '#59C059',
    secondary: '#46B946',
    tertiary: '#389438',
  },
  variables: {
    primary: '#FF8C1A',
    secondary: '#FF8000',
    tertiary: '#DB6E00',
  },
  myBlocks: {
    primary: '#FF6680',
    secondary: '#FF4D6A',
    tertiary: '#FF3355',
  },
  lists: {
    primary: '#FF661A',
    secondary: '#FF5500',
    tertiary: '#E64D00',
  },
} as const;

const blockStyle = (
  color: (typeof scratchPalette)[keyof typeof scratchPalette],
  overrides: Partial<Blockly.Theme.BlockStyle> = {},
) => ({
  colourPrimary: color.primary,
  colourSecondary: color.secondary,
  colourTertiary: color.tertiary,
  ...overrides,
});

export const scratchTheme = Blockly.Theme.defineTheme('scratch', {
  name: 'scratch',
  base: Blockly.Themes.Classic,
  blockStyles: {
    motion_blocks: blockStyle(scratchPalette.motion),
    looks_blocks: blockStyle(scratchPalette.looks),
    sound_blocks: blockStyle(scratchPalette.sound),
    event_blocks: blockStyle(scratchPalette.events),
    events_blocks: blockStyle(scratchPalette.events),
    hat_blocks: blockStyle(scratchPalette.events, {hat: 'cap'}),
    control_blocks: blockStyle(scratchPalette.control),
    loop_blocks: blockStyle(scratchPalette.control),
    sensing_blocks: blockStyle(scratchPalette.sensing),
    operators_blocks: blockStyle(scratchPalette.operators),
    logic_blocks: blockStyle(scratchPalette.operators),
    math_blocks: blockStyle(scratchPalette.operators),
    text_blocks: blockStyle(scratchPalette.operators),
    variable_blocks: blockStyle(scratchPalette.variables),
    variable_dynamic_blocks: blockStyle(scratchPalette.variables),
    list_blocks: blockStyle(scratchPalette.lists),
    procedure_blocks: blockStyle(scratchPalette.myBlocks),
    colour_blocks: blockStyle(scratchPalette.looks),
  },
  categoryStyles: {
    motion_category: {colour: scratchPalette.motion.primary},
    looks_category: {colour: scratchPalette.looks.primary},
    sound_category: {colour: scratchPalette.sound.primary},
    events_category: {colour: scratchPalette.events.primary},
    control_category: {colour: scratchPalette.control.primary},
    sensing_category: {colour: scratchPalette.sensing.primary},
    operators_category: {colour: scratchPalette.operators.primary},
    variables_category: {colour: scratchPalette.variables.primary},
    variable_category: {colour: scratchPalette.variables.primary},
    myblocks_category: {colour: scratchPalette.myBlocks.primary},
    procedure_category: {colour: scratchPalette.myBlocks.primary},
    list_category: {colour: scratchPalette.lists.primary},
    logic_category: {colour: scratchPalette.operators.primary},
    loop_category: {colour: scratchPalette.control.primary},
    math_category: {colour: scratchPalette.operators.primary},
    text_category: {colour: scratchPalette.operators.primary},
    colour_category: {colour: scratchPalette.looks.primary},
  },
});

export const applyScratchBlockPaletteOverrides = () => {
  for (const blockType of [
    'controls_if',
    'controls_ifelse',
    'controls_if_if',
    'controls_if_elseif',
    'controls_if_else',
  ]) {
    const blockDefinition = Blockly.Blocks[blockType];
    const originalInit = blockDefinition?.init;

    if (!originalInit) continue;

    blockDefinition.init = function (this: Blockly.Block) {
      originalInit.call(this);
      this.setStyle('control_blocks');
    };
  }
};
