import Logo from "@/components/logo";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChatBubble } from "./nostr/chat-bubble";
import { Login } from "@/components/nostr/login";
import { CHACHI_PUBKEY, CHACHI_RELAYS } from "@/constants";
import {
  MessageCircleHeart,
  Rocket,
  Github,
  Code,
  WandSparkles,
  MessageCircle,
  CloudUpload,
  DatabaseZap,
  HandCoins,
} from "lucide-react";
import Supporters from "./supporters";
import { Button } from "./ui/button";

const testimonials = [
  {
    id: "a08e7cab3d156572805a6e5b711c67b7fa3a1ed72266d0db5793f3636b1e34a8",
    pubkey: "32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245",
    created_at: 1736702671,
    kind: 1,
    tags: [["client", "Damus Notedeck"]],
    content: "https://chachi.chat/ is great",
    sig: "d337472859256adf869bfc42399c0639ae973308e22037a9ddcc6119a5a7c67aeb3533bc2d01f8b88d066471559b947d612432ed639ecb3b33b5b348095eacac",
  },
  {
    content: "Chachi is great, keep the focus.",
    created_at: 1737218972,
    id: "98c3e4c6183d80c5b5fb3547f708f990ff81d936f88ea7860b84841290ea5054",
    kind: 1,
    pubkey: "7bdef7be22dd8e59f4600e044aa53a1cf975a9dc7d27df5833bc77db784a5805",
    sig: "4b6670aec2968153424fcfe762e9e94c23aa433cd46fc5637a30532aa185cd18e5a1ff9d5571817a7d0355b2f8decaea02fe194024491df25b5bb08a59b49f0a",
    tags: [
      [
        "e",
        "8dfbc56368c976237413ebb9b787e8f016bba36bde21c57b906334176f1b6296",
        "",
        "root",
      ],
      ["p", "126103bfddc8df256b6e0abfd7f3797c80dcc4ea88f7c2f87dd4104220b4d65f"],
      ["p", "a9434ee165ed01b286becfc2771ef1705d3537d051b387288898cc00d5c885be"],
      ["p", "726a1e261cc6474674e8285e3951b3bb139be9a773d1acf49dc868db861a1c11"],
      ["p", "7fa56f5d6962ab1e3cd424e758c3002b8665f7b0d8dcee9fe9e288d7751ac194"],
    ],
  },
  {
    id: "8b4a41d4d57ae664dbf5a1d01715de69e519abe5f65f9072d4381078a8f0690f",
    pubkey: "97c70a44366a6535c145b333f973ea86dfdc2d7a99da618c40c64705ad98e322",
    created_at: 1737128929,
    kind: 1,
    tags: [
      [
        "p",
        "126103bfddc8df256b6e0abfd7f3797c80dcc4ea88f7c2f87dd4104220b4d65f",
        "wss://relay.primal.net/",
        "reya",
      ],
      [
        "p",
        "a9434ee165ed01b286becfc2771ef1705d3537d051b387288898cc00d5c885be",
        "wss://relay.damus.io/",
        "nielliesmons",
      ],
      [
        "p",
        "726a1e261cc6474674e8285e3951b3bb139be9a773d1acf49dc868db861a1c11",
        "wss://filter.nostr.wine/",
        "franzap",
      ],
      [
        "p",
        "7fa56f5d6962ab1e3cd424e758c3002b8665f7b0d8dcee9fe9e288d7751ac194",
        "wss://nos.lol/",
        "verbiricha",
      ],
      [
        "p",
        "7fa56f5d6962ab1e3cd424e758c3002b8665f7b0d8dcee9fe9e288d7751ac194",
        "wss://filter.nostr.wine/",
        "verbiricha",
      ],
      [
        "p",
        "a9434ee165ed01b286becfc2771ef1705d3537d051b387288898cc00d5c885be",
        "wss://niel.nostr1.com/",
        "nielliesmons",
      ],
      [
        "e",
        "8dfbc56368c976237413ebb9b787e8f016bba36bde21c57b906334176f1b6296",
        "wss://filter.nostr.wine/",
        "root",
        "7fa56f5d6962ab1e3cd424e758c3002b8665f7b0d8dcee9fe9e288d7751ac194",
      ],
      [
        "client",
        "Coracle",
        "31990:97c70a44366a6535c145b333f973ea86dfdc2d7a99da618c40c64705ad98e322:1685968093690",
      ],
    ],
    content: "Chachi is great, don't get discouraged",
    sig: "449900d5c169cc2a3a3ebe10c22adec603035fac5318e632d87038bec0e1245bcd8bc25881370d107fd9b1e739c3f633a774663f10df4fb339ec05a9fd9d223b",
  },
];

