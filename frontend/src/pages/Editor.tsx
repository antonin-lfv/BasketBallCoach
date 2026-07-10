import CanvasCourt from "../components/CanvasCourt";
import { NewDocModal, ShareModal, Toasts } from "../components/Modals";
import Navbar from "../components/Navbar";
import Playbar from "../components/Playbar";
import Sidebar from "../components/Sidebar";
import Toolbar from "../components/Toolbar";
import { useStore } from "../store";

export default function Editor() {
  const sidebarHidden = useStore((s) => s.sidebarHidden);
  const modal = useStore((s) => s.modal);

  return (
    <div className={"app-root" + (sidebarHidden ? " no-sidebar" : "")}>
      <Navbar />
      <Toolbar />
      <main>
        <Sidebar />
        <div id="courtArea">
          <CanvasCourt />
          <Playbar />
        </div>
      </main>
      {modal === "new" && <NewDocModal />}
      {modal === "share" && <ShareModal />}
      <Toasts />
    </div>
  );
}
