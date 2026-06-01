import path from 'path'

const AUTH_DIR = path.join(__dirname, '..', '..', 'playwright', '.auth')

export type Role = 'cozinheiro' | 'limpeza' | 'admin'

/** Retorna o caminho do storageState salvo pelo globalSetup para cada role. */
export function storageStatePath(role: Role) {
  return path.join(AUTH_DIR, `${role}.json`)
}
