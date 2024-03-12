import { RouterProvider, createBrowserRouter } from "react-router-dom";
import { SocketProvider } from "./contexts/Socket";
import Homepage from "./pages/Homepage";
import Room from "./pages/Room";

const router = createBrowserRouter([
  { path: "/room/:roomId", element: <Room /> },
  { path: "/", element: <Homepage /> },
]);

const App = () => {
  return (
    <SocketProvider>
      <RouterProvider router={router} />
    </SocketProvider>
  );
};

export default App;
