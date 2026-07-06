<script setup lang="ts">
import * as Blockly from "blockly";
import { registerContinuousToolbox } from "@blockly/continuous-toolbox";
import { pythonGenerator } from "blockly/python";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { createHighlighterCore, type HighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import pythonLang from "shiki/langs/python.mjs";
import lightTheme from "shiki/themes/material-theme-lighter.mjs";
import { systemCoreTheme } from "./blocklyTheme";
import { blocks } from "./blocks/text";
import {
  addDevice,
  getDevices,
  onDevicesChanged,
  refreshDeviceFields,
  registerDeviceField,
  removeDevice,
  setDevices,
  updateDevice,
  type Device,
} from "./devices";
import { forBlock } from "./generators/python";
import { buildToolbox } from "./toolbox";
import {
  addExtension,
  ensureCatalogLoaded,
  getLoadedExtensions,
  isExtensionLoaded,
  registerExtensions,
  removeExtension,
} from "./extensions";
import { simpleName } from "./apiCatalog";
import {
  generateAllOpmodes,
  makeOpmodeState,
  migrateWorkspaceState,
  newTabId,
  opmodeInfoFromState,
  type OpModeTab,
  type OpModeType,
  type WorkspaceState,
} from "./opmodes";

// v3: opmodes are separate hat blocks (details / setup / start / trigger), and
// motors live in a project-level registry rather than as per-tab variables.
const PROJECT_STORAGE_KEY = "opmodeProject.v3";

const blocklyDiv = ref<HTMLDivElement | null>(null);
const generatedCode = ref("");
const generationStatus = ref("Ready");

// Syntax-highlighted HTML for the generated Python, produced by Shiki. Shiki's
// highlighter is async, so we render into `highlightedCode` off a watcher and
// fall back to the plain <pre><code> until the first pass resolves.
const highlightedCode = ref("");

// A single fine-grained Shiki highlighter, bundling only Python + one theme and
// the JS regex engine (no WASM), created lazily on first use.
let highlighterPromise: Promise<HighlighterCore> | null = null;
const getHighlighter = () => {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      langs: [pythonLang],
      themes: [lightTheme],
      engine: createJavaScriptRegexEngine(),
    });
  }
  return highlighterPromise;
};

watch(
  generatedCode,
  async (code) => {
    try {
      const highlighter = await getHighlighter();
      highlightedCode.value = highlighter.codeToHtml(code, {
        lang: "python",
        theme: "material-theme-lighter",
      });
    } catch (error) {
      console.warn("Failed to highlight generated code:", error);
      highlightedCode.value = "";
    }
  },
  { immediate: true },
);

// OpMode tabs.
const tabs = ref<OpModeTab[]>([]);
const activeTabId = ref("");

// Motors (device registry) modal state. `motors` mirrors the registry so the
// modal stays reactive; the registry itself is the source of truth for codegen.
const motorsOpen = ref(false);
const motors = ref<Device[]>([]);

// Extensions picker state.
const pickerOpen = ref(false);
const pickerQuery = ref("");
const catalogClasses = ref<{ className: string; module: string }[]>([]);
const catalogLoading = ref(false);
const loadedExtensions = ref<string[]>([]);

let workspace: Blockly.WorkspaceSvg | null = null;
let suppressChanges = false;

const registerBlockly = () => {
  registerDeviceField();
  if (!Blockly.Blocks["sc_opmode_details"]) {
    Blockly.common.defineBlocks(blocks);
  }

  Object.assign(pythonGenerator.forBlock, forBlock);
};

const resizeWorkspace = () => {
  if (!workspace) return;
  Blockly.svgResize(workspace);
};

// --- Tab / opmode plumbing -------------------------------------------------

const TYPE_LABELS: Record<OpModeType, string> = {
  Teleop: "teleop",
  Auto: "autonomous",
  Utility: "utility",
};

const activeTab = () => tabs.value.find((tab) => tab.id === activeTabId.value);

const tabViews = computed(() =>
  tabs.value.map((tab) => {
    const info = opmodeInfoFromState(tab.state);
    return {
      id: tab.id,
      name: info.name,
      type: info.type,
      typeLabel: TYPE_LABELS[info.type] ?? info.type,
      enabled: info.enabled,
    };
  }),
);

