import { configureStore } from '@reduxjs/toolkit';
import complaintReducer from './complaintSlice';
import chatReducer from './chatSlice';
import auditReducer from './auditSlice';

export const store = configureStore({
  reducer: {
    complaint: complaintReducer,
    chat: chatReducer,
    audit: auditReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
