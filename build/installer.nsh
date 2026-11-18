; SPDX-License-Identifier: MIT
; Copyright (c) 2026 Richard Robertson
;
; Installer hooks. electron-builder removes the ProgID on uninstall but leaves
; the extension's default value behind, so clean associations up explicitly.

!macro customInstall
  ; Offer SimpleDocs in the Windows "Open with" list for Word files without
  ; taking over the user's default .docx association (usually Microsoft Word).
  WriteRegStr HKCU "Software\Classes\SimpleDocs.docx" "" "Word Document (SimpleDocs)"
  WriteRegStr HKCU "Software\Classes\SimpleDocs.docx\DefaultIcon" "" "$INSTDIR\resources\docx.ico"
  WriteRegStr HKCU "Software\Classes\SimpleDocs.docx\shell\open\command" "" '"$INSTDIR\SimpleDocs.exe" "%1"'
  WriteRegStr HKCU "Software\Classes\.docx\OpenWithProgids" "SimpleDocs.docx" ""
!macroend

!macro customUnInstall
  ReadRegStr $0 HKCU "Software\Classes\.sdjson" ""
  ${If} $0 == "SimpleDocs.sdjson"
    DeleteRegKey HKCU "Software\Classes\.sdjson"
  ${EndIf}

  ; .docx is shared with Microsoft Word: remove the Open With entry, and
  ; only clear the default value if the user explicitly chose SimpleDocs.
  DeleteRegValue HKCU "Software\Classes\.docx\OpenWithProgids" "SimpleDocs.docx"
  ReadRegStr $0 HKCU "Software\Classes\.docx" ""
  ${If} $0 == "SimpleDocs.docx"
    DeleteRegValue HKCU "Software\Classes\.docx" ""
  ${EndIf}
  DeleteRegKey HKCU "Software\Classes\SimpleDocs.docx"
!macroend
