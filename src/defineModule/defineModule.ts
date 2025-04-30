import { Expander } from "../Expander/Expander";
import type { Module } from "../Module";

type ModuleGetter = () => Promise<typeof Module>;

type TDefineModuleParams = {
  /** идентификатор модуля на сервере */
  moduleId: string;
  /** флаг отвечающий за подключение модуля
   *
   * `undefined`_(по умолчанию)_ - модуль будет подключаться если модуль подключен на сервере
   * и все модули от которых зависит этот модуль подключены
   *
   * `true` - модуль будет подключаться вне зависимости подключен ли он на сервере или нет,
   * но с учетом того, что все модули от которых зависит этот модуль подключены
   *
   * `false` - модуль не будет подключен, даже если он подключен на сервере */
  isConnect?: boolean;

  resolveModuleEntry: ModuleGetter;
};

export const defineModule = ({ moduleId, resolveModuleEntry, isConnect }: TDefineModuleParams) => {
  Expander.getInstance().registerModule(moduleId, resolveModuleEntry, {
    isConnect,
  });
};
