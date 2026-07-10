import CanvasCourt from "../components/CanvasCourt";
import Header from "../components/Header";
import LibraryModal from "../components/LibraryModal";
import { AuthModal, NewDocModal, ShareModal, Toasts } from "../components/Modals";
import Playbar from "../components/Playbar";
import Sidebar from "../components/Sidebar";
import { useStore } from "../store";

export default function Editor() {
  const sidebarHidden = useStore((s) => s.sidebarHidden);
  const modal = useStore((s) => s.modal);

  return (
    <div className={"app-root" + (sidebarHidden ? " no-sidebar" : "")}>
      <Header />
      <main>
        <Sidebar />
        <div id="courtArea">
          <CanvasCourt />
          <Playbar />
        </div>
      </main>
      {modal === "new" && <NewDocModal />}
      {modal === "auth" && <AuthModal />}
      {modal === "library" && <LibraryModal />}
      {modal === "share" && <ShareModal />}
      <Toasts />
    </div>
  );
}
