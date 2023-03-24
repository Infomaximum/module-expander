import { forEach, uniq, sortBy, isPlainObject, set } from "lodash";
import { assertSimple } from "@infomaximum/assert";
import type { NCore } from "./Interfaces";

/**
 * Метод для расширения конфига роутинга
 * @param {IRoutes[]} mainRoutes - config роутинга, который нужно расширить
 * @param {IRoutes[]} addingRoutes - config роутинга, которым нужно расширить
 */
export const expandRoutes = (
  mainRoutes: NCore.IRoutes[],
  addingRoutes: NCore.IRoutes[]
): void => {
  forEach(addingRoutes, (addingRoute) => {
    const { key, routes, childRoutesFilter, ...restOfAddingRoute } =
      addingRoute;

    const mainRoute = mainRoutes?.find((route) => route.key === key);

    if (mainRoute) {
      forEach(restOfAddingRoute, (value, key) => {
        const routeParam = mainRoute[key as keyof typeof restOfAddingRoute];

        if (Array.isArray(value) && Array.isArray(routeParam)) {
          set(mainRoute, key, uniq([...routeParam, ...value]));

          return;
        }

        set(mainRoute, key, value);
      });

      if (typeof childRoutesFilter === "function") {
        if (typeof mainRoute.childRoutesFilter === "function") {
          const originChildRoute = mainRoute.childRoutesFilter;
          mainRoute.childRoutesFilter = function (
            route,
            isFeatureEnabled,
            location,
            otherParamFilter
          ) {
            return (
              originChildRoute(
                route,
                isFeatureEnabled,
                location,
                otherParamFilter
              ) &&
              childRoutesFilter(
                route,
                isFeatureEnabled,
                location,
                otherParamFilter
              )
            );
          };
        } else {
          mainRoute.childRoutesFilter = childRoutesFilter;
        }
      }

      if (mainRoute.routes) {
        expandRoutes(mainRoute.routes, routes || []);
      } /* else {
        assertSimple(false, `Route с ключом "${key}" уже существует в расширяемом конфиге!`);
      } */
    } else {
      mainRoutes.push(addingRoute);
    }
  });
};

export const sortErrorHandlers = (errorHandlers: NCore.TErrorPreparer[]) =>
  sortBy(errorHandlers, (preparer: NCore.TErrorPreparer) => {
    if (preparer.params) {
      if (Array.isArray(preparer.params)) {
        return -preparer.params.length;
      }
      if (isPlainObject(preparer.params)) {
        return -Object.keys(preparer.params).length;
      }
      assertSimple(false, "Не поддерживаемый тип параметров");
    } else {
      return 0;
    }
  });

/**
 *  Метод для расширения списка обработчиков ошибок из других пакетов
 * @param mainErrorHandlers - расширяемый список обработчиков
 * @param addingErrorHandlers - расширяющий список обработчиков
 */
export const expandErrorHandlers = (
  mainErrorHandlers: NCore.TErrorPreparer[],
  addingErrorHandlers: NCore.TErrorPreparer[]
) => {
  mainErrorHandlers.push(...addingErrorHandlers);
  mainErrorHandlers.splice(
    0,
    mainErrorHandlers.length,
    ...sortErrorHandlers(mainErrorHandlers)
  );
};

export const showGlobalErrorModal = () => {
  const spinner = document.getElementById("spinner-wrapper");
  const element = document.getElementById("internal-error");

  if (spinner) {
    spinner.style.display = "none";
  }

  if (element) {
    (window as any).isRejectionRequired = true;
    element.style.display = "block";
  }
};

/**
 * Метод для расширения темы
 * @param mainTheme - объект темы, который нужно расширить
 * @param addingTheme - объект темы, которым нужно расширить
 */
export const expandTheme = (
  mainTheme: Record<string, any>,
  addingTheme: Record<string, any>
) => {
  Object.assign(mainTheme, addingTheme);
};
