export const tutorialModules = [
  {
    id: 1,
    title: "Instalação do OneZap",
    videos: [
      {
        id: 8,
        title: "Como baixar o OneZap no Windows",
        duration: "1:53",
        url: "https://youtu.be/qOBIYYLWOD4",
      },
      {
        id: 3,
        title: "Executando o OneZap no Mac",
        duration: "1:56",
        url: "https://youtu.be/JOgzcQh76kU",
      },
    ],
  },
  {
    id: 2,
    title: "Configuração e Uso do OneZap",
    videos: [
      {
        id: 1,
        title: "Usando o OneZap com o Gemini",
        duration: "3:40",
        url: "https://youtu.be/ehFPR2PsdeI",
      },
      {
        id: 2,
        title: "Usando o OneZap com o GPT",
        duration: "5:44",
        url: "https://youtu.be/L1VrXVDaxQ4",
      },
      {
        id: 9,
        title: "Como criar prompts para o OneZap",
        duration: "6:40",
        url: "https://youtu.be/KqNvtMuHtNI",
      },
      {
        id: 6,
        title: "Configurações de conversas",
        duration: "4:36",
        url: "https://youtu.be/8FqOeHvb-Sk",
      },
      {
        id: 10,
        title: "Como criar uma nova instância de conexão dentro do OneZap",
        duration: "0:34",
        url: "https://youtu.be/JuaHfY0FYec",
      },
      {
        id: 7,
        title: "Como importar informações de outra instância",
        duration: "0:25",
        url: "https://youtu.be/VO_SR94OwnY",
      },
    ],
  },
  {
    id: 3,
    title: "Hospedando o OneZap em uma VPS",
    videos: [
      {
        id: 5,
        title: "Como hospedar o OneZap no Database Mart",
        duration: "8:21",
        url: "https://youtu.be/Mti6aWyzW9g",
      },
      {
        id: 4,
        title: "Alternativa: Como subir o OneZap na AWS Lightsail",
        duration: "2:38",
        url: "https://youtu.be/hnXzWqoMZBs",
      },
    ],
  },
];

export const extractYoutubeId = (url) => {
  if (url.includes("youtu.be/")) {
    const id = url.split("youtu.be/")[1].split("?")[0];
    return id;
  }
  if (url.includes("v=")) {
    const id = url.split("v=")[1].split("&")[0];
    return id;
  }
  return "";
};
