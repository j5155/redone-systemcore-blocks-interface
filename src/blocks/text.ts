/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Blockly from 'blockly/core';
import {a301MethodOptions, A301_VALUE_METHODS} from '../generated/a301';
import {deviceField, movementMotorsField} from '../devices';

const eventsColour = '#FFBF00';
const motionColour = '#4C97FF';
const movementColour = "#FF4DCD";
const controlColour = '#FFAB19';
const sensingColour = '#5CB1D6';
const advancedColour = '#5C81A6';

// The opmode is described by several independent, opmode-scoped hat blocks that
// each live at the top of the tab's workspace, rather than one consolidated
// block: a details hat (config), a setup hat, one or more "on start" hats, and
// any number of trigger hats.

const scOpmodeDetails = {
  type: 'sc_opmode_details',
  message0: '%1 opmode   enabled %2',
  args0: [
    {
      type: 'field_dropdown',
      name: 'TYPE',
      // Values must match the Python decorator names (Teleop / Auto / Utility).
      options: [
        ['teleop', 'Teleop'],
        ['autonomous', 'Auto'],
        ['utility', 'Utility'],
      ],
    },
    {
      type: 'field_checkbox',
      name: 'ENABLED',
      checked: true,
    },
  ],
  message1: 'name %1',
  args1: [
    {
      type: 'field_input',
      name: 'NAME',
      text: 'My OpMode',
      spellcheck: false,
    },
  ],
  message2: 'group %1 description %2',
  args2: [
    {
      type: 'field_input',
      name: 'GROUP',
      text: '',
      spellcheck: false,
    },
    {
      type: 'field_input',
      name: 'DESCRIPTION',
      text: '',
      spellcheck: false,
    },
  ],
  colour: eventsColour,
  tooltip:
    'OpMode configuration. Each OpMode (tab) becomes its own decorated Python class (teleop, autonomous, or utility).',
  helpUrl: '',
};

const scOnSetup = {
  type: 'sc_on_setup',
  message0: 'set up robot',
  message1: '%1',
  args1: [
    {
      type: 'input_statement',
      name: 'SETUP',
      check: 'Setup',
    },
  ],
  colour: motionColour,
  tooltip: 'Register devices once when this OpMode starts.',
  helpUrl: '',
};

const scOnStart = {
  type: 'sc_on_start',
  message0: 'when this opmode starts',
  message1: 'do %1',
  args1: [
    {
      type: 'input_statement',
      name: 'COMMANDS',
      check: 'Command',
    },
  ],
  colour: eventsColour,
  tooltip: 'Runs this command sequence when the OpMode starts.',
  helpUrl: '',
};

const scTrigger = {
  type: 'sc_trigger',
  message0: 'when %1',
  args0: [
    {
      type: 'input_value',
      name: 'CONDITION',
      check: 'Boolean',
    },
  ],
  message1: '%1 do %2',
  args1: [
    {
      type: 'field_dropdown',
      name: 'MODE',
      options: [
        ['once', 'onTrue'],
        ['while true', 'whileTrue'],
      ],
    },
    {
      type: 'input_statement',
      name: 'COMMANDS',
      check: 'Command',
    },
  ],
  colour: eventsColour,
  tooltip:
    'Opmode-scoped trigger: schedules commands when any condition becomes true.',
  helpUrl: '',
};

const scMotorSetPower = {
  type: 'sc_motor_set_power',
  message0: 'set %1 power to %2 %',
  args0: [
    deviceField(),
    {
      type: 'input_value',
      name: 'POWER',
      check: 'Number',
    },
  ],
  previousStatement: 'Command',
  nextStatement: 'Command',
  colour: motionColour,
  tooltip: 'Sets an A301 motor throttle. Use -100 to 100.',
  helpUrl: '',
};

const scMotorRunForSeconds = {
  type: 'sc_motor_run_for_seconds',
  message0: 'run %1 at %2 % for %3 seconds',
  args0: [
    deviceField(),
    {
      type: 'input_value',
      name: 'POWER',
      check: 'Number',
    },
    {
      type: 'input_value',
      name: 'SECONDS',
      check: 'Number',
    },
  ],
  previousStatement: 'Command',
  nextStatement: 'Command',
  colour: motionColour,
  tooltip: 'Runs an A301 motor, waits, then stops it.',
  helpUrl: '',
};

