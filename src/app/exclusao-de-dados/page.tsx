import Link from "next/link";

export default function DataDeletionPage() {
  return (
    <main className="legal-page">
      <section className="legal-document">
        <Link className="legal-back" href="/">
          Autonomy
        </Link>
        <p className="eyebrow">Exclusao de Dados</p>
        <h1>Como solicitar exclusao dos seus dados</h1>
        <p>
          Voce pode solicitar a exclusao dos dados associados a sua conta no
          Autonomy, incluindo dados de perfil, posts salvos, agendamentos e
          conexoes com contas sociais.
        </p>
        <h2>Solicitacao</h2>
        <p>
          Envie uma solicitacao usando o mesmo email cadastrado na plataforma,
          informando que deseja excluir sua conta e seus dados. A equipe do
          Autonomy processara a solicitacao conforme os prazos legais aplicaveis.
        </p>
        <h2>Dados da Meta</h2>
        <p>
          Ao desconectar uma conta do Instagram ou Facebook, o Autonomy deixa de
          usar os tokens associados a essa conta. A exclusao completa pode ser
          solicitada por este canal.
        </p>
        <h2>Dados que podem permanecer</h2>
        <p>
          Alguns registros podem ser mantidos quando necessario para cumprimento
          de obrigacoes legais, antifraude, seguranca, contabilidade ou defesa de
          direitos.
        </p>
        <h2>Contato</h2>
        <p>
          Para solicitar exclusao, envie uma mensagem para o email de contato
          cadastrado no aplicativo Meta do Autonomy com o assunto "Exclusao de
          dados".
        </p>
      </section>
    </main>
  );
}
