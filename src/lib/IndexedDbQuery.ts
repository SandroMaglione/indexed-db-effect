/**
 * https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
 *
 * @since 1.0.0
 */
import { TypeIdError } from "@effect/platform/Error";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { type Pipeable, pipeArguments } from "effect/Pipeable";
import * as Schema from "effect/Schema";
import * as IndexedDb from "./IndexedDb.js";
import type * as IndexedDbTable from "./IndexedDbTable.js";
import type * as IndexedDbVersion from "./IndexedDbVersion.js";

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for(
  "@effect/platform-browser/IndexedDbQuery"
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

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments);
  },
};

const makeProto = ({
  database,
}: {
  readonly database: IDBDatabase;
}): IndexedDbQuery.Service => {
  function IndexedDbQuery() {}
  Object.setPrototypeOf(IndexedDbQuery, Proto);
  IndexedDbQuery.insert = (
    table: string,
    data: any
  ): Effect.Effect<
    globalThis.IDBValidKey,
    IndexedDbQueryError | IndexedDb.IndexedDbError
  > =>
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
    });

  return IndexedDbQuery as any;
};

/**
 * @since 1.0.0
 * @category tags
 */
export class IndexedDbApi extends Context.Tag(
  "@effect/platform-browser/IndexedDbApi"
)<
  IndexedDbApi,
  {
    readonly makeApi: <
      Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps = never
    >() => IndexedDbQuery.Service<Source>;
  }
>() {}

export const layer = Layer.effect(
  IndexedDbApi,
  Effect.gen(function* () {
    const { database } = yield* IndexedDb.IndexedDb;
    return IndexedDbApi.of({ makeApi: () => makeProto({ database }) });
  })
);

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace IndexedDbQuery {
  /**
   * @since 1.0.0
   * @category model
   */
  export interface Service<
    Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps = never
  > extends Pipeable {
    new (_: never): {};

    readonly [TypeId]: TypeId;
    readonly insert: <
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
    ) => Effect.Effect<
      globalThis.IDBValidKey,
      IndexedDbQueryError | IndexedDb.IndexedDbError
    >;
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Any {
    readonly [TypeId]: TypeId;
  }
}

// export const insertAll = <
//   Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
//   A extends IndexedDbTable.IndexedDbTable.TableName<
//     IndexedDbVersion.IndexedDbVersion.Tables<Source>
//   >
// >(
//   indexedDb: Source,
//   table: A,
//   dataList: Schema.Schema.Encoded<
//     IndexedDbTable.IndexedDbTable.TableSchema<
//       IndexedDbTable.IndexedDbTable.WithName<
//         IndexedDbVersion.IndexedDbVersion.Tables<Source>,
//         A
//       >
//     >
//   >[]
// ): Effect.Effect<
//   globalThis.IDBValidKey,
//   IndexedDbQueryError | IndexedDb.IndexedDbError
// > => Effect.all(dataList.map((data) => insert(indexedDb, table, data)));

// export const deleteTable = <
//   Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
//   A extends IndexedDbTable.IndexedDbTable.TableName<
//     IndexedDbVersion.IndexedDbVersion.Tables<Source>
//   >
// >(
//   indexedDb: Source,
//   table: A
// ): Effect.Effect<void, IndexedDbQueryError | IndexedDb.IndexedDbError> =>
//   IndexedDb.open(indexedDb).pipe(
//     Effect.flatMap((database) =>
//       Effect.try({
//         try: () => database.deleteObjectStore(table),
//         catch: (error) =>
//           new IndexedDbQueryError({
//             reason: "TransactionError",
//             cause: error,
//           }),
//       })
//     )
//   );

// export const create = <
//   Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
//   A extends IndexedDbTable.IndexedDbTable.TableName<
//     IndexedDbVersion.IndexedDbVersion.Tables<Source>
//   >
// >(
//   indexedDb: Source,
//   table: A
// ): Effect.Effect<void, IndexedDbQueryError | IndexedDb.IndexedDbError> =>
//   IndexedDb.open(indexedDb).pipe(
//     Effect.flatMap((database) =>
//       Effect.try({
//         try: () =>
//           database.createObjectStore(
//             table,
//             indexedDb.tables.pipe(HashMap.unsafeGet(table), (_) => _.options)
//           ),
//         catch: (error) =>
//           new IndexedDbQueryError({
//             reason: "TransactionError",
//             cause: error,
//           }),
//       })
//     )
//   );

// export const getAll = <
//   Source extends IndexedDbVersion.IndexedDbVersion.AnyWithProps,
//   A extends IndexedDbTable.IndexedDbTable.TableName<
//     IndexedDbVersion.IndexedDbVersion.Tables<Source>
//   >
// >(
//   indexedDb: Source,
//   table: A
// ): Effect.Effect<
//   Schema.Schema.Type<
//     IndexedDbTable.IndexedDbTable.TableSchema<
//       IndexedDbTable.IndexedDbTable.WithName<
//         IndexedDbVersion.IndexedDbVersion.Tables<Source>,
//         A
//       >
//     >
//   >[],
//   IndexedDbQueryError | IndexedDb.IndexedDbError
// > =>
//   IndexedDb.open(indexedDb).pipe(
//     Effect.flatMap((database) =>
//       Effect.async<any, IndexedDbQueryError>((resume) => {
//         const objectStore = database.transaction([table]).objectStore(table);
//         const request = objectStore.getAll();

//         request.onerror = (event) => {
//           resume(
//             Effect.fail(
//               new IndexedDbQueryError({
//                 reason: "TransactionError",
//                 cause: event,
//               })
//             )
//           );
//         };

//         request.onsuccess = () => {
//           resume(Effect.succeed(request.result));
//         };
//       })
//     ),
//     Effect.tap(console.log),
//     Effect.flatMap((data) => {
//       const tableSchema = Schema.Array(
//         indexedDb.tables.pipe(HashMap.unsafeGet(table), (_) => _.tableSchema)
//       ) as unknown as IndexedDbTable.IndexedDbTable.TableSchema<
//         IndexedDbTable.IndexedDbTable.WithName<
//           IndexedDbVersion.IndexedDbVersion.Tables<Source>,
//           A
//         >
//       >;
//       return Schema.decodeUnknown(tableSchema)(data).pipe(
//         Effect.mapError(
//           (error) =>
//             new IndexedDbQueryError({
//               reason: "DecodeError",
//               cause: error,
//             })
//         )
//       );
//     })
//   );
