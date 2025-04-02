/**
 * https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
 *
 * @since 1.0.0
 */
import { TypeIdError } from "@effect/platform/Error";
import type * as IndexedDb from "./IndexedDb.js";
import type * as IndexedDbTable from "./IndexedDbTable.js";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

/**
 * @since 1.0.0
 * @category type ids
 */
export const ErrorTypeId: unique symbol = Symbol.for(
  "@effect/platform-browser/IndexedDbQuery/IndexedDbError"
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
  readonly reason: "OpenError" | "TransactionError";
  readonly cause: unknown;
}> {
  get message() {
    return this.reason;
  }
}

export const get = <
  Source extends IndexedDb.IndexedDb.AnyWithProps,
  A extends IndexedDbTable.IndexedDbTable.TableName<
    IndexedDb.IndexedDb.Tables<Source>
  >
>(
  indexedDb: Source,
  table: A
): Effect.Effect<
  Schema.Schema.Type<
    IndexedDbTable.IndexedDbTable.TableSchema<
      IndexedDbTable.IndexedDbTable.WithName<
        IndexedDb.IndexedDb.Tables<Source>,
        A
      >
    >
  >
> =>
  Effect.async<IndexedDb<Tables>, IndexedDbError>((resume) => {
    const version = 1; // TODO: get version from API
    const request = window.indexedDB.open(table, version);

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
      Effect.gen(function* () {
        const idbRequest = event.target as IDBRequest<IDBDatabase>;
        const db = idbRequest.result;
        yield* Effect.all(
          Object.entries(schema).map(([key, indexes]) =>
            Effect.async<void, IndexedDbError>((resume) => {
              const objectStore = db.createObjectStore(key, options);
              for (const { name, keyPath, options } of indexes) {
                objectStore.createIndex(name, keyPath, options);
              }

              objectStore.transaction.onerror = (event) => {
                resume(
                  Effect.fail(
                    new IndexedDbError({
                      reason: "TransactionError",
                      cause: event,
                    })
                  )
                );
              };

              objectStore.transaction.oncomplete = (_) => {
                resume(Effect.void);
              };
            })
          ),
          { concurrency: "unbounded" }
        );
      });
    };

    request.onsuccess = (event) => {
      const idbRequest = event.target as IDBRequest<IDBDatabase>;
      const db = idbRequest.result;

      resume(
        Effect.succeed<IndexedDb<Tables>>({
          [TypeId]: TypeId,
          get: (table) =>
            Effect.async<Tables[typeof table]>((resume) => {
              const transaction = db.transaction([table]);
              const objectStore = transaction.objectStore(table);
              const request = objectStore.get(key);

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

              request.onsuccess = (event) => {
                // Do something with the request.result!
                console.log(
                  `Name for SSN 444-44-4444 is ${request.result.name}`
                );
              };
            }),
        })
      );
    };
  }) as any;
