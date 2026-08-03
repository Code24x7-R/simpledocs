// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { useDocStore } from './store/useDocStore';

// Expose store for E2E testing (always, since this is a local editor)
(window as any).__docStore = useDocStore;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