const scMotorStop = {
  type: 'sc_motor_stop',
  message0: 'stop %1',
  args0: [deviceField()],
  previousStatement: 'Command',
  nextStatement: 'Command',
  colour: motionColour,
  tooltip: 'Stops an A301 motor by setting its throttle to zero.',
  helpUrl: '',
};

const scMotorSetVelocity = {
  type: 'sc_motor_set_velocity',
  message0: 'set %1 speed to %2 RPM',
  args0: [
    deviceField(),
    {
      type: 'input_value',
      name: 'VELOCITY',
      check: 'Number',
    },
  ],
  previousStatement: 'Command',
  nextStatement: 'Command',
  colour: motionColour,
  tooltip: 'Asks the A301 to drive to a velocity setpoint.',
  helpUrl: '',
};

const scMotorSetPosition = {
  type: 'sc_motor_set_position',
  message0: 'move %1 to %2 rotations',
  args0: [
    deviceField(),
    {
      type: 'input_value',
      name: 'POSITION',
      check: 'Number',
    },
  ],
  previousStatement: 'Command',
  nextStatement: 'Command',
  colour: motionColour,
  tooltip: 'Asks the A301 to drive to a position setpoint.',
  helpUrl: '',
};

const scMovementMotors = {
  type: 'sc_movement_motors',
  message0: 'set movement motors %1',
  args0: [movementMotorsField()],
  previousStatement: 'Setup',
  nextStatement: 'Setup',
  colour: movementColour,
  tooltip:
    'Choose the motors used by movement drive blocks. Click the summary to edit.',
  helpUrl: '',
};

const scDrivetrainArcadeDrive = {
  type: 'sc_drivetrain_arcade_drive',
  message0: 'arcade drive forward %1 % turn %2 %',
  args0: [
    {
      type: 'input_value',
      name: 'FORWARD',
      check: 'Number',
    },
    {
      type: 'input_value',
      name: 'TURN',
      check: 'Number',
    },
  ],
  previousStatement: 'Command',
  nextStatement: 'Command',
  colour: movementColour,
  tooltip:
    'Uses wpilib.DifferentialDrive arcadeDrive with two A301 motors.',
  helpUrl: '',
};

const scDrivetrainTankDrive = {
  type: 'sc_drivetrain_tank_drive',
  message0: 'tank drive left power %1 % right power %2 %',
  args0: [
    {
      type: 'input_value',
      name: 'LEFT_POWER',
      check: 'Number',
    },
    {
      type: 'input_value',
      name: 'RIGHT_POWER',
      check: 'Number',
    },
  ],
  previousStatement: 'Command',
  nextStatement: 'Command',
  colour: movementColour,
  tooltip: 'Uses wpilib.DifferentialDrive tankDrive with two A301 motors.',
  helpUrl: '',
};

const scDrivetrainStop = {
  type: 'sc_drivetrain_stop',
  message0: 'stop movement motors',
  previousStatement: 'Command',
  nextStatement: 'Command',
  colour: movementColour,
  tooltip: 'Stops the configured movement motors.',
  helpUrl: '',
};

const scMecanumDrive = {
  type: 'sc_mecanum_drive',
  message0:
    'mecanum drive sideways %1 % forward %2 % turn %3 %',
  args0: [
    {
      type: 'input_value',
      name: 'SIDEWAYS',
      check: 'Number',
    },
    {
      type: 'input_value',
      name: 'FORWARD',
      check: 'Number',
    },
    {
      type: 'input_value',
      name: 'TURN',
      check: 'Number',
    },
  ],
  previousStatement: 'Command',
  nextStatement: 'Command',
  colour: movementColour,
  tooltip: 'Uses wpilib.MecanumDrive driveCartesian with four A301 motors.',
  helpUrl: '',
};

const scMecanumStop = {
  type: 'sc_mecanum_stop',
  message0: 'stop mecanum movement',
  previousStatement: 'Command',
  nextStatement: 'Command',
  colour: movementColour,
  tooltip: 'Stops the configured mecanum movement motors.',
  helpUrl: '',
};

