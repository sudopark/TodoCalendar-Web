import { createTestUser, signInTestUser, TEST_USER } from './helpers/auth'

async function globalSetup() {
  // 에뮬레이터에 테스트 유저 생성 (이미 있으면 로그인으로 확인)
  try {
    await createTestUser(TEST_USER.email, TEST_USER.password)
    console.log('[global-setup] Test user created')
  } catch {
    await signInTestUser(TEST_USER.email, TEST_USER.password)
    console.log('[global-setup] Test user already exists')
  }
}

export default globalSetup
