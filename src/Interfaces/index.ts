export type Route = {
  key: string;
  routes: Route[];

  /**
   * Обрабатывает дочерние роуты компонента. Вызывается для каждого роута из {@link routes} и должен вернуть true или
   * false, в зависимости от того, должен ли отображаться этот роут вместе со своими дочерними роутами или нет. Если
   * функция не передана, то проверка производиться не будет. Работает совместно с {@link accessKeys}: сперва
   * выполняется фильтрация роутов по {@link accessKeys}
   */
  childRoutesFilter?(...args: any[]): boolean;
};

export type ErrorPayload = {
  params?: Record<string, unknown>;
};
