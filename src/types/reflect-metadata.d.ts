declare namespace Reflect {
  function defineMetadata(
    metadataKey: any,
    metadataValue: any,
    target: Object
  ): void;
  function defineMetadata(
    metadataKey: any,
    metadataValue: any,
    target: Object,
    propertyKey: string | symbol
  ): void;
  function getMetadata(metadataKey: any, target: Object): any;
  function getMetadata(
    metadataKey: any,
    target: Object,
    propertyKey: string | symbol
  ): any;
}
