/**
 * https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
 *
 * @since 1.0.0
 */
import { TypeIdError } from "@effect/platform/Error";
import * as HashMap from "effect/HashMap";
import { type Pipeable, pipeArguments } from "effect/Pipeable";
import type * as IndexedDbTable from "./IndexedDbTable.js";

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for(
  "@effect/platform-browser/IndexedDbVersion"
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
export interface IndexedDbVersion<
  out Tables extends IndexedDbTable.IndexedDbTable.Any = never
> extends Pipeable {
  new (_: never): {};

  readonly [TypeId]: TypeId;
  readonly tables: HashMap.HashMap<string, Tables>;
}

/**
 * @since 1.0.0
 * @category type ids
 */
export const ErrorTypeId: unique symbol = Symbol.for(
  "@effect/platform-browser/IndexedDbVersion/IndexedDbVersionError"
);

/**
 * @since 1.0.0
 * @category type ids
 */
export type ErrorTypeId = typeof ErrorTypeId;

/**
 * @since 1.0.0
 * @category errors
 */
export class IndexedDbVersionError extends TypeIdError(
  ErrorTypeId,
  "IndexedDbVersionError"
)<{
  readonly reason: "OpenError" | "TransactionError" | "Blocked";
  readonly cause: unknown;
}> {
  get message() {
    return this.reason;
  }
}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace IndexedDbVersion {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Any {
    readonly [TypeId]: TypeId;
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type AnyWithProps =
    IndexedDbVersion<IndexedDbTable.IndexedDbTable.AnyWithProps>;

  /**
   * @since 1.0.0
   * @category models
   */
  export type Tables<Db extends Any> = Db extends IndexedDbVersion<
    infer _Tables
  >
    ? _Tables
    : never;
}

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments);
  },
};

const makeProto = <Tables extends IndexedDbTable.IndexedDbTable.Any>(options: {
  readonly tables: HashMap.HashMap<string, Tables>;
}): IndexedDbVersion<Tables> => {
  function IndexedDbVersion() {}
  Object.setPrototypeOf(IndexedDbVersion, Proto);
  IndexedDbVersion.tables = options.tables;
  return IndexedDbVersion as any;
};

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <
  Tables extends readonly IndexedDbTable.IndexedDbTable.Any[]
>(
  ...tables: Tables & { 0: IndexedDbTable.IndexedDbTable.Any }
): IndexedDbVersion<Tables[number]> => {
  return makeProto({
    tables: HashMap.fromIterable(
      tables.map((table) => [table.tableName, table])
    ),
  });
};
