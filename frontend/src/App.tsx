import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { api } from "./api";
import Editor from "./pages/Editor";
import SharedViewer from "./pages/SharedViewer";
import { useStore } from "./store";

export default function App() {
  useEffect(() => {
    api
      .me()
      .then((u) => useStore.getState().setUser(u))
      .catch(() => useStore.getState().setUser(null));
  }, []);

  return (
    <BrowserRouter basename="/app">
      <Routes>
        <Route path="/" element={<Editor />} />
        <Route path="/s/:token" element={<SharedViewer />} />
      </Routes>
    </BrowserRouter>
  );
}
