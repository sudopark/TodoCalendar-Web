import { test, expect } from '@playwright/test'
import { execSync } from 'child_process'

const PROJECT_DIR = '/Users/sudo.park/Documents/codebase/TodoCalendar-Web'

test('npm run build 가 정상적으로 완료된다', () => {
  // given / when / then: 빌드 명령이 예외 없이 완료되면 성공
  expect(() => {
    execSync('npm run build', {
      cwd: PROJECT_DIR,
      timeout: 120_000,
      stdio: 'pipe',
    })
  }).not.toThrow()
})

test('npm test 가 정상적으로 완료된다', () => {
  // given / when / then: 단위 테스트 명령이 예외 없이 완료되면 성공
  expect(() => {
    execSync('npm test', {
      cwd: PROJECT_DIR,
      timeout: 120_000,
      stdio: 'pipe',
    })
  }).not.toThrow()
})