const scWaitSeconds = {
  type: 'sc_wait_seconds',
  message0: 'wait %1 seconds',
  args0: [
    {
      type: 'input_value',
      name: 'SECONDS',
      check: 'Number',
    },
  ],
  previousStatement: 'Command',
  nextStatement: 'Command',
  colour: controlColour,
  tooltip: 'Waits inside the generated command sequence.',
  helpUrl: '',
};

const scRepeatCommands = {
  type: 'sc_repeat_commands',
  message0: 'repeat %1 times',
  args0: [
    {
      type: 'input_value',
      name: 'TIMES',
      check: 'Number',
    },
  ],
  message1: 'do %1',
  args1: [
    {
      type: 'input_statement',
      name: 'COMMANDS',
      check: 'Command',
    },
  ],
  previousStatement: 'Command',
  nextStatement: 'Command',
  colour: controlColour,
  tooltip: 'Repeats command blocks as a command-based sequence.',
  helpUrl: '',
};

const scParallelCommands = {
  type: 'sc_parallel_commands',
  message0: 'do both at the same time',
  message1: 'first %1',
  args1: [
    {
      type: 'input_statement',
      name: 'FIRST',
      check: 'Command',
    },
  ],
  message2: 'second %1',
  args2: [
    {
      type: 'input_statement',
      name: 'SECOND',
      check: 'Command',
    },
  ],
  previousStatement: 'Command',
  nextStatement: 'Command',
  colour: controlColour,
  tooltip: 'Runs two command stacks at the same time.',
  helpUrl: '',
};

const scRaceCommands = {
  type: 'sc_race_commands',
  message0: 'race commands until one finishes',
  message1: 'first %1',
  args1: [
    {
      type: 'input_statement',
      name: 'FIRST',
      check: 'Command',
    },
  ],
  message2: 'second %1',
  args2: [
    {
      type: 'input_statement',
      name: 'SECOND',
      check: 'Command',
    },
  ],
  previousStatement: 'Command',
  nextStatement: 'Command',
  colour: controlColour,
  tooltip: 'Runs two command stacks and ends when either one finishes.',
  helpUrl: '',
};

const scWaitUntil = {
  type: 'sc_wait_until',
  message0: 'wait until %1',
  args0: [
    {
      type: 'input_value',
      name: 'CONDITION',
      check: 'Boolean',
    },
  ],
  previousStatement: 'Command',
  nextStatement: 'Command',
  colour: controlColour,
  tooltip: 'Waits inside the command sequence until a condition is true.',
  helpUrl: '',
};

const scA301SensorValue = {
  type: 'sc_a301_sensor_value',
  message0: '%1 %2',
  args0: [
    deviceField(),
    {
      type: 'field_dropdown',
      name: 'SENSOR',
      options: [
        ['speed RPM', 'VELOCITY'],
        ['position rotations', 'POSITION'],
        ['absolute position', 'ABSOLUTE_POSITION'],
        ['temperature C', 'TEMPERATURE'],
        ['current amps', 'CURRENT'],
        ['power %', 'POWER'],
        ['bus voltage', 'BUS_VOLTAGE'],
      ],
    },
  ],
  output: 'Number',
  colour: sensingColour,
  tooltip: 'Reads a value from an A301 motor.',
  helpUrl: '',
};

// --- Gamepad -----------------------------------------------------------------
// Wrappers over wpilib.Gamepad. Only surfaced in Teleop opmodes (autonomous and
// utility opmodes don't read driver input), see toolbox.ts / App.vue.

const gamepadField = () => ({
  type: 'field_dropdown',
  name: 'GAMEPAD',
  options: [
    ['1', '1'],
    ['2', '2'],
  ],
});

const scGamepadButton = {
  type: 'sc_gamepad_button',
  message0: 'gamepad %1 %2 %3',
  args0: [
    gamepadField(),
    {
      type: 'field_dropdown',
      name: 'BUTTON',
      // Values are the wpilib.Gamepad getter stems: get{Value}Button[State]().
      options: [
        ['A', 'SouthFace'],
        ['B', 'EastFace'],
        ['X', 'WestFace'],
        ['Y', 'NorthFace'],
        ['left bumper', 'LeftBumper'],
        ['right bumper', 'RightBumper'],
        ['dpad up', 'DpadUp'],
        ['dpad down', 'DpadDown'],
        ['dpad left', 'DpadLeft'],
        ['dpad right', 'DpadRight'],
        ['left stick', 'LeftStick'],
        ['right stick', 'RightStick'],
        ['start', 'Start'],
        ['back', 'Back'],
      ],
    },
    {
      type: 'field_dropdown',
      name: 'STATE',
      options: [
        ['is held down', 'Held'],
        ['is pressed', 'Pressed'],
        ['is released', 'Released'],
      ],
    },
  ],
  output: 'Boolean',
  colour: sensingColour,
  tooltip: 'Reads a gamepad button. "Pressed"/"released" fire once per press.',
  helpUrl: '',
};

