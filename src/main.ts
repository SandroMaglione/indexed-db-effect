import { Schema } from "effect";
import { IndexedDb, IndexedDbQuery, IndexedDbTable } from "./lib";

export const myDb = IndexedDb.make("db")
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
  );

const table1 = IndexedDbQuery.get(myDb, "table1");
