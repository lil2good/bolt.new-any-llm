/*
 * @ts-nocheck
 * Preventing TS checks with files presented in the video for a better presentation.
 */
import type { Message } from 'ai';
import React, { type RefCallback, useEffect } from 'react';
import { ClientOnly } from 'remix-utils/client-only';
import { Menu } from '~/components/sidebar/Menu.client';
import { IconButton } from '~/components/ui/IconButton';
import { Workbench } from '~/components/workbench/Workbench.client';
import { classNames } from '~/utils/classNames';
import { MODEL_LIST, PROVIDER_LIST, initializeModelList } from '~/utils/constants';
import { Messages } from './Messages.client';
import { SendButton } from './SendButton.client';
import { useState } from 'react';
import { APIKeyManager } from './APIKeyManager';
import Cookies from 'js-cookie';

import styles from './BaseChat.module.scss';
import type { ProviderInfo } from '~/utils/types';

const EXAMPLE_PROMPTS = [
  { text: 'Help me create a message to my Fans to thank them for their support' },
  { text: 'Give me some ideas for a new NFT collection' },
  { text: 'Help me write a song about love' },
  { text: 'I need help with my marketing strategy' },
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const providerList = PROVIDER_LIST;

// @ts-ignore TODO: Introduce proper types
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ModelSelector = ({ model, setModel, provider, setProvider, modelList, providerList, apiKeys }) => {
  return (
    <div className="mb-2 flex gap-2 flex-col sm:flex-row">
      <select
        value={provider?.name}
        onChange={(e) => {
          setProvider(providerList.find((p: ProviderInfo) => p.name === e.target.value));

          const firstModel = [...modelList].find((m) => m.provider == e.target.value);
          setModel(firstModel ? firstModel.name : '');
        }}
        className="flex-1 p-2 rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-prompt-background text-bolt-elements-textPrimary focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus transition-all"
      >
        {providerList.map((provider: ProviderInfo) => (
          <option key={provider.name} value={provider.name}>
            {provider.name}
          </option>
        ))}
      </select>
      <select
        key={provider?.name}
        value={model}
        onChange={(e) => setModel(e.target.value)}
        className="flex-1 p-2 rounded-lg border border-bolt-elements-borderColor bg-bolt-elements-prompt-background text-bolt-elements-textPrimary focus:outline-none focus:ring-2 focus:ring-bolt-elements-focus transition-all lg:max-w-[70%] "
      >
        {[...modelList]
          .filter((e) => e.provider == provider?.name && e.name)
          .map((modelOption) => (
            <option key={modelOption.name} value={modelOption.name}>
              {modelOption.label}
            </option>
          ))}
      </select>
    </div>
  );
};

const TEXTAREA_MIN_HEIGHT = 76;

interface BaseChatProps {
  textareaRef?: React.RefObject<HTMLTextAreaElement> | undefined;
  messageRef?: RefCallback<HTMLDivElement> | undefined;
  scrollRef?: RefCallback<HTMLDivElement> | undefined;
  showChat?: boolean;
  chatStarted?: boolean;
  isStreaming?: boolean;
  messages?: Message[];
  enhancingPrompt?: boolean;
  promptEnhanced?: boolean;
  input?: string;
  model?: string;
  setModel?: (model: string) => void;
  provider?: ProviderInfo;
  setProvider?: (provider: ProviderInfo) => void;
  handleStop?: () => void;
  sendMessage?: (event: React.UIEvent, messageInput?: string) => void;
  handleInputChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  enhancePrompt?: () => void;
}

export const BaseChat = React.forwardRef<HTMLDivElement, BaseChatProps>(
  (
    {
      textareaRef,
      messageRef,
      scrollRef,
      showChat = true,
      chatStarted = false,
      isStreaming = false,
      enhancingPrompt = false,
      promptEnhanced = false,
      messages,
      input = '',
      model,
      setModel,
      provider,
      setProvider,
      sendMessage,
      handleInputChange,
      enhancePrompt,
      handleStop,
    },
    ref,
  ) => {
    const TEXTAREA_MAX_HEIGHT = chatStarted ? 400 : 200;
    const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
    const [modelList, setModelList] = useState(MODEL_LIST);

    useEffect(() => {
      // Load API keys from cookies on component mount
      try {
        const storedApiKeys = Cookies.get('apiKeys');

        if (storedApiKeys) {
          const parsedKeys = JSON.parse(storedApiKeys);

          if (typeof parsedKeys === 'object' && parsedKeys !== null) {
            setApiKeys(parsedKeys);
          }
        }
      } catch (error) {
        console.error('Error loading API keys from cookies:', error);

        // Clear invalid cookie data
        Cookies.remove('apiKeys');
      }

      initializeModelList().then((modelList) => {
        setModelList(modelList);
      });
    }, []);

    const updateApiKey = (provider: string, key: string) => {
      try {
        const updatedApiKeys = { ...apiKeys, [provider]: key };
        setApiKeys(updatedApiKeys);

        // Save updated API keys to cookies with 30 day expiry and secure settings
        Cookies.set('apiKeys', JSON.stringify(updatedApiKeys), {
          expires: 30, // 30 days
          secure: true, // Only send over HTTPS
          sameSite: 'strict', // Protect against CSRF
          path: '/', // Accessible across the site
        });
      } catch (error) {
        console.error('Error saving API keys to cookies:', error);
      }
    };

    return (
      <div
        ref={ref}
        className={classNames(
          styles.BaseChat,
          'relative flex flex-col lg:flex-row h-full w-full overflow-hidden bg-bolt-elements-background-depth-1',
        )}
        data-chat-visible={showChat}
      >
        <ClientOnly>{() => <Menu />}</ClientOnly>
        <div ref={scrollRef} className="flex flex-col lg:flex-row overflow-y-auto w-full h-full">
          <div className={classNames(styles.Chat, 'flex flex-col flex-grow lg:min-w-[var(--chat-min-width)] h-full')}>
            {!chatStarted && (
              <div id="intro" className="mt-[16vh] max-w-chat mx-auto text-center">
                <img
                  src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAKkAAABrCAYAAAAM9aKQAAAACXBIWXMAAAsTAAALEwEAmpwYAAAGoGlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNy4yLWMwMDAgNzkuMWI2NWE3OWI0LCAyMDIyLzA2LzEzLTIyOjAxOjAxICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgMjMuNSAoTWFjaW50b3NoKSIgeG1wOkNyZWF0ZURhdGU9IjIwMjMtMDctMTBUMTQ6NDI6MzQrMTA6MDAiIHhtcDpNb2RpZnlEYXRlPSIyMDI0LTAzLTIwVDE2OjA5OjU1KzExOjAwIiB4bXA6TWV0YWRhdGFEYXRlPSIyMDI0LTAzLTIwVDE2OjA5OjU1KzExOjAwIiBkYzpmb3JtYXQ9ImltYWdlL3BuZyIgcGhvdG9zaG9wOkNvbG9yTW9kZT0iMyIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo2YWEwZGQyMy0zYWNiLTQxM2UtODFhZS1mMmViYTMyY2RiMjAiIHhtcE1NOkRvY3VtZW50SUQ9ImFkb2JlOmRvY2lkOnBob3Rvc2hvcDoyYzU2MmE1ZC04MzZjLTVlNDctODZiZC1mOGU0YzdhNjhlN2UiIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDo2Zjc1MDM5NS00YTFiLTRiMTMtYjM0OC1iOTA0NzhjN2RhMTAiPiA8eG1wTU06SGlzdG9yeT4gPHJkZjpTZXE+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJjcmVhdGVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOjZmNzUwMzk1LTRhMWItNGIxMy1iMzQ4LWI5MDQ3OGM3ZGExMCIgc3RFdnQ6d2hlbj0iMjAyMy0wNy0xMFQxNDo0MjozNCsxMDowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIDIzLjUgKE1hY2ludG9zaCkiLz4gPHJkZjpsaSBzdEV2dDphY3Rpb249InNhdmVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOmMxYjI4NjBlLTlmZTItNDkyNy05OGUzLWFiYTM4MmExNDY5NCIgc3RFdnQ6d2hlbj0iMjAyMy0xMS0wN1QxNToyOTo1MCsxMTowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIDIzLjUgKE1hY2ludG9zaCkiIHN0RXZ0OmNoYW5nZWQ9Ii8iLz4gPHJkZjpsaSBzdEV2dDphY3Rpb249InNhdmVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOjZhYTBkZDIzLTNhY2ItNDEzZS04MWFlLWYyZWJhMzJjZGIyMCIgc3RFdnQ6d2hlbj0iMjAyNC0wMy0yMFQxNjowOTo1NSsxMTowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIDIzLjUgKE1hY2ludG9zaCkiIHN0RXZ0OmNoYW5nZWQ9Ii8iLz4gPC9yZGY6U2VxPiA8L3htcE1NOkhpc3Rvcnk+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+mJyPbAAAHwZJREFUeJztnXmUJFd1p7/7IjIis7LW7qreuyW1pBbaV5BG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"
                  className="m-auto pb-10"
                  alt="logo"
                />
                <h1 className="text-5xl font-bold text-bolt-elements-textPrimary mb-4 animate-fade-in">
                  AI For Artists and Fans
                </h1>
                <p className="text-xl mb-8 text-bolt-elements-textSecondary animate-fade-in animation-delay-200">
                  Bring your ideas to life with AI.
                </p>
              </div>
            )}
            <div
              className={classNames('pt-6 px-2 sm:px-6', {
                'h-full flex flex-col': chatStarted,
              })}
            >
              <ClientOnly>
                {() => {
                  return chatStarted ? (
                    <Messages
                      ref={messageRef}
                      className="flex flex-col w-full flex-1 max-w-chat pb-6 mx-auto z-1"
                      messages={messages}
                      isStreaming={isStreaming}
                    />
                  ) : null;
                }}
              </ClientOnly>
              <div
                className={classNames(
                  ' bg-bolt-elements-background-depth-2 p-3 rounded-lg border border-bolt-elements-borderColor relative w-full max-w-chat mx-auto z-prompt mb-6',
                  {
                    'sticky bottom-2': chatStarted,
                  },
                )}
              >
                <ModelSelector
                  key={provider?.name + ':' + modelList.length}
                  model={model}
                  setModel={setModel}
                  modelList={modelList}
                  provider={provider}
                  setProvider={setProvider}
                  providerList={PROVIDER_LIST}
                  apiKeys={apiKeys}
                />

                {provider && (
                  <APIKeyManager
                    provider={provider}
                    apiKey={apiKeys[provider.name] || ''}
                    setApiKey={(key) => updateApiKey(provider.name, key)}
                  />
                )}

                <div
                  className={classNames(
                    'shadow-lg border border-bolt-elements-borderColor bg-bolt-elements-prompt-background backdrop-filter backdrop-blur-[8px] rounded-lg overflow-hidden transition-all',
                  )}
                >
                  <textarea
                    ref={textareaRef}
                    className={`w-full pl-4 pt-4 pr-16 focus:outline-none focus:ring-0 focus:border-none focus:shadow-none resize-none text-md text-bolt-elements-textPrimary placeholder-bolt-elements-textTertiary bg-transparent transition-all`}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        if (event.shiftKey) {
                          return;
                        }

                        event.preventDefault();

                        sendMessage?.(event);
                      }
                    }}
                    value={input}
                    onChange={(event) => {
                      handleInputChange?.(event);
                    }}
                    style={{
                      minHeight: TEXTAREA_MIN_HEIGHT,
                      maxHeight: TEXTAREA_MAX_HEIGHT,
                    }}
                    placeholder="How can Loop AI help you today?"
                    translate="no"
                  />
                  <ClientOnly>
                    {() => (
                      <SendButton
                        show={input.length > 0 || isStreaming}
                        isStreaming={isStreaming}
                        onClick={(event) => {
                          if (isStreaming) {
                            handleStop?.();
                            return;
                          }

                          sendMessage?.(event);
                        }}
                      />
                    )}
                  </ClientOnly>
                  <div className="flex justify-between items-center text-sm p-4 pt-2">
                    <div className="flex gap-1 items-center">
                      <IconButton
                        title="Enhance prompt"
                        disabled={input.length === 0 || enhancingPrompt}
                        className={classNames('transition-all', {
                          'opacity-100!': enhancingPrompt,
                          'text-bolt-elements-item-contentAccent! pr-1.5 enabled:hover:bg-bolt-elements-item-backgroundAccent!':
                            promptEnhanced,
                        })}
                        onClick={() => enhancePrompt?.()}
                      >
                        {enhancingPrompt ? (
                          <>
                            <div className="i-svg-spinners:90-ring-with-bg text-bolt-elements-loader-progress text-xl animate-spin"></div>
                            <div className="ml-1.5">Enhancing prompt...</div>
                          </>
                        ) : (
                          <>
                            <div className="i-bolt:stars text-xl"></div>
                            {promptEnhanced && <div className="ml-1.5">Prompt enhanced</div>}
                          </>
                        )}
                      </IconButton>
                    </div>
                    {input.length > 3 ? (
                      <div className="text-xs text-bolt-elements-textTertiary">
                        Use <kbd className="kdb px-1.5 py-0.5 rounded bg-bolt-elements-background-depth-2">Shift</kbd> +{' '}
                        <kbd className="kdb px-1.5 py-0.5 rounded bg-bolt-elements-background-depth-2">Return</kbd> for
                        a new line
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
            {!chatStarted && (
              <div id="examples" className="relative w-full max-w-xl mx-auto mt-8 flex justify-center">
                <div className="flex flex-col space-y-2 [mask-image:linear-gradient(to_bottom,black_0%,transparent_180%)] hover:[mask-image:none]">
                  {EXAMPLE_PROMPTS.map((examplePrompt, index) => {
                    return (
                      <button
                        key={index}
                        onClick={(event) => {
                          sendMessage?.(event, examplePrompt.text);
                        }}
                        className="group flex items-center w-full gap-2 justify-center bg-transparent text-bolt-elements-textTertiary hover:text-bolt-elements-textPrimary transition-theme"
                      >
                        {examplePrompt.text}
                        <div className="i-ph:arrow-bend-down-left" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <ClientOnly>{() => <Workbench chatStarted={chatStarted} isStreaming={isStreaming} />}</ClientOnly>
        </div>
      </div>
    );
  },
);
