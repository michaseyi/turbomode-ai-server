import { createReactAgent, ToolNode, toolsCondition } from '@langchain/langgraph/prebuilt';
import { ChatGroq } from '@langchain/groq';
import {
  BaseCheckpointSaver,
  END,
  MessagesAnnotation,
  START,
  StateGraph,
} from '@langchain/langgraph';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';

import { config } from '@/config';
import { baseTools, commonTools, googleTools, userTools } from '@/lib/tools';
import { SystemMessage } from '@langchain/core/messages';
import { DynamicTool, StructuredToolInterface, tool } from '@langchain/core/tools';
import { RunnableToolLike } from '@langchain/core/runnables';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ConfigurationSchema } from '../configuration';

const messages = [
  new SystemMessage(`

# System Prompt: Autonomous Email Assistant (AVA)
## Core Directive: 
You are to handle the user's incoming emails, identify actionable tasks, plan their execution, utilize available tools to complete them, and report on actions taken without any user interaction. You do not engage in conversation.

you must always log the actions you take and the descisions you make. This is important for accountability and transparency.

before you use any tool, you must tell the user what you are going to do and why. This is important for transparency and accountability. Then you can proceed to call the tool in your next request.

when you are done with all that needs to be done incldue the ##FINISHED## tag in the message

you must walk the user through the steps you take as you are about to take them. This is important for transparency and accountability.

before you request a tool call, make sure you have previosully stated the intent to do so in the previous message. This is important for transparency and accountability. 

    `),
  new SystemMessage(`
''''''''''''''''''''''''''''''''''''''''''''''''''''''''''
Incoming Email Below

''''''''''''''''''''''''''''''''''''''''''''''''''''''''''''

Hi team,

Just a reminder that we're gearing up for the product launch next week. Here are the key things that still need to be handled:

Finalize the launch announcement email and schedule it.

Prepare demo scripts and walkthrough materials for the sales team.

Coordinate with the dev team to ensure the latest build is deployed to production by Monday.

Schedule a dry-run meeting on Friday with marketing, sales, and product.

Update the website banner with the correct launch date and feature highlights.

Let me know if you need help with anything.
Thanks,
Jane
    `),
];

type CreateTurobModeAgentParams = {
  llm: BaseChatModel;
  tools: (StructuredToolInterface | DynamicTool | RunnableToolLike)[];
  checkpointer: BaseCheckpointSaver;
};

function createAgent(params: CreateTurobModeAgentParams) {
  const { tools, llm, checkpointer } = params;

  if (!llm.bindTools) {
    throw new Error('Model should impliment the `bindTools` method.');
  }

  const agentLLM = llm.bindTools(tools);
  const plannerLLM = llm;

  // const StateAnnotation = Annotation.Root({
  //   messages: Annotation<BaseMessage[], Messages>({
  //     reducer: messagesStateReducer,
  //     default: () => [],
  //   }),
  // });

  const StateAnnotation = MessagesAnnotation;

  const toolNode = new ToolNode(tools);

  const llmNode = async (state: typeof StateAnnotation.State) => {
    return {
      messages: [await agentLLM.invoke(state.messages)],
    };
  };

  async function plannerNode(state: typeof StateAnnotation.State) {
    const plan = await plannerLLM.invoke([
      state.messages[1],
      new SystemMessage(`
        You are a planner, you job it to create plans.
       You have seen the email, go through it and give a detailed plan of action of what you can do for the user based on the tools that will be available.


       The following tools will be availble during the esecution stage.

       ${tools.map(tool => `${tool.name} - ${tool.description}`).join('\n-------------------------------------------------------------\n')}
        `),
    ]);

    return {
      messages: [
        plan,
        new SystemMessage(`
          Execute the plan step by step.
          `),
      ],
    };
  }

  const graphBuilder = new StateGraph(StateAnnotation, ConfigurationSchema);

  graphBuilder
    .addNode('planner', plannerNode)
    .addNode('llm', llmNode)
    .addNode('tools', toolNode)
    .addEdge('planner', 'llm')
    .addConditionalEdges('llm', state => {
      const route = toolsCondition(state);

      switch (route) {
        case END:
          const lastMessage = state.messages.at(-1);

          if (
            typeof lastMessage?.content === 'string' &&
            lastMessage.content.includes('##FINISHED##')
          ) {
            return END;
          }

          return 'llm';
        default:
          return route;
      }
    })
    .addEdge('tools', 'llm')
    .addEdge(START, 'planner');

  const graph = graphBuilder.compile({
    checkpointer,
  });

  return graph;
}

type createAssistantInstanceOptions = {
  model?: string;
};

export async function buildAssistant(options: createAssistantInstanceOptions) {
  const checkpointer = PostgresSaver.fromConnString(config.database.url, {
    schema: 'agent',
  });

  await checkpointer.setup();

  const llm = new ChatGroq({
    streaming: true,

    // model: 'mistral-saba-24b',
    // model: 'qwen-qwq-32b',
    model: 'qwen/qwen3-32b',
    // model: 'gemma2-9b-it',
    // model: 'llama-3.1-8b-instant',
    // temperature: 0.7,
    // maxTokens: 300,
    apiKey: config.env.GROQ_API_KEY,
  });

  const agent = createAgent({
    tools: [...Object.values(baseTools), ...Object.values(googleTools)],
    llm: llm,
    checkpointer,
  });

  const tools = [
    ...Object.values(baseTools),
    ...Object.values(googleTools),
    ...Object.values(userTools),
    ...Object.values(commonTools),
  ];

  return createReactAgent({
    llm: llm.bindTools(tools),
    tools,
    checkpointer,
  });

  // return agent;
}

export const llm = new ChatGroq({
  // model: 'gemma2-9b-it',
  model: 'llama-3.1-8b-instant',
  // model: 'qwen/qwen3-32b',
  apiKey: config.env.GROQ_API_KEY,
});
