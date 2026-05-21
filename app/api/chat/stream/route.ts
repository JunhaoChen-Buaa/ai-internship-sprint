type StreamChatRequest = {
  message?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as StreamChatRequest;
  const message = body.message?.trim();

  if (!message) {
    return new Response("请输入分析需求。", { status: 400 });
  }

  const apiKey = process.env.LLM_API_KEY;
  const baseUrl = process.env.LLM_BASE_URL ?? "https://api.minimax.io/v1";
  const model = process.env.LLM_MODEL ?? "MiniMax-M2.7";

  if (!apiKey || apiKey === "replace_me") {
    return new Response("MiniMax API Key 未配置。请先设置 LLM_API_KEY。", {
      status: 500,
    });
  }

  const upstream = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      stream: true,
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

  if (!upstream.ok || !upstream.body) {
    const errorText = await upstream.text().catch(() => "");
    return new Response(errorText || `MiniMax stream 请求失败，HTTP ${upstream.status}`, {
      status: upstream.status,
    });
  }

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) {
              continue;
            }

            const payload = trimmed.slice(5).trim();
            if (!payload || payload === "[DONE]") {
              continue;
            }

            try {
              const parsed = JSON.parse(payload) as {
                choices?: Array<{
                  delta?: {
                    content?: string;
                  };
                  message?: {
                    content?: string;
                  };
                }>;
              };
              const content =
                parsed.choices?.[0]?.delta?.content ??
                parsed.choices?.[0]?.message?.content ??
                "";

              if (content) {
                controller.enqueue(encoder.encode(content));
              }
            } catch {
              // Ignore malformed provider chunks and keep the stream alive.
            }
          }
        }
      } catch (error) {
        controller.error(error);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}
