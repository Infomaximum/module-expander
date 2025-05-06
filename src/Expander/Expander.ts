import {
  expandRoutes,
  expandErrorHandlers,
  expandTheme,
  type Nullable,
  type Awaitable,
} from "../utils";
import type { ErrorPayload, Route } from "../Interfaces";
import type { IModule, Module } from "../Module";

type TModuleMapSorted = {
  module: IModule;
  /**
   * счетчик количества зависимостей от модуля
   */
  count: number;
};

export type ResolveModuleEntry = () => Promise<typeof Module>;

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
  resolveModuleEntry: ResolveModuleEntry;
  metadata: ModuleMetadata;
};

export class Expander {
  private static instance: Expander;
  private modules = new Map<string, ModuleWithMetadata>();
  private routes: Route[] = [];
  private entrypointList: Awaitable<(() => void) | null>[] = [];
  private errorsConfig: ErrorPayload[] = [];
  private featuresConfig: Record<string, unknown> = {};
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
  private getSortedModules(modules: Set<IModule>) {
    const countName = "count" as const;
    const moduleName = "module" as const;

    const dependencies = new Map<string, TModuleMapSorted>();

    modules.forEach((module) => {
      if (!!module) {
        dependencies.set(module.moduleId, {
          [moduleName]: module,
          [countName]: 0,
        });
      }
    });

    modules.forEach((module) => {
      const directDependencies = module.dependencies.map((d) => d.instance.moduleId);

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

  public registerModule(
    moduleId: string,
    resolveModuleEntry: ResolveModuleEntry,
    metadata: ModuleMetadata
  ) {
    this.modules.set(moduleId, { resolveModuleEntry, metadata });

    return this;
  }

  private expandRoutes(routesConfig: Nullable<Route[]>) {
    if (routesConfig) {
      expandRoutes(this.routes, routesConfig);
    }

    return this;
  }

  private expandErrorsConfig(errorsConfig: Nullable<ErrorPayload[]>) {
    if (errorsConfig) {
      expandErrorHandlers(this.errorsConfig, errorsConfig);
    }

    return this;
  }

  private expandFeaturesConfig(featuresConfig: Nullable<Record<string, unknown>>) {
    if (!featuresConfig) {
      return this;
    }

    Object.keys(featuresConfig).forEach((key) => {
      if (key && !this.featuresConfig[key]) {
        this.featuresConfig[key] = {};
      }

      if (this.featuresConfig[key]) {
        Object.assign(this.featuresConfig[key], featuresConfig[key]);
      }
    });

    return this;
  }

  private expandEntryPoint(entrypoint: Awaitable<(() => void) | null>) {
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

  public getFeaturesConfig(): Record<string, unknown> {
    return this.featuresConfig;
  }

  public getTheme(): Record<string, any> {
    return this.theme;
  }

  private isConnectModule(
    module: typeof Module,
    subsystemsIds: Set<string>,
    resolvedModules: Set<IModule>
  ) {
    const { instance } = module;

    const isAllDependenciesAllowed =
      Array.isArray(instance.dependencies) &&
      /* c resolvedModules могут быть проблемы, если модуль зависит от модуля с наименьшим числом зависимостей,
      поэтому проверяем в крайнем случае и возможность модуля подключиться в дальнейшем (не безопасно, но и не нужно)
       */
      instance.dependencies.every(
        (dependency) =>
          resolvedModules.has(dependency.instance) ||
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

  public async connectModule(module: IModule) {
    await module.registerModels?.();

    this.expandRoutes(await module.getRoutesConfig?.());
    this.expandErrorsConfig(await module.getErrorsConfig?.());
    this.expandFeaturesConfig(await module.getFeaturesConfig?.());

    await module.registerExtensions?.();

    this.expandTheme(await module.getThemeConfig?.());

    await module.onInitialize?.();

    this.expandEntryPoint(() => module.getEntrypoint?.());

    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.log(`${module.constructor?.name} init`);
    }
  }

  public async resolveDependencies(modules: (typeof Module)[], resolvedModules: Set<IModule>) {
    for await (const module of modules) {
      if (!resolvedModules.has(module.instance)) {
        resolvedModules.add(module.instance);
      }

      if (module.instance.dependencies?.length) {
        await this.resolveDependencies(module.instance.dependencies, resolvedModules);
      }
    }
  }

  private async resolveAllModules() {
    const resolvedModules = new Set<IModule>();

    for await (const [, { resolveModuleEntry }] of this.modules) {
      const module = await resolveModuleEntry();

      resolvedModules.add(module.instance);

      await this.resolveDependencies(module.instance.dependencies, resolvedModules);
    }

    return this.getSortedModules(resolvedModules);
  }

  private async resolveByModuleIds(subsystemsIds: Set<string>) {
    const resolvedModules = new Set<IModule>();
    const instances = new Set<IModule>();

    for await (const { resolveModuleEntry } of this.modules.values()) {
      const module = await resolveModuleEntry();

      instances.add(module.instance);

      if (!this.isConnectModule(module, subsystemsIds, resolvedModules)) {
        // if (process.env.NODE_ENV !== "production") {
        //   // eslint-disable-next-line no-console
        //   console.error(
        //     `Модуль c id = ${module.instance.moduleId} не подключен, так как не были зарезолвлены все неободимые зависимости`
        //   );
        // }

        continue;
      }

      resolvedModules.add(module.instance);

      await this.resolveDependencies(module.instance.dependencies, resolvedModules);
    }

    const sortedModules = this.getSortedModules(instances);

    return sortedModules.filter((m) => resolvedModules.has(m));
  }

  /**
   * Метод расширения всех конфигов
   */
  public async build(subsystemsIds: Set<string> | undefined) {
    let modules: IModule[];

    if (!subsystemsIds?.size) {
      modules = await this.resolveAllModules();
    } else {
      modules = await this.resolveByModuleIds(subsystemsIds);
    }

    for await (const module of modules) {
      await this.connectModule(module);
    }

    this.isReadyApp = true;
    // Обязательно вызов функций должен быть после расширения всех конфигов и до вызова entrypoints
    this.whenAppReadyCallbacks.forEach((callback) => callback());

    // Обязательно, вызов этих функций должен быть последним
    for await (const entrypointGetter of this.entrypointList) {
      if (typeof entrypointGetter === "function") {
        entrypointGetter();
      }
    }
  }
}
