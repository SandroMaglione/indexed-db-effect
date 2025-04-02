/**
 * @since 1.0.0
 */
import { type Pipeable, pipeArguments } from "effect/Pipeable";
import * as Schema from "effect/Schema";

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for(
  "@effect/platform-browser/IndexedDbTable"
);

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId;

/**
 * @since 1.0.0
 * @category interface
 */
export interface IndexedDbTable<
  out TableName extends string,
  out TableSchema extends Schema.Schema.AnyNoContext = never
> extends Pipeable {
  new (_: never): {};

  readonly [TypeId]: TypeId;
  readonly name: TableName;
  readonly schema: TableSchema;
}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace IndexedDbTable {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Any {
    readonly [TypeId]: TypeId;
    readonly name: string;
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type AnyWithProps = IndexedDbTable<string, Schema.Schema.AnyNoContext>;
}

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments);
  },
};

const makeProto = <
  TableName extends string,
  TableSchema extends Schema.Schema.AnyNoContext
>(options: {
  readonly name: TableName;
  readonly schema: TableSchema;
}): IndexedDbTable<TableName, TableSchema> => {
  function IndexedDbTable() {}
  Object.setPrototypeOf(IndexedDbTable, Proto);
  IndexedDbTable.name = options.name;
  IndexedDbTable.schema = options.schema;
  return IndexedDbTable as any;
};

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <
  Name extends string,
  Schema extends Schema.Schema.AnyNoContext
>(
  name: Name,
  schema: Schema
): IndexedDbTable<Name, Schema> => makeProto({ name, schema });
