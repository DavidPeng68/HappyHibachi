import { useCallback, useEffect, useRef, useState } from 'react';
import type { PaginatedResponse, PaginationParams } from '../types/admin';

interface UsePaginatedQueryOptions<T> {
  queryFn: (params: PaginationParams) => Promise<PaginatedResponse<T>>;
  initialParams?: Partial<PaginationParams>;
  pageSize?: number;
}

interface UsePaginatedQueryResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  error: string | null;
  setPage: (page: number) => void;
  setParams: (params: Partial<PaginationParams>) => void;
  refetch: () => void;
}

export function usePaginatedQuery<T>(
  options: UsePaginatedQueryOptions<T>
): UsePaginatedQueryResult<T> {
  const { queryFn, initialParams = {}, pageSize = 20 } = options;

  const [params, setParamsState] = useState<PaginationParams>({
    page: 1,
    pageSize,
    ...initialParams,
  });
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track the latest request to discard stale responses
  const requestIdRef = useRef(0);
  // Debounce timer for search param changes
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Store queryFn in a ref so it doesn't trigger re-fetches when identity changes
  const queryFnRef = useRef(queryFn);
  queryFnRef.current = queryFn;

  const fetchData = useCallback(async (fetchParams: PaginationParams) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const result = await queryFnRef.current(fetchParams);
      // Discard stale responses
      if (requestId !== requestIdRef.current) return;

      if (result.success) {
        setData(result.data);
        setTotal(result.total);
      } else {
        setError('Request failed');
      }
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, []);

  // Fetch when params change, debouncing search changes
  const prevParamsRef = useRef(params);
  useEffect(() => {
    const prev = prevParamsRef.current;
    prevParamsRef.current = params;

    // Debounce only when the search term changed
    const searchChanged = prev.search !== params.search;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (searchChanged) {
      debounceRef.current = setTimeout(() => {
        fetchData(params);
      }, 300);
    } else {
      fetchData(params);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [params, fetchData]);

  const setPage = useCallback((page: number) => {
    setParamsState((prev) => ({ ...prev, page }));
  }, []);

  const setParams = useCallback((newParams: Partial<PaginationParams>) => {
    setParamsState((prev) => ({ ...prev, ...newParams, page: 1 }));
  }, []);

  const refetch = useCallback(() => {
    fetchData(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, fetchData]);

  return {
    data,
    total,
    page: params.page ?? 1,
    pageSize: params.pageSize ?? pageSize,
    loading,
    error,
    setPage,
    setParams,
    refetch,
  };
}
