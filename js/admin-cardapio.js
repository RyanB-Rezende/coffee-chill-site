// ===== GERENCIAMENTO DE CARDÁPIO (CATEGORIAS E ITENS) =====

// ===== VARIÁVEIS GLOBAIS =====
let categorias = [];
let itens = [];

// ===== Helpers de preço (globais) =====
function parseBR(value) {
  const cleaned = (value || '').toString().replace(/[^0-9]/g, '');
  if (!cleaned) return 0;
  const intPart = cleaned.slice(0, -2) || '0';
  const cents = cleaned.slice(-2);
  return parseFloat(`${intPart}.${cents}`);
}

function formatBR(number) {
  const n = typeof number === 'number' ? number : parseFloat(number);
  const safe = isNaN(n) ? 0 : n;
  return safe.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', async () => {
  // Aguardar verificação de sessão
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Carregar dados iniciais
  await carregarDados();
  
  // Configurar navegação entre seções
  configurarNavegacao();
  
  // Configurar modais
  configurarModais();
  
  // Configurar formulários
  configurarFormularios();
  
  // Atualizar visão geral
  atualizarVisaoGeral();
});

// ===== CARREGAR DADOS DO SUPABASE =====
async function carregarDados() {
  try {
    // Carregar categorias
    const { data: categoriasData, error: catError } = await window.sb
      .from('categorias_cardapio')
      .select('*')
      .order('nome');
    
    if (catError) throw catError;
    categorias = categoriasData || [];
    
    // Carregar itens
    const { data: itensData, error: itensError } = await window.sb
      .from('itens_cardapio')
      .select('*, categoria:categorias_cardapio(nome)')
      .order('nome');
    
    if (itensError) throw itensError;
    itens = itensData || [];
    
    // Renderizar tabelas
    renderizarCategorias();
    renderizarItens();
    popularSelectCategorias();
    
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    alert('Erro ao carregar dados do cardápio.');
  }
}

// ===== NAVEGAÇÃO ENTRE SEÇÕES =====
function configurarNavegacao() {
  const navLinks = document.querySelectorAll('.admin-nav-link');
  const sections = document.querySelectorAll('.admin-section');
  
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Remover active de todos
      navLinks.forEach(l => l.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));
      
      // Adicionar active ao clicado
      link.classList.add('active');
      const sectionId = link.getAttribute('data-section');
      document.getElementById(sectionId).classList.add('active');
    });
  });
}

