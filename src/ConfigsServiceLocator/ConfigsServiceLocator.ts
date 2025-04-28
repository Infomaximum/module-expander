type TClass = new (...args: any[]) => any;

class ConfigsServiceLocator {
  private registeredClasses = new WeakMap<TClass, InstanceType<TClass>>();

  public register<T extends TClass, K extends InstanceType<T>>(Class: T, instance: K) {
    this.registeredClasses?.set(Class, instance);
  }

  public resolve<T extends TClass>(Class: T): InstanceType<T> {
    const resolveClass = this.registeredClasses?.get(Class);

    if (!resolveClass && typeof Class === "function") {
      this.register(Class, new Class());

      return this.resolve(Class);
    }

    return resolveClass;
  }
}

export { ConfigsServiceLocator };
