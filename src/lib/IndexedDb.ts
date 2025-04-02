/**
 * https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
 *
 * @since 1.0.0
 */
import * as HashMap from "effect/HashMap";
import { type Pipeable, pipeArguments } from "effect/Pipeable";
import type * as IndexedDbTable from "./IndexedDbTable.js";

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for(
  "@effect/platform-browser/IndexedDb"
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
export interface IndexedDb<
  out Id extends string,
  out Tables extends IndexedDbTable.IndexedDbTable.Any = never
> extends Pipeable {
  new (_: never): {};

  readonly [TypeId]: TypeId;
  readonly identifier: Id;
  readonly tables: HashMap.HashMap<string, Tables>;

  add<A extends IndexedDbTable.IndexedDbTable.Any>(
    schema: A
  ): IndexedDb<Id, Tables | A>;
}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace IndexedDb {
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
  export type AnyWithProps = IndexedDb<
    string,
    IndexedDbTable.IndexedDbTable.AnyWithProps
  >;

  /**
   * @since 1.0.0
   * @category models
   */
  export type Tables<Db extends Any> = Db extends IndexedDb<
    infer _Id,
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
  add<A extends IndexedDbTable.IndexedDbTable.Any>(
    this: IndexedDb.AnyWithProps,
    table: A
  ) {
    return makeProto({
      identifier: this.identifier,
      tables: HashMap.empty().pipe(HashMap.set(table.name, table)),
    });
  },
};

const makeProto = <
  Id extends string,
  Tables extends IndexedDbTable.IndexedDbTable.Any
>(options: {
  readonly identifier: Id;
  readonly tables: HashMap.HashMap<string, Tables>;
}): IndexedDb<Id, Tables> => {
  function IndexedDb() {}
  Object.setPrototypeOf(IndexedDb, Proto);
  IndexedDb.identifier = options.identifier;
  IndexedDb.tables = options.tables;
  return IndexedDb as any;
};

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <const Id extends string>(identifier: Id): IndexedDb<Id> =>
  makeProto({
    identifier,
    tables: HashMap.empty(),
  });
