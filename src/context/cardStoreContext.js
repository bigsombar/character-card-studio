import { createContext, useContext } from 'react';

export const CardStoreContext = createContext();

export const useCardStore = () => useContext(CardStoreContext);