// ===== CONFIGURAR MODAIS =====
function configurarModais() {
  // Modal Categoria
  const modalCat = document.getElementById('modalCategoria');
  const btnNovaCat = document.getElementById('btnNovaCat');
  const btnCloseModalCat = document.getElementById('btnCloseModalCat');
  const btnCancelCat = document.getElementById('btnCancelCat');
  
  btnNovaCat.addEventListener('click', () => abrirModalCategoria());
  btnCloseModalCat.addEventListener('click', () => fecharModal(modalCat));
  btnCancelCat.addEventListener('click', () => fecharModal(modalCat));
  
  // Modal Item
  const modalItem = document.getElementById('modalItem');
  const btnNovoItem = document.getElementById('btnNovoItem');
  const btnCloseModalItem = document.getElementById('btnCloseModalItem');
  const btnCancelItem = document.getElementById('btnCancelItem');
  
  btnNovoItem.addEventListener('click', () => abrirModalItem());
  btnCloseModalItem.addEventListener('click', () => fecharModal(modalItem));
  btnCancelItem.addEventListener('click', () => fecharModal(modalItem));
  
    // Modal Promoção
    const modalPromocao = document.getElementById('modalPromocao');
    const btnCloseModalPromocao = document.getElementById('btnCloseModalPromocao');
    const btnCancelPromocao = document.getElementById('btnCancelPromocao');
  
    btnCloseModalPromocao.addEventListener('click', () => fecharModal(modalPromocao));
    btnCancelPromocao.addEventListener('click', () => fecharModal(modalPromocao));
  
  // Fechar modal ao clicar fora
    [modalCat, modalItem, modalPromocao].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        fecharModal(modal);
      }
    });
  });
  
  // Preview de imagem
  const itemImagem = document.getElementById('itemImagem');
  const preview = document.getElementById('itemImagemPreview');
  
  itemImagem.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        preview.src = event.target.result;
        preview.classList.add('active');
      };
      reader.readAsDataURL(file);
    }
  });
  
    // Validação de preço promocional em tempo real
    const promocaoPrecoPromocional = document.getElementById('promocaoPrecoPromocional');
    const promocaoPrecoNormal = document.getElementById('promocaoPrecoNormal');
  
  
    function validatePromo() {
      const precoNormal = parseFloat(promocaoPrecoNormal.value) || 0;
      const precoPromo = parseBR(promocaoPrecoPromocional.value);
    
      if (precoPromo <= 0) {
        promocaoPrecoPromocional.setCustomValidity('Informe um preço promocional válido');
        return;
      }
      if (precoPromo >= precoNormal) {
        promocaoPrecoPromocional.setCustomValidity('O preço promocional deve ser menor que o preço normal');
      } else {
        promocaoPrecoPromocional.setCustomValidity('');
      }
    }
  
    promocaoPrecoPromocional?.addEventListener('input', (e) => {
      const raw = e.target.value;
      // manter apenas números enquanto digita
      const parsed = parseBR(raw);
      // bloquear acima do normal automaticamente
      const normal = parseFloat(promocaoPrecoNormal.value) || 0;
      const adjusted = parsed >= normal ? (normal > 0 ? normal - 0.01 : 0) : parsed;
      e.target.value = formatBR(adjusted);
      validatePromo();
    });
  
    promocaoPrecoPromocional?.addEventListener('blur', (e) => {
      // garantir formatação bonita ao sair do campo
      const parsed = parseBR(e.target.value);
      e.target.value = formatBR(parsed);
      validatePromo();
    });
}

function abrirModal(modal) {
  modal.classList.add('active');
}

function fecharModal(modal) {
  modal.classList.remove('active');
}

