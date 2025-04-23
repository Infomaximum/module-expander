import { expandRoutes, expandErrorHandlers, expandTheme, type Nullable } from "../utils";
import type { NCore } from "../Interfaces";
import type { IModule, Module } from "../Module";

type TModuleMapSorted = {
  module: IModule;
  /**
   * счетчик количества зависимостей от модуля
   */
  count: number;
};

type ModuleGetter = () => Promise<typeof Module>;

export type ModuleMetadata = {
  /** флаг отвечающий за подключение модуля
   *
   * `undefined`_(по умолчанию)_ - модуль будет подключаться если модуль подключен на сервере
   * и все модули от которых зависит этот модуль подключены
   *
   * `true` - модуль будет подключаться вне зависимости подключен ли он на сервере или нет,
   * но с учетом того, что все модули от которых зависит этот модуль подключены
   *
   * `false` - модуль не будет подключен, даже если он подключен на сервере */
  isConnect?: boolean | undefined;
};

type ModuleWithMetadata = {
  moduleGetter: ModuleGetter;
  metadata: ModuleMetadata;
};

export class Expander {
  private static instance: Expander;
  private modules = new Map<string, ModuleWithMetadata>();
  private resolvedModules = new Set<IModule>();
  private routes: NCore.IRoutes[] = [];
  private entrypointList: (() => void)[] = [];
  private errorsConfig: NCore.TErrorPreparer[] = [];
  private featuresConfig = {
    featureList: {},
    featureGroupList: {},
    licenseFeatureList: {},
  } satisfies NCore.TFeaturesConfig;
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

  /**
   * сортировка от количества зависимостей, модули, от которых больше всего зависимостей
   * будут подключаться первыми
   */
  private get sortedModules() {
    const countName = "count" as const;
    const moduleName = "module" as const;

    const dependencies = new Map<string, TModuleMapSorted>();

    this.resolvedModules.values().forEach((module) => {
      if (!!module) {
        dependencies.set(module.moduleId, {
          [moduleName]: module,
          [countName]: 0,
        });
      }
    });

    dependencies.forEach((params) => {
      const directDependencies = params[moduleName].dependencies.map((d) => d.instance.moduleId);

      Array.isArray(directDependencies) &&
        directDependencies.forEach((dependency) => {
          const dependencyMeta = dependencies.get(dependency);

          if (dependencyMeta) {
            dependencies.set(dependency, {
              ...dependencyMeta,
              [countName]: dependencyMeta[countName] + 1,
            });
          }
        });
    });

    return Array.from(dependencies.values())
      .sort((a, b) => b[countName] - a[countName])
      .map((entry) => entry[moduleName]);
  }

  public registerModule(moduleId: string, moduleGetter: ModuleGetter, metadata: ModuleMetadata) {
    this.modules.set(moduleId, { moduleGetter, metadata });

    return this;
  }

  private expandRoutes(routesConfig: Nullable<NCore.IRoutes[]>) {
    if (routesConfig) {
      expandRoutes(this.routes, routesConfig);
    }

    return this;
  }

  private expandErrorsConfig(errorsConfig: Nullable<NCore.TErrorPreparer[]>) {
    if (errorsConfig) {
      expandErrorHandlers(this.errorsConfig, errorsConfig);
    }

    return this;
  }

  private expandFeaturesConfig(featuresConfig: Nullable<NCore.TFeaturesConfig>) {
    if (!featuresConfig) {
      return this;
    }

    if (featuresConfig.featureList) {
      Object.assign(this.featuresConfig.featureList, featuresConfig.featureList);
    }

    if (featuresConfig.featureGroupList) {
      Object.assign(this.featuresConfig.featureGroupList, featuresConfig.featureGroupList);
    }

    if (featuresConfig.licenseFeatureList) {
      Object.assign(this.featuresConfig.licenseFeatureList, featuresConfig.licenseFeatureList);
    }

    return this;
  }

  private expandEntryPoint(entrypoint: (() => void) | null) {
    if (entrypoint) {
      this.entrypointList.push(entrypoint);
    }

    return this;
  }

  private expandTheme(theme: Nullable<Record<string, any>>) {
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

  private isConnectModule(module: typeof Module, subsystemsIds: Set<string>) {
    const { instance } = module;

    const isAllDependenciesAllowed =
      Array.isArray(instance.dependencies) &&
      /* c resolvedModules могут быть проблемы, если модуль зависит от модуля с наименьшим числом зависимостей,
      поэтому проверяем в крайнем случае и возможность модуля подключиться в дальнейшем (не безопасно, но и не нужно)
       */
      instance.dependencies.every(
        (dependency) =>
          this.resolvedModules.has(dependency.instance) ||
          subsystemsIds.has(dependency.instance.moduleId)
      );

    if (isAllDependenciesAllowed && subsystemsIds.has(instance.moduleId)) {
      return true;
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

  public connectModule(module: IModule) {
    module.registerModels?.();

    this.expandRoutes(module.getRoutes?.());
    this.expandErrorsConfig(module.getErrorsConfig?.());
    this.expandFeaturesConfig(module.getFeaturesConfig?.());

    module.registerExtensions?.();

    this.expandTheme(module.getThemeConfig?.());

    module.onInitialize?.();

    this.expandEntryPoint(() => module.getEntrypoint?.());

    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.log(`${module.constructor?.name} init`);
    }
  }

  public async resolveDependencies(modules: (typeof Module)[]) {
    for await (const module of modules) {
      if (!this.resolvedModules.has(module.instance)) {
        this.resolvedModules.add(module.instance);
      }

      if (module.instance.dependencies?.length) {
        await this.resolveDependencies(module.instance.dependencies);
      }
    }
  }

  private async buildAllModules() {
    for await (const [, { moduleGetter }] of this.modules) {
      const module = await moduleGetter();

      this.resolvedModules.add(module.instance);

      await this.resolveDependencies(module.instance.dependencies);
    }
  }

  private async buildByModuleIds(subsystemsIds: Set<string>) {
    const modules = this.modules.entries().reduce((acc, [moduleId, module]) => {
      if (
        !acc.has(module) &&
        ((subsystemsIds.has(moduleId) && module.metadata.isConnect !== false) ||
          module.metadata.isConnect)
      ) {
        acc.add(module);
      }

      return acc;
    }, new Set<ModuleWithMetadata>());

    for await (const { moduleGetter } of modules) {
      const module = await moduleGetter();

      if (!this.isConnectModule(module, subsystemsIds)) {
        if (process.env.NODE_ENV !== "production") {
          // eslint-disable-next-line no-console
          console.error(
            `Модуль c id = ${module.instance.moduleId} не подключен, так как не были зарезолвлены все неободимые зависимости`
          );
        }

        continue;
      }

      this.resolvedModules.add(module.instance);

      await this.resolveDependencies(module.instance.dependencies);
    }
  }

  /**
   * Метод расширения всех конфигов
   */
  public async build(subsystemsIds: Set<string> | undefined) {
    if (!subsystemsIds?.size) {
      await this.buildAllModules();
    } else {
      await this.buildByModuleIds(subsystemsIds);
    }

    this.sortedModules.forEach((module) => this.connectModule(module));

    this.isReadyApp = true;
    // Обязательно вызов функций должен быть после расширения всех конфигов и до вызова entrypoints
    this.whenAppReadyCallbacks.forEach((callback) => callback());

    // Обязательно, вызов этих функций должен быть последним
    this.entrypointList.forEach((entrypointGetter) => {
      if (typeof entrypointGetter === "function") {
        entrypointGetter();
      }
    });
  }
}
