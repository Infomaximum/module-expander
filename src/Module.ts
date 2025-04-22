import type { NCore } from "./Interfaces";
import type { Nullable } from "./utils";

export interface IModule {
  moduleId: string;

  /** список прямых зависимостей модуля без которых он не будет подключаться. */
  dependencies: (typeof Module)[];

  /** Список роутов добавляемых модулем */
  getRoutes?(): Nullable<NCore.IRoutes[]>;
  /** Обработка рендеринга в DOM  */
  getEntrypoint?(): void;
  /** Список ошибок для модуля  */
  getErrorsConfig?(): Nullable<NCore.TErrorPreparer[]>;
  /** Конфиг фич модуля  */
  getFeaturesConfig?(): Nullable<NCore.TFeaturesConfig>;
  /** Расширение темы из модуля */
  getThemeConfig?(): Nullable<Record<string, any>>;
  /** Расширения модуля  */
  registerExtensions?(): void;
  /** Модели модуля */
  registerModels?(): void;
  /** Побочные эффекты при инициализации модуля */
  onInitialize?(): void;
}

export abstract class Module implements IModule {
  private static _instance: Module & IModule;

  protected constructor() {
    const constructor = this.constructor as typeof Module;

    if (constructor._instance) {
      throw new Error("Инстанс уже был создан");
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
