import { ConfigsServiceLocator } from "../ConfigsServiceLocator/ConfigsServiceLocator";

export const instanceExtensions = new ConfigsServiceLocator();

/**
 * Резолвит зависимость из хранилища
 */
export const getInstanceExt = <T extends new (...args: any[]) => any>(
  Class: T
): InstanceType<T> => instanceExtensions.resolve(Class);