const opmodeColor = (type: OpModeType) =>
  type === "Auto" ? "warning" : type === "Utility" ? "neutral" : "primary";

const activeTabView = computed(
  () => tabViews.value.find((tab) => tab.id === activeTabId.value) ?? null,
);

const extensionCount = computed(() => loadedExtensions.value.length);

const serializeWorkspace = (): WorkspaceState =>
  workspace ? Blockly.serialization.workspaces.save(workspace) : {};

const loadStateIntoWorkspace = (state: WorkspaceState) => {
  if (!workspace) return;
  const migratedState = migrateWorkspaceState(state);
  suppressChanges = true;
  Blockly.Events.disable();
  try {
    workspace.clear();
    Blockly.serialization.workspaces.load(migratedState, workspace, undefined);
  } catch (error) {
    console.warn("Failed to load opmode into workspace:", error);
    workspace.clear();
  } finally {
    Blockly.Events.enable();
    suppressChanges = false;
  }
};

// Copy the live workspace back into the active tab's stored state.
const syncActiveTab = () => {
  const tab = activeTab();
  if (tab && workspace) {
    tab.state = serializeWorkspace();
  }
};

const persistProject = () => {
  try {
    window.localStorage?.setItem(
      PROJECT_STORAGE_KEY,
      JSON.stringify({
        tabs: tabs.value,
        activeTabId: activeTabId.value,
        devices: getDevices(),
      }),
    );
  } catch (error) {
    console.warn("Failed to persist opmodes:", error);
  }
};

const generateCode = () => {
  syncActiveTab();
  const code = generateAllOpmodes(tabs.value);
  generatedCode.value =
    code.trim() || "# Add blocks to an OpMode to generate its Python class.";
  generationStatus.value = code.trim()
    ? "Python generated"
    : "Waiting for blocks";
};

const selectTab = (id: string) => {
  if (id === activeTabId.value) return;
  syncActiveTab();
  activeTabId.value = id;
  const tab = activeTab();
  if (tab) loadStateIntoWorkspace(tab.state);
  syncToolboxForActive();
  persistProject();
  generateCode();
};

const addOpmode = (type: OpModeType) => {
  syncActiveTab();
  const defaultName =
    type === "Auto"
      ? "My Autonomous"
      : type === "Utility"
        ? "My Utility"
        : "My Teleop";
  const tab: OpModeTab = {
    id: newTabId(),
    state: makeOpmodeState(type, defaultName),
  };
  tabs.value.push(tab);
  activeTabId.value = tab.id;
  loadStateIntoWorkspace(tab.state);
  syncToolboxForActive();
  persistProject();
  generateCode();
};

const deleteOpmode = (id: string) => {
  const index = tabs.value.findIndex((tab) => tab.id === id);
  if (index === -1) return;

  const wasActive = id === activeTabId.value;
  tabs.value.splice(index, 1);

  if (!tabs.value.length) {
    // Never leave the project empty.
    const tab: OpModeTab = {
      id: newTabId(),
      state: makeOpmodeState("Teleop", "My Teleop"),
    };
    tabs.value.push(tab);
    activeTabId.value = tab.id;
    loadStateIntoWorkspace(tab.state);
  } else if (wasActive) {
    const fallback = tabs.value[Math.max(0, index - 1)];
    activeTabId.value = fallback.id;
    loadStateIntoWorkspace(fallback.state);
  }

  syncToolboxForActive();
  persistProject();
  generateCode();
};

const loadProject = () => {
  const raw = window.localStorage?.getItem(PROJECT_STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as {
        tabs?: OpModeTab[];
        activeTabId?: string;
        devices?: Device[];
      };
      if (Array.isArray(parsed.tabs) && parsed.tabs.length) {
        tabs.value = parsed.tabs.map((tab) => ({
          ...tab,
          state: migrateWorkspaceState(tab.state),
        }));
        activeTabId.value =
          parsed.activeTabId &&
          parsed.tabs.some((t) => t.id === parsed.activeTabId)
            ? parsed.activeTabId
            : parsed.tabs[0].id;
        setDevices(Array.isArray(parsed.devices) ? parsed.devices : []);
        motors.value = [...getDevices()];
        return;
      }
    } catch (error) {
      console.warn("Discarding incompatible saved project:", error);
      window.localStorage?.removeItem(PROJECT_STORAGE_KEY);
    }
  }

  const tab: OpModeTab = {
    id: newTabId(),
    state: makeOpmodeState("Teleop", "My Teleop"),
  };
  tabs.value = [tab];
  activeTabId.value = tab.id;
};