const scGamepadAxis = {
  type: 'sc_gamepad_axis',
  message0: 'gamepad %1 %2',
  args0: [
    gamepadField(),
    {
      type: 'field_dropdown',
      name: 'AXIS',
      // Values are the wpilib.Gamepad getter stems: get{Value}().
      options: [
        ['left stick X', 'LeftX'],
        ['left stick Y', 'LeftY'],
        ['right stick X', 'RightX'],
        ['right stick Y', 'RightY'],
      ],
    },
  ],
  output: 'Number',
  colour: sensingColour,
  tooltip: 'Reads a gamepad joystick axis (-1 to 1).',
  helpUrl: '',
};

const scGamepadTrigger = {
  type: 'sc_gamepad_trigger',
  message0: 'gamepad %1 %2 trigger',
  args0: [
    gamepadField(),
    {
      type: 'field_dropdown',
      name: 'SIDE',
      options: [
        ['left', 'Left'],
        ['right', 'Right'],
      ],
    },
  ],
  output: 'Number',
  colour: sensingColour,
  tooltip: 'Reads a gamepad analog trigger (0 to 1).',
  helpUrl: '',
};

const scA301AdvancedCall = {
  type: 'sc_a301_advanced_call',
  message0: 'advanced A301 %1 . %2 args %3',
  args0: [
    deviceField(),
    {
      type: 'field_dropdown',
      name: 'METHOD',
      options: a301MethodOptions(),
    },
    {
      type: 'field_input',
      name: 'ARGS',
      text: '',
      spellcheck: false,
    },
  ],
  previousStatement: 'Command',
  nextStatement: 'Command',
  colour: advancedColour,
  tooltip: 'Escape hatch for A301 methods that do not have beginner blocks yet.',
  helpUrl: '',
};

const scA301AdvancedValue = {
  type: 'sc_a301_advanced_value',
  message0: 'advanced A301 value %1 . %2 args %3',
  args0: [
    deviceField(),
    {
      type: 'field_dropdown',
      name: 'METHOD',
      options: a301MethodOptions(A301_VALUE_METHODS),
    },
    {
      type: 'field_input',
      name: 'ARGS',
      text: '',
      spellcheck: false,
    },
  ],
  output: null,
  colour: advancedColour,
  tooltip: 'Escape hatch for reading an A301 method result.',
  helpUrl: '',
};

const scPythonSetupLine = {
  type: 'sc_python_setup_line',
  message0: 'advanced setup Python %1',
  args0: [
    {
      type: 'field_input',
      name: 'CODE',
      text: 'self.extra = None',
      spellcheck: false,
    },
  ],
  previousStatement: 'Setup',
  nextStatement: 'Setup',
  colour: advancedColour,
  tooltip: 'Adds one raw Python line inside robot setup.',
  helpUrl: '',
};

// Create the block definitions for the JSON-only blocks.
// This does not register their definitions with Blockly.
// This file has no side effects!
export const blocks = Blockly.common.createBlockDefinitionsFromJsonArray([
  scOpmodeDetails,
  scOnSetup,
  scOnStart,
  scTrigger,
  scMotorSetPower,
  scMotorRunForSeconds,
  scMotorStop,
  scMotorSetVelocity,
  scMotorSetPosition,
  scMovementMotors,
  scDrivetrainArcadeDrive,
  scDrivetrainTankDrive,
  scDrivetrainStop,
  scMecanumDrive,
  scMecanumStop,
  scWaitSeconds,
  scRepeatCommands,
  scParallelCommands,
  scRaceCommands,
  scWaitUntil,
  scA301SensorValue,
  scGamepadButton,
  scGamepadAxis,
  scGamepadTrigger,
  scA301AdvancedCall,
  scA301AdvancedValue,
  scPythonSetupLine,
]);
