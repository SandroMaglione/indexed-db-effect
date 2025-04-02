/**
 * https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
 *
 * @since 1.0.0
 */
import { TypeIdError } from "@effect/platform/Error";
import * as Effect from "effect/Effect";
import * as HashMap from "effect/HashMap";
import * as Schema from "effect/Schema";
import * as IndexedDb from "./IndexedDb.js";
import type * as IndexedDbTable from "./IndexedDbTable.js";

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
export class IndexedDbQueryError extends TypeIdError(
  ErrorTypeId,
  "IndexedDbQueryError"
)<{
  readonly reason: "TransactionError" | "DecodeError";
  readonly cause: unknown;
}> {
  get message() {
    return this.reason;
  }
}

export const getAll = <
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
  >[],
  IndexedDbQueryError | IndexedDb.IndexedDbError
> =>
  IndexedDb.open(indexedDb).pipe(
    Effect.flatMap((database) =>
      Effect.async<any, IndexedDbQueryError>((resume) => {
        const objectStore = database.transaction([table]).objectStore(table);
        const request = objectStore.getAll();

        request.onerror = (event) => {
          resume(
            Effect.fail(
              new IndexedDbQueryError({
                reason: "TransactionError",
                cause: event,
              })
            )
          );
        };

        request.onsuccess = () => {
          resume(Effect.succeed(request.result));
        };
      })
    ),
    Effect.tap(console.log),
    Effect.flatMap((data) => {
      const tableSchema = Schema.Array(
        indexedDb.tables.pipe(HashMap.unsafeGet(table), (_) => _.tableSchema)
      ) as unknown as IndexedDbTable.IndexedDbTable.TableSchema<
        IndexedDbTable.IndexedDbTable.WithName<
          IndexedDb.IndexedDb.Tables<Source>,
          A
        >
      >;
      return Schema.decodeUnknown(tableSchema)(data).pipe(
        Effect.mapError(
          (error) =>
            new IndexedDbQueryError({
              reason: "DecodeError",
              cause: error,
            })
        )
      );
    })
  );

export const insert = <
  Source extends IndexedDb.IndexedDb.AnyWithProps,
  A extends IndexedDbTable.IndexedDbTable.TableName<
    IndexedDb.IndexedDb.Tables<Source>
  >
>(
  indexedDb: Source,
  table: A,
  data: Schema.Schema.Encoded<
    IndexedDbTable.IndexedDbTable.TableSchema<
      IndexedDbTable.IndexedDbTable.WithName<
        IndexedDb.IndexedDb.Tables<Source>,
        A
      >
    >
  >
): Effect.Effect<
  globalThis.IDBValidKey,
  IndexedDbQueryError | IndexedDb.IndexedDbError
> =>
  IndexedDb.open(indexedDb).pipe(
    Effect.flatMap((database) =>
      Effect.async<globalThis.IDBValidKey, IndexedDbQueryError>((resume) => {
        const transaction = database.transaction([table], "readwrite");
        const objectStore = transaction.objectStore(table);
        const request = objectStore.add(data);

        request.onerror = (event) => {
          resume(
            Effect.fail(
              new IndexedDbQueryError({
                reason: "TransactionError",
                cause: event,
              })
            )
          );
        };

        request.onsuccess = (_) => {
          resume(Effect.succeed(request.result));
        };
      })
    )
  );
