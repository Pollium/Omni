export interface PageMeta{
    total: number;
    limit: number;
    offset: number;
}

export interface ApiResponse<T>{
    data: T;
    meta?: PageMeta;
}

export interface ApiError{
    error: string;
    errors?: Record<string, string>;
}
