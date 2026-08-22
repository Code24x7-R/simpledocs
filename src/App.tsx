// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { useEffect, useState, useCallback } from 'react';
import { useDocStore } from './store/useDocStore';
import { exportToPdf } from './utils/pdfExport';
import { loadDocFromUrl } from './utils/shareUrl';
import Navbar from './components/layout/Navbar';
import Toolbar from './components/layout/Toolbar/Toolbar';
import PageSetupModal from './components/layout/PageSetupModal';
import TableGridModal from './components/layout/TableGridModal';
import InsertFieldModal from './components/layout/InsertFieldModal';
import LinkModal from './components/layout/LinkModal';
import ImageModal from './components/layout/ImageModal';
import TableOfContentsModal from './components/layout/TableOfContentsModal';
import TtsPanel from './components/layout/TtsPanel';
import CloudStorageModal from './components/layout/CloudStorageModal';
import AboutModal from './components/layout/AboutModal';
import KeyboardShortcutsModal from './components/layout/KeyboardShortcutsModal';
import SearchReplaceModal from './components/layout/SearchReplaceModal';
import FieldMergeModal from './components/layout/FieldMergeModal';
import ChatPanel from './components/layout/ChatPanel';
import ProviderSetupModal from './components/layout/ProviderSetupModal';
import PaginatedViewport from './components/editor/PaginatedViewport';
import PageNavigation from './components/editor/PageNavigation';

export default function App() {
  const { docState, loadDocument, aboutOpen, setAboutOpen, shortcutsOpen, setShortcutsOpen, searchReplaceOpen, setSearchReplaceOpen, fieldMergeOpen, setFieldMergeOpen, linkOpen, setLinkOpen, imageOpen, setImageOpen, tocOpen, setTocOpen, ttsOpen, setTtsOpen, driveOpen, driveMode, setDriveOpen, chatOpen, setChatOpen, providerSetupOpen, setProviderSetupOpen, editor, savedLinkSelection, setSavedLinkSelection } = useDocStore();
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

  // Table of Contents handler
  const handleTocInsert = useCallback((tocContent: Record<string, unknown>, docWithAnchors: Record<string, unknown>) => {
    if (!editor) return;

    // Capture insertion target BEFORE setContent resets the selection:
    // - If a TOC already exists, replace it in place (preserve position).
    // - Otherwise insert at the current cursor position.
    let insertPos = editor.state.selection.from;
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'tableOfContents') {
        insertPos = pos;
        return false;
      }
      return true;
    });

    // Step 1: Apply heading anchors to the editor content.
    // setContent resets the selection, so we restore it afterwards.
    editor.commands.setContent(docWithAnchors, { emitUpdate: false });

    // Step 2: Insert the TOC at the captured position.
    // Using insertContentAt (rather than relying on the selection left by
    // setContent) guarantees the TOC lands at the right place.
    editor.chain().focus().insertContentAt(insertPos, tocContent).run();

    // Step 3: Update the store with the COMPLETE document (anchors + TOC)
    // This prevents the content-sync useEffect from overwriting our changes
    const finalContent = editor.getJSON();
    useDocStore.getState().updateContent(finalContent);

    setTocOpen(false);
  }, [editor, setTocOpen]);

  // Drive open handler
  const handleOpenFromDrive = useCallback((content: string, fileName: string) => {
    try {
      const parsed = JSON.parse(content);
      if (parsed.id && parsed.settings && (parsed.content || parsed.pages)) {
        // Valid DocState format — route through loadDocument so legacy
        // `pages[]` files migrate to `content` (which the editor sync
        // requires) and the document is sanitized + persisted.
        loadDocument(parsed);
        console.log('[App] Opened document from Drive:', fileName);
      } else {
        alert('Invalid document format in Drive file');
      }
    } catch {
      alert('Failed to parse document from Drive');
    }
  }, [loadDocument]);

  // Image modal handler
  const handleImageSubmit = useCallback((src: string, alt: string, width: number, height: number) => {
    if (!editor) return;
    // Store natural pixel dimensions as attributes for accurate PDF export
    const attrs = { src, alt, width: width > 0 ? width : undefined, height: height > 0 ? height : undefined };
    console.log('[App] Inserting image with attrs:', { src: src.slice(0, 50), alt, width, height });
    editor.chain().focus().setImage(attrs).run();
    setImageOpen(false);
  }, [editor, setImageOpen]);

  useEffect(() => {
    const handler = async () => {
      try {
        await exportToPdf(docState, []);
      } catch (err) {
        console.error('PDF export failed:', err);
        alert('PDF export failed. See console for details.');
      }
    };

    window.addEventListener('simpledocs:export-pdf', handler);
    return () => window.removeEventListener('simpledocs:export-pdf', handler);
  }, [docState]);

  // Hydrate from a share link (#doc= fragment) on first load.
  useEffect(() => {
    const shared = loadDocFromUrl();
    if (shared && shared.id && shared.settings && (shared.content || (shared as unknown as Record<string, unknown>).pages)) {
      loadDocument(shared);
      // Clear the fragment so a refresh does not re-load the shared doc.
      history.replaceState(null, '', window.location.pathname + window.location.search);
      console.log('[App] Opened shared document from link:', shared.title);
    }
  }, [loadDocument]);

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
      <CloudStorageModal
        isOpen={driveOpen}
        onClose={() => setDriveOpen(false)}
        mode={driveMode}
        documentTitle={docState.title || 'Untitled'}
        documentContent={JSON.stringify(docState, null, 2)}
        onOpenDocument={handleOpenFromDrive}
      />
      <TableOfContentsModal
        isOpen={tocOpen}
        onClose={() => setTocOpen(false)}
        onInsert={handleTocInsert}
      />
      <TtsPanel
        isOpen={ttsOpen}
        onClose={() => setTtsOpen(false)}
        editor={editor}
      />
    </div>
  );
}
