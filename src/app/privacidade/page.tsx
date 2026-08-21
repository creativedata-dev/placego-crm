export const metadata = {
  title: "Política de Privacidade — PlaceGo CRM",
};

export default function PrivacidadePage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12 prose prose-zinc">
      <h1>Política de Privacidade</h1>
      <p><strong>Última atualização:</strong> agosto de 2025</p>

      <p>
        O <strong>PlaceGo CRM</strong>, desenvolvido pela <strong>Quantive Business LTDA</strong>,
        respeita a privacidade dos usuários e está comprometido com a proteção dos dados pessoais
        coletados por meio de nossas integrações, incluindo a API do WhatsApp Business (Meta).
      </p>

      <h2>1. Dados coletados</h2>
      <p>Coletamos apenas os dados necessários para a prestação do serviço de CRM imobiliário:</p>
      <ul>
        <li>Nome e número de telefone de contatos que interagem via WhatsApp</li>
        <li>Conteúdo de mensagens recebidas para fins de atendimento</li>
        <li>E-mail e informações de perfil fornecidas voluntariamente</li>
      </ul>

      <h2>2. Uso dos dados</h2>
      <p>Os dados coletados são utilizados exclusivamente para:</p>
      <ul>
        <li>Gestão de leads e contatos imobiliários</li>
        <li>Comunicação entre corretores e potenciais clientes</li>
        <li>Notificações internas de atendimento</li>
      </ul>

      <h2>3. Compartilhamento</h2>
      <p>
        Não compartilhamos dados pessoais com terceiros, exceto quando necessário para
        a operação do serviço (ex: provedores de infraestrutura como Supabase e Vercel)
        ou quando exigido por lei.
      </p>

      <h2>4. Integração com WhatsApp (Meta)</h2>
      <p>
        Utilizamos a API oficial do WhatsApp Business (Meta Cloud API) para receber e
        enviar mensagens em nome das empresas clientes. As mensagens são processadas
        exclusivamente para fins de atendimento ao cliente e não são utilizadas para
        publicidade ou compartilhadas com terceiros.
      </p>

      <h2>5. Opt-out</h2>
      <p>
        O usuário pode solicitar a exclusão de seus dados ou cancelar o recebimento de
        mensagens a qualquer momento enviando a palavra <strong>PARAR</strong> via WhatsApp
        ou entrando em contato pelo e-mail abaixo.
      </p>

      <h2>6. Retenção de dados</h2>
      <p>
        Os dados são mantidos pelo período necessário à prestação do serviço contratado,
        podendo ser excluídos a pedido do titular.
      </p>

      <h2>7. Contato</h2>
      <p>
        Para dúvidas, solicitações de exclusão ou exercício de direitos previstos na LGPD:
      </p>
      <p>
        <strong>Quantive Business LTDA</strong><br />
        E-mail: <a href="mailto:privacidade@placego.com.br">privacidade@placego.com.br</a>
      </p>
    </main>
  );
}
