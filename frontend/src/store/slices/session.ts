import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/**
 * The guest cart token. Mirrored to the first-party `zq_cart` cookie by the listener in
 * store/listeners.ts, read back from the cookie once on mount (StoreProvider).
 */
interface SessionState {
  cartToken: string | null;
  hydrated: boolean;
}

const initialState: SessionState = { cartToken: null, hydrated: false };

export const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    hydrated(state, action: PayloadAction<string | null>) {
      state.cartToken = action.payload;
      state.hydrated = true;
    },
    cartTokenChanged(state, action: PayloadAction<string | null>) {
      state.cartToken = action.payload;
    },
  },
});

export const { hydrated, cartTokenChanged } = sessionSlice.actions;
