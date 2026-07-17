import { useState } from "react";
import { PaperPlaneRightIcon, StopIcon } from "@phosphor-icons/react";

interface ChatInputProps {
  busy: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
}

export function ChatInput({ busy, onSend, onStop }: ChatInputProps) {
  const [input, setInput] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    onSend(text);
  }

  return (
    <footer>
      <form className="chat-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about any GitHub repo..."
          autoComplete="off"
        />
        {busy ? (
          <button type="button" className="send-btn" onClick={onStop}>
            <StopIcon size={18} weight="fill" />
            Stop
          </button>
        ) : (
          <button type="submit" className="send-btn" disabled={!input.trim()}>
            <PaperPlaneRightIcon size={18} weight="fill" />
            Send
          </button>
        )}
      </form>
    </footer>
  );
}
