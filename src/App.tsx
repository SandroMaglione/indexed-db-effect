import { Effect } from "effect";
import { useActionState } from "react";
import { main } from "./main";

function App() {
  const [, action] = useActionState<unknown>(
    (_) => Effect.runPromise(main),
    null
  );
  return (
    <>
      <form action={action}>
        <button type="submit">Submit</button>
      </form>
    </>
  );
}

export default App;
