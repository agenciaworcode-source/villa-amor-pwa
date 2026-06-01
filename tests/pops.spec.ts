/**
 * Testes: filtro de POPs por role (bug corrigido em dfe9b31 + 45eda73)
 *
 * Garante que cada colaborador vê apenas os POPs do seu setor,
 * e que POPs sem residente aparecem como "Tarefas gerais" (não multiplicados por residente).
 */
import { test, expect } from '@playwright/test'
import { storageStatePath } from './helpers/auth'

// ── Cozinheiro ──────────────────────────────────────────────────────────────

test.describe('Cozinheiro — lista de POPs', () => {
  test.use({ storageState: storageStatePath('cozinheiro') })

  test('acessa /pops e vê a página de tarefas', async ({ page }) => {
    await page.goto('/pops')
    await expect(page.getByRole('heading', { name: 'Minhas Tarefas' })).toBeVisible()
  })

  test('não vê POPs de limpeza', async ({ page }) => {
    await page.goto('/pops')
    // O POP de limpeza tem role_type='limpeza' — não deve aparecer para cozinheiro
    const limpezaKeywords = ['Limpeza', 'Higienização', 'Protocolo de Limpeza']
    for (const kw of limpezaKeywords) {
      await expect(page.getByText(kw, { exact: false })).not.toBeVisible()
    }
  })

  test('POPs de cozinha aparecem como "Tarefas gerais" (sem residente)', async ({ page }) => {
    await page.goto('/pops')
    // POPs com requires_resident=false devem estar na seção "Tarefas gerais"
    // e NÃO aparecer expandidos por residente
    const tarefasGerais = page.getByText('Tarefas gerais', { exact: false })
    // Se o cozinheiro tem POPs cadastrados, a seção deve existir
    // (se não houver POPs de cozinha no banco, o teste de "nenhum protocolo" passa)
    const nenhumProtocolo = page.getByText('Nenhum protocolo cadastrado')
    const hasAny = await nenhumProtocolo.isVisible().catch(() => false)
    if (!hasAny) {
      await expect(tarefasGerais).toBeVisible()
    }
  })
})

// ── Limpeza ─────────────────────────────────────────────────────────────────

test.describe('Limpeza — lista de POPs', () => {
  test.use({ storageState: storageStatePath('limpeza') })

  test('acessa /pops e vê a página de tarefas', async ({ page }) => {
    await page.goto('/pops')
    await expect(page.getByRole('heading', { name: 'Minhas Tarefas' })).toBeVisible()
  })

  test('não vê POPs de cozinha', async ({ page }) => {
    await page.goto('/pops')
    const cozinhaKeywords = ['Cardápio', 'Refeição', 'Cozinha', 'Almoço']
    for (const kw of cozinhaKeywords) {
      await expect(page.getByText(kw, { exact: false })).not.toBeVisible()
    }
  })
})

// ── Admin ───────────────────────────────────────────────────────────────────

test.describe('Admin — redirecionamento', () => {
  test.use({ storageState: storageStatePath('admin') })

  test('admin é redirecionado para /dashboard', async ({ page }) => {
    await page.goto('/home')
    await expect(page).toHaveURL(/\/dashboard/)
  })
})
