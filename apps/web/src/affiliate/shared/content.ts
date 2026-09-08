/**
 * Toda a copy da landing page. Um arquivo só, de propósito: quem revisa texto
 * não deveria precisar abrir componente para trocar uma palavra.
 */

/**
 * Números que dependem da Porto — dependência D10 nos requisitos, fora deste
 * recorte. Enquanto forem `null`, a página descreve o mecanismo sem afirmar
 * valor: nenhuma promessa que o programa ainda não fez. Assim que a Porto
 * definir, basta preencher aqui e a seção correspondente passa a exibir.
 */
export const pendingFromPorto = {
  /** Ex.: 'R$ 25' — quanto o afiliado recebe por venda validada. */
  incentivePerSale: null as string | null,
  /** Ex.: '5%' — desconto que o cupom concede a quem compra. */
  customerDiscount: null as string | null,
  /** Prazo de análise do cadastro, fechado pela Porto na validação de 04/09/2026. */
  reviewWindow: 'até 72 horas' as string | null,
  /** Ex.: 'todo dia 10' — quando o incentivo é pago. */
  payoutSchedule: null as string | null,
};

export const site = {
  program: 'Influenciadores',
  company: 'Porto Serviço',
  contactEmail: 'afiliados@portoservico.com.br',
  accountCta: 'Acessar minha conta',
};

/**
 * "Quem somos nós", pedida pela Porto na validação de 04/09/2026 — e marcada
 * como TBD no mesmo documento.
 *
 * **Este texto é rascunho, à espera do institucional da Porto.** Ele não afirma
 * nada sobre a empresa que a própria landing já não afirme: descreve o
 * programa, o mecanismo do cupom e a análise manual. Nada de ano de fundação,
 * número de clientes ou posição de mercado — dado desses só entra vindo da
 * Porto.
 *
 * A seção e o item do menu saem do ar sozinhos se `paragraphs` ficar vazio:
 * âncora que não leva a lugar nenhum é pior do que menu sem o item.
 */
export const about = {
  eyebrow: 'Quem somos',
  title: 'O programa, e quem está por trás dele',
  paragraphs: [
    'Este é o canal em que a Porto Serviço remunera quem indica os seus serviços. Você recebe um cupom exclusivo, divulga para a sua rede e é remunerado a cada serviço concluído.',
    'A contratação, o pagamento e a execução acontecem inteiramente pela Porto Serviço. Você indica e recebe — não vende, não cobra e não executa o serviço.',
    'Cada cadastro é analisado por uma pessoa do time da Porto, um a um. É o que mantém o programa perto de quem realmente indica.',
  ] as string[],
};

export const hasAbout = about.paragraphs.length > 0;

export const nav = [
  ...(hasAbout ? [{ label: 'Quem somos', href: '#quem-somos' }] : []),
  { label: 'Como funciona', href: '#como-funciona' },
  { label: 'O que você recebe', href: '#beneficios' },
  { label: 'Requisitos', href: '#requisitos' },
  { label: 'Dúvidas', href: '#duvidas' },
];

export const hero = {
  badge: 'Campanha 2026',
  eyebrow: 'Programa de afiliados',
  title: 'Seu público já precisa desses serviços.',
  titleAccent: 'Agora eles recompensam você.',
  lead: 'Faça o seu cadastro, receba um cupom exclusivo da Porto Serviço, engaje sua rede e seja remunerado a cada serviço concluído.',
  /* A frase que fecha o argumento, separada do lead para ganhar o próprio peso. */
  kicker: 'Você não vende, não cobra e não executa o serviço. Só ganha!',
  primaryCta: 'Quero me cadastrar',
  secondaryCta: 'Ver como funciona',
  assurances: ['Cadastro gratuito', 'Sem CNPJ', 'Pagamento via PIX'],
};

/*
  O extrato do hero. Os valores são de exemplo e a peça diz isso na cara —
  `disclaimer` é renderizado ao lado do saldo, não em nota de rodapé. Quando a
  Porto fechar os números reais (`pendingFromPorto`), este bloco sai.

  As linhas somam exatamente `totalCents`: um extrato ilustrativo que não fecha
  a conta ensina o leitor a não confiar no extrato de verdade.
*/
export const showcase = {
  balanceLabel: 'Saldo acumulado',
  disclaimer: 'Valores ilustrativos',
  freshness: 'Atualizado agora',
  totalCents: 72000,
  lines: [
    { label: 'Encanador', cents: 32000 },
    { label: 'Eletricista', cents: 24000 },
    { label: 'Limpeza de Sofá', cents: 16000 },
  ],
  note: 'O extrato completo abre na sua área assim que o cadastro é aprovado.',
};

