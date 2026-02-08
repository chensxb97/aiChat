import { useChat } from '@ai-sdk/react';
import { useState } from 'react';

type WeatherProps = {
  temperature: number;
  // weather: string;
  location: string;
};

const Weather = ({ temperature, location }: WeatherProps) => {
  return (
    <div>
      <h2>Current Weather for {location}</h2>
      <p>Temperature: {temperature}°C</p>
    </div>
  );
};

export default function Chat() {
  const [input, setInput] = useState('');
  const { messages, sendMessage } = useChat();
  return (
    <div className="flex flex-col w-full max-w-md py-24 mx-auto stretch">
      {messages.map(message => (
        <div key={message.id} className="whitespace-pre-wrap">
          {message.role === 'user' ? 'User: ' : 'AI: '}
          {message.parts.map((part, index) => {
            if (part.type === 'text') {
              return <span key={index}>{part.text}</span>;
            }
            if (part.type === 'tool-weather') {
              switch (part.state) {
                case 'input-available':
                  return <div key={index}>Checking the weather...</div>;
                case 'output-available':
                  return (
                    <div key={index}>
                      <Weather {...part.output} />
                    </div>
                  );
                case 'output-error':
                  return <div key={index}>Error: {part.errorText}</div>;
                default:
                  return null;
              }
            }
            if (part.type === 'dynamic-tool') {
              switch (part.state) {
                case 'input-available':
                  return <span key={index}>Calling tool: {part.toolName}</span>;
                case 'output-available':
                  return (
                    <span key={index}>
                      Calculated result from MCP server is {JSON.stringify(part.output?.structuredContent?.result)}.
                    </span>
                  );
                case 'output-error':
                  return <span key={index}>Error while calculating result using MCP server: {part.errorText}</span>;
                default:
                  return null;
              }
            }
            return null;
          })}
        </div>
      ))}

      <form
        onSubmit={e => {
          e.preventDefault();
          sendMessage({ text: input });
          setInput('');
        }}
      >
        <input
          className="fixed dark:bg-zinc-900 bottom-0 w-full max-w-md p-2 mb-8 border border-zinc-300 dark:border-zinc-800 rounded shadow-xl"
          value={input}
          placeholder="Say something..."
          onChange={e => setInput(e.currentTarget.value)}
        />
      </form>
    </div>
  );
}