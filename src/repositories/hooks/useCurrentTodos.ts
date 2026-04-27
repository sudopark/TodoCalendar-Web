import { useShallow } from 'zustand/react/shallow'
import { useCurrentTodosCache } from '../caches/currentTodosCache'
import type { Todo } from '../../models/Todo'

/**
 * 현재 할 일(is_current) 목록을 React 컴포넌트에서 구독한다.
 * 캐시 변경 시 자동 리렌더. 반환 배열은 useShallow 로 안정 참조 유지.
 */
export function useCurrentTodos(): Todo[] {
  return useCurrentTodosCache(useShallow(state => state.todos))
}
