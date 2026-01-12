import { Provider } from '@angular/core';
import { Apollo, APOLLO_OPTIONS } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { ApolloClientOptions, InMemoryCache, ApolloLink } from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';

/**
 * Apollo Client Konfiguration für GraphQL
 * 
 * - Verbindet sich mit dem API Gateway auf /graphql
 * - Fügt automatisch JWT-Token zu Requests hinzu
 * - Cached Responses für Performance
 */

const uri = '/graphql'; // Proxy leitet an Gateway weiter

export function apolloOptionsFactory(httpLink: HttpLink): ApolloClientOptions<unknown> {
  // Auth-Link: Fügt JWT-Token zu jedem Request hinzu
  const authLink = setContext((_, { headers }) => {
    const token = localStorage.getItem('access_token');
    return {
      headers: {
        ...headers,
        authorization: token ? `Bearer ${token}` : '',
      }
    };
  });

  // HTTP-Link zum GraphQL-Endpoint
  const http = httpLink.create({ uri });

  return {
    link: ApolloLink.from([authLink, http]),
    cache: new InMemoryCache({
      typePolicies: {
        // Caching-Strategien für verschiedene Typen
        Student: {
          keyFields: ['id'],
        },
        User: {
          keyFields: ['id'],
        },
        Note: {
          keyFields: ['id'],
        },
        Modul: {
          keyFields: ['id'],
        },
        Studiengang: {
          keyFields: ['id'],
        },
        Einschreibung: {
          keyFields: ['id'],
        },
      },
    }),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: 'cache-and-network', // Erst Cache, dann Server
        errorPolicy: 'all',
      },
      query: {
        fetchPolicy: 'cache-first',
        errorPolicy: 'all',
      },
    },
  };
}

export const graphqlProviders: Provider[] = [
  Apollo,
  {
    provide: APOLLO_OPTIONS,
    useFactory: apolloOptionsFactory,
    deps: [HttpLink],
  },
];
