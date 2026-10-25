'use client';

import { createContext, useContext } from 'react';

/** The element in the shell's canvas row where the current page's title and actions render. */
export const HeaderSlot = createContext<HTMLElement | null>(null);
export const useHeaderSlot = () => useContext(HeaderSlot);
