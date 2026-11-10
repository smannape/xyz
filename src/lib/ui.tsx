import { createContext, useContext } from 'react';

/** App-level overlays: the register-entry / rule drawer and the traceability drawer. */
export interface Ui { openEntry: (id: string) => void; openTrace: () => void }
export const UiContext = createContext<Ui>({ openEntry: () => {}, openTrace: () => {} });
export const useUi = () => useContext(UiContext);
