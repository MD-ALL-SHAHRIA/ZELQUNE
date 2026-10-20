import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { baseApi } from './api/base';
import { listener } from './listeners';
import { sessionSlice } from './slices/session';
import { uiSlice } from './slices/ui';

const rootReducer = combineReducers({
  [baseApi.reducerPath]: baseApi.reducer,
  session: sessionSlice.reducer,
  ui: uiSlice.reducer,
});

/** One store per browser tab (App Router: created in StoreProvider, never shared on the server). */
export function makeStore() {
  return configureStore({
    reducer: rootReducer,
    middleware: (getDefault) =>
      getDefault().prepend(listener.middleware).concat(baseApi.middleware),
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = AppStore['dispatch'];
