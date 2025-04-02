import { Schema } from "effect";
import { IndexedDb, IndexedDbTable } from "./lib";

export const myDb = IndexedDb.make("db", 1)
  .add(
    IndexedDbTable.make(
      "table1",
      Schema.Struct({
        name: Schema.String,
        age: Schema.Number,
      }),
      {
        keyPath: "name",
      }
    )
  )
  .add(
    IndexedDbTable.make(
      "table2",
      Schema.Struct({
        name: Schema.String,
        age: Schema.Number,
      }),
      {
        keyPath: "name",
      }
    )
  );
