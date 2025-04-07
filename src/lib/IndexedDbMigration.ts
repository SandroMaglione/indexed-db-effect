/**
 * https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
 *
 * @since 1.0.0
 */
import * as Effect from "effect/Effect";
import * as HashMap from "effect/HashMap";
import { type Pipeable, pipeArguments } from "effect/Pipeable";
import type * as IndexedDbTable from "./IndexedDbTable.js";
import type * as IndexedDbVersion from "./IndexedDbVersion.js";

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for(
  "@effect/platform-browser/IndexedDbMigration"
);

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId;

interface MigrationApi<
  Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps
> {
  readonly createObjectStore: <
    A extends IndexedDbTable.IndexedDbTable.TableName<
      IndexedDbVersion.IndexedDbVersion.Tables<Source>
    >
  >(
    table: A
  ) => Effect.Effect<globalThis.IDBObjectStore>;

  readonly deleteObjectStore: <
    A extends IndexedDbTable.IndexedDbTable.TableName<
      IndexedDbVersion.IndexedDbVersion.Tables<Source>
    >
  >(
    table: A
  ) => Effect.Effect<void>;
}

export const migrationApi = <
  Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps
>(
  database: IDBDatabase,
  source: Source
): MigrationApi<Source> => {
  return {
    createObjectStore: (table) =>
      Effect.gen(function* () {
        const createTable = HashMap.unsafeGet(source.tables, table);
        return database.createObjectStore(
          createTable.tableName,
          createTable.options
        );
      }),
    deleteObjectStore: (table) =>
      Effect.gen(function* () {
        const createTable = HashMap.unsafeGet(source.tables, table);
        return database.deleteObjectStore(createTable.tableName);
      }),
  };
};

/**
 * @since 1.0.0
 * @category interface
 */
export interface IndexedDbMigration<
  in out FromVersion extends IndexedDbVersion.IndexedDbVersion.AnyWithProps = never,
  in out ToVersion extends IndexedDbVersion.IndexedDbVersion.AnyWithProps = never,
  out Error = never
> extends Pipeable {
  new (_: never): {};

  readonly [TypeId]: TypeId;
  readonly fromVersion: FromVersion;
  readonly toVersion: ToVersion;
  readonly execute: (
    fromQuery: MigrationApi<FromVersion>,
    toQuery: MigrationApi<ToVersion>
  ) => Effect.Effect<void, Error>;
}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace IndexedDbMigration {
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
  export type AnyWithProps = IndexedDbMigration<
    IndexedDbVersion.IndexedDbVersion.AnyWithProps,
    IndexedDbVersion.IndexedDbVersion.AnyWithProps,
    any
  >;
}

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments);
  },
};

const makeProto = <
  FromVersion extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
  ToVersion extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
  Error
>(options: {
  readonly fromVersion: FromVersion;
  readonly toVersion: ToVersion;
  readonly execute: (
    fromQuery: MigrationApi<FromVersion>,
    toQuery: MigrationApi<ToVersion>
  ) => Effect.Effect<void, Error>;
}): IndexedDbMigration<FromVersion, ToVersion, Error> => {
  function IndexedDbMigration() {}
  Object.setPrototypeOf(IndexedDbMigration, Proto);
  IndexedDbMigration.fromVersion = options.fromVersion;
  IndexedDbMigration.toVersion = options.toVersion;
  IndexedDbMigration.execute = options.execute;
  return IndexedDbMigration as any;
};

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = makeProto;