export const requirements = {
  eyebrow: 'Requisitos',
  title: 'O que a Porto confere antes de aprovar',
  lead: 'A análise é simples e manual. Não custa dinheiro e nem exige empresa aberta.',
  items: [
    'CPF regular e no seu nome. Não é preciso CNPJ nem MEI.',
    'Chave PIX registrada para o mesmo CPF do cadastro.',
    'Aceite do regulamento do programa, no envio do formulário.',
    'Dados conferidos pelo time da Porto, cadastro por cadastro.',
  ],
  note: 'A decisão final é da Porto Serviço e chega por e-mail — aprovada, com o link para criar sua senha; reprovada, com o motivo.',
};

export const audience = {
  eyebrow: 'Para quem é?',
  title: 'Ideal para quem é procurado quando um problema em casa aparece',
  lead: 'Todo mundo pode se candidatar, mas estes são os perfis campeões em indicações:',
  profiles: [
    {
      title: 'Creators e criadores de conteúdo',
      description:
        'Sua audiência já pede indicações de serviços para a casa. Agora, o seu cupom transforma suas respostas em renda extra, aumentando a sua credibilidade.',
    },
    {
      title: 'Clubes de compra e comunidades',
      description:
        'Um benefício a mais para a sua base, sem custo para você e sem nada para operar.',
    },
    {
      title: 'Síndicos e condôminos',
      description:
        'Você é a primeira pessoa procurada quando alguém precisa de instalação, conserto ou limpeza. Agora, você indica o melhor serviço e ainda é remunerado.',
    },
    {
      title: 'Profissionais do mercado imobiliário',
      description:
        'Quem acabou de mudar de casa contrata serviços no mesmo mês. É a janela mais curta entre indicações e venda.',
    },
    {
      title: 'E qualquer pessoa que indica',
      description:
        'Não é preciso audiência nem carteira de clientes. Quem responde o vizinho no grupo do prédio já pode se candidatar.',
    },
  ],
};

export const steps = {
  eyebrow: 'Como funciona',
  title: 'Do cadastro à primeira remuneração',
  items: [
    {
      title: 'Cadastre-se',
      description:
        'Nome, e-mail, RG, CPF e a chave PIX em que você quer receber. Leva menos de dois minutos e nem senha pede.',
    },
    {
      title: 'A Porto Serviço analisa',
      description:
        'Nada de triagem automática, cada cadastro é avaliado por uma pessoa do time da Porto, um a um. Não há consulta de crédito.',
    },
    {
      title: 'Seu cupom é liberado',
      description:
        'Aprovado, você recebe por e-mail o link para criar sua senha e o cupom exclusivo que identifica as suas indicações.',
    },
    {
      title: 'Divulgue do seu jeito',
      description:
        'Story, grupo de WhatsApp, mural do condomínio, lista de transmissão etc. O cupom é o mesmo em qualquer canal.',
    },
    {
      title: 'Acompanhe e receba',
      description:
        'Cada venda concluída com o seu cupom entra no seu extrato, e a remuneração cai na chave PIX que você cadastrou.',
    },
  ],
};

export const benefits = {
  eyebrow: 'O que você recebe?',
  title: 'Um cupom, um extrato e o dinheiro na sua chave Pix',
  highlight: {
    title: 'Um cupom exclusivo, só seu',
    description:
      'Ele é o que liga cada venda a você. Nenhuma indicação se perde por falta de rastreio e nenhum outro afiliado usa o seu código.',
  },
  items: [
    {
      title: 'Extrato por venda',
      description:
        'Cada indicação aparece com a data e o status atualizado: da compra à liberação do Pix.',
    },
    {
      title: 'Pagamento via PIX',
      description: 'Na chave que você cadastrou, sempre no seu nome.',
    },
    {
      title: 'Vantagem para quem compra',
      description: 'O cupom também é desconto para o cliente. Indicar fica bem mais fácil.',
    },
    {
      title: 'Sem custo e sem meta de entrada',
      description: 'Você não paga para participar, não precisa de CNPJ e sem meta de indicações.',
    },
  ],
};

