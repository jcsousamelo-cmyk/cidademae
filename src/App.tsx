
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { auth, db, secondaryAuth } from "./firebase";

import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import type { User } from "firebase/auth";

import React, { useEffect, useMemo, useState } from "react";

type Venda = {
  id: string;
  data: string;
  infinity: number;
  banese: number;
  sumup: number;
  dinheiro: number;
  outros: number;
  despesaRapida: number;
  motivoDespesa: string;
  observacao: string;
};

type Sangria = {
  id: string;
  data: string;
  categoria: string;
  descricao: string;
  valor: number;
  origemVendaId?: string;
};

type TipoDespesa = "Caixa" | "Financeiro";
type FormaPagamento = "Dinheiro" | "PIX" | "Cartão" | "Transferência";

type ContaFluxo = {
  id: string;
  descricao: string;
  valor: number;
  vencimento: string;
  status: "Pendente" | "Pago";
  formaPagamento: FormaPagamento;
  dataPagamento: string;
  gerarSangriaAutomatica: boolean;
  categoria: string;
  tipo: TipoDespesa;
};

type FechamentoDiario = {
  id: string;
  data: string;
  fundoCaixa: number;
  vendasDinheiro: number;
  vendasCartao: number;
  vendasOutras: number;
  totalVendas: number;
  sangrias: number;
  caixaEsperado: number;
  caixaReal: number;
  diferenca: number;
  observacao: string;
  criadoEm: string;
};

type UsuarioSistema = {
  id?: string;
  uid?: string;
  usuario: string;
  email: string;
  nome: string;
  tipo: string;
  ativo: boolean;
};

const hoje = () => new Date().toISOString().slice(0, 10);
const uid = () => Math.random().toString(36).slice(2, 10);

const moeda = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v || 0);

const STORAGE = "gestao_cidade_mae_v4";
const META_DIARIA_STORAGE = "gestao_cidade_mae_meta_diaria_v4";
const META_MENSAL_STORAGE = "gestao_cidade_mae_meta_mensal_v4";
const FUNDO_CAIXA_STORAGE = "gestao_cidade_mae_fundo_caixa_v2";

const LOGIN_DOMAIN = "cidademae.local";

const loginParaEmail = (login: string) => {
  const valor = login.trim().toLowerCase();
  if (!valor) return "";
  if (valor.includes("@")) return valor;
  return `${valor}@${LOGIN_DOMAIN}`;
};

const emailParaUsuario = (email: string) => email.split("@")[0] || "";

const normalizarLogin = (valor: string) => valor.trim().toLowerCase();

const loginPodeSerEmail = (valor: string) => normalizarLogin(valor).includes("@");

function Bloco({
  titulo,
  valor,
  subtitulo,
  destaque = false,
}: {
  titulo: string;
  value?: string;
  valor: string;
  subtitulo?: string;
  destaque?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl border p-5 shadow-sm transition ${
        destaque
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-900"
      }`}
    >
      <div className={`text-sm ${destaque ? "text-slate-300" : "text-slate-500"}`}>{titulo}</div>
      <div className="mt-2 text-2xl font-bold tracking-tight">{valor}</div>
      {subtitulo ? (
        <div className={`mt-1 text-xs ${destaque ? "text-slate-400" : "text-slate-400"}`}>
          {subtitulo}
        </div>
      ) : null}
    </div>
  );
}

function Card({
  titulo,
  children,
  acao,
}: {
  titulo: string;
  children: React.ReactNode;
  acao?: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">{titulo}</h2>
        {acao}
      </div>
      {children}
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-sm font-medium text-slate-700">{label}</div>
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 ${
        props.className || ""
      }`}
    />
  );
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 ${
        props.className || ""
      }`}
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 ${
        props.className || ""
      }`}
    />
  );
}

function Botao({
  children,
  onClick,
  variante = "primario",
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variante?: "primario" | "secundario" | "perigo";
  type?: "button" | "submit";
}) {
  const estilo =
    variante === "primario"
      ? "bg-slate-900 text-white hover:bg-slate-800 border border-slate-900"
      : variante === "perigo"
      ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
      : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50";

  return (
    <button type={type} onClick={onClick} className={`rounded-2xl px-4 py-3 text-sm font-medium transition ${estilo}`}>
      {children}
    </button>
  );
}

