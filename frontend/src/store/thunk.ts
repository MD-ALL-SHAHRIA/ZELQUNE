import { createAsyncThunk } from '@reduxjs/toolkit';
import type { AppDispatch, RootState } from './store';

/** createAsyncThunk typed with this app's state and dispatch; rejections carry an error code. */
export const createAppThunk = createAsyncThunk.withTypes<{
  state: RootState;
  dispatch: AppDispatch;
  rejectValue: string;
}>();
