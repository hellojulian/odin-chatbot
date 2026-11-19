const ABOUT_ME = `
STUDIO HOLA
Julian is a Melbourne-based product designer and creative technologist making human-centred digital experiences, with a focus on AI.

BACKGROUND
Outside work, Julian explores generative music in Max by Cycling '74 and hangs out with his cat.

WHAT JULIAN DOES
- AI Product Creation
- AI Prototyping
- Product Design
- Design Systems
- Front-End Development
- Brand & Visual Identity

CANVA — GENERATIVE AI IN PRESENTATIONS
Julian refined AI image and video generation inside Canva Presentations and helped shape a new end-to-end flow for generating brand-aligned presentations. He worked on the interactions and functional prototypes, then partnered with engineers through implementation and release.
Case study: https://studiohola.au/work/canva

LEONARDO AI — REBRAND AND MOBILE CREATION
Julian helped bring Leonardo AI's rebrand into the product by updating reusable design-system components and working with engineers to ship them. He also designed and prototyped native mobile workflows for AI image and video generation, including Blueprint templates and new model integrations.
Case study: https://studiohola.au/work/leonardo

JIGSPACE — 3D CREATION AND PRESENTATION
As Lead Designer at JigSpace, Julian set product design direction, mentored two designers and designed workflows for arranging and presenting interactive 3D content. He established reusable interface patterns and used Unity prototypes to explore spatial interactions. His native macOS and Apple Vision Pro explorations were concepts. JigSpace was featured in Apple's 2023 Vision Pro announcement.
Case study: https://studiohola.au/work/jigspace

BELONG (TELSTRA) — NATIVE MOBILE APP
As Mobile UI Lead and mobile subject-matter expert, Julian helped modernise Belong's native app. His work covered the dashboard, account management, onboarding, billing, data gifting and support. He built reusable Figma components with accessibility in mind and worked with engineers on their translation into React Native for iOS and Android.
Case study: https://studiohola.au/work/telstra

BASIC DESIGN SYSTEM — FIGMA TO REACT
Julian built a web design system connecting Figma Variables, design tokens and reusable React components. The project includes theming, accessibility considerations and published Storybook documentation so people can see how the components work in code.
Case study: https://studiohola.au/work/basic-design-system
Documentation: https://hellojulian.github.io/bds-docs/
Storybook: https://hellojulian.github.io/design-system/?path=/story/foundations-colors--color-palette

MOBILE APP STARTER KIT — FIGMA TO REACT NATIVE
Julian created a reusable kit that pairs Figma components with Expo and React Native implementations. The kit uses NativeWind, shared tokens and themeable components so the same mobile foundation can support different visual identities.
Case study: https://studiohola.au/work/mobile-starter-kit

MIDJOURNEY MOBILE — TOUCH-FIRST IMAGE GENERATION
An independent app concept exploring how Midjourney's creative workflow could work on a phone. Julian designed and prototyped a flow that connects prompting, generating, browsing and refining images.
Case study: https://studiohola.au/work/midjourney

ONDA — CULTURE-LED DATING
An independent dating product concept. Julian developed the positioning, identity, interface and prototype around Same Energy, an idea for helping people discover each other through shared tastes and cultural interests. He explored generative profile art as a way to express personality.
Case study: https://studiohola.au/work/onda

MERLIN STUDIO — MUSIC CREATION AND COLLABORATION
A portfolio concept for a cloud-based music workspace that brings composition, AI-assisted production, collaboration and publishing together. Julian developed the product direction, interface patterns and prototypes.
Case study: https://studiohola.au/work/merlin

SPOTIFY GROWTH — ARTIST DISCOVERY AND COMMERCE
An independent growth exploration looking at how artist storytelling and expanded artist shops could fit into Spotify's listening experience. Julian mapped release scenarios and designed interface concepts connecting discovery, artist content and purchases.
Case study: https://studiohola.au/work/spotify

MIFF MOBILE — FESTIVAL DISCOVERY AND TICKETING
An independent mobile app concept for the Melbourne International Film Festival. Julian designed and prototyped the journey from browsing the programme and watching trailers to selecting a session, choosing seats, checking out and accessing a digital ticket.
Case study: https://studiohola.au/work/miff

PROCREATE PROTOTYPE — INTERACTION DESIGN ON IPAD
An early independent concept for turning Procreate artwork into interactive app ideas on iPad. Julian explored how creators could arrange their artwork into screens, connect them with tap targets and preview a flow using touch-first controls.
Case study: https://studiohola.au/work/procreate
`;

const SYSTEM_PROMPT = `You are Studio Hola's portfolio assistant. Help visitors explore Julian's work and refer to him in the third person. If asked who you are, say you're Studio Hola's portfolio chatbot.

Use this background as your source for facts about Julian and his work:
${ABOUT_ME}

Keep replies warm, natural and brief. When recommending projects, share one or two relevant case-study links. If someone asks for the full portfolio, list all 12 projects with their links.

Describe Julian's own contributions accurately. Be clear about which work shipped and which projects were prototypes or independent concepts. If a detail isn't covered, say so plainly.`;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(200).json({
      reply: "This endpoint only accepts POST requests.",
    });
  }

  if (!process.env.OPENROUTER_API_KEY) {
    return res.status(200).json({
      reply: "ERROR: OPENROUTER_API_KEY is missing on the server.",
    });
  }

  try {
    const { question, history } = req.body || {};

    if (typeof question !== "string" || !question.trim()) {
      return res.status(200).json({
        reply: "Ask me something about Julian's work.",
        limited: false,
      });
    }

    const conversationMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(Array.isArray(history) ? history.slice(0, -1) : []),
      { role: "user", content: question.trim() },
    ];

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: conversationMessages,
          max_tokens: 1024,
          temperature: 0.6,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const status = response.status;
      const errorCode = data?.error?.code || data?.error?.status;
      let reply;
      let limited = false;

      if (
        status === 429 ||
        errorCode === "RESOURCE_EXHAUSTED" ||
        errorCode === "rate_limit_exceeded"
      ) {
        reply = "The portfolio chat is at its usage limit. Try again in a bit, or browse the case studies at https://studiohola.au.";
        limited = true;
      } else if (status === 401 || status === 403) {
        reply = "The portfolio chat is having a setup issue. You can still browse Julian's work at https://studiohola.au.";
      } else if (status >= 500) {
        reply = "The portfolio chat is temporarily unavailable. Try again in a moment.";
      } else {
        reply = "That didn't go through. Try asking about a specific project or give it another go in a moment.";
      }

      console.error("OpenRouter request failed", { status, errorCode });
      return res.status(200).json({ reply, limited });
    }

    const reply = data.choices?.[0]?.message?.content?.trim() ||
      "I didn't get a reply that time. Give it another try in a moment.";

    return res.status(200).json({ reply, limited: false });
  } catch (error) {
    console.error("Chat handler error:", error.message);
    return res.status(200).json({
      reply: "Something went wrong with the portfolio chat. Give it another try in a moment.",
      limited: false,
    });
  }
}
