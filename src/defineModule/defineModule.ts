import "reflect-metadata";
import type {
  IModuleExpander,
  TModuleExpanderParams,
} from "../ModuleExpander/ModuleExpander";
import { ModuleExpander } from "../ModuleExpander/ModuleExpander";
import { Expander } from "../Expander/Expander";

interface IModuleClass {
  new (params: TModuleExpanderParams): IModuleExpander;
  moduleName: string;
}

export type TModuleInjectParams = {
  /** список прямых зависимостей модуля без которых он не будет подключаться. */
  dependencies: IModuleClass[];
  /** имя модуля */
  moduleName: string;
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
};

type TDefineModuleParams = Omit<TModuleExpanderParams, "name"> & {
  injectParams: TModuleInjectParams;
};

export const defineModule =
  ({ injectParams, ...rest }: TDefineModuleParams) =>
  <T extends IModuleClass>(Module: T) => {
    const ModuleInstance = new Module({
      ...rest,
      name: injectParams.moduleName,
    });

    Module.moduleName = injectParams.moduleName;

    Reflect.defineMetadata(
      ModuleExpander.moduleInjectParamsKey,
      injectParams,
      ModuleInstance
    );

    Expander.getInstance().expandModules(ModuleInstance);
  };
