// Dados locais (fallback) caso Supabase esteja indisponível.
// Você pode remover este arquivo depois que tudo estiver ok.

window.localCategorias = [
  { id: "local-cafes", nome: "Cafés", slug: "cafes" },
  { id: "local-doces", nome: "Doces", slug: "doces" },
];

window.localItens = [
  {
    id: "local-01",
    categoria_slug: "cafes",
    nome: "Espresso",
    descricao: "Clássico, intenso e aromático.",
    preco: 8.0,
    imagem_caminho: null,
    disponivel: true,
  },
  {
    id: "local-02",
    categoria_slug: "doces",
    nome: "Cookie de chocolate",
    descricao: "Crocante por fora, macio por dentro.",
    preco: 6.5,
    imagem_caminho: null,
    disponivel: true,
  },
];
