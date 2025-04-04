import { Chat } from "../../Chat/Chat";
import { useEffect, useRef, useState } from "react";
import { GetKnowldege } from "@/Utils/GetKnowldege/GetKnowldege";

export default function SuperpowerChatBox({values}) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async (message) => {
    const updatedMessages = [...messages, message];

    setMessages(updatedMessages);
    setLoading(true);

    try {
        GetKnowldege(message.content, values['always_knowledges'])
        .then(response => {
            setMessages((messages) => [
                ...messages,
                {
                role: "assistant",
                content: response.answer,
                },
            ]);
            setLoading(false);
        }).then(() => {
          // TODO: asyncio or Threading in API should be able to take care of this
          if (values['always_knowledges'].includes('wikipedia')) axios.put("https://sea-turtle-app-qcwo5.ondigitalocean.app/documents")
        }).catch(error => {
            setLoading(false);
            alert("Error while fetching from API!")
            setMessages((messages) => [
                ...messages,
                {
                role: "assistant",
                content: "Fetch Error...",
                },
            ]);
        })
    } catch (error) {
        console.error(error);
        setLoading(false);
        return;
    }
  };

  const handleReset = () => {
    setMessages([
      {
        role: "assistant",
        content: values['greetings'] || "Hello, How can I assist you today?",
      },
    ]);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content: values['greetings'] || "Hello, How can I assist you today?",
      },
    ]);
  }, [values['greetings']]);

  return (
    <>
      <div className="d-flex flex-column">
        <div className="flex-grow-1 overflow-auto px-2 px-sm-10 pb-4 pb-sm-10">
          <div className="mx-auto mt-4 mt-sm-12">
            {/* <CustomDropDown items={values['always_knowledges'].map(item => ({name: item, value: item}))} value={selectedPartition} handleSelectChange={setSelectedPartition} placeholder={"Select the partition..."} toggleStyle={{height: "30px", backgroundColor: "white !important"}} toggleClassName={"w-100 select-dropdown border-none rounded-0"} /> */}
            <Chat
              messages={messages}
              loading={loading}
              onSend={handleSend}
              onReset={handleReset}
            />
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>
    </>
  );
}
