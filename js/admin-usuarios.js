// ===== GERENCIAMENTO DE ADMINISTRADORES =====

// ===== VARIÁVEIS GLOBAIS =====
let administradores = [];

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', async () => {
  // Aguardar um pouco para garantir que o cardápio carregou primeiro
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Carregar administradores
  await carregarAdministradores();
  
  // Configurar modal de administrador
  configurarModalAdmin();
});

// ===== CARREGAR ADMINISTRADORES =====
async function carregarAdministradores() {
  try {
    const { data, error } = await window.sb
      .from('administradores')
      .select('*')
      .order('criado_em', { ascending: false });
    
    if (error) throw error;
    
    administradores = data || [];
    renderizarAdministradores();
    atualizarTotalAdmins();
  } catch (error) {
    console.error('Erro ao carregar administradores:', error);
    alert('Erro ao carregar administradores.');
  }
}

// ===== RENDERIZAR TABELA =====
function renderizarAdministradores() {
  const tbody = document.getElementById('tabelaAdmins');
  
  if (administradores.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;">Nenhum administrador cadastrado.</td></tr>';
    return;
  }
  
  tbody.innerHTML = administradores.map(admin => {
    const criadoEm = new Date(admin.criado_em).toLocaleDateString('pt-BR');
    const ultimoLogin = admin.ultimo_login_em 
      ? new Date(admin.ultimo_login_em).toLocaleDateString('pt-BR') + ' ' + 
        new Date(admin.ultimo_login_em).toLocaleTimeString('pt-BR')
      : 'Nunca';
    
    return `
      <tr>
        <td><strong>${admin.nome}</strong></td>
        <td>${admin.email}</td>
        <td>${criadoEm}</td>
        <td>${ultimoLogin}</td>
        <td>
          <div class="btn-action-group">
            <button class="btn-action btn-danger" onclick="excluirAdministrador('${admin.id}', '${admin.email}')">
              🗑️ Excluir
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ===== CONFIGURAR MODAL =====
function configurarModalAdmin() {
  const modalAdmin = document.getElementById('modalAdmin');
  const btnNovoAdmin = document.getElementById('btnNovoAdmin');
  const btnCloseModalAdmin = document.getElementById('btnCloseModalAdmin');
  const btnCancelAdmin = document.getElementById('btnCancelAdmin');
  const btnSaveAdmin = document.getElementById('btnSaveAdmin');
  
  btnNovoAdmin.addEventListener('click', () => abrirModalAdmin());
  btnCloseModalAdmin.addEventListener('click', () => fecharModalAdmin());
  btnCancelAdmin.addEventListener('click', () => fecharModalAdmin());
  btnSaveAdmin.addEventListener('click', salvarAdministrador);
  
  // Fechar modal ao clicar fora
  modalAdmin.addEventListener('click', (e) => {
    if (e.target === modalAdmin) {
      fecharModalAdmin();
    }
  });
}

function abrirModalAdmin() {
  const modal = document.getElementById('modalAdmin');
  const form = document.getElementById('formAdmin');
  const title = document.getElementById('modalAdminTitle');
  
  form.reset();
  title.textContent = 'Novo Administrador';
  
  modal.classList.add('active');
}

function fecharModalAdmin() {
  const modal = document.getElementById('modalAdmin');
  modal.classList.remove('active');
}

// ===== SALVAR ADMINISTRADOR =====
async function salvarAdministrador() {
  const form = document.getElementById('formAdmin');
  
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  const nome = document.getElementById('adminNome').value.trim();
  const email = document.getElementById('adminEmail').value.trim();
  const senha = document.getElementById('adminSenha').value;
  const confirmarSenha = document.getElementById('adminConfirmSenha').value;
  
  // Validações
  if (senha !== confirmarSenha) {
    alert('As senhas não conferem!');
    return;
  }
  
  if (senha.length < 6) {
    alert('A senha deve ter no mínimo 6 caracteres!');
    return;
  }
  
  try {
    // 1. Criar usuário no Supabase Auth
    const { data: authData, error: authError } = await window.sb.auth.signUp({
      email: email,
      password: senha,
      options: {
        data: {
          nome: nome
        }
      }
    });
    
    if (authError) throw authError;
    
    // 2. Inserir na tabela de administradores
    const { data: adminData, error: adminError } = await window.sb
      .from('administradores')
      .insert([{
        nome: nome,
        email: email,
        senha_hash: 'gerenciado_pelo_supabase_auth' // Não armazenamos a senha, o Supabase Auth cuida disso
      }])
      .select()
      .single();
    
    if (adminError) {
      // Se falhar ao inserir na tabela, deletar o usuário do Auth
      await window.sb.auth.admin.deleteUser(authData.user.id);
      throw adminError;
    }
    
    alert('Administrador criado com sucesso! Um e-mail de confirmação foi enviado.');
    
    fecharModalAdmin();
    await carregarAdministradores();
  } catch (error) {
    console.error('Erro ao criar administrador:', error);
    
    if (error.message.includes('duplicate') || error.message.includes('already registered')) {
      alert('Este e-mail já está cadastrado!');
    } else {
      alert('Erro ao criar administrador: ' + error.message);
    }
  }
}

// ===== EXCLUIR ADMINISTRADOR =====
window.excluirAdministrador = async function(id, email) {
  // Verificar se não está tentando excluir a si mesmo
  const adminLogado = window.adminAuth.obterAdminLogado();
  
  if (adminLogado && adminLogado.email === email) {
    alert('Você não pode excluir sua própria conta!');
    return;
  }
  
  if (!confirm(`Deseja realmente excluir o administrador com e-mail "${email}"? Esta ação não pode ser desfeita.`)) {
    return;
  }
  
  try {
    // 1. Deletar da tabela de administradores
    const { error: dbError } = await window.sb
      .from('administradores')
      .delete()
      .eq('id', id);
    
    if (dbError) throw dbError;
    
    // 2. Buscar e deletar do Supabase Auth
    // Nota: Esta operação requer privilégios de admin service role
    // Em produção, você deve criar uma função do lado do servidor (Edge Function)
    // para fazer isso de forma segura
    try {
      const { data: authUsers, error: authError } = await window.sb.auth.admin.listUsers();
      
      if (!authError && authUsers) {
        const authUser = authUsers.users.find(u => u.email === email);
        if (authUser) {
          await window.sb.auth.admin.deleteUser(authUser.id);
        }
      }
    } catch (authError) {
      console.warn('Não foi possível deletar do Auth (requer service role):', authError);
    }
    
    alert('Administrador excluído com sucesso!');
    await carregarAdministradores();
  } catch (error) {
    console.error('Erro ao excluir administrador:', error);
    alert('Erro ao excluir administrador: ' + error.message);
  }
};

// ===== ATUALIZAR TOTAL NA VISÃO GERAL =====
function atualizarTotalAdmins() {
  const totalAdminsEl = document.getElementById('totalAdmins');
  if (totalAdminsEl) {
    totalAdminsEl.textContent = administradores.length;
  }
}
