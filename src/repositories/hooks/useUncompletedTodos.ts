import { useShallow } from 'zustand/react/shallow'
import { useUncompletedTodosCache } from '../caches/uncompletedTodosCache'
import type { Todo } from '../../models/Todo'

/**
 * 완료되지 않은 할 일 목록을 React 컴포넌트에서 구독한다.
 * 캐시 변경 시 자동 리렌더. 반환 배열은 useShallow 로 안정 참조 유지.
 */
export function useUncompletedTodos(): Todo[] {
  return useUncompletedTodosCache(useShallow(state => state.todos))
}
