import Link from "next/link";
import type { Metadata } from "next";
import { LegalPage } from "@/components/sections/LegalPage";
import { ENCARREGADO_DADOS, POLITICA_VERSAO, SITE } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/politica-de-privacidade" },
  title: "Política de Privacidade",
  description:
    "Como a Ousadia Marketing coleta, usa, guarda e protege os dados pessoais de quem usa o site, conforme a LGPD.",
};

/**
 * Texto escrito a partir do que o site faz de verdade (formulários em
 * `components/`, scripts em `docs/apps-script/`). Mudou um formulário, um
 * fornecedor ou passou a usar ferramenta de medição? Atualize aqui e troque
 * `POLITICA_VERSAO` em `lib/site.ts`.
 */
export default function PrivacidadePage() {
  const email = (
    <a href={`mailto:${ENCARREGADO_DADOS.email}`}>{ENCARREGADO_DADOS.email}</a>
  );

  return (
    <LegalPage title="Política de Privacidade" atualizado={POLITICA_VERSAO}>
      <p>
        Esta política explica, sem juridiquês, quais dados pessoais a Ousadia
        Marketing recebe por este site, o que faz com eles, com quem eles são
        compartilhados, por quanto tempo ficam guardados e como você exerce os
        seus direitos, conforme a Lei Geral de Proteção de Dados (Lei nº
        13.709/2018, a LGPD).
      </p>

      <h2>1. Quem cuida dos seus dados</h2>
      <div className="quadro">
        <p>
          <strong>{SITE.razaoSocial}</strong> (nome fantasia {SITE.name})
          <br />
          CNPJ {SITE.cnpj}
          <br />
          {SITE.endereco}
          <br />
          E-mail: {email}
        </p>
      </div>
      <p>
        A Ousadia é a <strong>controladora</strong> dos dados: é ela quem decide
        como eles são usados. A <strong>encarregada</strong> pelo tratamento de
        dados pessoais, que atende você e a Autoridade Nacional de Proteção de
        Dados (ANPD), é <strong>{ENCARREGADO_DADOS.nome}</strong>, pelo e-mail{" "}
        {email}.
      </p>

      <h2>2. Quais dados coletamos e para quê</h2>
      <p>
        O site só recebe dados pessoais quando você mesmo preenche um formulário
        ou chama a gente no WhatsApp. Cada formulário pede apenas o que precisa:
      </p>

      <h3>Diagnóstico de Maturidade Digital</h3>
      <ul>
        <li>
          <strong>Dados:</strong> nome, WhatsApp, e-mail, rede social, cidade e
          as respostas do diagnóstico.
        </li>
        <li>
          <strong>Para quê:</strong> mostrar e enviar o seu diagnóstico e
          conversar com você sobre cursos, mentoria ou serviços que fazem
          sentido para o seu resultado.
        </li>
      </ul>

      <h3>Qual é o seu Momento UGC?</h3>
      <ul>
        <li>
          <strong>Dados:</strong> nome, WhatsApp, e-mail, Instagram, faixa de
          idade, estado e cidade, as respostas sobre a sua rotina (por exemplo,
          se você é mãe ou trabalha de carteira assinada), seus desejos,
          pensamentos, bloqueios e medos, e a pergunta que você quiser deixar.
        </li>
        <li>
          <strong>Para quê:</strong> enviar o seu diagnóstico por e-mail,
          conversar com você pelo WhatsApp e, de forma agrupada, entender o que o
          público precisa para criar os próximos conteúdos e cursos. Esse
          diagnóstico é conduzido em parceria com Juliana Araújo (Juh), do Mapa
          do UGC, que também tem acesso às respostas.
        </li>
        <li>
          É só para quem tem <strong>18 anos ou mais</strong>: quem informa ter
          menos de 18 não chega a preencher nenhum dado de contato.
        </li>
      </ul>

      <h3>Diagnósticos de IA e de Social Media</h3>
      <ul>
        <li>
          <strong>Dados:</strong> nome, e-mail, WhatsApp, profissão, faixa
          etária e as respostas do diagnóstico.
        </li>
        <li>
          <strong>Para quê:</strong> entender quem está começando nessas áreas
          e enviar conteúdos sobre IA ou social media e sobre os cursos
          Inteligência Artificial do Zero à Prática e Social Media Ousado. De
          forma agrupada, sem identificar ninguém, as respostas também viram a
          média que aparece no resultado de quem faz o teste depois.
        </li>
        <li>
          Cada diagnóstico fica numa planilha separada. As respostas do
          Diagnóstico de Social Media também são acessadas por Tháscila
          Lawanda, mentora do curso Social Media Ousado.
        </li>
        <li>
          Quem informa ter <strong>menos de 18 anos</strong> vê o resultado,
          mas os dados não são guardados.
        </li>
      </ul>

      <h3>Ouse Ser Você (método Satoyiro)</h3>
      <ul>
        <li>
          <strong>Dados:</strong> nome, turma, e-mail, contato, rede social,
          data de nascimento e as respostas do diagnóstico.
        </li>
        <li>
          <strong>Para quê:</strong> entregar o seu mapa de autoconhecimento e
          permitir que o educador da sua turma acompanhe os resultados. É uma
          ferramenta pedagógica de reflexão, não um teste psicológico.
        </li>
      </ul>

      <h3>Newsletter</h3>
      <ul>
        <li>
          <strong>Dados:</strong> e-mail.
        </li>
        <li>
          <strong>Para quê:</strong> enviar os nossos conteúdos. Você pode sair
          a qualquer momento.
        </li>
      </ul>

      <h3>Contato, aplicação para a mentoria e pedido de proposta</h3>
      <p>
        Hoje esses formulários não gravam nada no site: ao enviar, eles abrem
        uma conversa no WhatsApp com o que você escreveu, e a conversa segue por
        lá. O mesmo vale para os botões de WhatsApp espalhados pelo site.
      </p>

      <h3>Navegação</h3>
      <p>
        Como qualquer site, o servidor de hospedagem registra dados técnicos de
        cada acesso (endereço IP, data e hora, página visitada e tipo de
        navegador), por segurança e porque a lei exige (Marco Civil da Internet,
        Lei nº 12.965/2014, art. 15).
      </p>

      <h2>3. Cookies e ferramentas de terceiros</h2>
      <p>
        Hoje o site <strong>não usa cookies próprios</strong> nem ferramentas de
        análise de audiência ou de publicidade. Os vídeos do YouTube só carregam
        quando você clica neles; a partir desse clique, o YouTube (Google) pode
        usar cookies conforme a política dele. Se passarmos a usar ferramentas
        de medição ou de anúncios, esta política será atualizada antes, e vamos
        pedir a sua autorização no próprio site.
      </p>

      <h2>4. Com base em quê usamos os dados</h2>
      <ul>
        <li>
          <strong>Consentimento</strong> (LGPD, art. 7º, I): nos diagnósticos e
          na newsletter, quando você marca a caixa de autorização ou se
          inscreve. A data e a versão desta política que você aceitou ficam
          registradas.
        </li>
        <li>
          <strong>Procedimentos antes de um contrato</strong> (art. 7º, V):
          quando você pede uma proposta ou se candidata a uma turma.
        </li>
        <li>
          <strong>Obrigação legal</strong> (art. 7º, II): na guarda dos
          registros de acesso exigida pelo Marco Civil da Internet.
        </li>
        <li>
          <strong>Legítimo interesse</strong> (art. 7º, IX): para manter o site
          seguro e bloquear envios automáticos e abusos nos formulários.
        </li>
      </ul>

      <h2>5. Com quem compartilhamos</h2>
      <p>
        A Ousadia <strong>não vende nem aluga</strong> dados pessoais. Eles
        passam apenas pelos serviços que fazem o site funcionar:
      </p>
      <ul>
        <li>
          <strong>Google</strong> (Planilhas, Gmail e Apps Script): onde as
          respostas dos formulários ficam guardadas e de onde saem os e-mails
          com os diagnósticos.
        </li>
        <li>
          <strong>Hostinger</strong>: hospedagem do site.
        </li>
        <li>
          <strong>Meta (WhatsApp)</strong>: quando você conversa com a gente
          pelo WhatsApp.
        </li>
        <li>
          <strong>Juliana Araújo (Mapa do UGC)</strong>: apenas as respostas do
          diagnóstico Qual é o seu Momento UGC?.
        </li>
        <li>
          <strong>Tháscila Lawanda (mentora do Social Media Ousado)</strong>:
          apenas as respostas do Diagnóstico de Social Media.
        </li>
        <li>
          <strong>Autoridades públicas</strong>: somente se houver ordem judicial
          ou obrigação legal.
        </li>
      </ul>
      <p>
        Google e Meta podem guardar dados em servidores fora do Brasil. Essa
        transferência internacional segue o que a LGPD permite (art. 33), com
        empresas que adotam padrões de proteção compatíveis.
      </p>

      <h2>6. Por quanto tempo guardamos</h2>
      <ul>
        <li>
          <strong>Respostas dos diagnósticos e contatos:</strong> até 2 anos
          depois do nosso último contato com você, ou até você pedir para
          apagar, o que vier primeiro.
        </li>
        <li>
          <strong>Newsletter:</strong> até você cancelar a inscrição.
        </li>
        <li>
          <strong>Registros de acesso:</strong> 6 meses, como manda o Marco
          Civil da Internet.
        </li>
      </ul>
      <p>
        Passado o prazo, os dados são apagados ou viram números agregados, sem
        identificar ninguém (por exemplo, &ldquo;40% das respostas estavam no
        momento Play&rdquo;).
      </p>

      <h2>7. Seus direitos</h2>
      <p>A qualquer momento, você pode pedir (LGPD, art. 18):</p>
      <ul>
        <li>confirmação de que tratamos dados seus e acesso a eles;</li>
        <li>correção de dados incompletos, errados ou desatualizados;</li>
        <li>
          anonimização, bloqueio ou eliminação de dados desnecessários ou
          tratados em desacordo com a lei;
        </li>
        <li>portabilidade dos dados para outro fornecedor;</li>
        <li>
          eliminação dos dados tratados com base no seu consentimento, e a
          revogação desse consentimento;
        </li>
        <li>informação sobre com quem compartilhamos os seus dados;</li>
        <li>revisão de decisões tomadas apenas de forma automatizada.</li>
      </ul>
      <p>
        É só escrever para {email}, de preferência pelo mesmo e-mail que você
        usou no site. Respondemos em até 15 dias. Para parar de receber nossos
        e-mails, também basta responder qualquer um deles com a palavra{" "}
        <strong>SAIR</strong>.
      </p>
      <p>
        Se achar que não resolvemos, você pode reclamar diretamente à ANPD, em{" "}
        <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer">
          gov.br/anpd
        </a>
        .
      </p>

      <h2>8. Menores de idade</h2>
      <p>
        Os diagnósticos abertos ao público (Maturidade Digital, Momento UGC,
        IA e Social Media) são para maiores de 18 anos; nos de IA e de Social
        Media, quem tem menos de 18 vê o resultado, mas nada é guardado. O
        Ouse Ser Você é usado com turmas do
        ensino médio, junto com a escola e os educadores; quando quem responde
        tem menos de 18 anos, os dados são usados apenas para entregar o mapa ao
        aluno e ao educador da turma, no melhor interesse do adolescente (LGPD,
        art. 14).
      </p>

      <h2>9. Como protegemos os dados</h2>
      <p>
        O site só funciona em conexão segura (HTTPS). As planilhas ficam numa
        conta Google de acesso restrito à equipe, os formulários têm proteção
        contra envios automáticos e o painel de resultados do Ouse Ser Você só
        abre com chave de acesso. Se acontecer algum incidente de segurança que
        possa trazer risco a você, avisaremos você e a ANPD, como manda a lei.
      </p>

      <h2>10. Mudanças nesta política</h2>
      <p>
        Quando esta política mudar, a data no topo da página muda junto. Se a
        mudança afetar algo que você autorizou, vamos pedir a sua autorização de
        novo. Veja também os nossos <Link href="/termos">Termos de Uso</Link>.
      </p>
    </LegalPage>
  );
}
