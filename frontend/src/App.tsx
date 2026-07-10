import { useEffect } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { api } from "./api";
import { rt } from "./runtime";
import Account from "./pages/Account";
import Editor from "./pages/Editor";
import Library from "./pages/Library";
import Login from "./pages/Login";
import Settings from "./pages/Settings";
import SharedViewer from "./pages/SharedViewer";
import { useStore } from "./store";

export default function App() {
  useEffect(() => {
    rt.speed = useStore.getState().prefs.speed;
    api
      .me()
      .then((u) => useStore.getState().setUser(u))
      .catch(() => useStore.getState().setUser(null));
  }, []);

  return (
    <BrowserRouter basename="/app">
      <Routes>
        <Route path="/" element={<Editor />} />
        <Route path="/login" element={<Login />} />
        <Route path="/library" element={<Library />} />
        <Route path="/account" element={<Account />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/s/:token" element={<SharedViewer />} />
      </Routes>
    </BrowserRouter>
  );
}
