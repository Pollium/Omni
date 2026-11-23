import { SessionState } from '../contracts/session';
import { create } from 'zustand';

const KEY = 'omni.session';

const readToken = (): string | null => {
    try{
        return localStorage.getItem(KEY);
    }catch{
        return null;
    }
};

const writeToken = (token: string | null) => {
    try{
        if(token === null) localStorage.removeItem(KEY);
        else localStorage.setItem(KEY, token);
    }catch{
        return;
    }
};

export const useSessionStore = create<SessionState>((set) => ({
    token: readToken(),
    setToken: (token) => {
        writeToken(token);
        set({ token });
    },
    clear: () => {
        writeToken(null);
        set({ token: null });
    }
}));
