import "reflect-metadata";
import {
  isFunction,
  forEach,
  map,
  orderBy,
  every,
  isArray,
  isUndefined,
  isBoolean,
} from "lodash";
import {
  type IModuleExpander,
  ModuleExpander,
} from "../ModuleExpander/ModuleExpander";
import { expandRoutes, expandErrorHandlers, expandTheme } from "../utils";
import type { NCore } from "../Interfaces";
import type { TModuleInjectParams } from "../defineModule/defineModule";

type TModuleMapSorted = {
  module: IModuleExpander;
  /**
   * счетчик количества зависимостей от модуля
   */
  count: number;
};

export class Expander {
  private static instance: Expander;
  private modules: IModuleExpander[] = [];
  private routes: NCore.IRoutes[] = [];
  private entrypointList: (() => void)[] = [];
  private errorsConfig: NCore.TErrorPreparer[] = [];
  private featuresConfig: NCore.TFeaturesConfig = {
    featureList: {},
    featureGroupList: {},
    licenseFeatureList: {},
  };
  private theme: Record<string, any> = {};

  /** Флаг указывает на то, что приложение готово к вызову entrypoints */
  private isReadyApp: boolean = false;

  /** Callback-функции, которые должны быть запущены после подключения всех модулей */
  private whenAppReadyCallbacks: (() => void)[] = [];

  public static getInstance(): Expander {
    if (Expander.instance) {
      return Expander.instance;
    }

    Expander.instance = new Expander();

    return Expander.instance;
  }

  private constructor() {}

  private getInjectModuleParams(module: IModuleExpander): TModuleInjectParams {
    return Reflect.getMetadata(ModuleExpander.moduleInjectParamsKey, module);
  }

  private getDependencies(module: IModuleExpander): string[] {
    const directDependencies = this.getInjectModuleParams(module).dependencies;

    return directDependencies?.map((m) => m.moduleName);
  }

  private getModuleName(module: IModuleExpander): string | undefined {
    return this.getInjectModuleParams(module).moduleName;
  }

  /**
   * сортировка от количества зависимостей, модули, от которых больше всего зависимостей
   * будут подключаться первыми
   */
  private get sortedModules() {
    const countName = "count" as const;
    const moduleName = "module" as const;

    const dependencies = new Map<string, TModuleMapSorted>();

    forEach(this.modules, (module) => {
      const name = this.getModuleName(module);

      if (!!name) {
        dependencies.set(name, {
          [moduleName]: module,
          [countName]: 0,
        });
      }
    });

    dependencies.forEach((params) => {
      const directDependencies = this.getDependencies(params[moduleName]);

      isArray(directDependencies) &&
        forEach(directDependencies, (dependency) => {
          const dependencyMeta = dependencies.get(dependency);

          if (dependencyMeta) {
            dependencies.set(dependency, {
              ...dependencyMeta,
              [countName]: dependencyMeta[countName] + 1,
            });
          }
        });
    });

    return map(
      orderBy(Array.from(dependencies.values()), countName, "desc"),
      moduleName
    );
  }

  public expandModules(module: IModuleExpander) {
    this.modules.push(module);

    return this;
  }

  private expandRoutes(routesConfig: NCore.IRoutes[] | undefined) {
    if (routesConfig) {
      expandRoutes(this.routes, routesConfig);
    }

    return this;
  }

  private expandErrorsConfig(errorsConfig: NCore.TErrorPreparer[] | undefined) {
    if (errorsConfig) {
      expandErrorHandlers(this.errorsConfig, errorsConfig);
    }

    return this;
  }

  private expandFeaturesConfig(
    featuresConfig: NCore.TFeaturesConfigFuncs | null
  ) {
    if (featuresConfig) {
      if (isFunction(featuresConfig.featureList)) {
        Object.assign(
          this.featuresConfig.featureList,
          featuresConfig.featureList()
        );
      }

      if (isFunction(featuresConfig.featureGroupList)) {
        Object.assign(
          this.featuresConfig.featureGroupList,
          featuresConfig.featureGroupList()
        );
      }

      if (isFunction(featuresConfig.licenseFeatureList)) {
        Object.assign(
          this.featuresConfig.licenseFeatureList,
          featuresConfig.licenseFeatureList()
        );
      }
    }

    return this;
  }

