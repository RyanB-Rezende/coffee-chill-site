// Renderização do cardápio usando Supabase

(function () {
  const gridEl = document.getElementById('menu-grid');
  const filtrosEl = document.getElementById('menu-filtros');
  const origemEl = document.getElementById('menu-origem');

  const priceBRL = (v) =>
    Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  async function fetchCategorias() {
    try {
      const { data, error } = await window.sb
        .from('categorias_cardapio')
        .select('*')
        .order('nome');
      if (error) throw error;
      return data || [];
    } catch (e) {
      console.warn('Falha categorias Supabase, usando dados locais:', e.message);
      origemEl.textContent = 'Dados locais de exemplo (Supabase indisponível)';
      return window.localCategorias || [];
    }
  }

  async function fetchItens(categoriaId) {
    try {
      let query = window.sb.from('itens_cardapio').select('*').eq('disponivel', true).order('nome');
      if (categoriaId) query = query.eq('categoria_id', categoriaId);
      const { data, error } = await query;
      if (error) throw error;
      origemEl.textContent = 'Dados carregados do Supabase';
      return data || [];
    } catch (e) {
      console.warn('Falha itens Supabase, usando dados locais:', e.message);
      origemEl.textContent = 'Dados locais de exemplo (Supabase indisponível)';
      // Filtro simples pelo slug
      if (!categoriaId) return window.localItens || [];
      // quando categoriaId existe mas só temos slug no local, retorna todos locais
      return window.localItens || [];
    }
  }

  async function fetchPromocoes(categoriaId) {
    const todos = await fetchItens(categoriaId);
    const now = new Date();
    return todos.filter(i => {
      const ativa = !!i.promocao_ativa && i.preco_promocional != null;
      const dentroJanela = (!i.promocao_inicio || new Date(i.promocao_inicio) <= now) &&
                           (!i.promocao_fim || new Date(i.promocao_fim) >= now);
      return ativa && dentroJanela;
    });
  }

  function makeCard(item) {
    const imgUrl = window.storagePublicUrl(item.imagem_caminho);

    const card = document.createElement('article');
    card.className = 'menu-card';

    const header = document.createElement('div');
    header.className = 'menu-card-header';

    const title = document.createElement('h3');
    title.textContent = item.nome;

    const price = document.createElement('span');
    price.className = 'menu-card-price';
    const promoActive = !!item.promocao_ativa;
    const now = new Date();
    const inWindow = (!item.promocao_inicio || new Date(item.promocao_inicio) <= now) &&
                     (!item.promocao_fim || new Date(item.promocao_fim) >= now);
    const showPromo = promoActive && item.preco_promocional != null && inWindow;
    if (showPromo) {
      price.innerHTML = `<span class=\"price-promo\">${priceBRL(item.preco_promocional)}</span>
                         <span class=\"price-original\">${priceBRL(item.preco)}</span>`;
      // Ativar contorno amarelo somente em promoção
      card.classList.add('promo-card');
    } else {
      price.textContent = priceBRL(item.preco);
    }

    header.appendChild(title);
    header.appendChild(price);
    card.appendChild(header);

    if (imgUrl) {
      const img = document.createElement('img');
      img.src = imgUrl;
      img.alt = item.nome;
      img.loading = 'lazy';
      img.className = 'menu-card-img';
      card.appendChild(img);
    }

    if (item.descricao) {
      const p = document.createElement('p');
      p.className = 'menu-card-desc';
      p.textContent = item.descricao;
      card.appendChild(p);
    }

    return card;
  }

  function renderGrid(itens) {
    gridEl.innerHTML = '';
    if (!itens || itens.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'menu-empty';
      empty.textContent = 'Nenhum item disponível nesta categoria.';
      gridEl.appendChild(empty);
      return;
    }
    itens.forEach((i) => gridEl.appendChild(makeCard(i)));
  }

  function renderFiltros(categorias) {
    filtrosEl.innerHTML = '';

    const btnTodos = document.createElement('button');
    btnTodos.type = 'button';
    btnTodos.className = 'menu-filter active';
    btnTodos.textContent = 'Todos';
    btnTodos.addEventListener('click', async () => {
      filtrosEl.querySelectorAll('.menu-filter').forEach((b) => b.classList.remove('active'));
      btnTodos.classList.add('active');
      const itens = await fetchItens(null);
      renderGrid(itens);
    });
    filtrosEl.appendChild(btnTodos);

    // Filtro de promoção
    const btnPromo = document.createElement('button');
    btnPromo.type = 'button';
    btnPromo.className = 'menu-filter';
    btnPromo.textContent = 'Em promoção';
    btnPromo.addEventListener('click', async () => {
      filtrosEl.querySelectorAll('.menu-filter').forEach((b) => b.classList.remove('active'));
      btnPromo.classList.add('active');
      const itens = await fetchPromocoes(null);
      renderGrid(itens);
    });
    filtrosEl.appendChild(btnPromo);

    categorias.forEach((cat) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'menu-filter';
      btn.textContent = cat.nome;
      btn.addEventListener('click', async () => {
        filtrosEl.querySelectorAll('.menu-filter').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const itens = await fetchItens(cat.id);
        renderGrid(itens);
      });
      filtrosEl.appendChild(btn);
    });
  }

  async function init() {
    try {
      const categorias = await fetchCategorias();
      renderFiltros(categorias);
      const itens = await fetchItens(null);
      renderGrid(itens);
    } catch (e) {
      origemEl.textContent = 'Erro ao carregar cardápio';
      console.error(e);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
