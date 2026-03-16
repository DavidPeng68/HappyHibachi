import { useAuth } from '../contexts/AuthContext';
import { usePaginatedQuery } from './usePaginatedQuery';
import * as adminApi from '../services/adminApi';

export function useAuditLogPaginated() {
  const { token } = useAuth();
  return usePaginatedQuery({
    queryFn: (params) => adminApi.fetchAuditLogPaginated(token, params),
    pageSize: 50,
  });
}
