// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { useEffect, useRef, useState, useCallback } from 'react';
import { useDocStore } from './store/useDocStore';
import { exportToPdf } from './utils/pdfExport';
import Navbar from './components/layout/Navbar';
import Toolbar from './components/layout/Toolbar/Toolbar';
import PageSetupModal from './components/layout/PageSetupModal';
import TableGridModal from './components/layout/TableGridModal';
import InsertFieldModal from './components/layout/InsertFieldModal';
import LinkModal from './components/layout/LinkModal';
import ImageModal from './components/layout/ImageModal';
import AboutModal from './components/layout/AboutModal';
import KeyboardShortcutsModal from './components/layout/KeyboardShortcutsModal';
import SearchReplaceModal from './components/layout/SearchReplaceModal';
import FieldMergeModal from './components/layout/FieldMergeModal';
import ChatPanel from './components/layout/ChatPanel';
import ProviderSetupModal from './components/layout/ProviderSetupModal';
import PaginatedViewport from './components/editor/PaginatedViewport';
import PageNavigation from './components/editor/PageNavigation';

export default function App() {
  const { docState, aboutOpen, setAboutOpen, shortcutsOpen, setShortcutsOpen, searchReplaceOpen, setSearchReplaceOpen, fieldMergeOpen, setFieldMergeOpen, linkOpen, setLinkOpen, imageOpen, setImageOpen, chatOpen, setChatOpen, providerSetupOpen, setProviderSetupOpen, editor, savedLinkSelection, setSavedLinkSelection } = useDocStore();
  const pageElementsRef = useRef<HTMLElement[]>([]);
  const [linkModalState, setLinkModalState] = useState<{ url: string; text: string }>({ url: '', text: '' });

  // Link modal handler
  const handleLinkSubmit = useCallback((url: string, text: string) => {
    if (!editor) return;
    if (!url) {
      // Remove link
      editor.chain().focus().unsetLink().run();
    } else {
      // Restore the selection that was saved before the modal opened
      if (savedLinkSelection) {
        const { from, to } = savedLinkSelection;
        editor.chain().focus().setTextSelection({ from, to }).run();
      }
      // If display text was provided, replace selection with that text + link
      if (text && text.trim()) {
        const sel = editor.state.selection;
        editor.chain()
          .focus()
          .insertContentAt(
            { from: sel.from, to: sel.to },
            { type: 'text', text: text.trim(), marks: [{ type: 'link', attrs: { href: url } }] }
          )
          .run();
      } else {
        editor.chain().focus().setLink({ href: url }).run();
      }
    }
    setSavedLinkSelection(null);
    setLinkOpen(false);
  }, [editor, setLinkOpen, savedLinkSelection, setSavedLinkSelection]);

  // Image modal handler
  const handleImageSubmit = useCallback((src: string, alt: string) => {
    if (!editor) return;
    editor.chain().focus().setImage({ src, alt }).run();
    setImageOpen(false);
  }, [editor, setImageOpen]);

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

  // Listen for Ctrl+K link shortcut from editor
  useEffect(() => {
    const handler = () => {
      if (editor) {
        // Save current selection before modal steals focus
        const { from, to } = editor.state.selection;
        setSavedLinkSelection({ from, to });
        // Get current link URL and selected text if editing existing link
        const attrs = editor.getAttributes('link');
        const selectedText = editor.state.doc.textBetween(from, to, ' ');
        setLinkModalState({
          url: (attrs.href as string) || '',
          text: from !== to ? selectedText : '',
        });
      }
      setLinkOpen(true);
    };
    window.addEventListener('simpledocs:open-link', handler);
    return () => window.removeEventListener('simpledocs:open-link', handler);
  }, [editor, setLinkOpen, setSavedLinkSelection]);

  return (
    <div className="h-screen flex flex-col">
      <Navbar />
      <Toolbar />
      <PageNavigation />
      <div className="flex-1 flex min-h-0">
        <PaginatedViewport />
        <ChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} />
      </div>
      <ProviderSetupModal
        isOpen={providerSetupOpen}
        onClose={() => setProviderSetupOpen(false)}
      />
      <PageSetupModal />
      <TableGridModal />
      <InsertFieldModal />
      <AboutModal isOpen={aboutOpen} onClose={() => setAboutOpen(false)} />
      <KeyboardShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <SearchReplaceModal isOpen={searchReplaceOpen} onClose={() => setSearchReplaceOpen(false)} />
      <FieldMergeModal isOpen={fieldMergeOpen} onClose={() => setFieldMergeOpen(false)} />
      <LinkModal
        isOpen={linkOpen}
        onClose={() => setLinkOpen(false)}
        onSubmit={handleLinkSubmit}
        initialUrl={linkModalState.url}
        initialText={linkModalState.text}
      />
      <ImageModal
        isOpen={imageOpen}
        onClose={() => setImageOpen(false)}
        onSubmit={handleImageSubmit}
      />
    </div>
  );
}