function GraficoBarras({ titulo, dados }: { titulo: string; dados: Array<{ label: string; valor: number }> }) {
  const maior = Math.max(...dados.map((d) => d.valor), 1);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-lg font-semibold text-slate-900">{titulo}</h2>
      {dados.length === 0 ? (
        <p className="text-sm text-slate-500">Sem dados suficientes para o gráfico.</p>
      ) : (
        <div className="space-y-4">
          {dados.map((item) => (
            <div key={item.label}>
              <div className="mb-1.5 flex items-center justify-between gap-4 text-sm">
                <span className="truncate text-slate-700">{item.label}</span>
                <span className="shrink-0 font-medium text-slate-900">{moeda(item.valor)}</span>
              </div>
              <div className="h-3 w-full rounded-full bg-slate-100">
                <div className="h-3 rounded-full bg-slate-900" style={{ width: `${(item.valor / maior) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [aba, setAba] = useState<"dashboard" | "fluxo" | "fechamentos">("dashboard");
  const [periodo, setPeriodo] = useState<"dia" | "semana" | "mes">("dia");

  const [vendas, setVendas] = useState<Venda[]>([]);
  const [sangrias, setSangrias] = useState<Sangria[]>([]);
  const [contasFluxo, setContasFluxo] = useState<ContaFluxo[]>([]);
  const [fechamentos, setFechamentos] = useState<FechamentoDiario[]>([]);

  const [caixaReal, setCaixaReal] = useState("");
  const [fundoCaixa, setFundoCaixa] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [mensagem, setMensagem] = useState("");

  const [metaDiaria, setMetaDiaria] = useState("");
  const [metaMensal, setMetaMensal] = useState("");

  const [authPronto, setAuthPronto] = useState(false);
  const [logado, setLogado] = useState(false);
  const [loginForm, setLoginForm] = useState({ usuario: "", senha: "" });
  const [erroLogin, setErroLogin] = useState("");

  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
  const [usuarioFirebase, setUsuarioFirebase] = useState<User | null>(null);
  const [usuarioLogado, setUsuarioLogado] = useState<UsuarioSistema | null>(null);

  const [credenciaisForm, setCredenciaisForm] = useState({
    usuarioAtual: "",
    senhaAtual: "",
    novoUsuario: "",
    novoNome: "",
    novaSenha: "",
    confirmarSenha: "",
  });
  const [erroCredenciais, setErroCredenciais] = useState("");

  const [editandoVendaId, setEditandoVendaId] = useState<string | null>(null);
  const [fechamentoObservacao, setFechamentoObservacao] = useState("");

  const [vendaForm, setVendaForm] = useState({
    data: hoje(),
    infinity: "",
    banese: "",
    sumup: "",
    dinheiro: "",
    outros: "",
    despesaRapida: "",
    motivoDespesa: "",
    observacao: "",
  });

  const [fluxoForm, setFluxoForm] = useState({
    descricao: "",
    valor: "",
    vencimento: hoje(),
    formaPagamento: "Dinheiro" as FormaPagamento,
    gerarSangriaAutomatica: true,
    categoria: "Operacional",
    tipo: "Financeiro" as TipoDespesa,
  });

  async function detectarColecaoUsuarios() {
  return "usuarios" as const;
}

  async function carregarUsuariosFirebase() {
    const nomeColecao = await detectarColecaoUsuarios();
    const snap = await getDocs(collection(db, nomeColecao));

    const lista: UsuarioSistema[] = snap.docs.map((item) => {
      const data = item.data() as Partial<UsuarioSistema> & {
        usuario?: string;
        email?: string;
        nome?: string;
        tipo?: string;
        ativo?: boolean;
        uid?: string;
      };

      return {
        id: item.id,
        uid: data.uid || item.id,
        usuario: data.usuario || emailParaUsuario(data.email || ""),
        email: data.email || loginParaEmail(data.usuario || item.id),
        nome: data.nome || data.usuario || emailParaUsuario(data.email || ""),
        tipo: data.tipo || "caixa",
        ativo: data.ativo !== false,
      };
    });

    setUsuarios(lista);
    return { nomeColecao, lista };
  }

  async function carregarOuCriarPerfilUsuario(user: User) {
    const { nomeColecao, lista } = await carregarUsuariosFirebase();
    const usuarioPorEmail = emailParaUsuario(user.email || "");

    let perfil =
      lista.find((item) => item.uid === user.uid) ||
      lista.find((item) => item.email === (user.email || "")) ||
      lista.find((item) => item.usuario === usuarioPorEmail);

    if (!perfil) {
  perfil = {
    id: user.uid,
    uid: user.uid,
    usuario: usuarioPorEmail || user.uid,
    email: user.email || loginParaEmail(user.uid),
    nome: user.displayName || usuarioPorEmail || "Usuário",
    tipo: lista.length === 0 ? "admin" : "caixa",
    ativo: true,
  };
}

    const perfilNormalizado: UsuarioSistema = {
      ...perfil,
      id: user.uid,
      uid: user.uid,
      usuario: perfil.usuario || usuarioPorEmail || user.uid,
      email: user.email || perfil.email || loginParaEmail(perfil.usuario || user.uid),
      nome: perfil.nome || perfil.usuario || usuarioPorEmail || "Usuário",
      tipo: perfil.tipo || "caixa",
      ativo: perfil.ativo !== false,
    };

    await setDoc(doc(db, nomeColecao, user.uid), perfilNormalizado, { merge: true });
    setUsuarioLogado(perfilNormalizado);
    setUsuarios((prev) => {
      const semAtual = prev.filter((item) => item.uid !== user.uid);
      return [...semAtual, perfilNormalizado];
    });

    return perfilNormalizado;
  }

  async function carregarDadosSistema() {
    const ref = doc(db, "gestao", "cidade-mae");
    const snap = await getDoc(ref);

    if (snap.exists()) {
      const dados = snap.data();
      setVendas(dados.vendas || []);
      setSangrias(dados.sangrias || []);
      setContasFluxo(dados.contasFluxo || []);
      setFechamentos(dados.fechamentos || []);
      setMetaDiaria(dados.metaDiaria || "");
      setMetaMensal(dados.metaMensal || "");
      setFundoCaixa(dados.fundoCaixa || "");
      return;
    }

    const data = localStorage.getItem(STORAGE);
    if (data) {
      const parsed = JSON.parse(data);
      setVendas(parsed.vendas || []);
      setSangrias(parsed.sangrias || []);
      setContasFluxo(parsed.contasFluxo || []);
      setFechamentos(parsed.fechamentos || []);
    }

    const metaDiariaSalva = localStorage.getItem(META_DIARIA_STORAGE);
    if (metaDiariaSalva) setMetaDiaria(metaDiariaSalva);

    const metaMensalSalva = localStorage.getItem(META_MENSAL_STORAGE);
    if (metaMensalSalva) setMetaMensal(metaMensalSalva);

    const fundoCaixaSalvo = localStorage.getItem(FUNDO_CAIXA_STORAGE);
    if (fundoCaixaSalvo) setFundoCaixa(fundoCaixaSalvo);
  }

  function limparFormularioVenda() {
    setVendaForm({
      data: hoje(),
      infinity: "",
      banese: "",
      sumup: "",
      dinheiro: "",
      outros: "",
      despesaRapida: "",
      motivoDespesa: "",
      observacao: "",
    });
    setEditandoVendaId(null);
  }

  function dentroPeriodo(data: string) {
    const h = new Date();
    const d = new Date(`${data}T00:00:00`);
    if (periodo === "dia") return data === hoje();
    if (periodo === "semana") {
      const inicio = new Date(h);
      inicio.setHours(0, 0, 0, 0);
      inicio.setDate(h.getDate() - h.getDay());
      const fim = new Date(inicio);
      fim.setDate(inicio.getDate() + 6);
      fim.setHours(23, 59, 59, 999);
      return d >= inicio && d <= fim;
    }
    return d.getMonth() === h.getMonth() && d.getFullYear() === h.getFullYear();
  }

  const vendasPeriodo = useMemo(() => vendas.filter((v) => dentroPeriodo(v.data)), [vendas, periodo]);
  const sangriasPeriodo = useMemo(() => sangrias.filter((s) => dentroPeriodo(s.data)), [sangrias, periodo]);
  const contasPeriodo = useMemo(
    () => contasFluxo.filter((c) => dentroPeriodo(c.vencimento) || (c.dataPagamento && dentroPeriodo(c.dataPagamento))),
    [contasFluxo, periodo]
  );

  const totalVendas = useMemo(
    () => vendasPeriodo.reduce((acc, v) => acc + v.infinity + v.banese + v.sumup + v.dinheiro + v.outros, 0),
    [vendasPeriodo]
  );
  const totalInfinity = useMemo(() => vendasPeriodo.reduce((acc, v) => acc + v.infinity, 0), [vendasPeriodo]);
  const totalBanese = useMemo(() => vendasPeriodo.reduce((acc, v) => acc + v.banese, 0), [vendasPeriodo]);
  const totalSumup = useMemo(() => vendasPeriodo.reduce((acc, v) => acc + v.sumup, 0), [vendasPeriodo]);
  const dinheiro = useMemo(() => vendasPeriodo.reduce((acc, v) => acc + v.dinheiro, 0), [vendasPeriodo]);
  const totalOutros = useMemo(() => vendasPeriodo.reduce((acc, v) => acc + v.outros, 0), [vendasPeriodo]);
  const totalCartoes = totalInfinity + totalBanese + totalSumup;

  const metaNumero = Number(metaDiaria) || 0;
  const faltaMeta = Math.max(metaNumero - totalVendas, 0);
  const percentualMeta = metaNumero > 0 ? Math.min((totalVendas / metaNumero) * 100, 100) : 0;

  const vendasMesAtual = useMemo(() => {
    const agora = new Date();
    return vendas.filter((v) => {
      const d = new Date(`${v.data}T00:00:00`);
      return d.getMonth() === agora.getMonth() && d.getFullYear() === agora.getFullYear();
    });
  }, [vendas]);

  const totalVendasMes = useMemo(
    () => vendasMesAtual.reduce((acc, v) => acc + v.infinity + v.banese + v.sumup + v.dinheiro + v.outros, 0),
    [vendasMesAtual]
  );
  const metaMensalNumero = Number(metaMensal) || 0;
  const faltaMetaMensal = Math.max(metaMensalNumero - totalVendasMes, 0);
  const percentualMetaMensal = metaMensalNumero > 0 ? Math.min((totalVendasMes / metaMensalNumero) * 100, 100) : 0;

  const totalSangria = useMemo(() => sangriasPeriodo.reduce((acc, s) => acc + s.valor, 0), [sangriasPeriodo]);
  const fundoCaixaNumero = Number(fundoCaixa) || 0;
  const caixaEsperado = fundoCaixaNumero + dinheiro - totalSangria;
  const diferenca = (Number(caixaReal) || 0) - caixaEsperado;

  const contasPagasPeriodo = useMemo(() => contasPeriodo.filter((c) => c.status === "Pago"), [contasPeriodo]);
  const contasPagasFinanceiras = useMemo(() => contasPagasPeriodo.filter((c) => c.tipo === "Financeiro"), [contasPagasPeriodo]);

  const totalContasPendentes = useMemo(
    () => contasPeriodo.filter((c) => c.status === "Pendente").reduce((acc, c) => acc + c.valor, 0),
    [contasPeriodo]
  );
  const totalDespesasFinanceiras = useMemo(
    () => contasPagasFinanceiras.reduce((acc, c) => acc + c.valor, 0),
    [contasPagasFinanceiras]
  );
  const totalDespesasCaixa = totalSangria;

  const despesasPorCategoria = useMemo(() => {
    const mapa: Record<string, number> = {};
    contasPagasFinanceiras.forEach((c) => {
      mapa[c.categoria] = (mapa[c.categoria] || 0) + c.valor;
    });
    return Object.entries(mapa).sort((a, b) => b[1] - a[1]);
  }, [contasPagasFinanceiras]);

  const lucro = totalVendas - totalDespesasFinanceiras;
  const alertaGastoAlto = totalDespesasFinanceiras > totalVendas * 0.8 && totalVendas > 0;
  const alertaLucroBaixo = lucro > 0 && lucro < totalVendas * 0.2;
  const principalCategoria = despesasPorCategoria.length > 0 ? despesasPorCategoria[0] : null;
  const alertaCategoriaPesada =
    principalCategoria ? principalCategoria[1] > totalDespesasFinanceiras * 0.4 && totalDespesasFinanceiras > 0 : false;
  const graficoCategorias = useMemo(
    () => despesasPorCategoria.slice(0, 5).map(([label, valor]) => ({ label, valor })),
    [despesasPorCategoria]
  );

  const graficoVendas = useMemo(() => {
    const mapa: Record<string, number> = {};
    vendasPeriodo.forEach((v) => {
      mapa[v.data] = (mapa[v.data] || 0) + v.infinity + v.banese + v.sumup + v.dinheiro + v.outros;
    });
    return Object.entries(mapa)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-7)
      .map(([label, valor]) => ({ label, valor }));
  }, [vendasPeriodo]);

  const alertaMetaBaixa = metaNumero > 0 && totalVendas < metaNumero && periodo === "dia";
  const alertaMetaMensalBaixa = metaMensalNumero > 0 && totalVendasMes < metaMensalNumero;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthPronto(false);
      setLoaded(false);

      if (!user) {
        setLogado(false);
        setUsuarioFirebase(null);
        setUsuarioLogado(null);
        setAuthPronto(true);
        return;
      }

      try {
        setUsuarioFirebase(user);
        const perfil = await carregarOuCriarPerfilUsuario(user);

        if (!perfil.ativo) {
          await signOut(auth);
          setErroLogin("Usuário inativo.");
          setAuthPronto(true);
          return;
        }

        await carregarDadosSistema();
        setLogado(true);
      } catch (error) {
        console.error("Erro ao carregar sessão autenticada:", error);
        setErroLogin("Erro ao carregar seus dados. Tente novamente.");
      } finally {
        setLoaded(true);
        setAuthPronto(true);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!loaded || !usuarioFirebase) return;

    async function salvar() {
      try {
        const ref = doc(db, "gestao", "cidade-mae");
        await setDoc(ref, {
          vendas,
          sangrias,
          contasFluxo,
          fechamentos,
          metaDiaria,
          metaMensal,
          fundoCaixa,
        });
      } catch (error) {
        console.error("Erro ao salvar no Firebase:", error);
      }
    }

    salvar();

    localStorage.setItem(STORAGE, JSON.stringify({ vendas, sangrias, contasFluxo, fechamentos }));
    localStorage.setItem(META_DIARIA_STORAGE, metaDiaria);
    localStorage.setItem(META_MENSAL_STORAGE, metaMensal);
    localStorage.setItem(FUNDO_CAIXA_STORAGE, fundoCaixa);
  }, [vendas, sangrias, contasFluxo, fechamentos, metaDiaria, metaMensal, fundoCaixa, loaded, usuarioFirebase]);

  useEffect(() => {
    if (!mensagem) return;
    const timer = window.setTimeout(() => setMensagem(""), 3000);
    return () => window.clearTimeout(timer);
  }, [mensagem]);

  async function entrar() {
  setErroLogin("");

  const loginDigitado = normalizarLogin(loginForm.usuario);
  const senhaDigitada = loginForm.senha;

  if (!loginDigitado || !senhaDigitada) {
    setErroLogin("Informe e-mail/usuário e senha.");
    return;
  }

  const tentativas = loginPodeSerEmail(loginDigitado)
    ? [loginDigitado]
    : [loginParaEmail(loginDigitado)];

  let ultimoErro: any = null;

  for (const emailTentativa of tentativas) {
    try {
      await signInWithEmailAndPassword(auth, emailTentativa, senhaDigitada);
      setLoginForm({ usuario: "", senha: "" });
      return;
    } catch (error: any) {
      ultimoErro = error;
    }
  }

  console.error("Erro ao fazer login:", ultimoErro);

  if (
    ultimoErro?.code === "auth/invalid-credential" ||
    ultimoErro?.code === "auth/wrong-password" ||
    ultimoErro?.code === "auth/user-not-found" ||
    ultimoErro?.code === "auth/invalid-email"
  ) {
    setErroLogin("E-mail/usuário ou senha inválidos.");
    return;
  }

  if (ultimoErro?.code === "auth/too-many-requests") {
    setErroLogin("Muitas tentativas. Aguarde alguns minutos e tente novamente.");
    return;
  }

  if (ultimoErro?.code === "auth/network-request-failed") {
    setErroLogin("Falha de rede. Verifique a internet.");
    return;
  }

  if (ultimoErro?.code === "auth/operation-not-allowed") {
    setErroLogin("Login por e-mail/senha não está habilitado no Firebase.");
    return;
  }

  if (ultimoErro?.code === "auth/unauthorized-domain") {
    setErroLogin("Domínio não autorizado no Firebase Authentication.");
    return;
  }

  setErroLogin(`Erro: ${ultimoErro?.code || "desconhecido"}`);
}

  async function sair() {
    await signOut(auth);
    setMensagem("Sessão encerrada.");
  }

  async function salvarCredenciais() {
    setErroCredenciais("");

    if (!usuarioFirebase || !usuarioLogado) {
      setErroCredenciais("Sessão inválida. Entre novamente.");
      return;
    }

    if (usuarioLogado.tipo !== "admin") {
      setErroCredenciais("Somente usuário admin pode criar novos acessos.");
      return;
    }

    const usuarioAtualInformado = normalizarLogin(credenciaisForm.usuarioAtual);
    const usuarioAtualValido =
      usuarioAtualInformado === normalizarLogin(usuarioLogado.usuario) ||
      usuarioAtualInformado === normalizarLogin(usuarioLogado.email) ||
      usuarioAtualInformado === normalizarLogin(emailParaUsuario(usuarioLogado.email));

    if (!usuarioAtualValido) {
      setErroCredenciais("Usuário atual incorreto.");
      return;
    }

    if (!credenciaisForm.senhaAtual) {
      setErroCredenciais("Informe a senha atual para confirmar.");
      return;
    }

    if (!credenciaisForm.novoUsuario || !credenciaisForm.novaSenha) {
      setErroCredenciais("Preencha o novo usuário e a nova senha.");
      return;
    }

    if (credenciaisForm.novaSenha !== credenciaisForm.confirmarSenha) {
      setErroCredenciais("A confirmação da nova senha não confere.");
      return;
    }

    try {
      const credencialAtual = EmailAuthProvider.credential(
        usuarioFirebase.email || loginParaEmail(usuarioLogado.usuario),
        credenciaisForm.senhaAtual
      );

      await reauthenticateWithCredential(usuarioFirebase, credencialAtual);

      const novoLogin = credenciaisForm.novoUsuario.trim().toLowerCase();
      const novoEmail = loginParaEmail(novoLogin);
      const novoNome = credenciaisForm.novoNome.trim() || credenciaisForm.novoUsuario.trim();

      const existe = usuarios.some(
        (u) => u.usuario.toLowerCase() === novoLogin || u.email.toLowerCase() === novoEmail
      );
      if (existe) {
        setErroCredenciais("Esse usuário já existe.");
        return;
      }

      const novoUserCredential = await createUserWithEmailAndPassword(secondaryAuth, novoEmail, credenciaisForm.novaSenha);
      const nomeColecao = await detectarColecaoUsuarios();

      const novoPerfil: UsuarioSistema = {
        id: novoUserCredential.user.uid,
        uid: novoUserCredential.user.uid,
        usuario: novoLogin,
        email: novoEmail,
        nome: novoNome,
        tipo: "caixa",
        ativo: true,
      };

      await setDoc(doc(db, nomeColecao, novoUserCredential.user.uid), novoPerfil, { merge: true });
      await signOut(secondaryAuth);

      setUsuarios((prev) => [...prev.filter((item) => item.uid !== novoPerfil.uid), novoPerfil]);
      setCredenciaisForm({
        usuarioAtual: "",
        senhaAtual: "",
        novoUsuario: "",
        novoNome: "",
        novaSenha: "",
        confirmarSenha: "",
      });
      setMensagem("Novo usuário criado com sucesso.");
    } catch (error: any) {
      console.error("Erro ao salvar usuário:", error);

      if (error?.code === "auth/email-already-in-use") {
        setErroCredenciais("Esse usuário já existe.");
      } else if (error?.code === "auth/weak-password") {
        setErroCredenciais("A nova senha precisa ter pelo menos 6 caracteres.");
      } else if (error?.code === "auth/invalid-credential" || error?.code === "auth/wrong-password") {
        setErroCredenciais("Senha atual incorreta.");
      } else {
        setErroCredenciais("Erro ao salvar usuário no banco.");
      }
    }
  }

  function salvarVenda() {
    const vendaId = uid();

    const novaVenda: Venda = {
      id: vendaId,
      data: vendaForm.data,
      infinity: Number(vendaForm.infinity) || 0,
      banese: Number(vendaForm.banese) || 0,
      sumup: Number(vendaForm.sumup) || 0,
      dinheiro: Number(vendaForm.dinheiro) || 0,
      outros: Number(vendaForm.outros) || 0,
      despesaRapida: Number(vendaForm.despesaRapida) || 0,
      motivoDespesa: vendaForm.motivoDespesa || "",
      observacao: vendaForm.observacao || "",
    };

    setVendas((prev) => [novaVenda, ...prev]);

    if ((Number(vendaForm.despesaRapida) || 0) > 0) {
      const novaSangria: Sangria = {
        id: uid(),
        data: vendaForm.data,
        categoria: "Despesa rápida",
        descricao: vendaForm.motivoDespesa
          ? `Despesa rápida: ${vendaForm.motivoDespesa}`
          : "Despesa rápida",
        valor: Number(vendaForm.despesaRapida) || 0,
        origemVendaId: vendaId,
      };

      setSangrias((prev) => [novaSangria, ...prev]);
    }

    setMensagem("Venda lançada com sucesso.");
    limparFormularioVenda();
  }

  function iniciarEdicaoVenda(venda: Venda) {
    setEditandoVendaId(venda.id);
    setVendaForm({
      data: venda.data,
      infinity: venda.infinity ? String(venda.infinity) : "",
      banese: venda.banese ? String(venda.banese) : "",
      sumup: venda.sumup ? String(venda.sumup) : "",
      dinheiro: venda.dinheiro ? String(venda.dinheiro) : "",
      outros: venda.outros ? String(venda.outros) : "",
      despesaRapida: venda.despesaRapida ? String(venda.despesaRapida) : "",
      motivoDespesa: venda.motivoDespesa || "",
      observacao: venda.observacao || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function atualizarVenda() {
    if (!editandoVendaId) return;

    setSangrias((prev) => prev.filter((s) => s.origemVendaId !== editandoVendaId));

    const novaDespesaRapida = Number(vendaForm.despesaRapida) || 0;
    const novoMotivo = vendaForm.motivoDespesa || "";

    if (novaDespesaRapida > 0) {
      const novaSangria: Sangria = {
        id: uid(),
        data: vendaForm.data,
        categoria: "Despesa rápida",
        descricao: novoMotivo ? `Despesa rápida: ${novoMotivo}` : "Despesa rápida",
        valor: novaDespesaRapida,
        origemVendaId: editandoVendaId,
      };

      setSangrias((prev) => [novaSangria, ...prev]);
    }

    setVendas((prev) =>
      prev.map((item) =>
        item.id === editandoVendaId
          ? {
              ...item,
              data: vendaForm.data,
              infinity: Number(vendaForm.infinity) || 0,
              banese: Number(vendaForm.banese) || 0,
              sumup: Number(vendaForm.sumup) || 0,
              dinheiro: Number(vendaForm.dinheiro) || 0,
              outros: Number(vendaForm.outros) || 0,
              despesaRapida: novaDespesaRapida,
              motivoDespesa: novoMotivo,
              observacao: vendaForm.observacao || "",
            }
          : item
      )
    );

    setMensagem("Venda atualizada com sucesso.");
    limparFormularioVenda();
  }

  function removerVenda(id: string) {
    setVendas((prev) => prev.filter((item) => item.id !== id));
    setSangrias((prev) => prev.filter((item) => item.origemVendaId !== id));
    if (editandoVendaId === id) limparFormularioVenda();
    setMensagem("Venda removida.");
  }

  function salvarContaFluxo() {
    if (!fluxoForm.descricao || !fluxoForm.valor) return;
    const conta: ContaFluxo = {
      id: uid(),
      descricao: fluxoForm.descricao,
      valor: Number(fluxoForm.valor) || 0,
      vencimento: fluxoForm.vencimento,
      status: "Pendente",
      formaPagamento: fluxoForm.formaPagamento,
      dataPagamento: "",
      gerarSangriaAutomatica: fluxoForm.gerarSangriaAutomatica,
      categoria: fluxoForm.categoria,
      tipo: fluxoForm.tipo,
    };
    setContasFluxo((prev) => [conta, ...prev]);
    setMensagem(conta.tipo === "Caixa" ? "Despesa rápida lançada." : "Conta financeira lançada.");
    setFluxoForm({
      descricao: "",
      valor: "",
      vencimento: hoje(),
      formaPagamento: "Dinheiro",
      gerarSangriaAutomatica: true,
      categoria: "Operacional",
      tipo: "Financeiro",
    });
  }

  function marcarContaPaga(id: string) {
    const conta = contasFluxo.find((item) => item.id === id);
    if (!conta || conta.status === "Pago") return;
    const dataPagamento = hoje();
    setContasFluxo((prev) => prev.map((item) => (item.id === id ? { ...item, status: "Pago", dataPagamento } : item)));
    if (conta.tipo === "Caixa" && conta.formaPagamento === "Dinheiro" && conta.gerarSangriaAutomatica) {
      const novaSangria: Sangria = {
        id: uid(),
        data: dataPagamento,
        categoria: conta.categoria || "Despesa rápida",
        descricao: `Despesa rápida: ${conta.descricao}`,
        valor: conta.valor,
      };
      setSangrias((prev) => [novaSangria, ...prev]);
      setMensagem("Despesa rápida paga e sangria automática gerada.");
    } else {
      setMensagem("Conta marcada como paga.");
    }
  }

  function removerConta(id: string) {
    setContasFluxo((prev) => prev.filter((item) => item.id !== id));
    setMensagem("Conta removida.");
  }

  function fecharCaixaDia() {
    if (!caixaReal) return setMensagem("Informe o caixa real antes de fechar o dia.");
    const jaExiste = fechamentos.some((f) => f.data === hoje());
    if (jaExiste) return setMensagem("Já existe fechamento salvo para hoje. Remova o anterior se quiser refazer.");
    const novoFechamento: FechamentoDiario = {
      id: uid(),
      data: hoje(),
      fundoCaixa: fundoCaixaNumero,
      vendasDinheiro: dinheiro,
      vendasCartao: totalCartoes,
      vendasOutras: totalOutros,
      totalVendas,
      sangrias: totalSangria,
      caixaEsperado,
      caixaReal: Number(caixaReal) || 0,
      diferenca,
      observacao: fechamentoObservacao,
      criadoEm: new Date().toISOString(),
    };
    setFechamentos((prev) => [novoFechamento, ...prev]);
    setFechamentoObservacao("");
    setMensagem("Fechamento do dia salvo com sucesso.");
  }

  function removerFechamento(id: string) {
    setFechamentos((prev) => prev.filter((item) => item.id !== id));
    setMensagem("Fechamento removido.");
  }

  function exportarBackup() {
    const dados = { vendas, sangrias, contasFluxo, fechamentos, fundoCaixa };
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gestao-cidade-mae-backup-${hoje()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function importarBackup(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const dados = JSON.parse(String(e.target?.result || "{}"));
        setVendas(dados.vendas || []);
        setSangrias(dados.sangrias || []);
        setContasFluxo(dados.contasFluxo || []);
        setFechamentos(dados.fechamentos || []);
        setFundoCaixa(dados.fundoCaixa || "");
        setMensagem("Backup importado com sucesso.");
      } catch {
        setMensagem("Erro ao importar backup.");
      }
    };
    reader.readAsText(file);
  }

  if (!authPronto) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 md:p-8">
        <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-5 text-sm text-slate-600 shadow-sm">
          Carregando acesso seguro...
        </div>
      </div>
    );
  }

  if (!logado) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 md:p-8">
        <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Gestão Cidade Mãe</h1>
            <p className="mt-2 text-sm text-slate-600">Entre para acessar o sistema com login seguro.</p>
          </div>
          <div className="space-y-4">
            <Campo label="E-mail ou usuário">
              <Input
                type="text"
                value={loginForm.usuario}
                onChange={(e) => setLoginForm({ ...loginForm, usuario: e.target.value.toLowerCase() })}
                placeholder="Ex.: admin@cidademae.com"
              />
            </Campo>
            <Campo label="Senha">
              <Input
                type="password"
                value={loginForm.senha}
                onChange={(e) => setLoginForm({ ...loginForm, senha: e.target.value })}
              />
            </Campo>
            {erroLogin ? <div className="text-sm text-red-600">{erroLogin}</div> : null}
            <div className="text-xs text-slate-500">Entre com o e-mail cadastrado no Firebase Authentication. Para usuarios criados dentro do sistema, use o login curto.</div>
            <div className="pt-2">
              <Botao onClick={entrar}>Entrar</Botao>
            </div>
          </div>
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
            Login protegido por Firebase Authentication.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-[1700px] px-4 py-4 md:px-6 md:py-6 xl:px-8 xl:py-8">
        <div className="space-y-6">
          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm xl:p-7">
            <div className="flex flex-col gap-5 2xl:flex-row 2xl:items-center 2xl:justify-between">
              <div className="max-w-4xl">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-4xl xl:text-5xl">Gestão Cidade Mãe</h1>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">versão final</span>
                </div>
                <p className="mt-3 max-w-3xl text-sm text-slate-600 md:text-base">
                  Caixa diário separado do financeiro mensal, com fechamento do dia, metas, histórico e automação de sangria.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {usuarioLogado ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Usuário: <strong className="text-slate-900">{usuarioLogado.nome}</strong>
                    <span className="ml-2 text-xs uppercase text-slate-500">{usuarioLogado.tipo}</span>
                  </div>
                ) : null}
                <Botao variante="secundario" onClick={exportarBackup}>Exportar backup</Botao>
                <label className="cursor-pointer rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                  Importar backup
                  <input type="file" accept=".json" onChange={importarBackup} className="hidden" />
                </label>
                <Botao variante="secundario" onClick={sair}>Sair</Botao>
              </div>
            </div>
          </div>

          {mensagem ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{mensagem}</div> : null}

          {alertaGastoAlto || alertaLucroBaixo || alertaCategoriaPesada || alertaMetaBaixa || alertaMetaMensalBaixa ? (
            <div className="space-y-2">
              {alertaGastoAlto ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  Atenção: suas despesas financeiras pagas estão acima de 80% das vendas no período.
                </div>
              ) : null}
              {alertaLucroBaixo ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Alerta: seu lucro está abaixo de 20% das vendas no período.
                </div>
              ) : null}
              {alertaCategoriaPesada && principalCategoria ? (
                <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
                  Cuidado: a categoria <strong>{principalCategoria[0]}</strong> representa a maior parte dos gastos financeiros pagos no período.
                </div>
              ) : null}
              {alertaMetaBaixa ? (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                  Meta diária ainda não foi batida. Faltam <strong>{moeda(faltaMeta)}</strong> para alcançar sua meta.
                </div>
              ) : null}
              {alertaMetaMensalBaixa ? (
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-800">
                  Meta mensal em andamento. Faltam <strong>{moeda(faltaMetaMensal)}</strong> para alcançar sua meta do mês.
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-3">
              {(["dia", "semana", "mes"] as const).map((item) => (
                <button
                  key={item}
                  onClick={() => setPeriodo(item)}
                  className={`rounded-2xl px-5 py-3 text-sm font-medium capitalize transition ${
                    periodo === item ? "bg-slate-900 text-white" : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
              Período selecionado: <strong className="text-slate-800">{periodo}</strong>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5 2xl:grid-cols-10">
            <Bloco titulo="Vendas" valor={moeda(totalVendas)} subtitulo="Total do período" />
            <Bloco titulo="Infinity" valor={moeda(totalInfinity)} />
            <Bloco titulo="Banese" valor={moeda(totalBanese)} />
            <Bloco titulo="SumUp" valor={moeda(totalSumup)} />
            <Bloco titulo="Dinheiro" valor={moeda(dinheiro)} />
            <Bloco titulo="Outros" valor={moeda(totalOutros)} />
            <Bloco titulo="Desp. rápidas" valor={moeda(totalDespesasCaixa)} subtitulo="Mexem no caixa" />
            <Bloco titulo="Desp. financeiras" valor={moeda(totalDespesasFinanceiras)} subtitulo="Fluxo mensal" />
            <Bloco titulo="Fundo de caixa" valor={moeda(fundoCaixaNumero)} />
            <Bloco titulo="Total" valor={moeda(lucro)} destaque />
          </div>

          <div className="grid gap-5 2xl:grid-cols-[1.15fr_1.15fr_0.7fr_0.8fr]">
            
            <Card titulo={editandoVendaId ? "Editar caixa do dia" : "Lançar Caixa do Dia"}>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                    <Campo label="Data">
                      <Input type="date" value={vendaForm.data} onChange={(e) => setVendaForm({ ...vendaForm, data: e.target.value })} />
                    </Campo>
                    <Campo label="Infinity">
                      <Input type="number" value={vendaForm.infinity} onChange={(e) => setVendaForm({ ...vendaForm, infinity: e.target.value })} />
                    </Campo>
                    <Campo label="Banese">
                      <Input type="number" value={vendaForm.banese} onChange={(e) => setVendaForm({ ...vendaForm, banese: e.target.value })} />
                    </Campo>
                    <Campo label="SumUp">
                      <Input type="number" value={vendaForm.sumup} onChange={(e) => setVendaForm({ ...vendaForm, sumup: e.target.value })} />
                    </Campo>
                    <Campo label="Dinheiro">
                      <Input type="number" value={vendaForm.dinheiro} onChange={(e) => setVendaForm({ ...vendaForm, dinheiro: e.target.value })} />
                    </Campo>
                    <Campo label="Outros">
                      <Input type="number" value={vendaForm.outros} onChange={(e) => setVendaForm({ ...vendaForm, outros: e.target.value })} />
                    </Campo>
                    <Campo label="Despesa rápida">
                      <Input
                        type="number"
                        value={vendaForm.despesaRapida}
                        onChange={(e) => setVendaForm({ ...vendaForm, despesaRapida: e.target.value })}
                        placeholder="Ex.: 20"
                      />
                    </Campo>
                    <Campo label="Motivo da despesa">
                      <Input
                        type="text"
                        value={vendaForm.motivoDespesa}
                        onChange={(e) => setVendaForm({ ...vendaForm, motivoDespesa: e.target.value })}
                        placeholder="Ex.: água, almoço, uber"
                      />
                    </Campo>
                    <div className="md:col-span-2 xl:col-span-2">
                      <Campo label="Observação">
                        <Input
                          type="text"
                          value={vendaForm.observacao}
                          onChange={(e) => setVendaForm({ ...vendaForm, observacao: e.target.value })}
                          placeholder="Ex.: movimento forte no fim da tarde"
                        />
                      </Campo>
                    </div>
                    <div className="flex flex-wrap items-end gap-2">
                      {editandoVendaId ? (
                        <>
                          <Botao onClick={atualizarVenda}>Atualizar caixa do dia</Botao>
                          <Botao variante="secundario" onClick={limparFormularioVenda}>Cancelar</Botao>
                        </>
                      ) : (
                        <Botao onClick={salvarVenda}>Salvar caixa do dia</Botao>
                      )}
                    </div>
                  </div>
                </Card>

            <Card titulo="Meta diária">
              <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-4">
                  <Campo label="Valor da meta diária">
                    <Input type="number" value={metaDiaria} onChange={(e) => setMetaDiaria(e.target.value)} placeholder="Ex.: 1000" />
                  </Campo>
                  <div>
                    <div className="mb-2 text-sm text-slate-600">Progresso da meta</div>
                    <div className="h-4 w-full rounded-full bg-slate-100">
                      <div className="h-4 rounded-full bg-emerald-600 transition-all" style={{ width: `${percentualMeta}%` }} />
                    </div>
                    <div className="mt-2 text-sm font-medium text-slate-700">{percentualMeta.toFixed(0)}%</div>
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="text-sm text-slate-500">Falta para meta</div>
                  <div className="mt-2 text-2xl font-bold text-slate-900">{moeda(faltaMeta)}</div>
                </div>
              </div>
            </Card>

            <Card titulo="Meta mensal">
              <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-4">
                  <Campo label="Valor da meta mensal">
                    <Input type="number" value={metaMensal} onChange={(e) => setMetaMensal(e.target.value)} placeholder="Ex.: 30000" />
                  </Campo>
                  <div>
                    <div className="mb-2 text-sm text-slate-600">Progresso da meta mensal</div>
                    <div className="h-4 w-full rounded-full bg-slate-100">
                      <div className="h-4 rounded-full bg-indigo-600 transition-all" style={{ width: `${percentualMetaMensal}%` }} />
                    </div>
                    <div className="mt-2 text-sm font-medium text-slate-700">{percentualMetaMensal.toFixed(0)}%</div>
                    <div className="mt-1 text-xs text-slate-500">Vendas do mês atual: {moeda(totalVendasMes)}</div>
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="text-sm text-slate-500">Falta para meta do mês</div>
                  <div className="mt-2 text-2xl font-bold text-slate-900">{moeda(faltaMetaMensal)}</div>
                </div>
              </div>
            </Card>

            <Card titulo="Fundo de caixa">
              <div className="space-y-4">
                <Campo label="Valor inicial no caixa">
                  <Input type="number" value={fundoCaixa} onChange={(e) => setFundoCaixa(e.target.value)} placeholder="Ex.: 200" />
                </Campo>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm text-slate-500">Fundo atual</div>
                  <div className="mt-1 text-2xl font-bold text-slate-900">{moeda(fundoCaixaNumero)}</div>
                </div>
              </div>
            </Card>

            <Card titulo="Caixa rápido">
              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm text-slate-500">Sangria do período</div>
                  <div className="mt-1 text-2xl font-bold text-slate-900">{moeda(totalSangria)}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm text-slate-500">Caixa esperado</div>
                  <div className="mt-1 text-2xl font-bold text-slate-900">{moeda(caixaEsperado)}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-sm text-slate-500">Contas pendentes</div>
                  <div className="mt-1 text-2xl font-bold text-slate-900">{moeda(totalContasPendentes)}</div>
                </div>
              </div>
            </Card>
          </div>

          <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <button
              onClick={() => setAba("dashboard")}
              className={`rounded-xl px-4 py-3 text-sm font-medium transition ${aba === "dashboard" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setAba("fluxo")}
              className={`rounded-xl px-4 py-3 text-sm font-medium transition ${aba === "fluxo" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
            >
              Fluxo + automação
            </button>
            <button
              onClick={() => setAba("fechamentos")}
              className={`rounded-xl px-4 py-3 text-sm font-medium transition ${aba === "fechamentos" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
            >
              Fechamentos
            </button>
          </div>

          {aba === "dashboard" ? (
            <div className="space-y-6">
              <div className="grid gap-5 2xl:grid-cols-2">
                <GraficoBarras titulo="Top despesas financeiras por categoria" dados={graficoCategorias} />
                <GraficoBarras titulo="Vendas por dia" dados={graficoVendas} />
              </div>

              <div className="grid gap-5 2xl:grid-cols-[1.35fr_0.65fr]">
                

                <Card titulo="Conferência de caixa">
                  <div className="space-y-4">
                    <Input type="number" placeholder="Digite quanto tem fisicamente no caixa" value={caixaReal} onChange={(e) => setCaixaReal(e.target.value)} />
                    <Textarea
                      rows={3}
                      placeholder="Observação do fechamento do dia"
                      value={fechamentoObservacao}
                      onChange={(e) => setFechamentoObservacao(e.target.value)}
                    />
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-sm text-slate-500">Diferença</div>
                      <div className={`mt-1 text-3xl font-bold ${diferenca === 0 ? "text-emerald-600" : diferenca > 0 ? "text-blue-600" : "text-red-600"}`}>
                        {moeda(diferenca)}
                      </div>
                    </div>
                    <div className="text-sm text-slate-600">
                      {diferenca === 0 && "Caixa batendo certinho."}
                      {diferenca > 0 && "Tem dinheiro sobrando no caixa."}
                      {diferenca < 0 && "Está faltando dinheiro no caixa."}
                    </div>
                    <Botao onClick={fecharCaixaDia}>Fechar caixa do dia</Botao>
                  </div>
                </Card>
              </div>

              <Card titulo="Histórico de vendas lançadas">
                <div className="space-y-3">
                  {vendas.length === 0 ? (
                    <p className="text-sm text-slate-500">Nenhuma venda lançada ainda.</p>
                  ) : (
                    vendas
                      .slice()
                      .sort((a, b) => b.data.localeCompare(a.data))
                      .map((item) => {
                        const total = item.infinity + item.banese + item.sumup + item.dinheiro + item.outros;
                        const despesaRapida = item.despesaRapida || 0;
                        const dinheiroLiquido = (item.dinheiro || 0) - despesaRapida;

                        return (
                          <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                              <div className="space-y-2 text-sm text-slate-700">
                                <div className="text-base font-semibold text-slate-900">Venda do dia {item.data}</div>
                                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                                  <div>Infinity: <strong>{moeda(item.infinity)}</strong></div>
                                  <div>Banese: <strong>{moeda(item.banese)}</strong></div>
                                  <div>SumUp: <strong>{moeda(item.sumup)}</strong></div>
                                  <div>Dinheiro: <strong>{moeda(item.dinheiro)}</strong></div>
                                  <div>Outros: <strong>{moeda(item.outros)}</strong></div>
                                  <div>Despesa rápida: <strong>{moeda(despesaRapida)}</strong></div>
                                  <div>Dinheiro líquido: <strong>{moeda(dinheiroLiquido)}</strong></div>
                                </div>
                                <div>Total: <strong>{moeda(total)}</strong></div>
                                {item.motivoDespesa ? (
                                  <div className="text-slate-500">Motivo da despesa: {item.motivoDespesa}</div>
                                ) : null}
                                {item.observacao ? <div className="text-slate-500">Obs.: {item.observacao}</div> : null}
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Botao variante="secundario" onClick={() => iniciarEdicaoVenda(item)}>Editar</Botao>
                                <Botao variante="perigo" onClick={() => removerVenda(item.id)}>Remover</Botao>
                              </div>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </Card>

              <Card titulo="Sangrias do período">
                <div className="space-y-3">
                  {sangriasPeriodo.length === 0 ? (
                    <p className="text-sm text-slate-500">Nenhuma sangria registrada.</p>
                  ) : (
                    sangriasPeriodo.map((s) => (
                      <div key={s.id} className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="font-medium text-slate-900">{s.descricao}</div>
                          <div className="mt-1 text-sm text-slate-500">{s.categoria} • {s.data}</div>
                        </div>
                        <div className="text-lg font-bold text-slate-900">{moeda(s.valor)}</div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          ) : aba === "fluxo" ? (
            <div className="space-y-6">
              <div className="grid gap-5 2xl:grid-cols-[1fr_1.3fr]">
                <Card titulo="Alterar login e senha">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Campo label="Usuário atual">
                      <Input type="text" value={credenciaisForm.usuarioAtual} onChange={(e) => setCredenciaisForm({ ...credenciaisForm, usuarioAtual: e.target.value })} />
                    </Campo>
                    <Campo label="Senha atual">
                      <Input type="password" value={credenciaisForm.senhaAtual} onChange={(e) => setCredenciaisForm({ ...credenciaisForm, senhaAtual: e.target.value })} />
                    </Campo>
                    <Campo label="Novo usuário">
                      <Input type="text" value={credenciaisForm.novoUsuario} onChange={(e) => setCredenciaisForm({ ...credenciaisForm, novoUsuario: e.target.value.toLowerCase() })} placeholder="Ex.: maria" />
                    </Campo>
                    <Campo label="Nome do usuário">
                      <Input type="text" value={credenciaisForm.novoNome} onChange={(e) => setCredenciaisForm({ ...credenciaisForm, novoNome: e.target.value })} placeholder="Ex.: Maria" />
                    </Campo>
                    <Campo label="Nova senha">
                      <Input type="password" value={credenciaisForm.novaSenha} onChange={(e) => setCredenciaisForm({ ...credenciaisForm, novaSenha: e.target.value })} />
                    </Campo>
                    <div className="md:col-span-2">
                      <Campo label="Confirmar nova senha">
                        <Input type="password" value={credenciaisForm.confirmarSenha} onChange={(e) => setCredenciaisForm({ ...credenciaisForm, confirmarSenha: e.target.value })} />
                      </Campo>
                    </div>
                  </div>
                  {erroCredenciais ? <div className="mt-3 text-sm text-red-600">{erroCredenciais}</div> : null}
                  <div className="mt-4">
                    <Botao onClick={salvarCredenciais}>Salvar novo login</Botao>
                  </div>
                </Card>

                <Card titulo="Lançar conta no fluxo">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <Campo label="Tipo da despesa">
                      <Select value={fluxoForm.tipo} onChange={(e) => setFluxoForm({ ...fluxoForm, tipo: e.target.value as TipoDespesa })}>
                        <option value="Caixa">Despesa rápida do dia (caixa)</option>
                        <option value="Financeiro">Despesa fixa/variável do negócio</option>
                      </Select>
                    </Campo>
                    <div className="md:col-span-2 xl:col-span-2">
                      <Campo label="Descrição">
                        <Input type="text" value={fluxoForm.descricao} onChange={(e) => setFluxoForm({ ...fluxoForm, descricao: e.target.value })} />
                      </Campo>
                    </div>
                    <Campo label="Valor">
                      <Input type="number" value={fluxoForm.valor} onChange={(e) => setFluxoForm({ ...fluxoForm, valor: e.target.value })} />
                    </Campo>
                    <Campo label="Vencimento">
                      <Input type="date" value={fluxoForm.vencimento} onChange={(e) => setFluxoForm({ ...fluxoForm, vencimento: e.target.value })} />
                    </Campo>
                    <Campo label="Categoria">
                      <Input type="text" value={fluxoForm.categoria} onChange={(e) => setFluxoForm({ ...fluxoForm, categoria: e.target.value })} />
                    </Campo>
                    <Campo label="Forma de pagamento">
                      <Select value={fluxoForm.formaPagamento} onChange={(e) => setFluxoForm({ ...fluxoForm, formaPagamento: e.target.value as FormaPagamento })}>
                        <option value="Dinheiro">Dinheiro</option>
                        <option value="PIX">PIX</option>
                        <option value="Cartão">Cartão</option>
                        <option value="Transferência">Transferência</option>
                      </Select>
                    </Campo>
                    <div className="md:col-span-2 xl:col-span-3 space-y-3">
                      <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={fluxoForm.gerarSangriaAutomatica}
                          onChange={(e) => setFluxoForm({ ...fluxoForm, gerarSangriaAutomatica: e.target.checked })}
                        />
                        Gerar sangria automática quando for despesa rápida em dinheiro
                      </label>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                        <strong className="text-slate-900">Regra do sistema:</strong> despesas do tipo <strong>Caixa</strong> mexem no caixa do dia. Despesas do tipo <strong>Financeiro</strong> entram no fluxo mensal e no lucro, sem derrubar o caixa diário.
                      </div>
                    </div>
                    <div className="flex items-end">
                      <Botao onClick={salvarContaFluxo}>Salvar conta</Botao>
                    </div>
                  </div>
                </Card>
              </div>

              <Card titulo="Contas lançadas">
                <div className="space-y-3">
                  {contasFluxo.length === 0 ? (
                    <p className="text-sm text-slate-500">Nenhuma conta lançada ainda.</p>
                  ) : (
                    contasFluxo.map((item) => (
                      <div key={item.id} className="rounded-3xl border border-slate-200 p-4">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                          <div className="text-sm text-slate-700">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-base font-semibold text-slate-900">{item.descricao}</div>
                              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${item.tipo === "Caixa" ? "bg-orange-100 text-orange-800" : "bg-indigo-100 text-indigo-800"}`}>
                                {item.tipo}
                              </span>
                            </div>
                            <div className="mt-1">Categoria: {item.categoria}</div>
                            <div>Vence em {item.vencimento} • Pagamento: {item.formaPagamento}</div>
                            <div>Status: {item.status}{item.dataPagamento ? ` • Pago em ${item.dataPagamento}` : ""}</div>
                            <div className="text-slate-500">Automação de sangria: {item.gerarSangriaAutomatica ? "Sim" : "Não"}</div>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="mr-2 text-right">
                              <div className="text-xs text-slate-500">Valor</div>
                              <div className="text-xl font-bold text-slate-900">{moeda(item.valor)}</div>
                            </div>
                            {item.status === "Pendente" ? <Botao variante="secundario" onClick={() => marcarContaPaga(item.id)}>Marcar paga</Botao> : null}
                            <Botao variante="perigo" onClick={() => removerConta(item.id)}>Remover</Botao>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          ) : (
            <div className="space-y-6">
              <Card titulo="Histórico de fechamentos do caixa">
                <div className="space-y-3">
                  {fechamentos.length === 0 ? (
                    <p className="text-sm text-slate-500">Nenhum fechamento salvo ainda.</p>
                  ) : (
                    fechamentos.slice().sort((a, b) => b.data.localeCompare(a.data)).map((item) => (
                      <div key={item.id} className="rounded-3xl border border-slate-200 p-4">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div className="space-y-2 text-sm text-slate-700">
                            <div className="text-base font-semibold text-slate-900">Fechamento {item.data}</div>
                            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                              <div>Fundo: <strong>{moeda(item.fundoCaixa)}</strong></div>
                              <div>Vendas em dinheiro: <strong>{moeda(item.vendasDinheiro)}</strong></div>
                              <div>Cartões: <strong>{moeda(item.vendasCartao)}</strong></div>
                              <div>Outros: <strong>{moeda(item.vendasOutras)}</strong></div>
                              <div>Total vendas: <strong>{moeda(item.totalVendas)}</strong></div>
                              <div>Sangrias: <strong>{moeda(item.sangrias)}</strong></div>
                              <div>Caixa esperado: <strong>{moeda(item.caixaEsperado)}</strong></div>
                              <div>Caixa real: <strong>{moeda(item.caixaReal)}</strong></div>
                            </div>
                            <div>Diferença: <strong>{moeda(item.diferenca)}</strong></div>
                            {item.observacao ? <div className="text-slate-500">Obs.: {item.observacao}</div> : null}
                          </div>
                          <Botao variante="perigo" onClick={() => removerFechamento(item.id)}>Remover</Botao>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
