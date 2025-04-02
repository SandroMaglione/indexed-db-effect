import { Effect } from "effect";
import { useActionState } from "react";
import { IndexedDbQuery } from "./lib";
import { myDb } from "./main";

const main = IndexedDbQuery.insert(myDb, "table1", {
  name: "John",
  age: 30,
});

const mainGet = IndexedDbQuery.getAll(myDb, "table1");

function App() {
  const [, action] = useActionState<unknown>(
    (_) => Effect.runPromise(main),
    null
  );
  const [, actionGet] = useActionState<unknown>(
    (_) => Effect.runPromise(mainGet),
    null
  );
  return (
    <>
      <form action={action}>
        <button type="submit">Submit</button>
      </form>

      <form action={actionGet}>
        <button type="submit">Get</button>
      </form>
    </>
  );
}

export default App;
