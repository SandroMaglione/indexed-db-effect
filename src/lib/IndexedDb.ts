/**
 * https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
 *
 * @since 1.0.0
 */
import { TypeIdError } from "@effect/platform/Error";
import { Layer } from "effect";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as HashMap from "effect/HashMap";
import { pipeArguments } from "effect/Pipeable";
import * as Schema from "effect/Schema";
import * as IndexedDbMigration from "./IndexedDbMigration.js";
import * as IndexedDbTable from "./IndexedDbTable.js";
import * as IndexedDbVersion from "./IndexedDbVersion.js";

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

export const migrationApi = <
  Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps
>(
  database: IDBDatabase,
  transaction: IDBTransaction,
  source: Source
): IndexedDbMigration.MigrationApi<Source> => {
  const insert = <
    A extends IndexedDbTable.IndexedDbTable.TableName<
      IndexedDbVersion.IndexedDbVersion.Tables<Source>
    >
  >(
    table: A,
    data: Schema.Schema.Encoded<
      IndexedDbTable.IndexedDbTable.TableSchema<
        IndexedDbTable.IndexedDbTable.WithName<
          IndexedDbVersion.IndexedDbVersion.Tables<Source>,
          A
        >
      >
    >
  ) =>
    Effect.gen(function* () {
      const { tableSchema } = yield* HashMap.get(source.tables, table).pipe(
        Effect.catchTag(
          "NoSuchElementException",
          () =>
            new IndexedDbError({
              reason: "TransactionError",
              cause: null,
            })
        )
      );

      yield* Schema.decodeUnknown(tableSchema)(data).pipe(
        Effect.catchTag("ParseError", (error) => {
          console.error("ParseError", error);
          return new IndexedDbError({
            reason: "TransactionError",
            cause: error,
          });
        })
      );

      return yield* Effect.async<globalThis.IDBValidKey, IndexedDbError>(
        (resume) => {
          const objectStore = transaction.objectStore(table);
          const request = objectStore.add(data);

          request.onerror = (event) => {
            resume(
              Effect.fail(
                new IndexedDbError({
                  reason: "TransactionError",
                  cause: event,
                })
              )
            );
          };

          request.onsuccess = (_) => {
            resume(Effect.succeed(request.result));
          };
        }
      );
    }).pipe(Effect.orDie);

  return {
    insert,
    insertAll: (table, dataList) =>
      Effect.all(dataList.map((data) => insert(table, data))),

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

    getAll: (table) =>
      Effect.gen(function* () {
        const { tableName, tableSchema } = yield* HashMap.get(
          source.tables,
          table
        ).pipe(
          Effect.catchTag(
            "NoSuchElementException",
            () =>
              new IndexedDbError({
                reason: "TransactionError",
                cause: null,
              })
          )
        );

        const data = yield* Effect.async<any, IndexedDbError>((resume) => {
          const store = transaction.objectStore(tableName);
          const request = store.getAll();

          request.onerror = (event) => {
            resume(
              Effect.fail(
                new IndexedDbError({ reason: "TransactionError", cause: event })
              )
            );
          };

          request.onsuccess = () => {
            resume(Effect.succeed(request.result));
          };
        });

        const tableSchemaArray = Schema.Array(
          tableSchema
        ) as unknown as IndexedDbTable.IndexedDbTable.TableSchema<
          IndexedDbTable.IndexedDbTable.WithName<
            IndexedDbVersion.IndexedDbVersion.Tables<Source>,
            typeof tableName
          >
        >;

        console.log("getAll", tableName, tableSchema, data);

        return yield* Schema.decodeUnknown(tableSchemaArray)(data).pipe(
          Effect.catchTag("ParseError", (error) => {
            console.error("ParseError", error);
            return new IndexedDbError({
              reason: "TransactionError",
              cause: error,
            });
          })
        );
      }).pipe(Effect.orDie),
  };
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
      let oldVersion = 0;
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

        // If `onupgradeneeded` exits successfully, `onsuccess` will then be triggered
        request.onupgradeneeded = (event) => {
          const idbRequest = event.target as IDBRequest<IDBDatabase>;
          const database = idbRequest.result;
          const transaction = idbRequest.transaction;
          oldVersion = event.oldVersion;

          if (transaction === null) {
            resume(
              Effect.fail(
                new IndexedDbError({ reason: "TransactionError", cause: null })
              )
            );
          } else {
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

            migrations.slice(oldVersion).reduce((prev, untypedMigration) => {
              const migration =
                untypedMigration as IndexedDbMigration.IndexedDbMigration.AnyWithProps;
              const fromApi = migrationApi(
                database,
                transaction,
                migration.fromVersion
              );
              const toApi = migrationApi(
                database,
                transaction,
                migration.toVersion
              );

              return prev.then(() =>
                Effect.runPromise(migration.execute(fromApi, toApi)).catch(
                  (cause) => {
                    console.error("Error during migration", cause);
                    resume(
                      Effect.fail(
                        new IndexedDbError({
                          reason: "UpgradeError",
                          cause,
                        })
                      )
                    );
                  }
                )
              );
            }, Promise.resolve());
          }
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
