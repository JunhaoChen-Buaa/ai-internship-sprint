import { NextResponse } from "next/server";

type ChatRequest = {
  message?: string;
};

type MiniMaxChoice = {
  message?: {
    content?: string;
  };
};

type MiniMaxResponse = {
  choices?: MiniMaxChoice[];
  error?: {
    message?: string;
  };
  base_resp?: {
    status_code?: number;
    status_msg?: string;
  };
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as ChatRequest;
  const message = body.message?.trim();

  if (!message) {
    return NextResponse.json({ error: "请输入分析需求。" }, { status: 400 });
  }

  const apiKey = process.env.LLM_API_KEY;
  const baseUrl = process.env.LLM_BASE_URL ?? "https://api.minimax.io/v1";
  const model = process.env.LLM_MODEL ?? "MiniMax-M2.7";

  if (!apiKey || apiKey === "replace_me") {
    return NextResponse.json(
      { error: "MiniMax API Key 未配置。请先在 .env.local 中设置 LLM_API_KEY。" },
      { status: 500 },
    );
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "你是一个严谨的 AI 竞品分析 Agent。请基于用户输入生成简短、结构化的竞品分析计划。不要编造具体事实；如果缺少证据，请明确说明需要补充来源。",
        },
        {
          role: "user",
          content: message,
        },
      ],
      temperature: 0.3,
    }),
  });

  const data = (await response.json().catch(() => ({}))) as MiniMaxResponse;

  if (!response.ok) {
    return NextResponse.json(
      {
        error:
          data.error?.message ??
          data.base_resp?.status_msg ??
          `MiniMax API 请求失败，HTTP ${response.status}`,
      },
      { status: response.status },
    );
  }

  if (data.base_resp?.status_code && data.base_resp.status_code !== 0) {
    return NextResponse.json(
      { error: data.base_resp.status_msg || "MiniMax API 返回业务错误。" },
      { status: 502 },
    );
  }

  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    return NextResponse.json(
      { error: "MiniMax API 没有返回有效内容。" },
      { status: 502 },
    );
  }

  return NextResponse.json({ content });
}