// --- Motors (device registry) ----------------------------------------------

const openMotors = () => {
  motors.value = [...getDevices()];
  motorsOpen.value = true;
};

const addMotor = () => {
  addDevice();
};

const removeMotor = (id: string) => {
  removeDevice(id);
};

const numberValue = (value: unknown) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const onMotorName = (id: string, value: unknown) => {
  updateDevice(id, { name: String(value ?? "") });
};

const onMotorBus = (id: string, value: unknown) => {
  updateDevice(id, { bus: numberValue(value) });
};

const onMotorDeviceId = (id: string, value: unknown) => {
  updateDevice(id, { deviceId: numberValue(value) });
};

// --- Extensions picker -----------------------------------------------------

const openExtensionPicker = async () => {
  pickerOpen.value = true;
  if (catalogClasses.value.length) return;
  catalogLoading.value = true;
  try {
    const catalog = await ensureCatalogLoaded();
    catalogClasses.value = catalog.classes.map((cls) => ({
      className: cls.className,
      module: cls.module,
    }));
  } finally {
    catalogLoading.value = false;
  }
};

const closePicker = () => {
  pickerOpen.value = false;
  pickerQuery.value = "";
};

const filteredClasses = computed(() => {
  const query = pickerQuery.value.trim().toLowerCase();
  const matches = query
    ? catalogClasses.value.filter((cls) =>
        cls.className.toLowerCase().includes(query),
      )
    : catalogClasses.value;
  return matches.slice(0, 200);
});

const toggleExtension = (className: string) => {
  if (isExtensionLoaded(className)) {
    removeExtension(className);
  } else {
    addExtension(className);
  }
  loadedExtensions.value = getLoadedExtensions();
};

const shortName = (className: string) => simpleName(className);

// After updateToolbox(), rebuild the always-open continuous flyout from the
// newly applied categories.
type ContinuousToolboxLike = {
  getInitialFlyoutContents?: () => unknown;
  getFlyout?: () => { show: (items: unknown) => void } | null;
};

const refreshContinuousFlyout = (ws: Blockly.WorkspaceSvg) => {
  const tb = ws.getToolbox() as unknown as ContinuousToolboxLike | null;
  const flyout = tb?.getFlyout?.();
  if (tb?.getInitialFlyoutContents && flyout) {
    flyout.show(tb.getInitialFlyoutContents());
  }
};

// The Gamepad category only makes sense in Teleop opmodes (driver input isn't
// read in autonomous/utility). Rebuild the toolbox whenever the active opmode's
// type changes so the category appears/disappears. `null` forces a first build.
let gamepadShown: boolean | null = null;

const syncToolboxForActive = () => {
  if (!workspace) return;
  const tab = activeTab();
  const includeGamepad = tab
    ? opmodeInfoFromState(tab.state).type === "Teleop"
    : false;
  if (includeGamepad === gamepadShown) return;
  gamepadShown = includeGamepad;
  workspace.updateToolbox(buildToolbox({ includeGamepad }));
  refreshContinuousFlyout(workspace);
};

