// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Richard Robertson
import { useContext } from 'react';
import { PaginationContext, type PaginationContextValue } from './paginationTypes';

export function usePaginationContext(): PaginationContextValue {
  const ctx = useContext(PaginationContext);
  if (!ctx) {
    throw new Error('usePaginationContext must be used within PaginationProvider');
  }
  return ctx;
}
