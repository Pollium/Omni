export interface PendingHandoff{
    verifier: string;
    next: string | null;
}

export interface SessionState{
    token: string | null;
    setToken: (token: string | null) => void;
    clear: () => void;
}
