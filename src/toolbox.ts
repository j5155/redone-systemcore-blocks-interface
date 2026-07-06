import {EXTENSIONS_TOOLBOX_CATEGORY} from './extensions';

type ToolboxInput = {
  shadow?: ToolboxBlock;
  block?: ToolboxBlock;
};

type ToolboxBlock = {
  kind: 'block';
  type: string;
  fields?: Record<string, unknown>;
  inputs?: Record<string, ToolboxInput>;
  next?: {
    block: ToolboxBlock;
  };
};

const categoryCss = (name: string) => ({
  row: `blocklyToolboxCategory systemcore-category systemcore-category-${name}`,
});

const numberShadow = (value: number): ToolboxBlock => ({
  kind: 'block',
  type: 'math_number',
  fields: {
    NUM: value,
  },
});

// Motor blocks in the flyout leave DEVICE unset so the field defaults to the
// first registered motor (the motor list is managed in the Motors modal).
const runForSecondsBlock = (): ToolboxBlock => ({
  kind: 'block',
  type: 'sc_motor_run_for_seconds',
  inputs: {
    POWER: {
      shadow: numberShadow(40),
    },
    SECONDS: {
      shadow: numberShadow(1),
    },
  },
});

const stopMotorBlock = (): ToolboxBlock => ({
  kind: 'block',
  type: 'sc_motor_stop',
});

const movementMotorsBlock = (): ToolboxBlock => ({
  kind: 'block',
  type: 'sc_movement_motors',
});

const arcadeDriveBlock = (): ToolboxBlock => ({
  kind: 'block',
  type: 'sc_drivetrain_arcade_drive',
  inputs: {
    FORWARD: {
      shadow: numberShadow(40),
    },
    TURN: {
      shadow: numberShadow(0),
    },
  },
});

const tankDriveBlock = (): ToolboxBlock => ({
  kind: 'block',
  type: 'sc_drivetrain_tank_drive',
  inputs: {
    LEFT_POWER: {
      shadow: numberShadow(40),
    },
    RIGHT_POWER: {
      shadow: numberShadow(40),
    },
  },
});

const stopDrivetrainBlock = (): ToolboxBlock => ({
  kind: 'block',
  type: 'sc_drivetrain_stop',
});

const mecanumDriveBlock = (): ToolboxBlock => ({
  kind: 'block',
  type: 'sc_mecanum_drive',
  inputs: {
    SIDEWAYS: {
      shadow: numberShadow(0),
    },
    FORWARD: {
      shadow: numberShadow(40),
    },
    TURN: {
      shadow: numberShadow(0),
    },
  },
});

const stopMecanumBlock = (): ToolboxBlock => ({
  kind: 'block',
  type: 'sc_mecanum_stop',
});

const sensorValueBlock = (): ToolboxBlock => ({
  kind: 'block',
  type: 'sc_a301_sensor_value',
});

const sensorGreaterThanBlock = (value: number): ToolboxBlock => ({
  kind: 'block',
  type: 'logic_compare',
  fields: {
    OP: 'GT',
  },
  inputs: {
    A: {
      block: sensorValueBlock(),
    },
    B: {
      shadow: numberShadow(value),
    },
  },
});

const gamepadButtonBlock = (button: string, state: string): ToolboxBlock => ({
  kind: 'block',
  type: 'sc_gamepad_button',
  fields: {GAMEPAD: '1', BUTTON: button, STATE: state},
});

// Only shown in Teleop opmodes (see buildToolbox / App.vue): reading driver
// input, and a ready-made "when a button is pressed, do …" gamepad trigger.
const gamepadCategory = {
  kind: 'category',
  name: 'Gamepad',
  categorystyle: 'sensing_category',
  cssConfig: categoryCss('sensing'),
  contents: [
    gamepadButtonBlock('SouthFace', 'Pressed'),
    {
      kind: 'block',
      type: 'sc_gamepad_axis',
      fields: {GAMEPAD: '1', AXIS: 'LeftY'},
    },
    {
      kind: 'block',
      type: 'sc_gamepad_trigger',
      fields: {GAMEPAD: '1', SIDE: 'Left'},
    },
    {
      kind: 'block',
      type: 'sc_trigger',
      inputs: {
        CONDITION: {
          block: gamepadButtonBlock('SouthFace', 'Pressed'),
        },
        COMMANDS: {
          block: stopMotorBlock(),
        },
      },
    },
  ],
};

