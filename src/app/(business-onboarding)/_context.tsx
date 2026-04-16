import React, { createContext, useContext, useState } from 'react';
import type { Category } from '../../types';

export interface WizardLocation {
  name: string;
  address: string;
  city: string;
  country: string;
}

export interface WizardState {
  // Step 1
  legalName: string;
  brandName: string;
  category: Category | '';
  foundedYear: string;
  // Step 2
  logoUri: string | null;
  coverUri: string | null;
  // Step 3
  brandStory: string;
  values: string[];
  // Step 4
  locations: WizardLocation[];
  // Step 5
  instagramHandle: string;
  tiktokHandle: string;
  youtubeHandle: string;
  website: string;
  // Step 6
  licenseUri: string | null;
}

interface WizardContextValue {
  state: WizardState;
  update: (patch: Partial<WizardState>) => void;
}

const defaultState: WizardState = {
  legalName: '',
  brandName: '',
  category: '',
  foundedYear: '',
  logoUri: null,
  coverUri: null,
  brandStory: '',
  values: [],
  locations: [],
  instagramHandle: '',
  tiktokHandle: '',
  youtubeHandle: '',
  website: '',
  licenseUri: null,
};

export const WizardContext = createContext<WizardContextValue>({
  state: defaultState,
  update: () => {},
});

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WizardState>(defaultState);
  const update = (patch: Partial<WizardState>) =>
    setState((s) => ({ ...s, ...patch }));
  return (
    <WizardContext.Provider value={{ state, update }}>
      {children}
    </WizardContext.Provider>
  );
}

export function useWizard() {
  return useContext(WizardContext);
}
