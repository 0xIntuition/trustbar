import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';
import { PropsWithChildren } from 'react';
import { useApolloClient } from '@apollo/client';
export { useQuery, useMutation, useLazyQuery } from '@apollo/client';
import { loadErrorMessages, loadDevMessages } from '@apollo/client/dev';
import { base } from 'viem/chains';
import { useStorage } from './useStorage';
import { currentChainStorage } from '@extension/storage';
import { getTransactionEventsQuery } from '../queries';

loadDevMessages();
loadErrorMessages();

export const ApolloProviderWrapper = ({ children }: PropsWithChildren) => {
  const chainId = useStorage(currentChainStorage);
  const client = new ApolloClient({
    uri: `https://prod.${chainId === base.id ? 'base' : 'base-sepolia'}.intuition-api.com/v1/graphql`,
    cache: new InMemoryCache(),
  });
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
};

// TODO: finish this
export function useWaitForTransactionEvents() {
  const client = useApolloClient();
  return async (hash: string) => {
    const fixedHash = convertHash(hash);
    const promise = new Promise(async (resolve, reject) => {
      while (true) {
        const { data, loading, error } = await client.query({
          query: getTransactionEventsQuery,
          variables: { hash: fixedHash },
        });
        if (data?.events.length > 0) {
          resolve(true);
        }
        if (error) {
          reject(error);
        }
      }
    });
    return promise;
  };
}

function convertHash(input: string): string {
  // Remove the "0x" prefix
  const hexString = input.startsWith('0x') ? input.slice(2) : input;

  // Convert each character in the string to its ASCII representation in hexadecimal
  const converted = [...hexString].map(char => `\\x${char.charCodeAt(0).toString(16)}`).join('');

  return converted;
}
