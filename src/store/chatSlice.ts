import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ChatMessage } from '../types';

interface ChatState {
  chatHistory: ChatMessage[];
  isProcessing: boolean;
}

const initialState: ChatState = {
  chatHistory: [],
  isProcessing: false,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage(state, action: PayloadAction<ChatMessage>) {
      state.chatHistory.push(action.payload);
    },
    clearChat(state) {
      state.chatHistory = [];
    },
    setProcessing(state, action: PayloadAction<boolean>) {
      state.isProcessing = action.payload;
    },
  },
});

export const { addMessage, clearChat, setProcessing } = chatSlice.actions;
export default chatSlice.reducer;
