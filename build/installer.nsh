; SPDX-License-Identifier: MIT
; Copyright (c) 2026 Richard Robertson
;
; Remove the .sdjson association on uninstall when it still points at this app.
; electron-builder removes the ProgID but leaves the extension's default value,
; which would leave a dead association behind.

!macro customUnInstall
  ReadRegStr $0 HKCU "Software\Classes\.sdjson" ""
  ${If} $0 == "SimpleDocs.sdjson"
    DeleteRegKey HKCU "Software\Classes\.sdjson"
  ${EndIf}
!macroend
