import { QdrantVectorStore } from '@langchain/qdrant';
import { embeddings } from '@/lib/embedding';
import { qdrantClient } from './qdrant';

export const notesVectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
  collectionName: 'notes',
  client: qdrantClient,
});
