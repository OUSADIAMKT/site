// Pôr uma conversa no funil comercial, pela caixa de entrada.
//
// É a ponte que faltava entre atender e vender: quem está lendo "quero o kit,
// aceita Pix?" decide ali que aquilo é uma oportunidade, escolhe funil, etapa
// e responsável, e o cartão nasce no quadro ligado àquela conversa.
//
// Duas coisas que o painel garante antes de deixar criar:
//
// 1. Mostra as oportunidades que a pessoa JÁ tem. Uma pessoa pode ter várias
//    (fez a escola, agora quer a mentoria), e isso é legítimo; o que não
//    pode é alguém criar a segunda sem saber da primeira e a equipe cobrar duas
//    vezes a mesma venda.
// 2. Não cria contato nenhum por conta própria. Quem amarra contato e negócio é
//    `garantirContato` no servidor, pelo telefone em E.164, e ele reaproveita a
//    pessoa que já existe. Duas oportunidades do mesmo telefone apontam para o
//    mesmo contato.

import { useEffect, useState } from "react";
import { Workflow } from "lucide-react";
import { chamar } from "./api.js";
import { Modal, Ficha, dinheiro, dataHora } from "./crmComum.jsx";

export default function PorNoFunil({ cliente, conversa, config, aoFechar, aoCriar }) {
  const funis = (config?.funis || []).filter((f) => f.ativo !== false);
  const [funilId, setFunilId] = useState(() => funis[0]?.id || "");
  const [etapaId, setEtapaId] = useState("");
  const [responsavelId, setResponsavelId] = useState("");
  const [titulo, setTitulo] = useState(() => conversa?.nome_contato || conversa?.telefone || conversa?.contato || "");
  const [valor, setValor] = useState("");
  const [existentes, setExistentes] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const funil = funis.find((f) => f.id === funilId) || null;
  const etapas = funil?.etapas || [];

  // Trocar de funil não pode manter a etapa do funil anterior: o servidor
  // recusaria, e a tela pareceria quebrada sem dizer por quê.
  useEffect(() => {
    const abertas = etapas.filter((e) => e.tipo === "aberta");
    setEtapaId((atual) => (etapas.some((e) => e.id === atual) ? atual : (abertas[0]?.id || etapas[0]?.id || "")));
  }, [funilId, etapas]);

  // O que esta pessoa já tem no funil. Falha aqui não impede criar: é aviso, e
  // não porteira, então a lista vira vazia em vez de erro na cara de quem está
  // tentando trabalhar.
  useEffect(() => {
    let valendo = true;
    chamar(`painel-crm?cliente=${cliente.id}&conversa=${conversa.id}`)
      .then((d) => { if (valendo) setExistentes(d.negocios || []); })
      .catch(() => { if (valendo) setExistentes([]); });
    return () => { valendo = false; };
  }, [cliente.id, conversa.id]);

  async function criar() {
    if (!etapaId) { setErro("Escolha a etapa."); return; }
    if (!titulo.trim()) { setErro("Dê um nome à oportunidade."); return; }
    setSalvando(true); setErro("");
    try {
      const d = await chamar(`painel-crm?cliente=${cliente.id}`, {
        method: "POST",
        body: {
          acao: "salvar-negocio",
          dados: {
            conversa_id: conversa.id,
            etapa_id: etapaId,
            titulo: titulo.trim(),
            responsavel_id: responsavelId || null,
            valor: valor.replace(",", ".") || 0,
          },
        },
      });
      aoCriar?.(d.negocio);
    } catch (e) {
      setErro(e.message);
      setSalvando(false);
    }
  }

  const nomeEtapa = (id) => {
    for (const f of funis) {
      const e = (f.etapas || []).find((x) => x.id === id);
      if (e) return `${f.nome}: ${e.nome}`;
    }
    return "etapa removida";
  };

  if (!funis.length) {
    return (
      <Modal titulo="Pôr no funil" aoFechar={aoFechar} largura={520}>
        <p className="nota" style={{ marginTop: 0 }}>
          Esta conta ainda não tem funil de vendas. Quem cria é o administrador,
          na tela Funil de vendas, e aí esta conversa pode entrar nele.
        </p>
      </Modal>
    );
  }

  return (
    <Modal
      titulo="Pôr no funil" aoFechar={aoFechar} largura={560}
      rodape={(
        <>
          <button type="button" className="btn secundario" onClick={aoFechar}>Cancelar</button>
          <button type="button" className="btn" disabled={salvando} onClick={criar}>
            {salvando ? "Criando…" : "Criar oportunidade →"}
          </button>
        </>
      )}
    >
      {erro && <div className="aviso erro" role="alert">{erro}</div>}

      {existentes !== null && existentes.length > 0 && (
        <div className="aviso atencao" role="status">
          <strong>
            {existentes.length === 1
              ? "Esta pessoa já tem uma oportunidade no funil."
              : `Esta pessoa já tem ${existentes.length} oportunidades no funil.`}
          </strong>
          <ul className="lista-seca">
            {existentes.map((n) => (
              <li key={n.id}>
                {n.titulo} · {nomeEtapa(n.etapa_id)}
                {Number(n.valor) > 0 ? ` · ${dinheiro(n.valor)}` : ""}
                {n.criado_em ? ` · de ${dataHora(n.criado_em)}` : ""}
                {n.situacao !== "aberto" && <> <Ficha texto={n.situacao} /></>}
              </li>
            ))}
          </ul>
          <p className="nota" style={{ marginBottom: 0 }}>
            Criar outra é normal quando é outra venda. Não é normal quando é a
            mesma: aí vale abrir a que já existe.
          </p>
        </div>
      )}

      <div className="grade-campos">
        <label className="campo largo">
          <span>Nome da oportunidade</span>
          <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} autoFocus maxLength={120} />
        </label>
        <label className="campo">
          <span>Funil</span>
          <select value={funilId} onChange={(e) => setFunilId(e.target.value)}>
            {funis.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>
        </label>
        <label className="campo">
          <span>Etapa</span>
          <select value={etapaId} onChange={(e) => setEtapaId(e.target.value)}>
            {etapas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}{e.tipo !== "aberta" ? ` (${e.tipo})` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="campo">
          <span>Responsável</span>
          <select value={responsavelId} onChange={(e) => setResponsavelId(e.target.value)}>
            <option value="">Ninguém ainda</option>
            {(config?.atendentes || []).map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        </label>
        <label className="campo">
          <span>Valor previsto</span>
          <input
            type="text" inputMode="decimal" value={valor} placeholder="opcional"
            onChange={(e) => setValor(e.target.value)}
          />
        </label>
      </div>

      <p className="nota">
        <Workflow size={13} aria-hidden="true" /> O cartão entra no fim da coluna,
        ligado a esta conversa. O contato não é duplicado: se esta pessoa já está
        no cadastro, a oportunidade aponta para ela.
      </p>
    </Modal>
  );
}
