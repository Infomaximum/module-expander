/// <reference types="@infomaximum/global-types" />

import { Expander } from "./Expander/Expander";
import { ModuleExpander } from "./ModuleExpander/ModuleExpander";
import type { IModuleExpander } from "./ModuleExpander/ModuleExpander";
import { defineModule } from "./defineModule/defineModule";
import type { NCore } from "./Interfaces";
import { showGlobalErrorModal, sortErrorHandlers } from "./utils";
import { getInstanceExt } from "./InjectConfigs/instanceExt";

class ModuleBuilder {
  private constructor() {}

  /**
   * @param subsystems - список uuid подключаемых модулей, если ничего не передаем(или undefined), то подключаются все модули
   */
  public static build(subsystems?: string[]) {
    const subsystemsIds =
      subsystems === undefined ? undefined : new Set<string>(subsystems);

    Expander.getInstance().build(subsystemsIds);
  }
}

export {
  ModuleBuilder,
  Expander,
  ModuleExpander,
  defineModule,
  sortErrorHandlers,
  getInstanceExt,
  showGlobalErrorModal,
};

export type { NCore, IModuleExpander };
