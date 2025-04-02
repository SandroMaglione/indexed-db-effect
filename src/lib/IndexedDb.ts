/**
 * https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
 *
 * @since 1.0.0
 */
import { TypeIdError } from "@effect/platform/Error";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
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
  readonly version: number;
  readonly tables: HashMap.HashMap<string, Tables>;

  add<A extends IndexedDbTable.IndexedDbTable.Any>(
    schema: A
  ): IndexedDb<Id, Tables | A>;
}

/**
 * @since 1.0.0
 * @category tags
 */
export class IndexedDbApi extends Context.Tag(
  "@effect/platform/IndexedDb/IndexedDbApi"
)<
  IndexedDbApi,
  {
    readonly database: globalThis.IDBDatabase;
    readonly indexedDb: IndexedDb<
      string,
      IndexedDbTable.IndexedDbTable.AnyWithProps
    >;
  }
>() {}

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
  readonly reason: "OpenError" | "TransactionError";
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
export declare namespace IndexedDb {
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
      version: this.version,
      tables: HashMap.empty().pipe(HashMap.set(table.name, table)),
    });
  },
};

const makeProto = <
  Id extends string,
  Tables extends IndexedDbTable.IndexedDbTable.Any
>(options: {
  readonly identifier: Id;
  readonly version: number;
  readonly tables: HashMap.HashMap<string, Tables>;
}): IndexedDb<Id, Tables> => {
  function IndexedDb() {}
  Object.setPrototypeOf(IndexedDb, Proto);
  IndexedDb.identifier = options.identifier;
  IndexedDb.version = options.version;
  IndexedDb.tables = options.tables;
  return IndexedDb as any;
};

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <const Id extends string>(
  identifier: Id,
  version: number
): IndexedDb<Id> =>
  makeProto({
    identifier,
    version,
    tables: HashMap.empty(),
  });

/**
 * @since 1.0.0
 * @category constructors
 */
export const open = <Source extends IndexedDb.AnyWithProps>(
  indexedDb: Source
) =>
  Effect.async<globalThis.IDBDatabase, IndexedDbError>((resume) => {
    const request = window.indexedDB.open(
      indexedDb.identifier,
      indexedDb.version
    );

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
      Effect.runPromiseExit(
        Effect.gen(function* () {
          const idbRequest = event.target as IDBRequest<IDBDatabase>;
          const db = idbRequest.result;
          yield* Effect.all(
            HashMap.toValues(indexedDb.tables).map((indexedDbTable) =>
              Effect.async<void, IndexedDbError>((resume) => {
                const objectStore = db.createObjectStore(
                  indexedDbTable.name,
                  indexedDbTable.options
                );

                // TODO: add indexes
                // for (const { name, keyPath, options } of indexes) {
                //   objectStore.createIndex(name, keyPath, options);
                // }

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
        })
      ).then((exit) => {
        if (!Exit.isSuccess(exit)) {
          resume(
            Effect.fail(
              new IndexedDbError({
                reason: "TransactionError",
                cause: exit.cause,
              })
            )
          );
        }
      });
    };

    request.onsuccess = (event) => {
      const idbRequest = event.target as IDBRequest<IDBDatabase>;
      const database = idbRequest.result;
      resume(Effect.succeed(database));
    };
  });
