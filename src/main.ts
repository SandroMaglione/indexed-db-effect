import { Effect, Layer, Schema } from "effect";
import {
  IndexedDb,
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

const Table1 = IndexedDbTable.make(
  "table1",
  Schema.Struct({
    id: Schema.UUID,
    value: Schema.Number,
  }),
  { keyPath: "id" }
);

const Table2_1 = IndexedDbTable.make(
  "table2",
  Schema.Struct({
    name: Schema.String,
    age: Schema.Number,
  }),
  { keyPath: "name" }
);

const Table2_2 = IndexedDbTable.make(
  "table2",
  Schema.Struct({
    nameAndAge: Schema.String,
  }),
  { keyPath: "nameAndAge" }
);

// `version` may be older, only changed when ready to upgrade
const CurrentDb = IndexedDbVersion.make(Table1, Table2_2);

// export const MyDb = IndexedDb.makeWith("db", 1, CurrentDb, (db) =>
//   Effect.gen(function* () {
//     // yield* IndexedDbQuery.create(db, "table1");
//     // yield* IndexedDbQuery.create(db, "table2");

//     yield* IndexedDbQuery.insertAll(db, "table1", [
//       { id: "1", value: 1 },
//       { id: "2", value: 2 },
//     ]);

//     yield* IndexedDbQuery.insertAll(db, "table2", [
//       { name: "John", age: 30 },
//       { name: "Jane", age: 25 },
//     ]);
//   })
// );
// .addVersion(2, {
//   from: CurrentDb,
//   to: CurrentDb2,
//   migration: (from, to) =>
//     Effect.gen(function* () {
//       const table2 = yield* IndexedDbQuery.getAll(from, "table2");
//       yield* IndexedDbQuery.deleteTable(from, "table2");
//       yield* IndexedDbQuery.create(to, "table2");
//       yield* IndexedDbQuery.insertAll(
//         to,
//         "table2",
//         table2.map((data) => ({
//           nameAndAge: `${data.name} ${data.age}`,
//         }))
//       );
//     }),
// });

const layer = IndexedDbQuery.layer.pipe(
  Layer.provide(
    IndexedDb.layer({
      identifier: "db",
      version: 1,
    })
  )
);

export const main = Effect.gen(function* () {
  const { makeApi } = yield* IndexedDbQuery.IndexedDbApi;
  const api = makeApi<typeof CurrentDb>();
  const key = yield* api.insert("table1", {
    id: "1",
    value: 1,
  });
  yield* Effect.log(key);
}).pipe(Effect.provide(layer));