export const buildToolbox = ({includeGamepad}: {includeGamepad: boolean}) => ({
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: 'OpMode',
      categorystyle: 'events_category',
      cssConfig: categoryCss('events'),
      contents: [
        // Opmode-scoped hat blocks. Each opmode tab starts with a details hat and
        // an "on start" hat; these let you add an "on start" hat, a setup hat (for
        // advanced raw-Python setup — motors are registered automatically), and
        // triggers with any condition.
        {
          kind: 'block',
          type: 'sc_on_start',
          inputs: {
            COMMANDS: {
              block: runForSecondsBlock(),
            },
          },
        },
        {
          kind: 'block',
          type: 'sc_on_setup',
          inputs: {
            SETUP: {
              block: {
                kind: 'block',
                type: 'sc_python_setup_line',
              },
            },
          },
        },
        {
          kind: 'block',
          type: 'sc_trigger',
          inputs: {
            CONDITION: {
              block: sensorGreaterThanBlock(0),
            },
            COMMANDS: {
              block: stopMotorBlock(),
            },
          },
        },
      ],
    },
    {
      kind: 'category',
      name: 'Motors',
      categorystyle: 'motion_category',
      cssConfig: categoryCss('motion'),
      contents: [
        {
          kind: 'block',
          type: 'sc_motor_set_power',
          inputs: {
            POWER: {
              shadow: numberShadow(50),
            },
          },
        },
        runForSecondsBlock(),
        stopMotorBlock(),
        {
          kind: 'block',
          type: 'sc_motor_set_velocity',
          inputs: {
            VELOCITY: {
              shadow: numberShadow(1200),
            },
          },
        },
        {
          kind: 'block',
          type: 'sc_motor_set_position',
          inputs: {
            POSITION: {
              shadow: numberShadow(2),
            },
          },
        },
      ],
    },
    {
      kind: 'category',
      name: 'Movement',
      categorystyle: 'movement_category',
      cssConfig: categoryCss('movement'),
      contents: [
        movementMotorsBlock(),
        arcadeDriveBlock(),
        tankDriveBlock(),
        stopDrivetrainBlock(),
        mecanumDriveBlock(),
        stopMecanumBlock(),
      ],
    },
    {
      kind: 'category',
      name: 'Control',
      categorystyle: 'control_category',
      cssConfig: categoryCss('control'),
      contents: [
        {
          kind: 'block',
          type: 'sc_wait_seconds',
          inputs: {
            SECONDS: {
              shadow: numberShadow(1),
            },
          },
        },
        {
          kind: 'block',
          type: 'sc_repeat_commands',
          inputs: {
            TIMES: {
              shadow: numberShadow(3),
            },
            COMMANDS: {
              block: runForSecondsBlock(),
            },
          },
        },
        {
          kind: 'block',
          type: 'sc_parallel_commands',
          inputs: {
            FIRST: {
              block: runForSecondsBlock(),
            },
            SECOND: {
              block: runForSecondsBlock(),
            },
          },
        },
        {
          kind: 'block',
          type: 'sc_race_commands',
          inputs: {
            FIRST: {
              block: runForSecondsBlock(),
            },
            SECOND: {
              block: runForSecondsBlock(),
            },
          },
        },
        {
          kind: 'block',
          type: 'sc_wait_until',
          inputs: {
            CONDITION: {
              block: sensorGreaterThanBlock(0),
            },
          },
        },
      ],
    },
    {
      kind: 'category',
      name: 'Sensing',
      categorystyle: 'sensing_category',
      cssConfig: categoryCss('sensing'),
      contents: [sensorValueBlock()],
    },
    ...(includeGamepad ? [gamepadCategory] : []),
    {
      kind: 'category',
      name: 'Operators',
      categorystyle: 'operators_category',
      cssConfig: categoryCss('operators'),
      contents: [
        numberShadow(0),
        {
          kind: 'block',
          type: 'math_arithmetic',
          inputs: {
            A: {
              shadow: numberShadow(1),
            },
            B: {
              shadow: numberShadow(1),
            },
          },
        },
        {
          kind: 'block',
          type: 'math_number_property',
          inputs: {
            NUMBER_TO_CHECK: {
              shadow: numberShadow(0),
            },
          },
        },
        {
          kind: 'block',
          type: 'logic_compare',
        },
        {
          kind: 'block',
          type: 'logic_operation',
        },
        {
          kind: 'block',
          type: 'logic_boolean',
        },
      ],
    },
    {
      kind: 'category',
      name: 'Variables',
      categorystyle: 'variables_category',
      cssConfig: categoryCss('variables'),
      custom: 'VARIABLE',
    },
    {
      kind: 'category',
      name: 'My Blocks',
      categorystyle: 'myblocks_category',
      cssConfig: categoryCss('myblocks'),
      custom: 'PROCEDURE',
    },
    {
      kind: 'category',
      name: 'Extensions',
      categorystyle: 'advanced_category',
      cssConfig: categoryCss('advanced'),
      // Escape hatch: the full generated RobotPy API is reachable here, but only
      // once a class is loaded as an extension. Nothing generated is in the
      // toolbox by default — the flyout is built dynamically in extensions.ts.
      custom: EXTENSIONS_TOOLBOX_CATEGORY,
    },
  ],
});

// Default toolbox (no gamepad category). App.vue swaps in the gamepad variant
// when the active opmode is a Teleop.
export const toolbox = buildToolbox({includeGamepad: false});
