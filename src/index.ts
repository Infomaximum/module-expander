import { Expander, type ResolveModuleEntry } from "./Expander/Expander";
import { defineModule } from "./defineModule/defineModule";
import type { Route, ErrorPayload } from "./Interfaces";
import { sortErrorHandlers } from "./utils";
import { getInstanceExt } from "./InjectConfigs/instanceExt";
import type { IModule } from "./Module";
import { Module } from "./Module";

class ModuleBuilder {
  private constructor() {}

  /**
   * @param subsystems - список uuid подключаемых модулей, если ничего не передаем(или undefined), то подключаются все модули
   */
  public static build(subsystems?: string[]) {
    const subsystemsIds = subsystems === undefined ? undefined : new Set<string>(subsystems);

    Expander.getInstance().build(subsystemsIds);
  }
}

export { ModuleBuilder, Expander, Module, defineModule, sortErrorHandlers, getInstanceExt };

export type { Route, ErrorPayload, IModule, ResolveModuleEntry };
