import { Effect } from "effect";
import { useActionState } from "react";
import { IndexedDbQuery } from "./lib";
import { myDb } from "./main";

const main = IndexedDbQuery.get(myDb, "table2");

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
