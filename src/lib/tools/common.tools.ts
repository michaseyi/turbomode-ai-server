import { TavilySearch } from '@langchain/tavily';

export const internetSearch = new TavilySearch({
  maxResults: 5,
  topic: 'general',
  tavilyApiKey: '',
  name: 'internet_search',
});