// ===== CATEGORIAS =====
function renderizarCategorias() {
  const tbody = document.getElementById('tabelaCategorias');
  
  if (categorias.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem;">Nenhuma categoria cadastrada.</td></tr>';
    return;
  }
  
  tbody.innerHTML = categorias.map(cat => `
    <tr>
      <td>${cat.nome}</td>
      <td><code>${cat.slug}</code></td>
      <td>${cat.descricao || '-'}</td>
      <td>
        <div class="btn-action-group">
          <button class="btn-action btn-primary" onclick="editarCategoria('${cat.id}')">
            ✏️ Editar
          </button>
          <button class="btn-action btn-danger" onclick="excluirCategoria('${cat.id}')">
            🗑️ Excluir
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function abrirModalCategoria(categoriaId = null) {
  const modal = document.getElementById('modalCategoria');
  const form = document.getElementById('formCategoria');
  const title = document.getElementById('modalCatTitle');
  
  form.reset();
  
  if (categoriaId) {
    const categoria = categorias.find(c => c.id === categoriaId);
    if (categoria) {
      title.textContent = 'Editar Categoria';
      document.getElementById('catId').value = categoria.id;
      document.getElementById('catNome').value = categoria.nome;
      document.getElementById('catSlug').value = categoria.slug;
      document.getElementById('catDescricao').value = categoria.descricao || '';
    }
  } else {
    title.textContent = 'Nova Categoria';
  }
  
  abrirModal(modal);
}

window.editarCategoria = function(id) {
  abrirModalCategoria(id);
};

window.excluirCategoria = async function(id) {
  if (!confirm('Deseja realmente excluir esta categoria? Esta ação não pode ser desfeita.')) {
    return;
  }
  
  try {
    const { error } = await window.sb
      .from('categorias_cardapio')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    alert('Categoria excluída com sucesso!');
    await carregarDados();
    atualizarVisaoGeral();
  } catch (error) {
    console.error('Erro ao excluir categoria:', error);
    alert('Erro ao excluir categoria. Verifique se não há itens vinculados a ela.');
  }
};

// ===== ITENS =====
function renderizarItens() {
  const tbody = document.getElementById('tabelaItens');
  
  if (itens.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem;">Nenhum item cadastrado.</td></tr>';
    return;
  }
  
  tbody.innerHTML = itens.map(item => {
    const imagemUrl = item.imagem_caminho 
      ? window.storagePublicUrl(item.imagem_caminho)
      : 'https://via.placeholder.com/60?text=Sem+Imagem';
    
    const temPromocao = item.promocao_ativa && item.preco_promocional != null;
    const precoOriginal = parseFloat(item.preco);
    const precoPromo = temPromocao ? parseFloat(item.preco_promocional) : null;
    
    // Verificar se a promoção está dentro da janela de tempo
    const agora = new Date();
    const dataInicio = item.promocao_inicio ? new Date(item.promocao_inicio) : null;
    const dataFim = item.promocao_fim ? new Date(item.promocao_fim) : null;
    const promocaoValida = temPromocao && (!dataInicio || agora >= dataInicio) && (!dataFim || agora <= dataFim);
    
    return `
      <tr>
        <td>
          <img src="${imagemUrl}" alt="${item.nome}" 
               style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;">
        </td>
        <td><strong>${item.nome}</strong></td>
        <td>${item.categoria?.nome || '-'}</td>
        <td>
          R$ ${precoOriginal.toFixed(2)}
        </td>
        <td>
          <span class="badge ${item.disponivel ? 'badge-success' : 'badge-danger'}">
            ${item.disponivel ? 'Disponível' : 'Indisponível'}
          </span>
        </td>
        <td>
          <span class="badge ${item.destaque ? 'badge-warning' : 'badge-secondary'}">
            ${item.destaque ? '⭐ Sim' : 'Não'}
          </span>
        </td>
        <td>
          ${promocaoValida 
            ? `<span class="badge badge-success">✓ Ativa</span>
               <br><small style="color:#dc3545; font-weight:700;">R$ ${precoPromo.toFixed(2)}</small>`
            : temPromocao 
              ? `<span class="badge badge-secondary">Configurada</span>`
              : `<span class="badge badge-secondary">-</span>`}
        </td>
        <td>
          <div class="btn-action-group">
            <button class="btn-action btn-primary" onclick="editarItem('${item.id}')">
              ✏️ Editar
            </button>
            <button class="btn-action btn-warning" onclick="gerenciarPromocao('${item.id}')" style="background: #ffc107; color: #000;">
              🏷️ Promoção
            </button>
            <button class="btn-action btn-danger" onclick="excluirItem('${item.id}')">
              🗑️ Excluir
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function abrirModalItem(itemId = null) {
  const modal = document.getElementById('modalItem');
  const form = document.getElementById('formItem');
  const title = document.getElementById('modalItemTitle');
  const preview = document.getElementById('itemImagemPreview');
  
  form.reset();
  preview.classList.remove('active');
  
  if (itemId) {
    const item = itens.find(i => i.id === itemId);
    if (item) {
      title.textContent = 'Editar Item';
      document.getElementById('itemId').value = item.id;
      document.getElementById('itemNome').value = item.nome;
      document.getElementById('itemCategoria').value = item.categoria_id;
      document.getElementById('itemPreco').value = parseFloat(item.preco).toFixed(2);
      document.getElementById('itemDisponivel').value = item.disponivel.toString();
      document.getElementById('itemDestaque').checked = item.destaque;
      document.getElementById('itemDescricao').value = item.descricao || '';
      
      if (item.imagem_caminho) {
        preview.src = window.storagePublicUrl(item.imagem_caminho);
        preview.classList.add('active');
      }
    }
  } else {
    title.textContent = 'Novo Item';
  }
  
  abrirModal(modal);
}

window.editarItem = function(id) {
  abrirModalItem(id);
};

window.excluirItem = async function(id) {
  if (!confirm('Deseja realmente excluir este item? Esta ação não pode ser desfeita.')) {
    return;
  }
  
  try {
    // Buscar item para deletar imagem
    const item = itens.find(i => i.id === id);
    
    // Deletar do banco
    const { error } = await window.sb
      .from('itens_cardapio')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    // Deletar imagem do storage se existir
    if (item && item.imagem_caminho) {
      await window.sb.storage
        .from('imagens_cardapio')
        .remove([item.imagem_caminho]);
    }
    
    alert('Item excluído com sucesso!');
    await carregarDados();
    atualizarVisaoGeral();
  } catch (error) {
    console.error('Erro ao excluir item:', error);
    alert('Erro ao excluir item.');
  }
};

function popularSelectCategorias() {
  const select = document.getElementById('itemCategoria');
  select.innerHTML = '<option value="">Selecione...</option>' +
    categorias.map(cat => `<option value="${cat.id}">${cat.nome}</option>`).join('');
}

// ===== CONFIGURAR FORMULÁRIOS =====
function configurarFormularios() {
  // Formulário de Categoria
  document.getElementById('btnSaveCat').addEventListener('click', salvarCategoria);
  
  // Auto-gerar slug
  document.getElementById('catNome').addEventListener('input', (e) => {
    const slug = e.target.value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    document.getElementById('catSlug').value = slug;
  });
  
  // Formulário de Item
  document.getElementById('btnSaveItem').addEventListener('click', salvarItem);
  
    // Formulário de Promoção
    document.getElementById('btnSavePromocao').addEventListener('click', salvarPromocao);
    document.getElementById('btnRemoverPromocao').addEventListener('click', removerPromocao);
}

async function salvarCategoria() {
  const form = document.getElementById('formCategoria');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  const id = document.getElementById('catId').value;
  const dados = {
    nome: document.getElementById('catNome').value.trim(),
    slug: document.getElementById('catSlug').value.trim(),
    descricao: document.getElementById('catDescricao').value.trim() || null
  };
  
  try {
    if (id) {
      // Atualizar
      const { error } = await window.sb
        .from('categorias_cardapio')
        .update(dados)
        .eq('id', id);
      
      if (error) throw error;
      alert('Categoria atualizada com sucesso!');
    } else {
      // Criar
      const { error } = await window.sb
        .from('categorias_cardapio')
        .insert([dados]);
      
      if (error) throw error;
      alert('Categoria criada com sucesso!');
    }
    
    fecharModal(document.getElementById('modalCategoria'));
    await carregarDados();
    atualizarVisaoGeral();
  } catch (error) {
    console.error('Erro ao salvar categoria:', error);
    alert('Erro ao salvar categoria: ' + error.message);
  }
}

async function salvarItem() {
  const form = document.getElementById('formItem');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  const id = document.getElementById('itemId').value;
  const arquivo = document.getElementById('itemImagem').files[0];
  
  let imagemCaminho = null;
  
  try {
    // Upload de imagem se houver
    if (arquivo) {
      const categoriaId = document.getElementById('itemCategoria').value;
      const categoria = categorias.find(c => c.id === categoriaId);
      const pasta = categoria?.slug || 'outros';
      
      const nomeArquivo = `${pasta}/${Date.now()}_${arquivo.name}`;
      
      const { data: uploadData, error: uploadError } = await window.sb.storage
        .from('imagens_cardapio')
        .upload(nomeArquivo, arquivo);
      
      if (uploadError) throw uploadError;
      imagemCaminho = uploadData.path;
    }
    
    const dados = {
      nome: document.getElementById('itemNome').value.trim(),
      categoria_id: document.getElementById('itemCategoria').value,
      preco: parseFloat(document.getElementById('itemPreco').value),
      disponivel: document.getElementById('itemDisponivel').value === 'true',
      destaque: document.getElementById('itemDestaque').checked,
      descricao: document.getElementById('itemDescricao').value.trim() || null
    };
    
    if (imagemCaminho) {
      dados.imagem_caminho = imagemCaminho;
    }
    
    if (id) {
      // Atualizar
      const { error } = await window.sb
        .from('itens_cardapio')
        .update(dados)
        .eq('id', id);
      
      if (error) throw error;
      alert('Item atualizado com sucesso!');
    } else {
      // Criar
      const { error } = await window.sb
        .from('itens_cardapio')
        .insert([dados]);
      
      if (error) throw error;
      alert('Item criado com sucesso!');
    }
    
    fecharModal(document.getElementById('modalItem'));
    await carregarDados();
    atualizarVisaoGeral();
  } catch (error) {
    console.error('Erro ao salvar item:', error);
    alert('Erro ao salvar item: ' + error.message);
  }
}

// ===== ATUALIZAR VISÃO GERAL =====
function atualizarVisaoGeral() {
  document.getElementById('totalCategorias').textContent = categorias.length;
  document.getElementById('totalItens').textContent = itens.length;
  document.getElementById('totalDisponiveis').textContent = 
    itens.filter(i => i.disponivel).length;
  document.getElementById('totalDestaques').textContent = 
    itens.filter(i => i.destaque).length;
}

// ===== GERENCIAR PROMOÇÃO =====
window.gerenciarPromocao = function(itemId) {
  const item = itens.find(i => i.id === itemId);
  if (!item) return;
  
  const modal = document.getElementById('modalPromocao');
  const form = document.getElementById('formPromocao');
  
  form.reset();
  
  // Preencher dados do item
  document.getElementById('promocaoItemId').value = item.id;
  document.getElementById('promocaoItemNome').value = item.nome;
  document.getElementById('promocaoPrecoNormal').value = parseFloat(item.preco).toFixed(2);
  document.getElementById('promocaoPrecoOriginal').value = parseFloat(item.preco).toFixed(2);
  document.getElementById('precoNormalDisplay').textContent = parseFloat(item.preco).toFixed(2);
  
  // Preencher dados da promoção se existir
  if (item.preco_promocional != null) {
    document.getElementById('promocaoPrecoPromocional').value = parseFloat(item.preco_promocional).toFixed(2);
  }
  document.getElementById('promocaoAtiva').value = item.promocao_ativa ? 'true' : 'false';
  
  if (item.promocao_inicio) {
    document.getElementById('promocaoInicio').value = new Date(item.promocao_inicio).toISOString().slice(0, 16);
  }
  if (item.promocao_fim) {
    document.getElementById('promocaoFim').value = new Date(item.promocao_fim).toISOString().slice(0, 16);
  }
  
  abrirModal(modal);
};

async function salvarPromocao() {
  const form = document.getElementById('formPromocao');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  
  const itemId = document.getElementById('promocaoItemId').value;
  const precoNormal = parseFloat(document.getElementById('promocaoPrecoOriginal').value);
  const precoPromocional = (function(){
    const v = document.getElementById('promocaoPrecoPromocional').value;
    // aceitar formato BR (com vírgula) e o formatado pelo input
    const num = parseBR(v);
    return num;
  })();
  
  // Validação adicional
  if (precoPromocional >= precoNormal) {
    alert(`O preço promocional (R$ ${precoPromocional.toFixed(2)}) deve ser menor que o preço normal (R$ ${precoNormal.toFixed(2)})`);
    return;
  }
  
  const dados = {
    preco_promocional: parseFloat(precoPromocional.toFixed(2)),
    promocao_ativa: document.getElementById('promocaoAtiva').value === 'true',
    promocao_inicio: new Date(document.getElementById('promocaoInicio').value).toISOString(),
    promocao_fim: new Date(document.getElementById('promocaoFim').value).toISOString()
  };
  
  try {
    const { error } = await window.sb
      .from('itens_cardapio')
      .update(dados)
      .eq('id', itemId);
    
    if (error) throw error;
    
    alert('Promoção salva com sucesso!');
    fecharModal(document.getElementById('modalPromocao'));
    await carregarDados();
  } catch (error) {
    console.error('Erro ao salvar promoção:', error);
    alert('Erro ao salvar promoção: ' + error.message);
  }
}

async function removerPromocao() {
  if (!confirm('Deseja realmente remover a promoção deste item?')) {
    return;
  }
  
  const itemId = document.getElementById('promocaoItemId').value;
  
  const dados = {
    preco_promocional: null,
    promocao_ativa: false,
    promocao_inicio: null,
    promocao_fim: null
  };
  
  try {
    const { error } = await window.sb
      .from('itens_cardapio')
      .update(dados)
      .eq('id', itemId);
    
    if (error) throw error;
    
    alert('Promoção removida com sucesso!');
    fecharModal(document.getElementById('modalPromocao'));
    await carregarDados();
  } catch (error) {
    console.error('Erro ao remover promoção:', error);
    alert('Erro ao remover promoção: ' + error.message);
  }
}
