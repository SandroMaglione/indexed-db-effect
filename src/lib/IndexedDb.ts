/**
 * https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
 *
 * @since 1.0.0
 */
import { TypeIdError } from "@effect/platform/Error";
import { Layer } from "effect";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import { pipeArguments } from "effect/Pipeable";

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
 * @category type ids
 */
export const ErrorTypeId: unique symbol = Symbol.for(
  "@effect/platform-browser/IndexedDb/IndexedDbError"
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
export class IndexedDbError extends TypeIdError(ErrorTypeId, "IndexedDbError")<{
  readonly reason: "OpenError" | "TransactionError" | "Blocked";
  readonly cause: unknown;
}> {
  get message() {
    return this.reason;
  }
}

/**
 * @since 1.0.0
 * @category tags
 */
export class IndexedDb extends Context.Tag(
  "@effect/platform-browser/IndexedDb"
)<IndexedDb, IndexedDb.AnyWithProps>() {}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace IndexedDb {
  /**
   * @since 1.0.0
   * @category model
   */
  export interface Service<out Id extends string = string> {
    new (_: never): {};
    readonly [TypeId]: TypeId;
    readonly identifier: Id;
    readonly version: number;
    readonly database: IDBDatabase;
  }

  // export interface Service<
  //   out Id extends string,
  //   in out DbVersion extends IndexedDbVersion.IndexedDbVersion.Any = never,
  //   InitError = never
  // > extends Pipeable {
  //   new (_: never): {};

  //   readonly [TypeId]: TypeId;
  //   readonly identifier: Id;
  //   readonly version: number;
  //   readonly dbVersion: DbVersion;
  //   readonly init: <R = never>(
  //     db: DbVersion
  //   ) => Effect.Effect<void, InitError, R>;
  //   readonly migrations: [
  //     version: number,
  //     migration: <E, R = never>(
  //       from: IndexedDbVersion.IndexedDbVersion.Any,
  //       to: IndexedDbVersion.IndexedDbVersion.Any
  //     ) => Effect.Effect<void, E, R>
  //   ][];

  //   readonly addVersion: <V1 extends DbVersion, V2 extends DbVersion, E>(
  //     version: number,
  //     options: {
  //       from: V1;
  //       to: V2;
  //       migration: (from: V1, to: V2) => Effect.Effect<void, E>;
  //     }
  //   ) => IndexedDb.Service<Id, V2>;
  // }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Any {
    readonly [TypeId]: TypeId;
    readonly identifier: string;
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type AnyWithProps = IndexedDb.Service;
}

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments);
  },
};

const makeProto = <Id extends string>(options: {
  readonly identifier: Id;
  readonly version: number;
  readonly database: globalThis.IDBDatabase;
}): IndexedDb.Service<Id> => {
  function IndexedDb() {}
  Object.setPrototypeOf(IndexedDb, Proto);
  IndexedDb.identifier = options.identifier;
  IndexedDb.version = options.version;
  IndexedDb.database = options.database;
  return IndexedDb as any;
};

/**
 * @since 1.0.0
 * @category constructors
 */
export const layer = <Id extends string>({
  identifier,
  version,
}: {
  identifier: Id;
  version: number;
}) =>
  Layer.effect(
    IndexedDb,
    Effect.gen(function* () {
      const database = yield* Effect.async<
        globalThis.IDBDatabase,
        IndexedDbError
      >((resume) => {
        console.log("Opening indexedDB", identifier, version);
        const request = window.indexedDB.open(identifier, version);

        request.onerror = (event) => {
          const idbRequest = event.target as IDBRequest<IDBDatabase>;

          resume(
            Effect.fail(
              new IndexedDbError({
                reason: "OpenError",
                cause: idbRequest.error,
              })
            )
          );
        };

        request.onblocked = (event) => {
          resume(
            Effect.fail(new IndexedDbError({ reason: "Blocked", cause: event }))
          );
        };

        // If `onupgradeneeded` exits successfully, `onsuccess` will then be triggered
        request.onupgradeneeded = (_) => {
          // const idbRequest = event.target as IDBRequest<IDBDatabase>;
          // const _ = idbRequest.result;
        };

        request.onsuccess = (event) => {
          const idbRequest = event.target as IDBRequest<IDBDatabase>;
          const database = idbRequest.result;
          console.log("Database opened", database);
          resume(Effect.succeed(database));
        };
      });

      return makeProto({ identifier, version, database });
    })
  );
