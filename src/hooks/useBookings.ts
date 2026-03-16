import { useAuth } from '../contexts/AuthContext';
import { usePaginatedQuery } from './usePaginatedQuery';
import * as adminApi from '../services/adminApi';

export function useBookingsPaginated() {
  const { token } = useAuth();
  return usePaginatedQuery({
    queryFn: (params) => adminApi.fetchBookingsPaginated(token, params),
    pageSize: 20,
  });
}