onMounted(() => {
  registerBlockly();

  if (!blocklyDiv.value) {
    throw new Error(`div with id 'blocklyDiv' not found`);
  }

  registerContinuousToolbox();

  // Inject with an empty toolbox first. The continuous toolbox eagerly builds
  // every category's flyout on init, including the dynamic (custom) Devices and
  // Extensions categories — so their callbacks must be registered *before* the
  // real toolbox is applied. We register them, then swap in the full toolbox.
  workspace = Blockly.inject(blocklyDiv.value, {
    toolbox: { kind: "categoryToolbox", contents: [] },
    renderer: "zelos",
    theme: systemCoreTheme,
    trashcan: true,
    zoom: {
      controls: true,
      wheel: true,
      startScale: 0.9,
      maxScale: 2,
      minScale: 0.4,
      scaleSpeed: 1.1,
    },
    plugins: {
      flyoutsVerticalToolbox: "ContinuousFlyout",
      metricsManager: "ContinuousMetrics",
      toolbox: "ContinuousToolbox",
    },
  });

  registerExtensions(workspace, pythonGenerator, openExtensionPicker);

  // Keep the modal mirror, the device dropdowns and the generated code in sync
  // whenever a motor is added/renamed/removed from the Motors modal.
  onDevicesChanged(() => {
    motors.value = [...getDevices()];
    if (workspace) refreshDeviceFields(workspace);
    persistProject();
    generateCode();
  });

  // Keep the flyout at a constant size regardless of workspace zoom. By default
  // the flyout scale tracks the workspace scale (getFlyoutScale → targetWorkspace
  // scale, applied in reflowInternal_); pin it so flyout blocks stay constant.
  const flyout = workspace.getFlyout();
  if (flyout) {
    (flyout as unknown as { getFlyoutScale: () => number }).getFlyoutScale =
      () => 0.67;
  }

  // Now that every dynamic-category callback is registered, apply the real
  // toolbox (its gamepad category depends on the active opmode type, so load
  // the project first) and rebuild the (empty) continuous flyout.
  loadProject();
  syncToolboxForActive();
  const active = activeTab();
  if (active) loadStateIntoWorkspace(active.state);
  generateCode();

  workspace.addChangeListener((event: Blockly.Events.Abstract) => {
    if (
      suppressChanges ||
      event.isUiEvent ||
      event.type === Blockly.Events.FINISHED_LOADING ||
      !workspace ||
      workspace.isDragging()
    ) {
      return;
    }

    syncActiveTab();
    // A live edit to the details hat may flip the opmode type (e.g. teleop →
    // auto), which adds/removes the gamepad category.
    syncToolboxForActive();
    persistProject();
    generateCode();
  });

  window.addEventListener("resize", resizeWorkspace);
  requestAnimationFrame(resizeWorkspace);
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", resizeWorkspace);
  workspace?.dispose();
  workspace = null;
});
</script>

