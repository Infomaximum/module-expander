import type { Location, NavigateFunction, PathMatch, NonIndexRouteObject } from "react-router";
import type { TFeatureEnabledChecker } from "@infomaximum/utility";
import type { TLocalizationDescription, Localization } from "@infomaximum/localization";

export declare namespace NCore {
  // ---------------------------- Расширение RoutesConfig ---------------------------//
  type TQueryParams = {
    /** Параметр для получения id из match.params */
    idParamName: string;
    /**Параметр для построения запроса вида:
     * query{
     *    path{
     *      item
     *    }
     * }
     */
    path: string;
    /** Параметр для построения запроса */
    item: string;
    /** Локализация для префикса перед именем модели */
    prefixLoc: TLocalizationDescription;
  };

  interface IRoutes extends NonIndexRouteObject {
    /** Уникальный идентификатор роута */
    key?: string;

    /** Путь по которому будет доступен данный роут */
    path?: string;

    /** Оригинальный путь роута (до преобразования в относительный, формирует routesMap) */
    originalPath?: string;

    /** Указывает, конечный ли путь у роута */
    exact?: boolean;

    /** Локализация для пункта меню */
    loc?: TLocalizationDescription;

    /** Строка с ссылкой для редиректа */
    redirect?: string;

    /** Порядок вывода пунктов */
    priority?: number;

    /** Вложенные роуты */
    routes?: IRoutes[];

    /**
     * Привилегии, наличие которых необходимо для отображения компонентов из ветви роутинга. Если доступы не указаны,
     * то проверка и отсечение не производится. Ветвь роутинга будет отображена, если у пользователя по каждой привилегии
     * будет доступ хотя бы по одной операции, в противном случае будет скрыта вся весть вместе с дочерними роутами.
     * Имеет более высокий приоритет, чем {@link somePrivileges}.
     *
     * @example
     * {
     *   privileges: [
     *     ECoreAccessKey.Employee,
     *     [ECoreAccessKey.SecuritySettings, { accessType: EOperationType.WRITE }],
     *   ],
     * }
     */
    privileges?: (string | Parameters<TFeatureEnabledChecker>)[];

    /**
     * Привилегии, наличие которых необходимо для отображения компонентов из ветви роутинга. Если привилегии не указаны,
     * то проверка и отсечение не производится. Ветвь роутинга будет отображена, если у пользователя хотя бы по одной
     * привилегии будет доступ хотя бы по одной операции, в противном случае будет скрыта вся весть вместе с дочерними
     * роутами.
     *
     * @example
     * {
     *   somePrivileges: [
     *     ECoreAccessKey.Employee,
     *     [ECoreAccessKey.SecuritySettings, { accessType: EOperationType.WRITE }],
     *   ],
     * },
     * }
     */
    somePrivileges?: (string | Parameters<TFeatureEnabledChecker>)[];

    /**
     * Указывает на то, отображает ли эта конфигурация роута только компонент редиректа, бех других компонентов.
     */
    isRedirectRoute?: boolean;

    /**
     * Обрабатывает дочерние роуты компонента. Вызывается для каждого роута из {@link routes} и должен вернуть true или
     * false, в зависимости от того, должен ли отображаться этот роут вместе со своими дочерними роутами или нет. Если
     * функция не передана, то проверка производиться не будет. Работает совместно с {@link accessKeys}: сперва
     * выполняется фильтрация роутов по {@link accessKeys}, потом, в лейаутах и {@link NavigationTabs}, фильтрация по
     * {@link childRoutesFilter}.
     */
    childRoutesFilter?(
      route: IRoutes,
      isFeatureEnabled: TFeatureEnabledChecker | undefined,
      location: TRouteComponentProps["location"],
      otherParamFilter?: any
    ): boolean;

    /**
     * заголовок вкладки браузера
     */
    systemTitleLoc?: TLocalizationDescription;

    /** URL по которому будет произведен переход "назад" */
    backUrl?: string;

    /** Указывает на то, является ли эта конфигурация роута оберткой контента */
    isLayoutRoute?: boolean;

    /** Компонент иконки, которая может отображаться рядом (или вместо) с текстовой ссылкой  */
    icon?: React.ElementType;

    component?: React.ComponentType<TRouteComponentProps<any, any>>;

    isBeta?: boolean;
  }

  type TRouteComponentProps<MatchParamsKey extends string = string, S = Location["state"]> = {
    route: IRoutes;
    location: Location & { state: S };
    match: PathMatch<MatchParamsKey>;
    navigate: NavigateFunction;
  };

  // ---------------------------- Расширение RoutesConfig ---------------------------//

  // ---------------------------- Расширение ErrorsConfig ---------------------------//
  /** тип ошибки влияющий на вид отображаемого модального окна */
  type TDisplayedComponent = "error" | "info";
  type TError = {
    code?: string;
    error?: any;
    /** Дополнительные параметры в ошибке  */
    params?: any;
    message?: string;
    messageContent?: string | JSX.Element;
    comment?: string;
    title?: string;
    reloadOnClose?: boolean;
    traceId?: string;
    /** тип отображаемого модального окна */
    typeDisplayedComponent?: TDisplayedComponent;
  };

  type TErrorHandlerParams = {
    traceId?: string;
  };

  type TErrorHandler = {
    code: string;
    message: string;
    params?: any;
  };

  /**
   * Ошибка в graphql формате
   */
  type TGraphqlError = {
    code?: string;
    message?: string;
    parameters?: any;
  };

  type TErrorPreparer = {
    /**
     * Код ошибки
     */
    code: string;

    /**
     * Параметры ошибки
     */
    params?: Record<string, unknown>;

    /**
     * Локализация описания ошибки
     */
    description?: TLocalizationDescription;

    /**
     * Локализация для заголовка модального окна ошибки
     */
    title?: TLocalizationDescription;

    /**
     * Флаг перезагрузки страницы при закрытия модального окна с ошибкой
     */
    reloadOnClose?: boolean;
    /** тип отображаемого модального окна */
    typeDisplayedComponent?: TDisplayedComponent;
    /** Обработчик логики ошибок (например выполнение логаута) */
    handle?: ({
      error,
      errorsByCode,
    }: {
      error: TError["error"];
      /** Список ошибок с одинаковыми code */
      errorsByCode: TErrorPreparer[];
    }) => Promise<void>;
    /**
     * Кастомный обработчик ошибки (возвращает текст ошибки)
     */
    getError?: (params: {
      error: TError;
      localization: Localization;
      handleError: (
        error: TErrorHandler | undefined,
        localization: Localization
      ) => TError | undefined;
    }) => TError | undefined;
  };

  // ---------------------------- Расширение ErrorsConfig ---------------------------//

  // ---------------------------- Расширение FeaturesConfig ---------------------------//
  type TFeatureExt = {
    name: string;
    priority?: number;
    // список операций, не влияющих на простановку операции READ
    readIndependentOperations?: string[];
  };

  type TFeatureListExt = Record<string, TFeatureExt>;
  type TLicenseFeatureListExt = Record<string, Set<string>>;

  type TFeaturesConfig = {
    featureList: TFeatureListExt;
    licenseFeatureList?: TLicenseFeatureListExt;
    featureGroupList: TFeatureListExt;
  };

  // ---------------------------- Расширение FeaturesConfig ---------------------------//

  // ---------------------------- Расширение ExtendersConfig ---------------------------//
  type TExtendersConfig = { [key: string]: () => void };
  // ---------------------------- Расширение ExtendersConfig ---------------------------//
}
