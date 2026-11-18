export function homePathForRole(role) {
  return role === 'ADMIN' ? '/' : '/pos'
}
