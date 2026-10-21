import Link from "next/link";
import type { Metadata } from "next";
import { LegalPage } from "@/components/sections/LegalPage";
import { POLITICA_VERSAO, SITE } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/termos" },
  title: "Termos de Uso",
  description:
    "Condições de uso do site da Ousadia Marketing, dos diagnósticos gratuitos e das ofertas de cursos, mentorias e serviços.",
};

/** Mesma data de versão da Política de Privacidade: as duas mudam juntas. */
export default function TermosPage() {
  const email = <a href={`mailto:${SITE.email}`}>{SITE.email}</a>;

  return (
    <LegalPage title="Termos de Uso" atualizado={POLITICA_VERSAO}>
      <p>
        Estes termos valem para quem usa o site {SITE.url.replace("https://", "")}.
        Ao navegar, preencher um formulário ou fazer um diagnóstico, você
        concorda com eles. Se não concordar, é só não usar o site.
      </p>

      <h2>1. Quem somos</h2>
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

      <h2>2. O que o site oferece</h2>
      <p>
        O site apresenta a Escola, a mentoria, a agência e a comunidade da
        Ousadia, publica conteúdos gratuitos e oferece diagnósticos gratuitos.
        Ele é informativo: nenhuma compra é concluída aqui. Cursos, mentorias e
        serviços são contratados à parte, pelo WhatsApp, por plataforma de
        pagamento ou por contrato, com as condições de cada oferta.
      </p>

      <h2>3. Diagnósticos gratuitos</h2>
      <p>
        O Diagnóstico de Maturidade Digital, o Qual é o seu Momento UGC? e o
        Ouse Ser Você são ferramentas educativas de reflexão. O resultado é uma
        orientação geral, montada a partir das suas próprias respostas:
      </p>
      <ul>
        <li>não é consultoria individual nem avaliação profissional;</li>
        <li>não é teste psicológico;</li>
        <li>
          não é promessa de resultado, de renda ou de contrato com marcas.
          Resultado depende de prática, constância e de fatores que ninguém
          controla.
        </li>
      </ul>
      <p>
        Os diagnósticos Maturidade Digital e Momento UGC são para maiores de 18
        anos. Como os seus dados são usados está na{" "}
        <Link href="/politica-de-privacidade">Política de Privacidade</Link>.
      </p>

      <h2>4. Cursos, mentorias e serviços</h2>
      <p>
        Preço, forma de pagamento, datas, acesso e regras de cancelamento de
        cada produto ficam na página da oferta, na conversa de contratação ou no
        contrato. Nas contratações feitas a distância, você pode desistir em até
        7 dias depois da compra ou do início do acesso e receber o valor de
        volta, como garante o Código de Defesa do Consumidor (art. 49).
      </p>

      <h2>5. Uso correto do site</h2>
      <p>Ao usar o site, você se compromete a:</p>
      <ul>
        <li>informar dados verdadeiros e seus nos formulários;</li>
        <li>
          não enviar dados de outra pessoa sem autorização dela, nem usar os
          formulários para mandar mensagens a terceiros;
        </li>
        <li>
          não usar robôs, envios automáticos ou qualquer meio que sobrecarregue
          ou tente burlar o site e os formulários.
        </li>
      </ul>
      <p>
        Envios que descumpram essas regras podem ser descartados sem aviso.
      </p>

      <h2>6. Propriedade intelectual</h2>
      <p>
        A marca Ousadia Marketing, os textos, vídeos, materiais e os métodos
        apresentados no site (como o Destrave e o método Satoyiro) pertencem à
        Ousadia ou a quem os licenciou para ela. Você pode compartilhar links e
        citar trechos com crédito, mas não pode copiar, revender ou distribuir o
        conteúdo sem autorização por escrito. Os grafismos usados no visual do
        site são inspirados em padrões dos povos indígenas da Amazônia, que
        reconhecemos como autores dessa tradição.
      </p>

      <h2>7. Links para outros sites</h2>
      <p>
        O site leva a serviços de terceiros, como WhatsApp, Instagram e
        YouTube. Eles têm termos e políticas próprios, e a Ousadia não responde
        pelo que acontece neles.
      </p>

      <h2>8. Disponibilidade e responsabilidade</h2>
      <p>
        Trabalhamos para manter o site no ar e as informações corretas, mas ele
        pode ficar fora do ar por manutenção ou falhas de terceiros, e alguma
        informação pode mudar (datas de turma, valores, vagas). Na dúvida, vale
        o que for confirmado com a nossa equipe pelo WhatsApp ou por e-mail.
      </p>

      <h2>9. Mudanças nestes termos</h2>
      <p>
        Estes termos podem ser atualizados. A data no topo da página mostra a
        versão em vigor.
      </p>

      <h2>10. Lei e foro</h2>
      <p>
        Valem as leis brasileiras. Fica eleito o foro da comarca de Altamira
        (PA), sem prejuízo do direito de quem é consumidor de entrar com ação
        no foro do próprio domicílio.
      </p>

      <h2>11. Fale com a gente</h2>
      <p>Dúvidas sobre estes termos: {email}.</p>
    </LegalPage>
  );
}
