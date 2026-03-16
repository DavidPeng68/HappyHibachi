import { useAuth } from '../contexts/AuthContext';
import { usePaginatedQuery } from './usePaginatedQuery';
import * as adminApi from '../services/adminApi';

export function useCustomersPaginated() {
  const { token } = useAuth();
  return usePaginatedQuery({
    queryFn: (params) => adminApi.fetchCustomersPaginated(token, params),
    pageSize: 20,
  });
}
