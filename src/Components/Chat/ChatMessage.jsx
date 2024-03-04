export const ChatMessage = ({ message }) => {
  return (
    <div className={`d-flex flex-column ${message.role === "assistant" ? "align-items-start" : "align-items-end"}`}>
      <div
        className={`d-flex items-center ${message.role === "assistant" ? "bg-light text-dark" : "bg-primary text-white"} rounded-2xl px-3 py-2`}
        style={{ overflowWrap: "anywhere", maxWidth: "67%", whiteSpace: "pre-wrap" }}
      >
        {message.content}
      </div>
    </div>
  );
};
