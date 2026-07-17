import { useState } from "react";
import { getToolName, isToolUIPart, type UIMessage } from "ai";
import { Streamdown } from "streamdown";
import { CaretDownIcon, GearIcon } from "@phosphor-icons/react";

function shortToolName(name: string): string {
  const m = name.match(/^[A-Za-z0-9_-]{6,}_([A-Za-z][A-Za-z0-9]*)$/);
  return m ? m[1] : name;
}

function stripKimiTemplate(text: string): string {
  return text
    .replace(/<\|tool_calls_section_begin\|>[\s\S]*?<\|tool_calls_section_end\|>/g, "")
    .trim();
}

function unwrapMcpOutput(output: unknown): string {
  if (
    output &&
    typeof output === "object" &&
    "content" in output &&
    Array.isArray((output as { content: unknown[] }).content)
  ) {
    const parts = (output as { content: Array<{ type?: string; text?: string }> }).content;
    const text = parts.map((p) => (p?.type === "text" ? p.text ?? "" : "")).join("\n");
    if (text) {
      try {
        return JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        return text;
      }
    }
  }
  return typeof output === "string" ? output : JSON.stringify(output, null, 2);
}

function ToolPart({ part }: { part: UIMessage["parts"][number] }) {
  const [collapsed, setCollapsed] = useState(true);
  if (!isToolUIPart(part)) return null;

  const name = shortToolName(getToolName(part));
  const input = "input" in part ? part.input : undefined;
  const output = "output" in part ? part.output : undefined;

  return (
    <div className={`tool${collapsed ? " collapsed" : ""}`}>
      <button
        type="button"
        className="tool-header"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
      >
        <CaretDownIcon
          size={12}
          weight="bold"
          className={`chevron${collapsed ? " collapsed" : ""}`}
        />
        <GearIcon size={14} weight="duotone" className="tool-icon" />
        <span className="tool-name">{name}</span>
        <span className="tool-state">{part.state}</span>
      </button>
      {!collapsed && (
        <div className="tool-content">
          {input ? <pre>input: {JSON.stringify(input)}</pre> : null}
          {output !== undefined ? <pre>{unwrapMcpOutput(output)}</pre> : null}
        </div>
      )}
    </div>
  );
}

export function ChatMessage({ msg }: { msg: UIMessage }) {
  const rendered = msg.parts.flatMap((part, i) => {
    if (part.type === "text") {
      const text = msg.role === "assistant" ? stripKimiTemplate(part.text) : part.text;
      if (!text) return [];
      return [
        msg.role === "assistant" ? (
          <Streamdown key={i} linkSafety={{ enabled: false }}>{text}</Streamdown>
        ) : (
          <span key={i}>{text}</span>
        ),
      ];
    }
    if (isToolUIPart(part)) {
      return [<ToolPart key={i} part={part} />];
    }
    return [];
  });

  if (rendered.length === 0) return null;

  return (
    <div className={`message ${msg.role}`}>
      <div className="message-content">{rendered}</div>
    </div>
  );
}
