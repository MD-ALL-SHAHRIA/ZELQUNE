import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/** UI state shared across features (drawers, toasts). */
interface UiState {
  cartOpen: boolean;
  menuOpen: boolean;
  toast: string | null;
}

const initialState: UiState = { cartOpen: false, menuOpen: false, toast: null };

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setCartOpen(state, action: PayloadAction<boolean>) {
      state.cartOpen = action.payload;
      if (action.payload) state.menuOpen = false;
    },
    setMenuOpen(state, action: PayloadAction<boolean>) {
      state.menuOpen = action.payload;
    },
    showToast(state, action: PayloadAction<string | null>) {
      state.toast = action.payload;
    },
  },
});

export const { setCartOpen, setMenuOpen, showToast } = uiSlice.actions;
