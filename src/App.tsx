import { useEffect, useRef } from 'react';
import { useDocStore } from './store/useDocStore';
import { exportToPdf } from './utils/pdfExport';
import Navbar from './components/layout/Navbar';
import Toolbar from './components/layout/Toolbar/Toolbar';
import PageSetupModal from './components/layout/PageSetupModal';
import TableGridModal from './components/layout/TableGridModal';
import InsertFieldModal from './components/layout/InsertFieldModal';
import AboutModal from './components/layout/AboutModal';
import KeyboardShortcutsModal from './components/layout/KeyboardShortcutsModal';
import SearchReplaceModal from './components/layout/SearchReplaceModal';
import PaginatedViewport from './components/editor/PaginatedViewport';
import PageNavigation from './components/editor/PageNavigation';

export default function App() {
  const { docState, aboutOpen, setAboutOpen, shortcutsOpen, setShortcutsOpen, searchReplaceOpen, setSearchReplaceOpen } = useDocStore();
  const pageElementsRef = useRef<HTMLElement[]>([]);

  useEffect(() => {
    const handler = async () => {
      const canvases = document.querySelectorAll<HTMLElement>('[data-testid="page-canvas"]');
      pageElementsRef.current = Array.from(canvases);
      if (pageElementsRef.current.length > 0) {
        try {
          await exportToPdf(docState, pageElementsRef.current);
        } catch (err) {
          console.error('PDF export failed:', err);
          alert('PDF export failed. See console for details.');
        }
      }
    };

    window.addEventListener('simpledocs:export-pdf', handler);
    return () => window.removeEventListener('simpledocs:export-pdf', handler);
  }, [docState]);

  return (
    <div className="h-screen flex flex-col">
      <Navbar />
      <Toolbar />
      <PageNavigation />
      <PaginatedViewport />
      <PageSetupModal />
      <TableGridModal />
      <InsertFieldModal />
      <AboutModal isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />
      <KeyboardShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <SearchReplaceModal isOpen={searchReplaceOpen} onClose={() => setSearchReplaceOpen(false)} />
    </div>
  );
}
