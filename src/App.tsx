import { Effect } from "effect";
import { useActionState } from "react";
import { IndexedDbQuery } from "./lib";
import { myDb } from "./main";

const main = IndexedDbQuery.insert(myDb, "table1", {
  name: "John",
  age: 30,
});

function App() {
  const [_, action] = useActionState<unknown>(
    (_) => Effect.runPromise(main),
    null
  );
  return (
    <form action={action}>
      <button type="submit">Submit</button>
    </form>
  );
}

export default App;
