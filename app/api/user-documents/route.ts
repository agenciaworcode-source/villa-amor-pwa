import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function getSessionUser() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Checklists padrão por vínculo (espelham a migration para PF e o Doc 1 para
// PJ/PcD). Usados para semear tipos que ainda não têm nenhum documento — cobre
// tanto registros criados após a migration quanto abas PJ/PcD nunca semeadas.
const DOC_TEMPLATES: Record<string, { category: string; doc_name: string }[]> = {
  pf: [
    { category: 'identificacao', doc_name: 'RG ou CNH' },
    { category: 'identificacao', doc_name: 'CPF' },
    { category: 'identificacao', doc_name: 'Título de Eleitor' },
    { category: 'identificacao', doc_name: 'Certidão de Nascimento ou Casamento' },
    { category: 'comprovante',   doc_name: 'Comprovante de Residência' },
    { category: 'escolaridade',  doc_name: 'Comprovante de Escolaridade / Diploma' },
    { category: 'trabalhista',   doc_name: 'Carteira de Trabalho (CTPS Digital)' },
    { category: 'trabalhista',   doc_name: 'Cartão PIS/PASEP' },
    { category: 'saude',         doc_name: 'ASO Admissional' },
    { category: 'beneficios',    doc_name: 'Dados Bancários' },
    { category: 'beneficios',    doc_name: 'Comprovante de Endereço para Vale-Transporte' },
  ],
  pj: [
    { category: 'empresa',            doc_name: 'Contrato Social / Requerimento / Certificado MEI' },
    { category: 'empresa',            doc_name: 'Cartão CNPJ atualizado' },
    { category: 'empresa',            doc_name: 'Inscrição Municipal ou Estadual' },
    { category: 'empresa',            doc_name: 'Comprovante de Endereço da Empresa' },
    { category: 'regularidade',       doc_name: 'CND — Certidões Negativas de Débitos' },
    { category: 'regularidade',       doc_name: 'Certificado de Regularidade do FGTS (CRF)' },
    { category: 'regularidade',       doc_name: 'DAS Atualizado (MEI)' },
    { category: 'contrato_prestacao', doc_name: 'Contrato de Prestação de Serviços' },
    { category: 'beneficios',         doc_name: 'Dados Bancários da Conta PJ' },
  ],
  pcd: [
    { category: 'identificacao',   doc_name: 'RG, CNH ou Carteira de Identidade Nacional' },
    { category: 'identificacao',   doc_name: 'CPF' },
    { category: 'identificacao',   doc_name: 'Carteira de Trabalho (CTPS Digital)' },
    { category: 'identificacao',   doc_name: 'Título de Eleitor' },
    { category: 'identificacao',   doc_name: 'Certidão de Nascimento ou Casamento' },
    { category: 'comprovante',     doc_name: 'Comprovante de Residência (até 90 dias)' },
    { category: 'inss_beneficio',  doc_name: 'Carta de Concessão do Benefício / Extrato INSS' },
    { category: 'inss_beneficio',  doc_name: 'Extrato de Pagamento/Crédito do INSS' },
    { category: 'trabalhista',     doc_name: 'Cartão PIS/PASEP' },
    { category: 'beneficios',      doc_name: 'Dados Bancários' },
    { category: 'outros',          doc_name: 'Certificado de Reservista' },
  ],
}

// GET /api/user-documents?user_id=xxx&employee_type=pf|pj|pcd
// Se o vínculo solicitado ainda não tiver nenhum documento, semeia o checklist
// padrão daquele vínculo (lazy seed) antes de retornar.
export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser()
    if (!sessionUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const userId = req.nextUrl.searchParams.get('user_id')
    if (!userId) return NextResponse.json({ error: 'user_id obrigatório' }, { status: 400 })

    const employeeType = req.nextUrl.searchParams.get('employee_type') ?? 'pf'
    const admin = adminClient()

    const fetchAll = () => admin
      .from('user_documents')
      .select('*')
      .eq('user_id', userId)
      .order('category')
      .order('doc_name')

    const { data, error } = await fetchAll()
    if (error) throw new Error(error.message)

    // Lazy seed: se o vínculo pedido não tem nenhum documento, cria o template.
    const hasType = (data ?? []).some(d => d.employee_type === employeeType)
    const template = DOC_TEMPLATES[employeeType]
    if (!hasType && template) {
      const { error: seedError } = await admin
        .from('user_documents')
        .insert(template.map(t => ({
          user_id: userId, employee_type: employeeType,
          category: t.category, doc_name: t.doc_name, status: 'pendente',
        })))
      if (seedError) throw new Error(seedError.message)
      const reload = await fetchAll()
      if (reload.error) throw new Error(reload.error.message)
      return NextResponse.json({ documents: reload.data ?? [] })
    }

    return NextResponse.json({ documents: data ?? [] })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// PATCH /api/user-documents — atualiza notes ou status de um documento
export async function PATCH(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser()
    if (!sessionUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await req.json()
    const { id, notes, status } = body as { id: string; notes?: string; status?: string }
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

    const admin = adminClient()
    const updates: Record<string, unknown> = {}
    if (notes !== undefined) updates.notes = notes
    if (status !== undefined) updates.status = status

    const { error } = await admin.from('user_documents').update(updates).eq('id', id)
    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST /api/user-documents — cria documento avulso
export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser()
    if (!sessionUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await req.json()
    const { user_id, employee_type, category, doc_name } = body as {
      user_id: string; employee_type: string; category: string; doc_name: string
    }
    if (!user_id || !category || !doc_name) {
      return NextResponse.json({ error: 'Campos obrigatórios: user_id, category, doc_name' }, { status: 400 })
    }

    const admin = adminClient()
    const { data, error } = await admin
      .from('user_documents')
      .insert({ user_id, employee_type: employee_type ?? 'pf', category, doc_name, status: 'pendente' })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return NextResponse.json({ document: data }, { status: 201 })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
