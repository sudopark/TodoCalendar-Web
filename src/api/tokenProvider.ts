import { getAuthInstance } from '../firebase'

export const tokenProvider = {
  async getToken(): Promise<string> {
    const user = getAuthInstance().currentUser
    if (!user) throw new Error('Not authenticated')
    return user.getIdToken()
  },
}
