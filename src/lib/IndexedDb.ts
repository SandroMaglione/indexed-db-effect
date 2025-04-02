/**
 * https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
 *
 * @since 1.0.0
 */
import * as HashSet from "effect/HashSet";
import { type Pipeable, pipeArguments } from "effect/Pipeable";
import * as Schema from "effect/Schema";
import * as IndexedDbTable from "./IndexedDbTable.js";

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
  readonly tables: HashSet.HashSet<Tables>;

  add<A extends IndexedDbTable.IndexedDbTable.Any>(
    schema: A
  ): IndexedDb<Id, Tables | A>;

  get<A extends IndexedDbTable.IndexedDbTable.TableName<Tables>>(
    table: A
  ): IndexedDbTable.IndexedDbTable.WithName<Tables, A>;
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
      tables: HashSet.empty().pipe(HashSet.add(table)),
    });
  },
};

const makeProto = <
  Id extends string,
  Tables extends IndexedDbTable.IndexedDbTable.Any
>(options: {
  readonly identifier: Id;
  readonly tables: HashSet.HashSet<Tables>;
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
    tables: HashSet.empty(),
  });

export const myDb = make("db")
  .add(
    IndexedDbTable.make(
      "table1",
      Schema.Struct({
        name: Schema.String,
        age: Schema.Number,
      })
    )
  )
  .add(
    IndexedDbTable.make(
      "table2",
      Schema.Struct({
        name: Schema.String,
        age: Schema.Number,
      })
    )
  )
  .get("table2");

// export const open = <
//   const Tables extends Record<string, Schema.Schema.AnyNoContext>
// >({
//   schema,
//   options,
//   name,
//   version,
// }: {
//   name: string;
//   version: number;
//   options?: IDBObjectStoreParameters;
//   schema: Record<
//     keyof Tables,
//     {
//       name: string;
//       keyPath: string | Iterable<string>;
//       options?: IDBIndexParameters;
//     }[]
//   >;
// }) =>
//   Effect.async<IndexedDb<Tables>, IndexedDbError>((resume) => {
//     const request = window.indexedDB.open(name, version);

//     request.onerror = (event) => {
//       const idbRequest = event.target as IDBRequest<IDBDatabase>;

//       resume(
//         Effect.fail(
//           new IndexedDbError({
//             reason: "OpenError",
//             cause: idbRequest.error,
//           })
//         )
//       );
//     };

//     // If `onupgradeneeded` exits successfully, `onsuccess` will then be triggered
//     request.onupgradeneeded = (event) => {
//       Effect.gen(function* () {
//         const idbRequest = event.target as IDBRequest<IDBDatabase>;
//         const db = idbRequest.result;
//         yield* Effect.all(
//           Object.entries(schema).map(([key, indexes]) =>
//             Effect.async<void, IndexedDbError>((resume) => {
//               const objectStore = db.createObjectStore(key, options);
//               for (const { name, keyPath, options } of indexes) {
//                 objectStore.createIndex(name, keyPath, options);
//               }

//               objectStore.transaction.onerror = (event) => {
//                 resume(
//                   Effect.fail(
//                     new IndexedDbError({
//                       reason: "TransactionError",
//                       cause: event,
//                     })
//                   )
//                 );
//               };

//               objectStore.transaction.oncomplete = (_) => {
//                 resume(Effect.void);
//               };
//             })
//           ),
//           { concurrency: "unbounded" }
//         );
//       });
//     };

//     request.onsuccess = (event) => {
//       const idbRequest = event.target as IDBRequest<IDBDatabase>;
//       const db = idbRequest.result;

//       resume(
//         Effect.succeed<IndexedDb<Tables>>({
//           [TypeId]: TypeId,
//           get: (table) =>
//             Effect.async<Tables[typeof table]>((resume) => {
//               const transaction = db.transaction([table]);
//               const objectStore = transaction.objectStore(table);
//               const request = objectStore.get(key);

//               request.onerror = (event) => {
//                 resume(
//                   Effect.fail(
//                     new IndexedDbError({
//                       reason: "TransactionError",
//                       cause: event,
//                     })
//                   )
//                 );
//               };

//               request.onsuccess = (event) => {
//                 // Do something with the request.result!
//                 console.log(
//                   `Name for SSN 444-44-4444 is ${request.result.name}`
//                 );
//               };
//             }),
//         })
//       );
//     };
//   });
