import type { ErrorPayload, Route } from "./Interfaces";
import type { Awaitable } from "./utils";

export interface IModule {
  moduleId: string;

  /** список прямых зависимостей модуля без которых он не будет подключаться. */
  dependencies: (typeof Module)[];

  /** Список роутов добавляемых модулем */
  getRoutesConfig?(): Awaitable<Route[]>;
  /** Обработка рендеринга в DOM  */
  getEntrypoint?(): Awaitable<void>;
  /** Список ошибок для модуля  */
  getErrorsConfig?(): Awaitable<ErrorPayload[]>;
  /** Конфиг фич модуля  */
  getFeaturesConfig?(): Awaitable<Record<string, unknown>>;
  /** Расширение темы из модуля */
  getThemeConfig?(): Awaitable<Record<string, any>>;
  /** Расширения модуля  */
  registerExtensions?(): Awaitable<void>;
  /** Модели модуля */
  registerModels?(): Awaitable<void>;
  /** Побочные эффекты при инициализации модуля */
  onInitialize?(): Awaitable<void>;
}

export abstract class Module implements IModule {
  private static _instance: Module & IModule;

  protected constructor() {
    const constructor = this.constructor as typeof Module;

    if (constructor._instance) {
      throw new Error("Instance has already been created");
    }

    constructor._instance = this;
  }

  public static get instance() {
    const constructor = this;

    if (!constructor._instance) {
      //@ts-expect-error
      constructor._instance = new constructor();
    }

    return constructor._instance;
  }

  public abstract moduleId: string;

  public abstract dependencies: (typeof Module)[];
}