  private expandExtendersConfig(
    extendersConfig: NCore.TExtendersConfig | undefined
  ) {
    if (extendersConfig) {
      forEach(extendersConfig, (extenderFunc) => {
        if (extenderFunc && isFunction(extenderFunc)) {
          extenderFunc();
        }
      });
    }

    return this;
  }

  private expandLaunchEffect(launchEffect: (() => void) | null) {
    if (isFunction(launchEffect)) {
      launchEffect();
    }

    return this;
  }

  private expandEntryPoint(entrypoint: (() => void) | null) {
    if (entrypoint) {
      this.entrypointList.push(entrypoint);
    }

    return this;
  }

  private expandModels(expandModels: (() => void) | null) {
    if (isFunction(expandModels)) {
      expandModels();
    }

    return this;
  }

  private expandTheme(theme: Record<string, any> | undefined) {
    if (theme) {
      expandTheme(this.theme, theme);
    }

    return this;
  }

  public getRoutes() {
    return this.routes;
  }

  public getErrorsHandlers() {
    return this.errorsConfig;
  }

  public getFeaturesConfig(): NCore.TFeaturesConfig {
    return this.featuresConfig;
  }

  public getTheme(): Record<string, any> {
    return this.theme;
  }

  /**
   * описание логики работа в описании типа `TModuleInjectParams["isConnect"]`
   */
  private isConnectModule(
    module: IModuleExpander,
    resolvedModules: Set<string>,
    subsystemsIds: Set<string> | undefined
  ) {
    if (subsystemsIds === undefined) {
      return true;
    }

    const { isConnect, moduleName, dependencies } =
      this.getInjectModuleParams(module);

    const isAllDependenciesAllowed =
      isArray(dependencies) &&
      /* c resolvedModules могут быть проблемы, если модуль зависит от модуля с наименьшим числом зависимостей,
      поэтому проверяем в крайнем случае и возможность модуля подключиться в дальнейшем (не безопасно, но и не нужно)
       */
      every(
        dependencies,
        (dependency) =>
          resolvedModules.has(dependency.moduleName) ||
          subsystemsIds.has(dependency.moduleName)
      );

    if (
      isUndefined(isConnect) &&
      isAllDependenciesAllowed &&
      subsystemsIds.has(moduleName)
    ) {
      return true;
    }

    if (isBoolean(isConnect) && isConnect && isAllDependenciesAllowed) {
      return true;
    }

    if (isBoolean(isConnect) && !isConnect) {
      return false;
    }

    return false;
  }

  /**
   * Запустить callback-функцию, если подключены все модули или положить в очередь вызовов
   * @param callback
   */
  public runWhenAppReady(callback: () => void) {
    if (this.isReadyApp) {
      callback();
    } else {
      this.whenAppReadyCallbacks.push(callback);
    }
  }

  /**
   * Метод расширения всех конфигов
   */
  public build(subsystemsIds: Set<string> | undefined) {
    const resolvedModules = new Set<string>();

    forEach(this.sortedModules, (module) => {
      const { moduleName } = this.getInjectModuleParams(module);

      if (this.isConnectModule(module, resolvedModules, subsystemsIds)) {
        this.expandModels(module.getModelsConfig())
          .expandRoutes(module.getRoutes()?.())
          .expandErrorsConfig(module.getErrorsConfig()?.())
          .expandFeaturesConfig(module.getFeaturesConfig())
          .expandExtendersConfig(module.getExtendersConfig()?.())
          .expandTheme(module.getThemeConfig()?.())
          .expandLaunchEffect(module.getLaunchEffect())
          .expandEntryPoint(module.getEntrypoint());

        resolvedModules.add(moduleName);

        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.log(`${module.constructor?.name} init`);
        }
      }
    });

    this.isReadyApp = true;
    // Обязательно вызов функций должен быть после расширения всех конфигов и до вызова entrypoints
    forEach(this.whenAppReadyCallbacks, (callback) => callback());

    // Обязательно, вызов этих функций должен быть последним
    this.entrypointList.forEach((entrypointGetter) => {
      if (isFunction(entrypointGetter)) {
        entrypointGetter();
      }
    });
  }
}
