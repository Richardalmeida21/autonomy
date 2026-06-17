import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="legal-page">
      <section className="legal-document">
        <Link className="legal-back" href="/">
          Autonomy
        </Link>
        <p className="eyebrow">Termos de Servico</p>
        <h1>Regras de uso do Autonomy</h1>
        <p>
          Ao usar o Autonomy, voce concorda em utilizar a plataforma de forma
          licita, respeitando direitos de terceiros, politicas das redes sociais
          e as regras dos provedores integrados.
        </p>
        <h2>Assinatura e creditos</h2>
        <p>
          O acesso ao sistema depende do plano contratado. Geracoes de posts e
          imagens consomem creditos conforme o formato escolhido. Os limites e
          valores podem variar de acordo com o plano.
        </p>
        <h2>Conteudo gerado</h2>
        <p>
          O usuario e responsavel por revisar textos, imagens, ofertas,
          promessas e publicacoes antes de usa-los comercialmente. A inteligencia
          artificial pode cometer erros ou gerar resultados que exijam ajustes.
        </p>
        <h2>Publicacao automatica</h2>
        <p>
          A publicacao no Instagram depende da autorizacao concedida pelo usuario
          via Meta. O usuario pode desconectar suas contas sociais quando quiser.
          A disponibilidade dessa funcionalidade tambem depende das APIs e
          politicas da Meta.
        </p>
        <h2>Uso proibido</h2>
        <p>
          E proibido tentar burlar pagamentos, creditos, autenticacao,
          autorizacoes de terceiros ou limites tecnicos da plataforma.
        </p>
        <h2>Alteracoes</h2>
        <p>
          Estes termos podem ser atualizados conforme o produto evolui. O uso
          continuo da plataforma representa aceitacao da versao vigente.
        </p>
      </section>
    </main>
  );
}
