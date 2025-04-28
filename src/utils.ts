import { forEach, uniq, sortBy, isPlainObject, set } from "lodash";
import { assertSimple } from "@infomaximum/assert";
import type { ErrorPayload, Route } from "./Interfaces";

export type Nullable<T> = T | null | undefined;
export type Awaitable<T> = T | Promise<T>;

/**
 * Метод для расширения конфига роутинга
 * @param {Route[]} mainRoutes - config роутинга, который нужно расширить
 * @param {Route[]} addingRoutes - config роутинга, которым нужно расширить
 */
export const expandRoutes = (mainRoutes: Route[], addingRoutes: Route[]): void => {
  forEach(addingRoutes, (addingRoute) => {
    const { key, routes, childRoutesFilter, ...restOfAddingRoute } = addingRoute;

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
          mainRoute.childRoutesFilter = function (...args) {
            return originChildRoute(...args) && childRoutesFilter(...args);
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

export const sortErrorHandlers = (preparedErrors: ErrorPayload[]) =>
  sortBy(preparedErrors, (error: ErrorPayload) => {
    if (!error.params) {
      return 0;
    }

    if (Array.isArray(error.params)) {
      return -error.params.length;
    }

    if (isPlainObject(error.params)) {
      return -Object.keys(error.params).length;
    }

    assertSimple(false, "Не поддерживаемый тип параметров");
  });

/**
 *  Метод для расширения списка обработчиков ошибок из других пакетов
 * @param mainErrorHandlers - расширяемый список обработчиков
 * @param addingErrorHandlers - расширяющий список обработчиков
 */
export const expandErrorHandlers = (
  mainErrorHandlers: ErrorPayload[],
  addingErrorHandlers: ErrorPayload[]
) => {
  mainErrorHandlers.push(...addingErrorHandlers);
  mainErrorHandlers.splice(0, mainErrorHandlers.length, ...sortErrorHandlers(mainErrorHandlers));
};

/**
 * Метод для расширения темы
 * @param mainTheme - объект темы, который нужно расширить
 * @param addingTheme - объект темы, которым нужно расширить
 */
export const expandTheme = (mainTheme: Record<string, any>, addingTheme: Record<string, any>) => {
  Object.assign(mainTheme, addingTheme);
};
