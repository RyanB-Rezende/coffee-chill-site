// ===== AUTENTICAÇÃO DE ADMINISTRADORES =====

// Verificar se existem administradores cadastrados
async function verificarAdministradoresExistentes() {
  try {
    const { data, error, count } = await window.sb
      .from('administradores')
      .select('*', { count: 'exact', head: true });
    
    if (error) throw error;
    
    return count > 0;
  } catch (error) {
    console.error('Erro ao verificar administradores:', error);
    return true; // Em caso de erro, assume que existem admins (mais seguro)
  }
}

// Verificar se usuário já está autenticado
async function verificarSessao() {
  try {
    const { data: { session }, error } = await window.sb.auth.getSession();
    
    if (error) throw error;
    
    if (session) {
      // Verificar se o usuário é um administrador
      const { data: admin, error: adminError } = await window.sb
        .from('administradores')
        .select('*')
        .eq('email', session.user.email)
        .single();
      
      if (adminError) {
        console.error('Erro ao verificar administrador:', adminError);
        await window.sb.auth.signOut();
        return null;
      }
      
      if (admin) {
        // Atualizar último login
        await window.sb
          .from('administradores')
          .update({ ultimo_login_em: new Date().toISOString() })
          .eq('id', admin.id);
        
        return admin;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao verificar sessão:', error);
    return null;
  }
}

// Redirecionar se já estiver logado (para página de login)
if (window.location.pathname.includes('admin-login.html')) {
  // Aguardar o Supabase estar pronto
  function inicializarLogin() {
    if (typeof window.sb !== 'undefined') {
      verificarSessao().then(admin => {
        if (admin) {
          window.location.href = 'admin-dashboard.html';
        } else {
          // Verificar se existem administradores
          verificarAdministradoresExistentes().then(existemAdmins => {
            configurarFormularioLogin(existemAdmins);
          });
        }
      });
    } else {
      // Aguardar evento de supabase pronto
      window.addEventListener('supabaseReady', () => {
        verificarSessao().then(admin => {
          if (admin) {
            window.location.href = 'admin-dashboard.html';
          } else {
            // Verificar se existem administradores
            verificarAdministradoresExistentes().then(existemAdmins => {
              configurarFormularioLogin(existemAdmins);
            });
          }
        });
      }, { once: true });
    }
  }
  
  inicializarLogin();
}

// Proteger páginas administrativas (para dashboard)
if (window.location.pathname.includes('admin-dashboard.html')) {
  function inicializarDashboard() {
    if (typeof window.sb !== 'undefined') {
      verificarSessao().then(admin => {
        if (!admin) {
          window.location.href = 'admin-login.html';
        } else {
          // Exibir informações do administrador
          const usernameEl = document.getElementById('adminUsername');
          if (usernameEl) {
            usernameEl.textContent = admin.nome;
          }
          
          // Armazenar dados do admin no sessionStorage
          sessionStorage.setItem('adminData', JSON.stringify(admin));
        }
      });
    } else {
      // Aguardar evento de supabase pronto
      window.addEventListener('supabaseReady', () => {
        verificarSessao().then(admin => {
          if (!admin) {
            window.location.href = 'admin-login.html';
          } else {
            // Exibir informações do administrador
            const usernameEl = document.getElementById('adminUsername');
            if (usernameEl) {
              usernameEl.textContent = admin.nome;
            }
            
            // Armazenar dados do admin no sessionStorage
            sessionStorage.setItem('adminData', JSON.stringify(admin));
          }
        });
      }, { once: true });
    }
  }
  
  inicializarDashboard();
}

// ===== FUNÇÃO DE LOGIN =====
async function fazerLogin(email, senha) {
  try {
    // Primeiro, verificar se o email existe na tabela de administradores
    const { data: admin, error: adminError } = await window.sb
      .from('administradores')
      .select('*')
      .eq('email', email)
      .single();
    
    if (adminError || !admin) {
      throw new Error('E-mail não encontrado ou não autorizado.');
    }
    
    // Tentar fazer login com Supabase Auth
    const { data, error } = await window.sb.auth.signInWithPassword({
      email: email,
      password: senha,
    });
    
    if (error) {
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('invalid login credentials')) {
        throw new Error('Senha incorreta. Verifique suas credenciais.');
      }
      // Ambiente sem confirmação de e-mail: informe claramente
      if (msg.includes('email not confirmed') || msg.includes('not confirmed')) {
        throw new Error('Este projeto está configurado para dispensar confirmação de e-mail. Ajuste a configuração no Supabase para permitir login imediato (Authentication → Settings → Email → desative Confirm email).');
      }
      throw error;
    }
    
    // Atualizar último login
    await window.sb
      .from('administradores')
      .update({ ultimo_login_em: new Date().toISOString() })
      .eq('id', admin.id);
    
    return { success: true, admin };
  } catch (error) {
    console.error('Erro no login:', error);
    return { success: false, error: error.message };
  }
}

// ===== FUNÇÃO DE LOGOUT =====
async function fazerLogout() {
  try {
    const { error } = await window.sb.auth.signOut();
    if (error) throw error;
    
    sessionStorage.removeItem('adminData');
    window.location.href = 'admin-login.html';
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    alert('Erro ao sair. Tente novamente.');
  }
}

// ===== EVENT LISTENERS PARA FORMULÁRIO DE LOGIN =====
if (window.location.pathname.includes('admin-login.html')) {
  const loginForm = document.getElementById('loginForm');
  const btnLogin = document.getElementById('btnLogin');
  const errorMessage = document.getElementById('errorMessage');
  
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Desabilitar botão e mostrar loading
      btnLogin.disabled = true;
      btnLogin.querySelector('.btn-text').style.display = 'none';
      btnLogin.querySelector('.btn-loading').style.display = 'inline';
      errorMessage.style.display = 'none';
      
      // Pegar dados do formulário
      const email = document.getElementById('email').value.trim();
      const senha = document.getElementById('senha').value;
      
      // Validações básicas
      if (!email || !senha) {
        errorMessage.textContent = 'Preencha todos os campos.';
        errorMessage.style.display = 'block';
        btnLogin.disabled = false;
        btnLogin.querySelector('.btn-text').style.display = 'inline';
        btnLogin.querySelector('.btn-loading').style.display = 'none';
        return;
      }
      
      // Tentar fazer login
      const resultado = await fazerLogin(email, senha);
      
      if (resultado.success) {
        // Redirecionar para dashboard
        window.location.href = 'admin-dashboard.html';
      } else {
        // Mostrar erro
        errorMessage.textContent = resultado.error || 'Erro ao fazer login. Tente novamente.';
        errorMessage.style.display = 'block';
        // Mensagem permanece visível; sem fluxo de confirmação de e-mail
        
        // Reabilitar botão
        btnLogin.disabled = false;
        btnLogin.querySelector('.btn-text').style.display = 'inline';
        btnLogin.querySelector('.btn-loading').style.display = 'none';
      }
    });
  }
}

