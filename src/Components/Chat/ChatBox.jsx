import { Chat } from "./Chat";
import { useEffect, useRef, useState } from "react";
import { OpenAIStream } from "@/Utils/OpenAIStream";
import { useQuery } from "@tanstack/react-query";
import request from "../../Utils/AxiosUtils";
import { prompt } from "@/Utils/AxiosUtils/API";
import { superpower, gptmodel } from "@/Utils/AxiosUtils/API";
import { GetKnowldege } from "@/Utils/GetKnowldege/GetKnowldege";

export default function ChatBox({activeTab, values}) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPrompts, setSelectedPrompts] = useState([]);

  const messagesEndRef = useRef(null);

  const { data: promptData, isLoading: promptLoader } = useQuery(["prompts", values['prompts']], () => request({ url: prompt }), { refetchOnWindowFocus: false, select: (res) => res?.data });
  const { data: superpowers, isLoading: superpowerloading } = useQuery([superpower, values['superpowers']], () => request({ url: superpower, method: 'get', params: {ids: values['superpowers'].join()} }), { refetchOnWindowFocus: false, select: (res) => res?.data.data });
  const { data: customModelData, isLoading: modelLoader, refetch, fetchStatus } = useQuery([gptmodel, values['gpt_model']], () => request({
    url: `${gptmodel}/${values['gpt_model']} ? ${values['gpt_model']} : false`}), { refetchOnWindowFocus: false, select: (res) => res?.data });

  useEffect(() => {
    if(!promptLoader && promptData) {
        const selectedPromptData = promptData.data.filter(data => values['prompts'].includes(data.id));
        setSelectedPrompts(selectedPromptData)
    }
  }, [promptLoader, promptData, values['prompts']])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSend = async (message) => {
    if (!customModelData) {
      alert("Model has not selected yet....");
      return;
    }

    const promptTexts = selectedPrompts.map(prom => ({role: "user", content: prom.prompt_text}))
    const updatedMessages = [...messages, message];

    // const getModelandAPI = (model) => {
    //     if (model.includes("gpt")) {
    //         return {model: model, api: ChatGPTAPI, api_key: process.env.OPENAI_API_KEY};
    //     }
    //     if (model.includes("anyscale")) {
    //         return {model: model.replace("anyscale-", ""), api: AnyScaleAPI, api_key: process.env.ANYSCALE_API_KEY}
    //     }
    //     return {model: model, api: ChatGPTAPI, api_key: process.env.OPENAI_API_KEY};
    // }

    // const {model, api, api_key} = getModelandAPI(values["gpt_model"])

    setMessages(updatedMessages);
    setLoading(true);

    let knowledgeText = "";

    if (values['superpowers'] && values['superpowers'].length > 0) {
      knowledgeText = await handleGetKnowledges(message.content);
    }

    try {
        const charLimit = 12000;
        let charCount = 0;
        let messagesToSend = [];

        for (let i = 0; i < updatedMessages.length; i++) {
            const message = updatedMessages[i];
            if (charCount + message.content.length > charLimit) {
                messagesToSend.push(...promptTexts);
                messagesToSend.push({role: 'user', content: `KNOWLEDGE DATA TO REFERENCE FOR YOU: ${knowledgeText}`});
                messagesToSend.push(updatedMessages[updatedMessages.length - 1]);
                break;
            }
            charCount += message.content.length;
            if(i === updatedMessages.length - 1) {
              messagesToSend.push(...promptTexts);
              messagesToSend.push({role: 'user', content: `KNOWLEDGE DATA TO REFERENCE FOR YOU: ${knowledgeText}`});
            }
            messagesToSend.push(message);
        }

        const getModelName = (name) => {
          if(name.includes("anyscale-")) {
            return name.replace("anyscale-", "");
          } else {
            return name;
          }
        }

        OpenAIStream(messagesToSend, getModelName(customModelData?.name), customModelData?.api_url, customModelData?.api_key)
            .then(response => {
                setMessages((messages) => [
                    ...messages,
                    {
                    role: "assistant",
                    content: response,
                    },
                ]);
            
                setLoading(false);
            })
            .catch(error => {
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
    if(messages.length > 1) {
      scrollToBottom();
    }
  }, [messages]);

  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content: values['greetings'] || "Hello, How can I assist you today?",
      },
    ]);
  }, [values['greetings']]);

  const handleGetKnowledges = async (message) => {
    return new Promise((resolve, reject) => {
      const partition_names = superpowers?.map(item => (item.always_knowledges.split(','))).flat();
      GetKnowldege(message, partition_names)
        .then(response => {
          resolve(response[0]);
        })
        .catch(error => {
          reject(error);
        })
    })
  }

  return (
    <>
      <div className="d-flex flex-column">
        <div className="flex-grow-1 overflow-auto px-2 px-sm-10 pb-4 pb-sm-10">
          <div className="mx-auto mt-4 mt-sm-12">
            <Chat
              messages={messages}
              loading={loading || superpowerloading || modelLoader}
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
