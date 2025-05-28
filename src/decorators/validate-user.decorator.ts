import "reflect-metadata";

const VALIDATE_USER_METADATA_KEY = Symbol("validateUser");

export type ValidateUserDecorator = () => ClassDecorator;

export const ValidateUser: ValidateUserDecorator = () => {
  return function (target: any) {
    Reflect.defineMetadata(VALIDATE_USER_METADATA_KEY, true, target);
    return target;
  };
};

export function requiresValidation(target: any): boolean {
  return Reflect.getMetadata(VALIDATE_USER_METADATA_KEY, target) === true;
}