function Testimonials() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-12 w-full px-4 bg-accent/30 py-12 flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="flex flex-row items-end gap-3 mb-2">
          <MessageCircleHeart className="size-10 text-muted-foreground" />
          <h2 className="text-5xl font-semibold leading-none">
            {t("landing.testimonials")}
          </h2>
        </div>
        <p className="text-center text-balance text-lg text-muted-foreground">
          {t("landing.testimonials-desc")}
        </p>
      </div>
      <div className="flex items-center justify-center w-full max-w-xl">
        <div className="flex flex-col gap-6 items-center justify-center">
          {testimonials.map((testimonial) => (
            <ChatBubble
              key={testimonial.id}
              event={testimonial}
              showReply={false}
              showReactions={false}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const REPO = "https://github.com/purrgrammer/chachi";

function SourceCode() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center my-8 gap-8 my-12 px-8 w-full">
      <div className="flex flex-col items-center gap-2 max-w-xl">
        <div className="flex flex-row items-end gap-3 mb-2">
          <Code className="size-10 text-muted-foreground" />
          <h2 className="text-5xl font-semibold leading-none">
            {t("landing.source-code")}
          </h2>
        </div>
        <p className="text-center text-balance text-lg text-muted-foreground">
          {t("landing.source-code-desc")}
        </p>
      </div>
      <Link
        to={"/groups.0xchat.com/chachi"}
        className="hover:underline hover:decoration-dotted"
      >
        <div className="flex flex-row items-center gap-2">
          <MessageCircle />
          <span className="text-xl font-normal">
            {t("landing.source-code-chat")}
          </span>
        </div>
      </Link>
      <Link
        to={REPO}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:underline hover:decoration-dotted"
      >
        <div className="flex flex-row items-center gap-2">
          <Github />
          <span className="text-xl font-normal">
            {t("landing.source-code-link")}
          </span>
        </div>
      </Link>
    </div>
  );
}

function Features() {
  const { t } = useTranslation();
  const sections = [
    {
      key: "chat",
      title: t("landing.features.chat"),
      description: t("landing.features.chat-desc"),
      icon: <MessageCircle className="size-6 text-muted-foreground" />,
    },
    {
      key: "payments",
      title: t("landing.features.payments"),
      description: t("landing.features.payments-desc"),
      icon: <HandCoins className="size-6 text-muted-foreground" />,
    },
    {
      key: "files",
      title: t("landing.features.files"),
      description: t("landing.features.files-desc"),
      icon: <CloudUpload className="size-6 text-muted-foreground" />,
    },
    {
      key: "selfhost",
      title: t("landing.features.selfhost"),
      description: t("landing.features.selfhost-desc"),
      icon: <DatabaseZap className="size-6 text-muted-foreground" />,
    },
  ];
  return (
    <div className="flex flex-col items-center justify-center gap-8 py-12 px-8 w-full bg-accent/10">
      <div className="flex flex-col items-center gap-2">
        <div className="flex flex-row items-end gap-3 mb-2">
          <WandSparkles className="size-10 text-muted-foreground" />
          <h2 className="text-5xl font-semibold leading-none">
            {t("landing.features.title")}
          </h2>
        </div>
        <p className="text-center text-balance text-lg text-muted-foreground">
          {t("landing.features.description")}
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 max-w-xl">
        {sections.map((section) => (
          <div className="flex flex-col gap-4 w-64 items-center justify-center">
            <div className="flex flex-row items-center gap-2">
              {section.icon}
              <h3 className="text-2xl font-semibold">{section.title}</h3>
            </div>
            <p className="text-muted-foreground text-md text-center text-balance">
              {section.description}
            </p>
          </div>
        ))}
      </div>
      <GetStarted />
    </div>
  );
}

function GetStarted() {
  const { t } = useTranslation();
  return (
    <div className="w-full flex flex-col items-center justify-center mt-6 mb-12">
      <div className="max-w-xl">
        <Login
          trigger={
            <Button size="lg">
              <Rocket />
              <span className="text-xl font-normal">
                {t("landing.get-started")}
              </span>
            </Button>
          }
        />
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="flex flex-col items-center w-full min-h-screen">
      <div className="flex flex-col items-center justify-center py-20 text-center px-4 md:flex-row gap-6 md:gap-12">
        <div className="mb-6">
          <div className="flex flex-col gap-2 items-center">
            <Logo width={220} height={220} />
            <h1 className="text-8xl font-semibold leading-none">chachi</h1>
          </div>
        </div>
        <div className="flex flex-col items-start">
          <h2 className="text-8xl font-normal leading-none text-balance">
            <span className="font-semibold text-gradient bg-clip-text text-transparent">
              vibe
            </span>
            <br />
            with your
            <br />
            <span className="font-semibold text-animated-gradient bg-clip-text text-transparent">
              tribe
            </span>
          </h2>
        </div>
      </div>
      <Features />
      <Testimonials />
      <Supporters pubkey={CHACHI_PUBKEY} relays={CHACHI_RELAYS} />
      <SourceCode />
      <footer className="bg-white text-black flex items-center justify-center text-background w-full py-12">
        <div className="flex flex-col max-w-xl">
          <div className="flex flex-row items-center gap-1">
            <Logo width={18} height={18} />
            <span className="text-lg font-light">chachi</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
