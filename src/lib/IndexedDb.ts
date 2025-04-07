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
import * as IndexedDbMigration from "./IndexedDbMigration.js";

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
  readonly reason:
    | "OpenError"
    | "TransactionError"
    | "Blocked"
    | "UpgradeError";
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
export const layer = <
  Id extends string,
  Migrations extends readonly IndexedDbMigration.IndexedDbMigration.Any[]
>(
  identifier: Id,
  ...migrations: Migrations & {
    0: IndexedDbMigration.IndexedDbMigration.Any;
  }
) =>
  Layer.effect(
    IndexedDb,
    Effect.gen(function* () {
      const version = migrations.length;
      const database = yield* Effect.async<
        globalThis.IDBDatabase,
        IndexedDbError
      >((resume) => {
        console.log("Opening indexedDB", identifier, version);
        const request = window.indexedDB.open(identifier, version);

        request.onblocked = (event) => {
          resume(
            Effect.fail(new IndexedDbError({ reason: "Blocked", cause: event }))
          );
        };

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
        request.onupgradeneeded = (event) => {
          const idbRequest = event.target as IDBRequest<IDBDatabase>;
          const database = idbRequest.result;
          const transaction = idbRequest.transaction;
          const oldVersion = event.oldVersion;

          if (transaction !== null) {
            transaction.onabort = (event) => {
              resume(
                Effect.fail(
                  new IndexedDbError({
                    reason: "Blocked",
                    cause: event,
                  })
                )
              );
            };

            transaction.onerror = (event) => {
              resume(
                Effect.fail(
                  new IndexedDbError({
                    reason: "TransactionError",
                    cause: event,
                  })
                )
              );
            };
          }

          Effect.runSync(
            Effect.all(
              migrations.slice(oldVersion).map((untypedMigration) => {
                const migration =
                  untypedMigration as IndexedDbMigration.IndexedDbMigration.AnyWithProps;
                return migration.execute(
                  IndexedDbMigration.migrationApi(
                    database,
                    migration.fromVersion
                  ),
                  IndexedDbMigration.migrationApi(database, migration.toVersion)
                );
              })
            )
          );
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
