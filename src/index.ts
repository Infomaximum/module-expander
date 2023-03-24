import { get, map } from "lodash";
import { Expander } from "./Expander/Expander";
import { ModuleExpander } from "./ModuleExpander/ModuleExpander";
import type { IModuleExpander } from "./ModuleExpander/ModuleExpander";
import { defineModule } from "./defineModule/defineModule";
import type { NCore } from "./Interfaces";
import { showGlobalErrorModal, sortErrorHandlers } from "./utils";
import { getInstanceExt } from "./InjectConfigs/instanceExt";
import { XTraceIdHeaderKey } from "@infomaximum/utility";
import { v4 as uuid4 } from "uuid";

const apiPrefix = get(window, "imFrontEndSystem.apiPrefix");

// Определение пути, по которому лежат chunks динамических импортов
__webpack_public_path__ = `${apiPrefix}/`; //todo: убрать после стабилизации

class ModuleBuilder {
  private async getSubsystems(): Promise<string[] | undefined> {
    try {
      const data = await (
        await fetch(`${apiPrefix}/graphql`, {
          headers: {
            "Content-Type": "application/json",
            [XTraceIdHeaderKey]: uuid4(),
          },
          body: JSON.stringify({ query: "{server{active_subsystem{uuid}}}" }),
          method: "POST",
        })
      ).json();

      if (!!get(data, "error")) {
        throw new Error(); // ошибка для перехода в catch
      }

      return map(
        get(data, "data.server.active_subsystem"),
        (subsystem) => subsystem.uuid
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Ошибка загрузки списка модулей ", error);

      showGlobalErrorModal();
    }
  }
  public async build() {
    const subsystemsIds = new Set<string>(await this.getSubsystems());

    Expander.getInstance().build(subsystemsIds);
  }
}

if (process.env.NODE_ENV !== "test") {
  new ModuleBuilder().build();
}

export {
  Expander,
  ModuleExpander,
  defineModule,
  sortErrorHandlers,
  getInstanceExt,
  showGlobalErrorModal,
};

export type { NCore, IModuleExpander };
