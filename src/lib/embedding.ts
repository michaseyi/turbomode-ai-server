import { PineconeEmbeddings } from '@langchain/pinecone';

export const embeddings = new PineconeEmbeddings({
  model: 'multilingual-e5-large',
});
