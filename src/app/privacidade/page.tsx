import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <section className="legal-document">
        <Link className="legal-back" href="/">
          Autonomy
        </Link>
        <p className="eyebrow">Politica de Privacidade</p>
        <h1>Como tratamos seus dados</h1>
        <p>
          O Autonomy coleta apenas os dados necessarios para criar sua conta,
          processar pagamentos, gerar posts com inteligencia artificial, salvar
          sua biblioteca e, quando autorizado, publicar ou agendar conteudos no
          Instagram conectado.
        </p>
        <h2>Dados coletados</h2>
        <p>
          Podemos coletar nome, email, telefone, CPF ou CNPJ, plano contratado,
          historico de uso, posts gerados, posts salvos, dados de pagamento
          processados pela Stripe e informacoes de contas sociais conectadas por
          meio da Meta.
        </p>
        <h2>Uso dos dados</h2>
        <p>
          Usamos esses dados para autenticar usuarios, entregar o servico,
          controlar creditos, processar assinaturas, melhorar a experiencia e
          cumprir obrigacoes legais e de seguranca.
        </p>
        <h2>Integrações</h2>
        <p>
          O Autonomy usa OpenAI para geracao de conteudo, Supabase para
          autenticacao, banco e armazenamento, Stripe para pagamentos e Meta
          Graph API para conexao e publicacao no Instagram quando voce autoriza.
        </p>
        <h2>Seguranca</h2>
        <p>
          Tokens de redes sociais sao armazenados criptografados. O acesso aos
          dados do usuario e limitado por autenticacao, regras de banco de dados
          e controles internos de permissao.
        </p>
        <h2>Contato</h2>
        <p>
          Para solicitar informacoes, correcao ou exclusao de dados, acesse a
          pagina de exclusao de dados ou entre em contato pelo email informado no
          cadastro do aplicativo.
        </p>
      </section>
    </main>
  );
}
