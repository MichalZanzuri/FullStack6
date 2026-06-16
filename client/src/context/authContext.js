import { createContext } from 'react';

// Pulled into its own module so the .jsx file only exports React components
// (keeps Vite's fast refresh happy).
export const AuthContext = createContext(null);
