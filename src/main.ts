import {
  FetchHttpClient,
  HttpClient,
  HttpClientRequest,
  HttpClientResponse,
} from "@effect/platform";
import { Console, Effect, Layer, Schema } from "effect";
import {
  IndexedDb,
  IndexedDbDatabase,
  IndexedDbMigration,
  IndexedDbQuery,
  IndexedDbTable,
  IndexedDbVersion,
} from "./lib";

/**
https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB#creating_or_updating_the_version_of_the_database

In this case, the database will already have the object stores from the previous version of the database, so you do not have to create these object stores again. You only need to create any new object stores, or delete object stores from the previous version that are no longer needed.

If you need to change an existing object store (e.g., to change the keyPath), then you must delete the old object store and create it again with the new options. (Note that this will delete the information in the object store! If you need to save that information, you should read it out and save it somewhere else before upgrading the database.)
 */

/**
 * 1. What if a data migration depends on data from *another* table?
 * 2. What if a migration requires to delete a table?
 * 3. What if a keyPath changes, and the old data doesn't match the new keyPath?
 */

const Todo = Schema.Struct({
  id: Schema.Number,
  userId: Schema.Number,
  title: Schema.String,
  completed: Schema.Boolean,
});

const Table1 = IndexedDbTable.make("todo", Todo, { keyPath: "id" });

const Table2 = IndexedDbTable.make(
  "todo",
  Schema.Struct({
    ...Todo.fields,
    newId: Schema.UUID,
  }),
  { keyPath: "newId" }
);

const Db1 = IndexedDbVersion.make(Table1);
const Db2 = IndexedDbVersion.make(Table2);

const layer = IndexedDbQuery.layer.pipe(
  Layer.provide(
    Layer.unwrapEffect(
      Effect.gen(function* () {
        const baseClient = yield* HttpClient.HttpClient;
        const request = HttpClientRequest.get(
          "https://jsonplaceholder.typicode.com/todos"
        ).pipe(HttpClientRequest.acceptJson);

        const data = yield* baseClient.execute(request).pipe(
          Effect.flatMap(
            HttpClientResponse.schemaBodyJson(
              Schema.Array(
                Schema.Struct({
                  userId: Schema.Number,
                  id: Schema.Number,
                  title: Schema.String,
                  completed: Schema.Boolean,
                })
              )
            )
          )
        );

        return IndexedDbDatabase.layer(
          "db",
          IndexedDbMigration.make({
            fromVersion: IndexedDbVersion.makeEmpty,
            toVersion: Db1,
            execute: (_, toQuery) =>
              Effect.gen(function* () {
                yield* Console.log("Migration 1");
                yield* toQuery.createObjectStore("todo");
                yield* toQuery.insertAll("todo", data);
                yield* Console.log("Migration 1 done");
              }),
          }),
          IndexedDbMigration.make({
            fromVersion: Db1,
            toVersion: Db2,
            execute: (fromQuery, toQuery) =>
              Effect.gen(function* () {
                yield* Console.log("Migration 2");
                const data = yield* fromQuery.getAll("todo");
                yield* Effect.log(data);
                yield* fromQuery.deleteObjectStore("todo");
                yield* toQuery.createObjectStore("todo");
                yield* toQuery.insertAll(
                  "todo",
                  data.map((d) => ({
                    ...d,
                    newId: crypto.randomUUID(),
                  }))
                );
                yield* Console.log("Migration 2 done");
              }),
          })
        );
      })
    )
  ),
  Layer.provide([FetchHttpClient.layer, IndexedDb.layerWindow])
);

export const main = Effect.gen(function* () {
  const { makeApi } = yield* IndexedDbQuery.IndexedDbApi;
  const api = makeApi(Db2);
  const key = yield* api.insert("todo", {
    id: 2,
    userId: 1,
    title: "et porro tempora",
    completed: true,
    newId: crypto.randomUUID(),
  });
  yield* Effect.log(key);
}).pipe(Effect.provide(layer));