// ===== CONFIGURAR FORMULÁRIO DE LOGIN/CADASTRO =====
function configurarFormularioLogin(existemAdmins) {
  const loginForm = document.getElementById('loginForm');
  const cadastroForm = document.getElementById('cadastroForm');
  const toggleBtn = document.getElementById('toggleFormBtn');
  const subtitle = document.querySelector('.admin-subtitle');
  
  if (!existemAdmins) {
    // Nenhum admin cadastrado - mostrar formulário de cadastro
    loginForm.style.display = 'none';
    cadastroForm.style.display = 'flex';
    subtitle.textContent = 'Nenhum administrador cadastrado. Crie o primeiro administrador.';
    subtitle.style.color = '#ffc107';
  } else {
    // Já existem admins - mostrar login
    loginForm.style.display = 'flex';
    cadastroForm.style.display = 'none';
    toggleBtn.style.display = 'none';
  }
  
  // Configurar formulário de cadastro
  configurarFormularioCadastro();
}

// ===== FORMULÁRIO DE CADASTRO DO PRIMEIRO ADMIN =====
function configurarFormularioCadastro() {
  const cadastroForm = document.getElementById('cadastroForm');
  const btnCadastro = document.getElementById('btnCadastro');
  const errorMessage = document.getElementById('cadastroErrorMessage');
  const successMessage = document.getElementById('cadastroSuccessMessage');
  
  if (cadastroForm) {
    cadastroForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Desabilitar botão
      btnCadastro.disabled = true;
      btnCadastro.querySelector('.btn-text').style.display = 'none';
      btnCadastro.querySelector('.btn-loading').style.display = 'inline';
      errorMessage.style.display = 'none';
      successMessage.style.display = 'none';
      
      // Pegar dados
      const nome = document.getElementById('cadastroNome').value.trim();
      const email = document.getElementById('cadastroEmail').value.trim();
      const senha = document.getElementById('cadastroSenha').value;
      const confirmarSenha = document.getElementById('cadastroConfirmSenha').value;
      
      // Validações
      if (!nome || !email || !senha || !confirmarSenha) {
        errorMessage.textContent = 'Preencha todos os campos.';
        errorMessage.style.display = 'block';
        btnCadastro.disabled = false;
        btnCadastro.querySelector('.btn-text').style.display = 'inline';
        btnCadastro.querySelector('.btn-loading').style.display = 'none';
        return;
      }
      
      if (senha !== confirmarSenha) {
        errorMessage.textContent = 'As senhas não conferem!';
        errorMessage.style.display = 'block';
        btnCadastro.disabled = false;
        btnCadastro.querySelector('.btn-text').style.display = 'inline';
        btnCadastro.querySelector('.btn-loading').style.display = 'none';
        return;
      }
      
      if (senha.length < 6) {
        errorMessage.textContent = 'A senha deve ter no mínimo 6 caracteres.';
        errorMessage.style.display = 'block';
        btnCadastro.disabled = false;
        btnCadastro.querySelector('.btn-text').style.display = 'inline';
        btnCadastro.querySelector('.btn-loading').style.display = 'none';
        return;
      }
      
      // Verificar se já existe algum admin (segurança extra)
      const existemAdmins = await verificarAdministradoresExistentes();
      if (existemAdmins) {
        errorMessage.textContent = 'Já existem administradores cadastrados. Use o formulário de login.';
        errorMessage.style.display = 'block';
        btnCadastro.disabled = false;
        btnCadastro.querySelector('.btn-text').style.display = 'inline';
        btnCadastro.querySelector('.btn-loading').style.display = 'none';
        
        // Recarregar página para mostrar formulário de login
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        return;
      }
      
      // Criar primeiro administrador
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
        const { error: adminError } = await window.sb
          .from('administradores')
          .insert([{
            nome: nome,
            email: email,
            senha_hash: 'gerenciado_pelo_supabase_auth'
          }]);
        
        if (adminError) {
          // Se falhar ao inserir na tabela, tentar deletar o usuário do Auth
          try {
            await window.sb.auth.admin.deleteUser(authData.user.id);
          } catch (e) {
            console.error('Erro ao reverter criação do usuário:', e);
          }
          throw adminError;
        }
        
        // Sucesso!
        successMessage.textContent = 'Primeiro administrador criado com sucesso! Você pode fazer login agora.';
        successMessage.style.display = 'block';
        
        // Limpar formulário
        cadastroForm.reset();
        
        // Redirecionar para login após 2 segundos
        setTimeout(() => {
          window.location.reload();
        }, 2000);
        
      } catch (error) {
        console.error('Erro ao criar primeiro administrador:', error);
        
        if (error.message.includes('duplicate') || error.message.includes('already registered')) {
          errorMessage.textContent = 'Este e-mail já está cadastrado!';
        } else {
          errorMessage.textContent = 'Erro ao criar administrador: ' + error.message;
        }
        errorMessage.style.display = 'block';
        
        btnCadastro.disabled = false;
        btnCadastro.querySelector('.btn-text').style.display = 'inline';
        btnCadastro.querySelector('.btn-loading').style.display = 'none';
      }
    });
  }
}

// ===== EVENT LISTENER PARA LOGOUT =====
if (window.location.pathname.includes('admin-dashboard.html')) {
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', async (e) => {
      e.preventDefault();
      
      if (confirm('Deseja realmente sair?')) {
        await fazerLogout();
      }
    });
  }
}

// ===== FUNÇÕES AUXILIARES PARA OUTRAS PÁGINAS =====

// Obter dados do administrador logado
function obterAdminLogado() {
  const adminData = sessionStorage.getItem('adminData');
  return adminData ? JSON.parse(adminData) : null;
}

// Verificar permissão de administrador
async function verificarPermissao() {
  const admin = await verificarSessao();
  if (!admin) {
    window.location.href = 'admin-login.html';
    return false;
  }
  return true;
}

// Exportar funções para uso em outros scripts
window.adminAuth = {
  verificarSessao,
  fazerLogin,
  fazerLogout,
  obterAdminLogado,
  verificarPermissao
};
