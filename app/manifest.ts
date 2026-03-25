import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Meal Decider Web",
    short_name: "MealDecider",
    description: "一个本地优先的吃饭决策系统，帮助你在饭点快速决定吃什么。",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f1e8",
    theme_color: "#f6f1e8",
    lang: "zh-CN",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}