export const pitch = {
  eyebrow: 'Na prática',
  title: 'Como explicar para o cliente',
  lead: 'Não há link para rastrear e nem formulário para preencher. Na hora de fechar a contratação no WhatsApp da Porto Serviço, o cliente digita o seu cupom.',
  /*
    Amostra genérica de propósito. Um código com cara de real — `MARINA25` — é
    lido como um cupom que já existe e que dá para usar; o cupom de verdade só
    nasce na área do afiliado, depois da aprovação.
  */
  sampleCoupon: 'SEUCUPOM',
  quote:
    'Quando for agendar, coloque o meu cupom no campo de desconto. Você paga menos e a indicação fica registrada.',
  /* Frases prontas: quem indica não quer redigir, quer copiar e colar. */
  phrases: [
    'No fim da compra, coloca o meu cupom de desconto.',
    'Digita o meu código no campo de cupom que você paga menos.',
    'É assim que a Porto Serviço identifica que a indicação foi minha.',
  ],
  phrasesLabel: 'Como pedir, em uma frase',
  checkoutLabel: 'Check-out da Porto Serviço',
  note: 'O cupom aparece na sua área assim que o cadastro é aprovado. O exemplo acima é ilustrativo.',
};

export const faq = {
  eyebrow: 'Dúvidas',
  title: 'O que perguntam antes de se cadastrar',
  items: [
    {
      question: 'Preciso pagar alguma coisa para participar?',
      answer:
        'Não. O cadastro é gratuito, não há mensalidade e não existe meta mínima para continuar no programa.',
    },
    {
      question: 'Preciso ter CNPJ ou ser MEI?',
      answer:
        'Não. O cadastro é feito com CPF e o incentivo é pago na sua chave PIX de pessoa física.',
    },
    {
      question: 'A chave PIX pode estar no nome de outra pessoa?',
      answer:
        'Não. Ela precisa estar no seu nome — é o que garante que o incentivo chega a quem indicou. Se você escolher o tipo CPF, a chave tem que ser exatamente o CPF do cadastro.',
    },
    {
      question: 'Quanto tempo leva a análise?',
      answer: `A análise é feita pela Porto Serviço e em ${pendingFromPorto.reviewWindow ?? 'poucos dias'} você terá uma devolutiva. Você recebe um e-mail com o resultado — aprovado, com o link para criar sua senha; reprovado, com o motivo registrado.`,
    },
    {
      question: 'Eu vendo o serviço ou recebo o dinheiro do cliente?',
      answer:
        'Nem um nem outro. A contratação, o pagamento e a execução acontecem inteiramente via Porto Serviço. Você indica e recebe; o resto é com a gente.',
    },
    {
      question: 'Como acompanho as minhas indicações?',
      answer:
        'Depois de aprovado, você cria sua senha pelo link enviado por e-mail e acessa a sua área, onde ficam o cupom e o extrato das vendas.',
    },
  ],
};

export const registration = {
  eyebrow: 'Cadastro',
  title: 'Comece agora',
  lead: 'Preencha as informações ao lado: sem senha, anexo ou taxa. Você recebe um e-mail de confirmação e outro com a devolutiva.',
  /*
    Rótulo da caixa de aceite, e não mais aviso solto embaixo do botão. O
    aceite é campo do formulário: o texto acompanha o controle que o registra.
  */
  consent: 'Li e concordo com o Regulamento do programa e com a Política de Privacidade da Porto.',
  lgpd: 'Seus dados são tratados conforme a LGPD e usados apenas para a análise do cadastro e o pagamento dos incentivos.',
  marks: ['Cadastro 100% digital', 'Sem custo de adesão', 'Análise feita por uma pessoa'],
  /*
    A jornada do lado do formulário é a da campanha, e não os cinco passos da
    seção "Como funciona": aqui a aprovação e a liberação do cupom são etapas
    separadas, porque é o que a pessoa acompanha depois de enviar.
  */
  journey: [
    'Cadastre-se',
    'A Porto Serviço analisa',
    'Aprovação confirmada',
    'Seu cupom é liberado',
    'Comece a divulgar o cupom, e boas vendas',
  ],
};

export const footer = {
  tagline: 'Um canal de aquisição da Porto Serviço operado com a Mesa.',
  links: [
    { label: 'Regulamento', href: '/regulamento' },
    { label: 'Política de Privacidade', href: '/privacidade' },
  ],
};