<template>
  <UApp>
    <main
      class="flex h-screen min-w-[320px] flex-col overflow-hidden bg-slate-100 text-slate-950"
    >
      <header
        class="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 shadow-sm"
      >
        <div class="flex min-w-0 items-center gap-3">
          <div
            class="grid size-9 shrink-0 place-items-center rounded-lg bg-teal-600 text-sm font-black text-white"
          >
            SC
          </div>
          <div class="min-w-0">
            <h1 class="truncate text-base font-extrabold tracking-tight">
              SystemCore Blocks
            </h1>
            <p class="truncate text-xs font-semibold text-slate-500">
              {{ activeTabView?.name ?? "Robot project" }}
            </p>
          </div>
        </div>

        <div class="flex shrink-0 items-center gap-1 overflow-x-auto">
          <UBadge color="neutral" variant="soft" class="hidden sm:inline-flex">
            {{ generationStatus }}
          </UBadge>
          <UButton
            size="sm"
            @click="openMotors"
          >
            Motors
          </UButton>
          <UButton
            size="sm"
            @click="openExtensionPicker"
          >
            Add Extensions
            <span v-if="extensionCount">({{ extensionCount }})</span>
          </UButton>
        </div>
      </header>

      <UDashboardGroup :persistent="false" class="relative min-h-0 flex-1">
        <!-- Left panel: the block workspace. It's the resizable one, so its
             right edge doubles as the draggable divider for the code sidebar. -->
        <UDashboardPanel
          id="workspace"
          resizable
          :default-size="64"
          :min-size="40"
          :max-size="82"
          class="h-full min-h-0"
        >
        <section
          class="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] bg-slate-100 p-3"
          aria-label="Block workspace"
        >
          <!-- One tab per OpMode; each tab is its own workspace + hat block. -->
          <nav
            class="flex min-w-0 flex-wrap items-end gap-1 overflow-x-auto px-1"
            aria-label="OpModes"
          >
            <div
              v-for="tab in tabViews"
              :key="tab.id"
              class="group flex max-w-[250px] items-stretch rounded-t-lg border transition"
              :class="[
                tab.id === activeTabId
                  ? 'border-slate-200 border-b-white bg-white text-slate-950 shadow-sm'
                  : 'border-transparent bg-slate-200/70 text-slate-600 hover:bg-white hover:text-slate-950',
                !tab.enabled ? 'opacity-60' : '',
              ]"
            >
              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                class="min-w-0 flex-1 justify-start gap-2 rounded-b-none px-2.5 py-2"
                @click="selectTab(tab.id)"
              >
                <UBadge
                  :color="opmodeColor(tab.type)"
                  variant="soft"
                  size="xs"
                  class="uppercase"
                >
                  {{ tab.typeLabel }}
                </UBadge>
                <span
                  class="min-w-0 flex-1 truncate font-bold"
                  :class="{ 'line-through': !tab.enabled }"
                >
                  {{ tab.name }}
                </span>
              </UButton>
              <UButton
                v-if="tabViews.length > 1"
                size="xs"
                color="error"
                variant="ghost"
                class="rounded-b-none rounded-l-none px-2"
                aria-label="Delete opmode"
                @click="deleteOpmode(tab.id)"
                >×</UButton
              >
            </div>
            <div
              class="ml-1 flex shrink-0 items-center gap-1 rounded-t-lg border border-dashed border-slate-300 bg-white/70 px-1.5 py-1"
            >
              <UButton
                size="xs"
                color="primary"
                variant="soft"
                @click="addOpmode('Teleop')"
              >
                + Teleop
              </UButton>
              <UButton
                size="xs"
                color="warning"
                variant="soft"
                @click="addOpmode('Auto')"
              >
                + Auto
              </UButton>
              <UButton
                size="xs"
                color="neutral"
                variant="soft"
                @click="addOpmode('Utility')"
              >
                + Utility
              </UButton>
            </div>
          </nav>

          <div
            class="min-h-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
          >
            <div id="blocklyDiv" ref="blocklyDiv" class="h-full w-full"></div>
          </div>
        </section>
        </UDashboardPanel>

        <!-- Right panel: generated code. Fills whatever width the workspace
             divider leaves; drag the divider between the two to resize. -->
        <UDashboardPanel id="code" class="h-full min-h-0">
        <aside
          class="flex min-h-0 flex-1 flex-col overflow-hidden bg-white"
          aria-label="Generated code and status"
        >
            <div
              v-if="highlightedCode"
              id="generatedCode"
              class="shiki-code h-full min-h-0 overflow-auto text-[0.8rem] leading-6"
              v-html="highlightedCode"
            ></div>
            <pre
              v-else
              id="generatedCode"
              class="h-full min-h-0 overflow-auto  p-3 text-[0.8rem] leading-6 text-slate-100"
            ><code>{{ generatedCode }}</code></pre>
        </aside>
        </UDashboardPanel>
      </UDashboardGroup>
    </main>

    <!-- Motors: the project-level device registry. Motors added here are
         registered automatically in every opmode and appear in every motor
         block's dropdown. -->
    <UModal
      v-model:open="motorsOpen"
      title="Motors"
      description="Add your robot's motors once here. Each is registered automatically in every OpMode and can be picked from any motor block."
      :close="false"
      :ui="{
        content: 'w-[calc(100vw-2rem)] max-w-2xl',
        body: 'min-h-0 overflow-hidden',
        footer: 'justify-between',
      }"
    >
      <template #body>
        <div class="flex max-h-[min(58vh,520px)] min-h-0 flex-col gap-3">
          <UEmpty
            v-if="!motors.length"
            title="No motors yet"
            description="Add one to get started."
            variant="soft"
          />

          <div v-else class="grid min-h-0 gap-1 overflow-hidden">
            <div
              class="grid grid-cols-[minmax(0,1fr)_112px_124px_auto] items-center gap-2 px-1 text-[0.7rem] font-black uppercase tracking-wide text-slate-400"
            >
              <span>Name</span>
              <span>Bus</span>
              <span>Device ID</span>
              <span></span>
            </div>
            <ul class="grid min-h-0 gap-1 overflow-y-auto">
              <li
                v-for="motor in motors"
                :key="motor.id"
                class="grid grid-cols-[minmax(0,1fr)_112px_124px_auto] items-center gap-2 rounded-lg px-1 py-1 hover:bg-slate-50"
              >
                <UInput
                  class="min-w-0"
                  size="sm"
                  :model-value="motor.name"
                  placeholder="motor name"
                  @update:model-value="onMotorName(motor.id, $event)"
                />
                <UInputNumber
                  class="min-w-0"
                  size="sm"
                  :model-value="motor.bus"
                  :increment="false"
                  :decrement="false"
                  :ui="{ base: 'text-center' }"
                  @update:model-value="onMotorBus(motor.id, $event)"
                />
                <UInputNumber
                  class="min-w-0"
                  size="sm"
                  :model-value="motor.deviceId"
                  :increment="false"
                  :decrement="false"
                  :ui="{ base: 'text-center' }"
                  @update:model-value="onMotorDeviceId(motor.id, $event)"
                />
                <UButton
                  size="xs"
                  color="error"
                  variant="soft"
                  @click="removeMotor(motor.id)"
                >
                  Remove
                </UButton>
              </li>
            </ul>
          </div>
        </div>
      </template>

      <template #footer="{ close }">
        <UButton color="primary" @click="addMotor">+ Add motor</UButton>
        <UButton color="neutral" variant="ghost" @click="close">Close</UButton>
      </template>
    </UModal>

    <!-- Extensions picker: load any RobotPy class as an escape-hatch extension. -->
    <UModal
      v-model:open="pickerOpen"
      title="Extensions"
      description="Load any RobotPy class as an escape hatch. Loaded classes appear in the Extensions category of the toolbox."
      :close="false"
      :ui="{
        content: 'w-[calc(100vw-2rem)] max-w-2xl',
        body: 'min-h-0 overflow-hidden',
        footer: 'justify-end',
      }"
      @after:leave="pickerQuery = ''"
    >
      <template #body>
        <div class="flex max-h-[min(58vh,520px)] min-h-0 flex-col gap-3">
          <UInput
            v-model="pickerQuery"
            size="lg"
            type="search"
            placeholder="Search classes (e.g. A301, Gyro, Servo)..."
          />

          <USeparator label="Available classes" />

          <div v-if="catalogLoading" class="grid gap-2">
            <USkeleton
              v-for="index in 5"
              :key="index"
              class="h-14 w-full rounded-lg"
            />
          </div>

          <UEmpty
            v-else-if="!filteredClasses.length"
            title="No matching classes"
            description="Try a different RobotPy class name."
            variant="soft"
          />

          <ul v-else class="grid min-h-0 gap-1 overflow-y-auto">
            <li
              v-for="cls in filteredClasses"
              :key="cls.className"
              class="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-slate-50"
            >
              <div class="min-w-0">
                <span class="block truncate text-sm font-bold">
                  {{ shortName(cls.className) }}
                </span>
                <span
                  class="block truncate text-xs font-semibold text-slate-400"
                >
                  {{ cls.className }}
                </span>
                <UBadge
                  color="neutral"
                  variant="soft"
                  size="xs"
                  class="mt-1 max-w-full truncate"
                >
                  {{ cls.module }}
                </UBadge>
              </div>
              <UButton
                size="xs"
                :color="isExtensionLoaded(cls.className) ? 'error' : 'primary'"
                :variant="isExtensionLoaded(cls.className) ? 'soft' : 'solid'"
                @click="toggleExtension(cls.className)"
              >
                {{ isExtensionLoaded(cls.className) ? "Remove" : "Add" }}
              </UButton>
            </li>
          </ul>
        </div>
      </template>

      <template #footer="{ close }">
        <UButton
          color="neutral"
          variant="ghost"
          @click="
            close();
            closePicker();
          "
        >
          Close
        </UButton>
      </template>
    </UModal>
  </UApp>
</template>

<style scoped>
/* Shiki injects its own <pre class="shiki"> with an inline background. Make it
   fill the panel and let long lines scroll instead of wrapping. */
.shiki-code :deep(pre.shiki) {
  margin: 0;
  min-height: 100%;
  padding: 0.75rem;
  border-radius: 0;
}

.shiki-code :deep(code) {
  font-family: inherit;
}
</style>
