import type { NCore } from "../Interfaces";

type TFunction = (() => void) | null;

export interface IModuleExpander {
  name: string;

  /** Список роутов добавляемых модулем */
  getRoutes(): NCore.TRoutesFunc | null;
  /** Обработка рендеринга в DOM  */
  getEntrypoint(): (() => void) | null;
  /** Список ошибок для модуля  */
  getErrorsConfig(): NCore.TErrorPreparersFunc | null;
  /** Конфиг фич модуля  */
  getFeaturesConfig(): NCore.TFeaturesConfigFuncs | null;
  /** Расширения модуля  */
  getExtendersConfig(): NCore.TExtendersConfigFunc | null;
  /** Расширение темы из модуля */
  getThemeConfig(): NCore.TThemeConfigFunc | null;
  /** Модели модуля */
  getModelsConfig(): TFunction;
  /** Побочные эффекты модуля */
  getLaunchEffect(): TFunction;
}

export type TModuleExpanderParams = {
  name: string;
  routesConfig?: NCore.TRoutesFunc;
  /** Функция, выполняемая при начальной загрузке модуля */
  launchEffect?: TFunction;
  /**
   * Энтрипоинт который служит для отображения приложения, например
   * отображение приложения в <div id="root"></div>.
   * У приложения может быть несколько таких точек
   */
  entrypoint?: TFunction;
  errorsConfig?: NCore.TErrorPreparersFunc;
  featuresConfig?: NCore.TFeaturesConfigFuncs;
  extendersConfig?: NCore.TExtendersConfigFunc;
  modelsConfig?: TFunction;
  themeConfig?: NCore.TThemeConfigFunc;
};

export abstract class ModuleExpander implements IModuleExpander {
  protected routesConfig: NCore.TRoutesFunc | null;
  protected launchEffect: TFunction | null;
  protected entrypoint: TFunction | null;
  protected errorsConfig: NCore.TErrorPreparersFunc | null;
  protected featuresConfig: NCore.TFeaturesConfigFuncs | null;
  protected extendersConfig: NCore.TExtendersConfigFunc | null;
  protected modelsConfig: TFunction;
  protected themeConfig: NCore.TThemeConfigFunc | null;

  public name: string;

  public static moduleInjectParamsKey = Symbol.for("moduleInjectParams");
  public static moduleName = "";

  constructor({
    name,
    routesConfig,
    launchEffect,
    entrypoint,
    errorsConfig,
    featuresConfig,
    extendersConfig,
    modelsConfig,
    themeConfig,
  }: TModuleExpanderParams) {
    this.name = name;

    this.routesConfig = routesConfig ?? null;
    this.launchEffect = launchEffect ?? null;
    this.entrypoint = entrypoint ?? null;
    this.errorsConfig = errorsConfig ?? null;
    this.featuresConfig = featuresConfig ?? null;
    this.extendersConfig = extendersConfig ?? null;
    this.modelsConfig = modelsConfig ?? null;
    this.themeConfig = themeConfig ?? null;
  }

  public getRoutes() {
    return this.routesConfig;
  }

  public getLaunchEffect() {
    return this.launchEffect;
  }

  public getEntrypoint() {
    return this.entrypoint;
  }

  public getErrorsConfig() {
    return this.errorsConfig;
  }

  public getFeaturesConfig() {
    return this.featuresConfig;
  }

  public getExtendersConfig() {
    return this.extendersConfig;
  }

  public getModelsConfig() {
    return this.modelsConfig;
  }

  public getThemeConfig() {
    return this.themeConfig;
  }
}
